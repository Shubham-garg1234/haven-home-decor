import express from 'express';
import { supabaseAdmin } from '../config/supabase.js';

const router = express.Router();
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ROOM_TYPES = new Set(['living room', 'bedroom', 'dining room', 'entryway', 'home office']);
const ROOM_STYLES = new Set([
  'let the AI choose',
  'modern',
  'scandinavian',
  'bohemian',
  'minimalist',
  'warm contemporary',
  'traditional',
]);
const hasAIProvider = () =>
  Boolean(process.env.OPENAI_API_KEY?.trim() || process.env.GEMINI_API_KEY?.trim());
const callOpenAI = async (apiKey, body) => {
  let response;
  try {
    response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
      body: JSON.stringify({ model: process.env.OPENAI_MODEL || 'gpt-4o-mini', ...body }),
      signal: AbortSignal.timeout(30000),
    });
  } catch (error) {
    if (error.name === 'TimeoutError' || error.name === 'AbortError') {
      throw new Error('The AI request timed out. Try again with a smaller image or question.');
    }
    console.error('Could not connect to OpenAI:', error.message);
    throw new Error('The backend could not connect to OpenAI. Check server network access.');
  }

  const result = await response.json().catch(() => null);
  if (!response.ok) {
    const code = result?.error?.code || result?.error?.type || 'unknown_error';
    const providerMessage =
      typeof result?.error?.message === 'string'
        ? result.error.message.replace(/data:image\/[^;]+;base64,[A-Za-z0-9+/=]+/g, '[image data]').slice(0, 300)
        : '';
    console.error(
      `OpenAI request failed with status ${response.status} (${code})${providerMessage ? `: ${providerMessage}` : ''}`,
    );

    if (response.status === 401 || code === 'invalid_api_key') {
      throw new Error('OpenAI authentication failed. Check OPENAI_API_KEY on the backend.');
    }
    if (code === 'insufficient_quota') {
      throw new Error('OpenAI account quota is exhausted. Check the account billing and usage limits.');
    }
    if (response.status === 429) {
      throw new Error('OpenAI rate limit reached. Wait briefly and try again.');
    }
    if (response.status === 404 || code === 'model_not_found') {
      throw new Error('The configured OpenAI model is unavailable. Check OPENAI_MODEL access and configuration.');
    }
    if (response.status === 400) {
      if (/image|dimension|resolution|format/i.test(`${code} ${providerMessage}`)) {
        throw new Error(
          `OpenAI could not process this image. Try a clear JPEG or PNG under 5 MB.${providerMessage ? ` Details: ${providerMessage}` : ''}`,
        );
      }
      throw new Error(
        `OpenAI rejected the request. Check the model and request configuration.${providerMessage ? ` Details: ${providerMessage}` : ''}`,
      );
    }
    throw new Error(`OpenAI request failed (HTTP ${response.status}, ${code}). Check backend logs.`);
  }

  if (!result) {
    throw new Error('OpenAI returned an invalid response. Check backend logs.');
  }
  return result;
};

const callGemini = async (apiKey, body) => {
  const systemMessage = body.messages.find((message) => message.role === 'system');
  const contents = body.messages
    .filter((message) => message.role !== 'system')
    .map((message) => {
      const parts = Array.isArray(message.content)
        ? message.content.flatMap((part) => {
            if (part.type === 'text') return [{ text: part.text }];
            if (part.type === 'image_url') {
              const match = part.image_url.url.match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/);
              if (!match) {
                throw new Error('Gemini fallback requires an uploaded image in a supported format.');
              }
              return [{ inlineData: { mimeType: match[1], data: match[2] } }];
            }
            return [];
          })
        : [{ text: message.content }];

      return {
        role: message.role === 'assistant' ? 'model' : 'user',
        parts,
      };
    });

  const requestBody = {
    ...(systemMessage && {
      systemInstruction: { parts: [{ text: systemMessage.content }] },
    }),
    contents,
    generationConfig: {
      maxOutputTokens: body.max_tokens || 350,
      ...(body.response_format && { responseMimeType: 'application/json' }),
    },
  };

  let response;
  try {
    response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${process.env.GEMINI_MODEL || 'gemini-2.5-flash'}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(30000),
      },
    );
  } catch (error) {
    if (error.name === 'TimeoutError' || error.name === 'AbortError') {
      throw new Error('The Gemini request timed out. Try again with a smaller image or question.');
    }
    console.error('Could not connect to Gemini:', error.message);
    throw new Error('The backend could not connect to Gemini. Check server network access.');
  }

  const result = await response.json().catch(() => null);
  if (!response.ok) {
    const code = result?.error?.status || 'unknown_error';
    console.error(`Gemini request failed with status ${response.status} (${code})`);
    if (response.status === 401 || response.status === 403) {
      throw new Error('Gemini authentication failed. Check GEMINI_API_KEY on the backend.');
    }
    if (response.status === 429) {
      throw new Error('Gemini rate limit or quota reached. Check Google AI billing and usage limits.');
    }
    if (response.status === 404) {
      throw new Error('The configured Gemini model is unavailable. Check GEMINI_MODEL access and configuration.');
    }
    throw new Error(`Gemini request failed (HTTP ${response.status}, ${code}). Check backend logs.`);
  }

  const text = result?.candidates?.[0]?.content?.parts
    ?.map((part) => part.text || '')
    .join('');
  if (typeof text !== 'string' || !text.trim()) {
    throw new Error('Gemini returned an empty response.');
  }

  return { choices: [{ message: { content: text } }] };
};

const callAI = async (body, { allowGeminiFallback = true } = {}) => {
  const openAIKey = process.env.OPENAI_API_KEY?.trim();
  const geminiKey = process.env.GEMINI_API_KEY?.trim();

  if (openAIKey) {
    try {
      return { result: await callOpenAI(openAIKey, body), provider: 'openai' };
    } catch (openAIError) {
      if (!geminiKey || !allowGeminiFallback) throw openAIError;
      console.warn(`OpenAI failed; trying Gemini fallback: ${openAIError.message}`);
    }
  }

  if (geminiKey) {
    try {
      return { result: await callGemini(geminiKey, body), provider: 'gemini' };
    } catch (geminiError) {
      if (openAIKey) {
        throw new Error(`Both AI providers failed. Gemini: ${geminiError.message}`);
      }
      throw geminiError;
    }
  }

  throw new Error('AI features are not configured. Set OPENAI_API_KEY or GEMINI_API_KEY on the backend.');
};

router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    configured: hasAIProvider(),
    providers: {
      openai: Boolean(process.env.OPENAI_API_KEY?.trim()),
      gemini: Boolean(process.env.GEMINI_API_KEY?.trim()),
    },
    model: process.env.OPENAI_API_KEY?.trim()
      ? process.env.OPENAI_MODEL || 'gpt-4o-mini'
      : process.env.GEMINI_MODEL || 'gemini-2.5-flash',
  });
});

router.post(
  '/image-search',
  express.raw({ type: [...IMAGE_TYPES], limit: MAX_IMAGE_SIZE }),
  async (req, res) => {
    if (!hasAIProvider()) {
      return res.status(503).json({
        error: 'AI features are not configured. Set OPENAI_API_KEY or GEMINI_API_KEY on the backend.',
      });
    }

    const contentType = req.get('content-type')?.split(';')[0].trim().toLowerCase();
    if (!IMAGE_TYPES.has(contentType)) {
      return res.status(415).json({ error: 'Upload a JPEG, PNG, or WebP image.' });
    }

    if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
      return res.status(400).json({ error: 'Choose an image to search.' });
    }

    try {
      const image = `data:${contentType};base64,${req.body.toString('base64')}`;
      const { result: visionResult, provider } = await callAI({
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

      if (provider === 'gemini') {
        return res.json({ description, products: rankedProducts });
      }

      let comparison;
      try {
        ({ result: comparison } = await callAI({
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
        }, { allowGeminiFallback: false }));
      } catch (error) {
        console.warn(`Visual comparison failed; using catalog keyword ranking: ${error.message}`);
        return res.json({ description, products: rankedProducts });
      }

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

router.post(
  '/room-recommendations',
  express.raw({ type: [...IMAGE_TYPES], limit: MAX_IMAGE_SIZE }),
  async (req, res) => {
    if (!hasAIProvider()) {
      return res.status(503).json({
        error: 'AI features are not configured. Set OPENAI_API_KEY or GEMINI_API_KEY on the backend.',
      });
    }

    const contentType = req.get('content-type')?.split(';')[0].trim().toLowerCase();
    if (!IMAGE_TYPES.has(contentType)) {
      return res.status(415).json({ error: 'Upload a JPEG, PNG, or WebP image.' });
    }
    if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
      return res.status(400).json({ error: 'Choose a room photo to continue.' });
    }

    const roomType = String(req.query.roomType || '').toLowerCase();
    const style = String(req.query.style || '').toLowerCase();
    if (!ROOM_TYPES.has(roomType) || !ROOM_STYLES.has(style)) {
      return res.status(400).json({ error: 'Choose a valid room type and design style.' });
    }

    try {
      const { data: products, error } = await supabaseAdmin
        .from('products')
        .select(
          'id, name, slug, description, short_description, category_id, price, compare_at_price, stock_quantity, is_active, is_featured, images, specifications, created_at, updated_at, category:categories(name)',
        )
        .eq('is_active', true)
        .gt('stock_quantity', 0)
        .order('is_featured', { ascending: false })
        .limit(80);

      if (error) {
        console.error('Room recommendations catalog query error:', error.message);
        return res.status(500).json({ error: 'Could not load products for room recommendations.' });
      }
      if (!products?.length) {
        return res.status(404).json({
          error: 'There are no in-stock products to recommend yet. Please check back soon.',
        });
      }

      const catalog = products.map((product) => ({
        id: product.id,
        name: product.name,
        description: product.short_description || product.description,
        category: product.category?.name || 'Home decor',
        price: product.price,
        specifications: product.specifications || {},
      }));
      const image = `data:${contentType};base64,${req.body.toString('base64')}`;
      const { result } = await callAI({
        messages: [
          {
            role: 'system',
            content:
              'You are a thoughtful home stylist. Analyze the uploaded room photo and recommend only products from the provided active catalog. Select 3 to 5 in-stock products that would complement the visible room, colors, and requested style; do not invent products or IDs. Return JSON with "roomDescription" (one concise sentence grounded only in visible details), "detectedStyle" (a short style label), "palette" (3 to 5 concise color names), and "recommendations" (an array of objects with "productId" and a specific one-sentence "reason"). If fewer products are suitable, return fewer. Use only exact catalog IDs.',
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Room type: ${roomType}. Preferred style: ${style}. Recommend from this catalog only:\n${JSON.stringify(catalog)}`,
              },
              { type: 'image_url', image_url: { url: image, detail: 'low' } },
            ],
          },
        ],
        response_format: { type: 'json_object' },
        max_tokens: 800,
      });

      const content = result.choices?.[0]?.message?.content;
      if (typeof content !== 'string') {
        throw new Error('The AI service returned invalid room recommendations.');
      }

      let design;
      try {
        design = JSON.parse(content);
      } catch {
        throw new Error('The AI service returned invalid room recommendations.');
      }
      if (!design || typeof design !== 'object') {
        throw new Error('The AI service returned invalid room recommendations.');
      }

      const productsById = new Map(products.map((product) => [product.id, product]));
      const seenProductIds = new Set();
      const recommendations = [];
      for (const recommendation of Array.isArray(design.recommendations) ? design.recommendations : []) {
        if (recommendations.length >= 5) break;
        if (
          !recommendation ||
          typeof recommendation.productId !== 'string' ||
          seenProductIds.has(recommendation.productId) ||
          !productsById.has(recommendation.productId)
        ) {
          continue;
        }

        seenProductIds.add(recommendation.productId);
        recommendations.push({
          product: productsById.get(recommendation.productId),
          reason: typeof recommendation.reason === 'string'
            ? recommendation.reason.slice(0, 240)
            : 'Selected to complement your room.',
        });
      }

      return res.json({
        roomDescription: typeof design.roomDescription === 'string'
          ? design.roomDescription.slice(0, 300)
          : '',
        detectedStyle: typeof design.detectedStyle === 'string'
          ? design.detectedStyle.slice(0, 80)
          : '',
        palette: Array.isArray(design.palette)
          ? design.palette.filter((color) => typeof color === 'string').slice(0, 5)
          : [],
        recommendations,
      });
    } catch (error) {
      console.error('Room recommendations error:', error.message);
      return res.status(502).json({ error: error.message || 'Room recommendations failed.' });
    }
  },
);

router.post(
  '/room-preview',
  express.raw({ type: [...IMAGE_TYPES], limit: MAX_IMAGE_SIZE }),
  async (req, res) => {
    const openAIKey = process.env.OPENAI_API_KEY?.trim();
    if (!openAIKey) {
      return res.status(503).json({
        error: 'AI room previews require an OpenAI API key configured on the backend.',
      });
    }

    const contentType = req.get('content-type')?.split(';')[0].trim().toLowerCase();
    if (!IMAGE_TYPES.has(contentType)) {
      return res.status(415).json({ error: 'Upload a JPEG, PNG, or WebP image.' });
    }
    if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
      return res.status(400).json({ error: 'Choose a room photo to continue.' });
    }

    const productIds = String(req.query.productIds || '')
      .split(',')
      .filter(Boolean)
      .slice(0, 5);
    if (
      productIds.length === 0 ||
      productIds.some((id) => !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))
    ) {
      return res.status(400).json({ error: 'Select at least one valid recommended product.' });
    }

    try {
      const { data: products, error } = await supabaseAdmin
        .from('products')
        .select('name, short_description, specifications')
        .in('id', productIds)
        .eq('is_active', true);

      if (error) {
        console.error('Room preview catalog query error:', error.message);
        return res.status(500).json({ error: 'Could not load the selected products for the preview.' });
      }
      if (!products?.length) {
        return res.status(404).json({ error: 'The selected products are no longer available.' });
      }

      const productDetails = products
        .map((product) => {
          const specifications = Object.entries(product.specifications || {})
            .map(([key, value]) => `${key}: ${value}`)
            .join(', ');
          return `${product.name}: ${product.short_description || ''}${specifications ? ` (${specifications})` : ''}`;
        })
        .join('\n');
      const form = new FormData();
      form.append('model', process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1');
      form.append(
        'prompt',
        `Create a photorealistic interior design concept by restyling the uploaded room photo. Preserve the room's layout, architecture, camera perspective, and recognizable fixed features. Tastefully incorporate decor inspired by these selected store items, using their described materials and colors: ${productDetails}. Keep the result realistic and uncluttered. This is an approximate design visualization, not an exact product photo. Do not add text, labels, or logos.`,
      );
      form.append('size', '1024x1024');
      form.append('quality', 'low');
      form.append('image', new Blob([req.body], { type: contentType }), `room.${contentType.split('/')[1]}`);

      let response;
      try {
        response = await fetch('https://api.openai.com/v1/images/edits', {
          method: 'POST',
          headers: { Authorization: `Bearer ${openAIKey}` },
          body: form,
          signal: AbortSignal.timeout(90000),
        });
      } catch (error) {
        if (error.name === 'TimeoutError' || error.name === 'AbortError') {
          throw new Error('The room preview took too long to generate. Please try again.');
        }
        console.error('Could not connect to OpenAI image generation:', error.message);
        throw new Error('The backend could not connect to the image generation service.');
      }

      const result = await response.json().catch(() => null);
      if (!response.ok) {
        const code = result?.error?.code || result?.error?.type || 'unknown_error';
        console.error(`OpenAI image generation failed with status ${response.status} (${code})`);
        if (response.status === 401) {
          throw new Error('OpenAI authentication failed. Check OPENAI_API_KEY on the backend.');
        }
        if (response.status === 429) {
          throw new Error('OpenAI image generation is rate limited or out of quota. Try again later.');
        }
        if (response.status === 404) {
          throw new Error('The configured image model is unavailable. Check OPENAI_IMAGE_MODEL access.');
        }
        throw new Error(`Room preview generation failed (HTTP ${response.status}). Check backend logs.`);
      }

      const generatedImage = result?.data?.[0]?.b64_json;
      if (typeof generatedImage !== 'string' || !generatedImage) {
        throw new Error('The image service returned no preview. Please try again.');
      }

      return res.json({ image: generatedImage, warning: 'AI concept visualization; product appearance may differ from the actual items.' });
    } catch (error) {
      console.error('Room preview error:', error.message);
      return res.status(502).json({ error: error.message || 'Room preview generation failed.' });
    }
  },
);

router.post('/chat', async (req, res) => {
  if (!hasAIProvider()) {
    return res.status(503).json({
      error: 'AI features are not configured. Set OPENAI_API_KEY or GEMINI_API_KEY on the backend.',
    });
  }

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
    const { result } = await callAI({
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
