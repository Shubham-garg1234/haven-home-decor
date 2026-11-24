import assert from 'node:assert/strict';
import test from 'node:test';
import { buildRoomRecommendations, parseRoomDesignResponse } from '../utils/roomDesign.js';

const products = [
  { id: 'mirror', name: 'Arched Mirror', category: { name: 'Wall Decor' }, stock_quantity: 4 },
  { id: 'bed', name: 'Upholstered Queen Bed', category: { name: 'Bedroom' }, stock_quantity: 3 },
  { id: 'bedding', name: 'Cotton Duvet Bedding', category: { name: 'Bedroom' }, stock_quantity: 5 },
  { id: 'lamp', name: 'Bedside Table Lamp', category: { name: 'Lighting' }, stock_quantity: 6 },
  { id: 'sofa', name: 'Living Room Sofa', category: { name: 'Seating' }, stock_quantity: 2 },
  { id: 'curtains', name: 'Bedroom Curtains', category: { name: 'Textiles' }, stock_quantity: 7 },
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
  assert.ok(recommendations.every(({ product }) => product.stock_quantity > 0));
});
