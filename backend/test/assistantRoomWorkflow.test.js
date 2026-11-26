import assert from 'node:assert/strict';
import test from 'node:test';
import express from 'express';

const makeId = (suffix) => `00000000-0000-4000-8000-${suffix.padStart(12, '0')}`;
const products = [
  { id: makeId('1'), name: 'Sienna Three-Seat Sofa', category: { name: 'Sofas & Seating' }, description: 'Olive woven upholstery with rounded arms.', specifications: { color: 'Olive', material: 'Woven upholstery' }, images: ['https://catalog.test/sofa.jpg'], is_active: true, stock_quantity: 4, is_featured: true },
  { id: makeId('2'), name: 'Aster Tripod Floor Lamp', category: { name: 'Lighting' }, description: 'A tripod lamp with a fabric shade.', specifications: { color: 'Ivory', material: 'Wood and fabric' }, images: ['https://catalog.test/lamp.jpg'], is_active: true, stock_quantity: 5, is_featured: false },
  { id: makeId('3'), name: 'Pebble Round Pouf', category: { name: 'Furniture & Accents' }, description: 'A soft round woven pouf.', specifications: { color: 'Natural', shape: 'Round' }, images: ['https://catalog.test/pouf.jpg'], is_active: true, stock_quantity: 5, is_featured: false },
  { id: makeId('4'), name: 'Riva Jute Area Rug', category: { name: 'Textiles' }, description: 'A hand-finished jute blend rug.', specifications: { size: '150 x 210 cm', material: 'Jute blend' }, images: ['https://catalog.test/rug.jpg'], is_active: true, stock_quantity: 5, is_featured: false },
  { id: makeId('5'), name: 'Kora Textured Cushion Cover', category: { name: 'Textiles' }, description: 'A tactile cotton cushion cover.', specifications: { size: '45 x 45 cm', color: 'Oatmeal' }, images: ['https://catalog.test/cushion.jpg'], is_active: true, stock_quantity: 5, is_featured: false },
  { id: makeId('6'), name: 'Marlow Upholstered Queen Bed', category: { name: 'Bedroom' }, description: 'A warm beige upholstered queen bed.', specifications: { size: 'Queen', color: 'Warm beige' }, images: ['https://catalog.test/bed.jpg'], is_active: true, stock_quantity: 3, is_featured: true },
  { id: makeId('7'), name: 'Linen Cloud Duvet Cover Set', category: { name: 'Bedroom' }, description: 'A relaxed cotton-linen duvet cover.', specifications: { size: 'Queen', color: 'Ivory' }, images: ['https://catalog.test/duvet.jpg'], is_active: true, stock_quantity: 5, is_featured: false },
  { id: makeId('8'), name: 'Nook Solid Wood Side Table', category: { name: 'Furniture & Accents' }, description: 'A compact solid-wood bedside table.', specifications: { material: 'Solid mango wood', style: 'Scandinavian' }, images: ['https://catalog.test/side-table.jpg'], is_active: true, stock_quantity: 5, is_featured: false },
  { id: makeId('9'), name: 'Arden Two-Door Wardrobe', category: { name: 'Storage' }, description: 'A compact warm-white wardrobe.', specifications: { color: 'Warm white', doors: '2' }, images: ['https://catalog.test/wardrobe.jpg'], is_active: true, stock_quantity: 3, is_featured: false },
];

test('room selections stay aligned with generated previews for living room and bedroom', async () => {
  const envKeys = [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'SUPABASE_ANON_KEY',
    'OPENAI_API_KEY',
    'OPENAI_IMAGE_MODEL',
    'OPENAI_MODEL',
    'GEMINI_API_KEY',
  ];
  const originalEnv = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));
  const originalFetch = globalThis.fetch;
  const imageRequests = [];
  process.env.SUPABASE_URL = 'https://supabase.test';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
  process.env.SUPABASE_ANON_KEY = 'test-anon-key';
  process.env.OPENAI_API_KEY = 'test-openai-key';
  process.env.OPENAI_IMAGE_MODEL = 'gpt-image-2';
  process.env.OPENAI_MODEL = 'gpt-4o-mini';
  delete process.env.GEMINI_API_KEY;

  globalThis.fetch = async (input, init = {}) => {
    const url = new URL(typeof input === 'string' ? input : input.url);
    if (url.hostname === 'supabase.test') {
      return new Response(JSON.stringify(products), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    if (url.hostname === 'api.openai.com' && url.pathname === '/v1/chat/completions') {
      const request = JSON.parse(init.body);
      const userText = request.messages[1].content.find((part) => part.type === 'text').text;
      const isBedroom = userText.includes('Room type: bedroom.');
      const selectedIds = isBedroom
        ? ['6', '1', '7', '2', '8']
        : ['1', '6', '2', '3', '4'];
      const response = {
        roomDescription: `A ${isBedroom ? 'bedroom' : 'living room'} with natural light.`,
        detectedStyle: isBedroom ? 'scandinavian' : 'bohemian',
        palette: ['cream', 'wood', 'olive'],
        recommendations: selectedIds.map((id) => ({
          productId: makeId(id),
          reason: 'Coordinates with the selected room and style.',
        })),
      };
      return new Response(JSON.stringify({
        choices: [{ message: { content: JSON.stringify(response) } }],
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    if (url.hostname === 'api.openai.com' && url.pathname === '/v1/images/edits') {
      imageRequests.push(JSON.parse(init.body));
      return new Response(JSON.stringify({ data: [{ b64_json: 'generated-preview' }] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    throw new Error(`Unexpected outbound request: ${url.href}`);
  };

  let server;
  try {
    const { default: assistantRoutes } = await import('../routes/assistant.js');
    const app = express();
    app.use('/api/assistant', assistantRoutes);
    server = app.listen(0, '127.0.0.1');
    await new Promise((resolve) => server.once('listening', resolve));
    const address = server.address();
    const endpoint = `http://127.0.0.1:${address.port}/api/assistant`;

    for (const { roomType, style } of [
      { roomType: 'living room', style: 'bohemian' },
      { roomType: 'bedroom', style: 'scandinavian' },
    ]) {
      const image = Buffer.from('room photo');
      const recommendationsResponse = await originalFetch(
        `${endpoint}/room-recommendations?roomType=${encodeURIComponent(roomType)}&style=${encodeURIComponent(style)}`,
        { method: 'POST', headers: { 'Content-Type': 'image/jpeg' }, body: image },
      );
      assert.equal(recommendationsResponse.status, 200);
      const design = await recommendationsResponse.json();
      assert.equal(design.roomType, roomType);
      assert.equal(design.style, style);

      const selected = design.recommendations.map(({ product }) => product);
      assert.ok(selected.length > 0);
      assert.ok(selected.every(({ images }) => images?.length));
      assert.equal(
        selected.some(({ name }) => roomType === 'living room'
          ? /bed|duvet|wardrobe/i.test(name)
          : /sofa|couch/i.test(name)),
        false,
      );

      const previewResponse = await originalFetch(
        `${endpoint}/room-preview?productIds=${selected.map(({ id }) => id).join(',')}&roomType=${encodeURIComponent(design.roomType)}&style=${encodeURIComponent(design.style)}`,
        { method: 'POST', headers: { 'Content-Type': 'image/jpeg' }, body: image },
      );
      assert.equal(previewResponse.status, 200);
      assert.equal((await previewResponse.json()).image, 'generated-preview');
      const request = imageRequests.at(-1);
      assert.match(request.prompt, new RegExp(`Requested room: ${roomType}\\. Requested style: ${style}`));
      assert.ok(selected.every(({ id }) => request.prompt.includes(`catalog ID ${id}`)));
      assert.deepEqual(
        request.images.slice(1).map(({ image_url }) => image_url),
        selected.map(({ images }) => images[0]),
      );
    }
  } finally {
    if (server) await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    globalThis.fetch = originalFetch;
    for (const key of envKeys) {
      if (originalEnv[key] === undefined) delete process.env[key];
      else process.env[key] = originalEnv[key];
    }
  }
});
