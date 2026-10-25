import express from 'express';
import { supabaseAdmin } from '../config/supabase.js';

const router = express.Router();
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const getApiKey = (res) => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    res.status(503).json({ error: 'AI features are not configured on the server.' });
    return null;
  }
  return apiKey;
};

const callOpenAI = async (apiKey, body) => {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model: process.env.OPENAI_MODEL || 'gpt-4o-mini', ...body }),
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    console.error(`OpenAI request failed with status ${response.status}`);
    throw new Error('The AI service could not complete the request.');
  }

  return response.json();
};

router.post(
  '/image-search',
  express.raw({ type: [...IMAGE_TYPES], limit: MAX_IMAGE_SIZE }),
  async (req, res) => {
    const apiKey = getApiKey(res);
    if (!apiKey) return;

    const contentType = req.get('content-type')?.split(';')[0].trim().toLowerCase();
    if (!IMAGE_TYPES.has(contentType)) {
      return res.status(415).json({ error: 'Upload a JPEG, PNG, or WebP image.' });
    }

    if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
      return res.status(400).json({ error: 'Choose an image to search.' });
    }

    try {
      const image = `data:${contentType};base64,${req.body.toString('base64')}`;
      const visionResult = await callOpenAI(apiKey, {
        messages: [
          {
            role: 'system',
            content:
              'Describe the main purchasable item in the image for visual product search. Return JSON with "description" (one short sentence) and "keywords" (up to 8 concise visual terms including item type, color, material, and style when visible). Do not infer details that cannot be seen.',
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Identify this item for a product catalog search.' },
              { type: 'image_url', image_url: { url: image, detail: 'low' } },
            ],
          },
        ],
        response_format: { type: 'json_object' },
        max_tokens: 160,
      });

      const content = visionResult.choices?.[0]?.message?.content;
      if (typeof content !== 'string') {
        throw new Error('The AI service returned an invalid image description.');
      }

      let visualDescription;
      try {
        visualDescription = JSON.parse(content);
      } catch {
        throw new Error('The AI service returned an invalid image description.');
      }
      if (!visualDescription || typeof visualDescription !== 'object') {
        throw new Error('The AI service returned an invalid image description.');
      }

      const keywords = Array.isArray(visualDescription.keywords)
        ? visualDescription.keywords
            .filter((keyword) => typeof keyword === 'string')
            .slice(0, 8)
        : [];
      const description =
        typeof visualDescription.description === 'string'
          ? visualDescription.description.slice(0, 300)
          : '';
      const stopWords = new Set(['with', 'from', 'that', 'this', 'product', 'item', 'home', 'decor']);
      const terms = [...new Set(
        [...keywords, description]
          .flatMap((text) => text.toLowerCase().match(/[a-z0-9]{2,}/g) || [])
          .filter((term) => !stopWords.has(term)),
      )].slice(0, 12);

      if (terms.length === 0) {
        return res.json({ description, products: [] });
      }

      const searchableFields = ['name', 'description', 'short_description'];
      const filters = terms.flatMap((term) =>
        searchableFields.map((field) => `${field}.ilike.%${term}%`),
      );
      const { data: products, error } = await supabaseAdmin
        .from('products')
        .select(
          'id, name, slug, description, short_description, category_id, price, compare_at_price, stock_quantity, is_active, is_featured, images, specifications, created_at, updated_at, category:categories(*)',
        )
        .eq('is_active', true)
        .or(filters.join(','))
        .limit(100);

      if (error) {
        console.error('Image search catalog query error:', error.message);
        return res.status(500).json({ error: 'Could not search the product catalog.' });
      }

      const rankedProducts = (products || [])
        .map((product) => {
          const searchableText = [
            product.name,
            product.description,
            product.short_description,
            product.category?.name,
            JSON.stringify(product.specifications || {}),
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();
          const score = terms.reduce(
            (total, term) => total + (searchableText.includes(term) ? 1 : 0),
            0,
          );
          return { product, score };
        })
        .filter(({ score }) => score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 12)
        .map(({ product }) => product);

      const visualCandidates = rankedProducts
        .map((product) => {
          const imageUrl = product.images?.find((url) => {
            try {
              return ['http:', 'https:'].includes(new URL(url).protocol);
            } catch {
              return false;
            }
          });
          return imageUrl ? { product, imageUrl } : null;
        })
        .filter(Boolean)
        .slice(0, 8);

      if (visualCandidates.length === 0) {
        return res.json({ description, products: rankedProducts });
      }

      const comparison = await callOpenAI(apiKey, {
        messages: [
          {
            role: 'system',
            content:
              'Compare the first image (the customer upload) with the following product images. Rank only the provided product IDs from most to least visually similar, considering item type, color, shape, material, and style. Return JSON with "rankedProductIds" as an array of IDs. Return an empty array if none are reasonably similar.',
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Customer image:' },
              { type: 'image_url', image_url: { url: image, detail: 'low' } },
              ...visualCandidates.flatMap(({ product, imageUrl }) => [
                {
                  type: 'text',
                  text: `Product ID: ${product.id}; name: ${product.name}`,
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: imageUrl,
                    detail: 'low',
                  },
                },
              ]),
            ],
          },
        ],
        response_format: { type: 'json_object' },
        max_tokens: 180,
      });

      const comparisonContent = comparison.choices?.[0]?.message?.content;
      if (typeof comparisonContent !== 'string') {
        throw new Error('The AI service returned invalid visual matches.');
      }

      let comparisonResult;
      try {
        comparisonResult = JSON.parse(comparisonContent);
      } catch {
        throw new Error('The AI service returned invalid visual matches.');
      }
      if (!comparisonResult || typeof comparisonResult !== 'object') {
        throw new Error('The AI service returned invalid visual matches.');
      }

      const candidateById = new Map(
        visualCandidates.map(({ product }) => [product.id, product]),
      );
      const visuallyRanked = Array.isArray(comparisonResult.rankedProductIds)
        ? comparisonResult.rankedProductIds
            .map((id) => candidateById.get(id))
            .filter(Boolean)
        : [];
      const rankedIds = new Set(visuallyRanked.map((product) => product.id));
      const remainingProducts = rankedProducts.filter(
        (product) => !candidateById.has(product.id) && !rankedIds.has(product.id),
      );

      return res.json({
        description,
        products: [...visuallyRanked, ...remainingProducts].slice(0, 12),
      });
    } catch (error) {
      console.error('Image search error:', error.message);
      return res.status(502).json({ error: error.message || 'Image search failed.' });
    }
  },
);

router.post('/chat', async (req, res) => {
  const apiKey = getApiKey(res);
  if (!apiKey) return;

  const { messages } = req.body || {};
  if (
    !Array.isArray(messages) ||
    messages.length === 0 ||
    messages.some(
      (message) =>
        !message ||
        !['user', 'assistant'].includes(message.role) ||
        typeof message.content !== 'string' ||
        message.content.trim().length === 0 ||
        message.content.length > 2000,
    )
  ) {
    return res.status(400).json({ error: 'Send a valid chat message (up to 2,000 characters).' });
  }

  try {
    const { data: products, error } = await supabaseAdmin
      .from('products')
      .select('name, description, short_description, price, category:categories(name)')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Assistant catalog query error:', error.message);
      return res.status(500).json({ error: 'Could not load product information for the assistant.' });
    }

    const catalogContext = (products || [])
      .map((product) => {
        const summary = product.short_description || product.description || '';
        return `- ${product.name} (${product.category?.name || 'General'}, ₹${product.price}): ${summary}`;
      })
      .join('\n');
    const chatMessages = messages.slice(-8).map(({ role, content }) => ({
      role,
      content: content.trim(),
    }));
    const result = await callOpenAI(apiKey, {
      messages: [
        {
          role: 'system',
          content: `You are the helpful shopping assistant for DecorNest, an Indian home decor store. Answer clearly and concisely. Use the catalog context below for product facts; do not invent products, prices, availability, policies, or order details. You cannot access customer accounts or order status, so direct those requests to the store's support team. If the catalog does not answer a product question, say so and offer general guidance.\n\nCatalog:\n${catalogContext || 'No active products are currently listed.'}`,
        },
        ...chatMessages,
      ],
      max_tokens: 350,
    });
    const reply = result.choices?.[0]?.message?.content;
    if (typeof reply !== 'string' || !reply.trim()) {
      throw new Error('The AI service returned an empty reply.');
    }

    return res.json({ reply: reply.trim() });
  } catch (error) {
    console.error('Assistant chat error:', error.message);
    return res.status(502).json({ error: error.message || 'The assistant could not respond.' });
  }
});

router.use((error, req, res, next) => {
  if (error.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Image must be 5 MB or smaller.' });
  }
  if (error.type === 'encoding.unsupported') {
    return res.status(415).json({ error: 'Unsupported image encoding.' });
  }
  return next(error);
});

export default router;
