const ROOM_PRODUCT_TERMS = {
  'living room': ['sofa', 'couch', 'coffee table', 'rug', 'throw', 'cushion', 'armchair', 'floor lamp'],
  bedroom: ['bed', 'bed frame', 'bedding', 'nightstand', 'bedside', 'duvet', 'curtain', 'table lamp'],
  'dining room': ['dining', 'dining table', 'dining chair', 'pendant', 'sideboard', 'table runner'],
  entryway: ['console', 'entryway', 'shoe', 'bench', 'wall mirror', 'coat', 'runner'],
  'home office': ['desk', 'office chair', 'bookcase', 'shelf', 'task lamp', 'desk lamp'],
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

    seenProductIds.add(recommendation.productId);
    const product = productsById.get(recommendation.productId);
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
    .filter((product) => !seenProductIds.has(product.id))
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
