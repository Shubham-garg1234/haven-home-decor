import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildRoomPreviewRequest,
  buildRoomRecommendations,
  parseRoomDesignResponse,
} from '../utils/roomDesign.js';

const products = [
  { id: 'mirror', name: 'Arched Mirror', category: { name: 'Wall Decor' }, stock_quantity: 4, images: ['https://catalog.test/mirror.jpg'], specifications: { material: 'oak', color: 'natural' } },
  { id: 'bed', name: 'Upholstered Queen Bed', category: { name: 'Bedroom' }, stock_quantity: 3, images: ['https://catalog.test/bed.jpg'], description: 'A tailored upholstered bed.' },
  { id: 'bedding', name: 'Cotton Duvet Bedding', category: { name: 'Bedroom' }, stock_quantity: 5, images: ['https://catalog.test/bedding.jpg'] },
  { id: 'lamp', name: 'Bedside Table Lamp', category: { name: 'Lighting' }, stock_quantity: 6, images: ['https://catalog.test/lamp.jpg'] },
  { id: 'sofa', name: 'Living Room Sofa', category: { name: 'Seating' }, stock_quantity: 2, images: ['https://catalog.test/sofa.jpg'] },
  { id: 'curtains', name: 'Bedroom Curtains', category: { name: 'Textiles' }, stock_quantity: 7, images: ['https://catalog.test/curtains.jpg'] },
  { id: 'dining-table', name: 'Extendable Dining Table', category: { name: 'Dining' }, stock_quantity: 2 },
  { id: 'office-desk', name: 'Home Office Desk', category: { name: 'Home Office' }, stock_quantity: 2 },
];

test('parses the expected AI room design response', () => {
  const design = parseRoomDesignResponse(JSON.stringify({
    roomDescription: 'A warm bedroom with natural light.',
    detectedStyle: 'Modern',
    palette: ['cream', 'wood'],
    recommendations: [{ productId: 'bed', reason: 'The upholstered headboard adds softness.' }],
  }));

  assert.equal(design.recommendations.length, 1);
  assert.equal(design.recommendations[0].productId, 'bed');
});

test('rejects malformed or unexpected recommendation JSON', () => {
  assert.throws(() => parseRoomDesignResponse('{invalid json'));
  assert.throws(() => parseRoomDesignResponse('{"recommendations": "mirror"}'));
});

test('fills short AI responses with relevant, unique in-stock catalog products', () => {
  const design = {
    roomDescription: 'A restful bedroom with warm wood tones.',
    detectedStyle: 'Modern',
    palette: ['cream', 'wood'],
    recommendations: [
      { productId: 'mirror', reason: 'The shape adds a soft focal point.' },
      { productId: 'mirror', reason: 'Duplicate recommendation.' },
      { productId: 'not-in-catalog', reason: 'Unknown product.' },
    ],
  };

  const recommendations = buildRoomRecommendations({
    design,
    products,
    roomType: 'bedroom',
    style: 'modern',
  });

  assert.equal(recommendations.length, 5);
  assert.equal(new Set(recommendations.map(({ product }) => product.id)).size, 5);
  assert.equal(recommendations[0].product.id, 'mirror');
  const recommendedIds = recommendations.map(({ product }) => product.id);
  assert.ok(recommendedIds.includes('bed'));
  assert.ok(recommendedIds.includes('bedding'));
  assert.ok(!recommendedIds.includes('sofa'));
  assert.ok(!recommendedIds.includes('dining-table'));
  assert.ok(!recommendedIds.includes('office-desk'));
  assert.ok(recommendations.every(({ product }) => product.stock_quantity > 0));
});

test('living room recommendations exclude bedroom products and keep preview inputs aligned', () => {
  const recommendations = buildRoomRecommendations({
    design: {
      recommendations: [
        { productId: 'bed', reason: 'AI selected this incorrectly.' },
        { productId: 'sofa', reason: 'A seating anchor for the room.' },
        { productId: 'lamp', reason: 'Warm accent lighting.' },
      ],
    },
    products,
    roomType: 'living room',
    style: 'bohemian',
  });
  const selectedProducts = recommendations.map(({ product }) => product);
  const preview = buildRoomPreviewRequest({
    image: 'data:image/jpeg;base64,room-photo',
    roomType: 'living room',
    style: 'bohemian',
    products: selectedProducts,
    model: 'gpt-image-2',
  });

  assert.ok(selectedProducts.length > 0);
  assert.ok(selectedProducts.every(({ id }) => !['bed', 'bedding'].includes(id)));
  assert.match(preview.prompt, /Requested room: living room\. Requested style: bohemian/);
  assert.ok(selectedProducts.every(({ id }) => preview.prompt.includes(`catalog ID ${id}`)));
  assert.equal(preview.images[0].image_url, 'data:image/jpeg;base64,room-photo');
  assert.deepEqual(
    preview.images.slice(1).map(({ image_url }) => image_url),
    selectedProducts.map(({ images }) => images[0]),
  );
});

test('bedroom recommendations exclude living room sofas and retain exact product references', () => {
  const recommendations = buildRoomRecommendations({
    design: {
      recommendations: [
        { productId: 'sofa', reason: 'AI selected this incorrectly.' },
        { productId: 'bed', reason: 'A calm upholstered focal point.' },
        { productId: 'bedding', reason: 'A soft neutral layer.' },
      ],
    },
    products,
    roomType: 'bedroom',
    style: 'scandinavian',
  });
  const selectedProducts = recommendations.map(({ product }) => product);
  const preview = buildRoomPreviewRequest({
    image: 'data:image/png;base64,room-photo',
    roomType: 'bedroom',
    style: 'scandinavian',
    products: selectedProducts,
    model: 'gpt-image-2',
  });

  assert.ok(selectedProducts.length > 0);
  assert.ok(selectedProducts.every(({ id }) => id !== 'sofa'));
  assert.match(preview.prompt, /Requested room: bedroom\. Requested style: scandinavian/);
  assert.ok(selectedProducts.every(({ id }) => preview.prompt.includes(`catalog ID ${id}`)));
  assert.deepEqual(
    preview.images.slice(1).map(({ image_url }) => image_url),
    selectedProducts.map(({ images }) => images[0]),
  );
});
