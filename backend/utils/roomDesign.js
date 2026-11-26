const ROOM_PRODUCT_TERMS = {
  'living room': ['sofa', 'couch', 'coffee table', 'rug', 'throw', 'cushion', 'armchair', 'floor lamp'],
  bedroom: ['bed', 'bed frame', 'bedding', 'nightstand', 'bedside', 'duvet', 'curtain', 'table lamp'],
  'dining room': ['dining', 'dining table', 'dining chair', 'pendant', 'sideboard', 'table runner'],
  entryway: ['console', 'entryway', 'shoe', 'bench', 'wall mirror', 'coat', 'runner'],
  'home office': ['desk', 'office chair', 'bookcase', 'shelf', 'task lamp', 'desk lamp'],
};

const ROOM_PRODUCT_EXCLUSIONS = {
  'living room': [
    { category: 'bedroom' },
    { name: /\b(bed|bedding|bedspread|duvet|nightstand|wardrobe|dining table|dining chair|entryway bench|shoe cabinet|desk|office chair)\b/i },
  ],
  bedroom: [
    { category: 'dining' },
    { name: /\b(sofa|couch|sectional|loveseat|dining table|dining chair|coffee table|desk|office chair|shoe cabinet)\b/i },
  ],
};

export const isProductSuitableForRoom = (product, roomType) => {
  const exclusions = ROOM_PRODUCT_EXCLUSIONS[roomType] || [];
  const category = product.category?.name || '';
  return !exclusions.some(({ category: excludedCategory, name }) =>
    (excludedCategory && category.toLowerCase() === excludedCategory) ||
    (name && name.test(product.name || '')),
  );
};

export const describeCatalogProduct = (product) => {
  const specifications = Object.entries(product.specifications || {})
    .map(([key, value]) => `${key.replace(/_/g, ' ')}: ${value}`)
    .join('; ');
  return [
    product.description,
    product.short_description,
    product.category?.name && `Category: ${product.category.name}`,
    specifications && `Catalog attributes: ${specifications}`,
  ].filter(Boolean).join('\n');
};

export const getProductReferenceImage = (product) =>
  product.images?.find((image) => {
    try {
      return ['http:', 'https:'].includes(new URL(image).protocol);
    } catch {
      return false;
    }
  });

export const buildRoomPreviewRequest = ({ image, roomType, style, products, model }) => {
  const images = [{ image_url: image }];
  const productDetails = products.map((product, index) => {
    const referenceImage = getProductReferenceImage(product);
    const referenceNumber = referenceImage ? images.push({ image_url: referenceImage }) : 0;
    return [
      `Product ${index + 1} (catalog ID ${product.id}): ${product.name}`,
      describeCatalogProduct(product),
      referenceImage
        ? `Use reference image ${referenceNumber} as this exact product's visual identity.`
        : 'No catalog product image is available; follow the supplied catalog attributes exactly.',
    ].filter(Boolean).join('\n');
  }).join('\n\n');
  const prompt =
    `Edit source image 1, which is the customer's ${roomType}. Preserve its room type, architecture, layout, camera perspective, and recognizable fixed features. Restyle it in the ${style === 'let the AI choose' ? 'detected complementary' : style} design style. ` +
    `Add the exact catalog products listed below. The source room is image 1; each product image reference number is specified next to its catalog item. Treat each product reference image as the identity of that exact item, not as inspiration: preserve its silhouette, color, material, texture, and proportions. Include these selected items and do not replace them with generic alternatives, omit them, duplicate them, or add unrelated furniture. Do not place beds or bedroom-only items in a living room, or living-room sofas in a bedroom. Use only the described product set; keep other room furnishings minimal and subordinate. ` +
    `Requested room: ${roomType}. Requested style: ${style}. Product details:\n${productDetails}\n\n` +
    'Create a realistic, uncluttered concept image. Do not add text, labels, or logos.';

  return { model, prompt, images };
};

export const parseRoomDesignResponse = (content) => {
  if (typeof content !== 'string') {
    throw new Error('The AI service returned invalid room recommendations.');
  }

  let design;
  try {
    design = JSON.parse(content);
  } catch {
    throw new Error('The AI service returned invalid room recommendations.');
  }
  if (!design || typeof design !== 'object' || Array.isArray(design)) {
    throw new Error('The AI service returned invalid room recommendations.');
  }
  if (!Array.isArray(design.recommendations)) {
    throw new Error('The AI service returned invalid room recommendations: recommendations must be an array.');
  }
  return design;
};

export const buildRoomRecommendations = ({ design, products, roomType, style }) => {
  const productsById = new Map(products.map((product) => [product.id, product]));
  const seenProductIds = new Set();
  const recommendations = [];
  const categoryCounts = new Map();

  for (const recommendation of design.recommendations) {
    if (recommendations.length >= 5) break;
    if (
      !recommendation ||
      typeof recommendation.productId !== 'string' ||
      seenProductIds.has(recommendation.productId) ||
      !productsById.has(recommendation.productId)
    ) {
      continue;
    }

    const product = productsById.get(recommendation.productId);
    if (!isProductSuitableForRoom(product, roomType)) continue;

    seenProductIds.add(recommendation.productId);
    const categoryName = product.category?.name || 'Home decor';
    categoryCounts.set(categoryName, (categoryCounts.get(categoryName) || 0) + 1);
    recommendations.push({
      product,
      reason: typeof recommendation.reason === 'string'
        ? recommendation.reason.slice(0, 240)
        : 'Selected to complement your room.',
    });
  }

  const contextTerms = [
    roomType,
    style === 'let the AI choose' ? '' : style,
    typeof design.detectedStyle === 'string' ? design.detectedStyle : '',
    typeof design.roomDescription === 'string' ? design.roomDescription : '',
    ...(Array.isArray(design.palette) ? design.palette.filter((color) => typeof color === 'string') : []),
    ...ROOM_PRODUCT_TERMS[roomType],
  ]
    .join(' ')
    .toLowerCase()
    .match(/[a-z0-9]{3,}/g) || [];
  const scoredProducts = products
    .filter((product) =>
      !seenProductIds.has(product.id) &&
      isProductSuitableForRoom(product, roomType),
    )
    .map((product) => {
      const searchableText = [
        product.name,
        product.description,
        product.short_description,
        product.category?.name,
        JSON.stringify(product.specifications || {}),
      ].filter(Boolean).join(' ').toLowerCase();
      const score = contextTerms.reduce(
        (total, term) => total + (searchableText.includes(term) ? 1 : 0),
        product.is_featured ? 1 : 0,
      );
      return { product, score };
    })
    .sort((a, b) => b.score - a.score);

  const addFallback = (product) => {
    seenProductIds.add(product.id);
    const categoryName = product.category?.name || 'Home decor';
    recommendations.push({
      product,
      reason: `A ${categoryName.toLowerCase()} pick selected to complement your ${roomType}.`,
    });
  };

  for (const { product } of scoredProducts) {
    if (recommendations.length >= 5) break;
    const categoryName = product.category?.name || 'Home decor';
    if ((categoryCounts.get(categoryName) || 0) >= 2) continue;

    categoryCounts.set(categoryName, (categoryCounts.get(categoryName) || 0) + 1);
    addFallback(product);
  }

  for (const { product } of scoredProducts) {
    if (recommendations.length >= 5) break;
    if (seenProductIds.has(product.id)) continue;
    addFallback(product);
  }

  return recommendations;
};
