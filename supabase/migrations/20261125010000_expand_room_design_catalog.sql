INSERT INTO public.categories (name, slug, description, image_url, is_active)
VALUES
  ('Bedroom', 'bedroom', 'Beds and bedroom essentials for a more restful space.', 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=85', true),
  ('Sofas & Seating', 'sofas-seating', 'Comfortable seating and statement pieces for living spaces.', 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=900&q=85', true),
  ('Ceiling Fans', 'ceiling-fans', 'Decorative ceiling fans with practical, everyday comfort.', 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=900&q=85', true),
  ('Dining', 'dining', 'Dining tables, chairs, and useful pieces for gathering.', 'https://images.unsplash.com/photo-1617806118233-18e1de247200?auto=format&fit=crop&w=900&q=85', true),
  ('Storage', 'storage', 'Shelving and storage to keep home essentials organized.', 'https://images.unsplash.com/photo-1593085260707-5377ba37f868?auto=format&fit=crop&w=900&q=85', true),
  ('Window Treatments', 'window-treatments', 'Curtains and soft layers for privacy and filtered light.', 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=900&q=85', true)
ON CONFLICT (slug) DO UPDATE
SET name = EXCLUDED.name,
    description = concat_ws(
      E'\n\n',
      EXCLUDED.description,
      'Catalog visual attributes: ' || (
        SELECT string_agg(
          initcap(replace(attribute.key, '_', ' ')) || ': ' || attribute.value,
          '; ' ORDER BY attribute.key
        )
        FROM jsonb_each_text(EXCLUDED.specifications) AS attribute(key, value)
      )
    ),
    image_url = EXCLUDED.image_url,
    is_active = EXCLUDED.is_active,
    updated_at = now();

WITH catalog (
  name, slug, description, short_description, category_slug, price,
  compare_at_price, sku, stock_quantity, is_featured, image_url, specifications
) AS (
  VALUES
    ('Marlow Upholstered Queen Bed', 'marlow-upholstered-queen-bed', 'A softly upholstered queen bed with a tailored headboard and a supportive solid frame for a calm, comfortable bedroom.', 'A cushioned queen bed with a clean-lined headboard.', 'bedroom', 32999.00, 38999.00, 'DN-BED-001', 5, true, 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1000&q=85', '{"material":"Upholstered fabric and engineered wood","color":"Warm beige","size":"Queen"}'::jsonb),
    ('Alder Solid Wood King Bed', 'alder-solid-wood-king-bed', 'A sturdy king bed in a warm wood finish with simple proportions that work well in both modern and traditional bedrooms.', 'A timeless king bed in a warm wood finish.', 'bedroom', 42999.00, 49999.00, 'DN-BED-002', 3, false, 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1000&q=85&sat=-20', '{"material":"Solid mango wood","color":"Natural walnut","size":"King"}'::jsonb),
    ('Linen Cloud Duvet Cover Set', 'linen-cloud-duvet-cover-set', 'A breathable cotton-linen duvet cover set with a relaxed texture for an easy, layered bed.', 'A breathable neutral duvet cover set.', 'bedroom', 6999.00, 8499.00, 'DN-BED-003', 16, true, 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=1000&q=85', '{"material":"Cotton linen blend","color":"Ivory","size":"Queen"}'::jsonb),
    ('Solis Quilted Bedspread', 'solis-quilted-bedspread', 'A lightweight quilted bedspread with a subtle stitched pattern, designed to add a soft finishing layer to the bed.', 'A soft quilted layer for a finished bed.', 'bedroom', 5499.00, 6799.00, 'DN-BED-004', 12, false, 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=1000&q=85&sat=-10', '{"material":"Cotton","color":"Sage","size":"Queen"}'::jsonb),
    ('Sienna Three-Seat Sofa', 'sienna-three-seat-sofa', 'A comfortable three-seat sofa with gently rounded arms and durable woven upholstery for everyday living.', 'A family-friendly sofa with an inviting silhouette.', 'sofas-seating', 45999.00, 52999.00, 'DN-SEA-001', 4, true, 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=1000&q=85', '{"material":"Woven upholstery and solid wood frame","color":"Olive","seats":"3"}'::jsonb),
    ('Rowan Compact Two-Seat Sofa', 'rowan-compact-two-seat-sofa', 'A compact two-seat sofa for apartments and reading corners, finished in a versatile textured fabric.', 'A compact sofa for smaller living rooms.', 'sofas-seating', 32999.00, 38999.00, 'DN-SEA-002', 6, false, 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=1000&q=85&sat=-20', '{"material":"Textured upholstery","color":"Stone","seats":"2"}'::jsonb),
    ('Mira Boucle Accent Chair', 'mira-boucle-accent-chair', 'A sculptural accent chair with a softly curved back and tactile boucle upholstery for a living room or bedroom corner.', 'A cozy chair with a modern curved profile.', 'sofas-seating', 18999.00, 22999.00, 'DN-SEA-003', 8, true, 'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?auto=format&fit=crop&w=1000&q=85', '{"material":"Boucle fabric and wood","color":"Cream","style":"Contemporary"}'::jsonb),
    ('Cove Upholstered Ottoman', 'cove-upholstered-ottoman', 'A versatile upholstered ottoman that works as a footrest, occasional seat, or soft landing beside a sofa.', 'A flexible footrest and extra seat.', 'sofas-seating', 8999.00, 10999.00, 'DN-SEA-004', 10, false, 'https://images.unsplash.com/photo-1593193341197-3b1e2d0b1c99?auto=format&fit=crop&w=1000&q=85', '{"material":"Woven upholstery","color":"Sand","style":"Modern"}'::jsonb),
    ('Aero Three-Blade Ceiling Fan', 'aero-three-blade-ceiling-fan', 'A quiet, energy-conscious ceiling fan with a clean three-blade profile for bedrooms and living spaces.', 'A quiet modern ceiling fan for everyday comfort.', 'ceiling-fans', 9999.00, 11999.00, 'DN-FAN-001', 12, true, 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1000&q=85&sat=-15', '{"material":"Metal and engineered wood","color":"Matte white","blade_count":"3","remote":"Included"}'::jsonb),
    ('Caspian Brass Decorative Ceiling Fan', 'caspian-brass-decorative-ceiling-fan', 'A decorative ceiling fan with warm brass details and a low-profile light for a polished living or dining room.', 'A decorative fan with warm brass details and light.', 'ceiling-fans', 16999.00, 19999.00, 'DN-FAN-002', 7, false, 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1000&q=85&sat=10', '{"material":"Metal and wood","color":"Brushed brass and walnut","blade_count":"4","light":"Integrated LED"}'::jsonb),
    ('Breeze Rattan-Detail Ceiling Fan', 'breeze-rattan-detail-ceiling-fan', 'A statement ceiling fan with natural rattan-look blade accents that pair well with relaxed and coastal interiors.', 'Natural texture for relaxed rooms.', 'ceiling-fans', 13999.00, 16999.00, 'DN-FAN-003', 8, false, 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1000&q=85&sat=20', '{"material":"Metal and rattan-look finish","color":"Natural","blade_count":"3","style":"Coastal"}'::jsonb),
    ('Morrow Extendable Dining Table', 'morrow-extendable-dining-table', 'A solid-wood dining table with an extendable top for everyday meals and extra guests.', 'An extendable table for everyday gathering.', 'dining', 27999.00, 32999.00, 'DN-DIN-001', 5, true, 'https://images.unsplash.com/photo-1617806118233-18e1de247200?auto=format&fit=crop&w=1000&q=85', '{"material":"Solid mango wood","color":"Natural oak","seats":"6 to 8"}'::jsonb),
    ('Tala Dining Chair Set of Two', 'tala-dining-chair-set-of-two', 'A pair of comfortable dining chairs with softly curved backs and easy-care upholstery.', 'Two upholstered chairs with a refined profile.', 'dining', 11999.00, 14999.00, 'DN-DIN-002', 10, false, 'https://images.unsplash.com/photo-1503602642458-232111445657?auto=format&fit=crop&w=1000&q=85', '{"material":"Wood and upholstery","color":"Natural and cream","quantity":"Set of 2"}'::jsonb),
    ('Elm Sideboard Cabinet', 'elm-sideboard-cabinet', 'A generous sideboard with closed storage and a warm wood finish for dining rooms and open-plan living spaces.', 'Practical closed storage with a warm finish.', 'dining', 23999.00, 28999.00, 'DN-DIN-003', 4, false, 'https://images.unsplash.com/photo-1595428774223-ef52624120d2?auto=format&fit=crop&w=1000&q=85', '{"material":"Engineered wood with oak veneer","color":"Natural oak","doors":"3"}'::jsonb),
    ('Kite Modular Bookshelf', 'kite-modular-bookshelf', 'An open modular bookshelf for books, framed pieces, and plants in a living room or home office.', 'Open shelving for books and collected objects.', 'storage', 14999.00, 17999.00, 'DN-STO-001', 9, true, 'https://images.unsplash.com/photo-1593085260707-5377ba37f868?auto=format&fit=crop&w=1000&q=85', '{"material":"Engineered wood","color":"Walnut","shelves":"5"}'::jsonb),
    ('Linden Entryway Storage Bench', 'linden-entryway-storage-bench', 'A useful entryway bench with a lift-up seat for shoes and daily essentials.', 'A bench with hidden entryway storage.', 'storage', 10999.00, 12999.00, 'DN-STO-002', 7, false, 'https://images.unsplash.com/photo-1595428774223-ef52624120d2?auto=format&fit=crop&w=1000&q=85&sat=-10', '{"material":"Solid wood and woven panel","color":"Natural","storage":"Lift-up seat"}'::jsonb),
    ('Arden Two-Door Wardrobe', 'arden-two-door-wardrobe', 'A compact two-door wardrobe with a hanging rail and adjustable shelf for bedroom storage.', 'Compact wardrobe storage for bedrooms.', 'storage', 29999.00, 34999.00, 'DN-STO-003', 3, false, 'https://images.unsplash.com/photo-1595428774223-ef52624120d2?auto=format&fit=crop&w=1000&q=85&sat=15', '{"material":"Engineered wood","color":"Warm white","doors":"2"}'::jsonb),
    ('Solstice Linen Curtain Pair', 'solstice-linen-curtain-pair', 'A pair of softly textured linen-blend curtains that filter daylight while adding a calm, natural layer.', 'Light-filtering curtains in a relaxed linen blend.', 'window-treatments', 3999.00, 4999.00, 'DN-WIN-001', 20, true, 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=1000&q=85', '{"material":"Linen blend","color":"Natural","quantity":"Pair"}'::jsonb),
    ('Moss Velvet Blackout Curtains', 'moss-velvet-blackout-curtains', 'Soft velvet blackout curtains in a deep green shade for restful bedrooms and cozy media spaces.', 'Blackout curtains with a rich velvet finish.', 'window-treatments', 5999.00, 7299.00, 'DN-WIN-002', 13, false, 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=1000&q=85&sat=-15', '{"material":"Polyester velvet","color":"Moss green","quantity":"Pair","lining":"Blackout"}'::jsonb),
    ('Loom Natural Woven Window Shade', 'loom-natural-woven-window-shade', 'A textured woven shade that softens incoming light and brings natural materials into a room.', 'A light-filtering woven window shade.', 'window-treatments', 4499.00, 5499.00, 'DN-WIN-003', 11, false, 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=1000&q=85&sat=10', '{"material":"Woven natural fiber","color":"Natural","style":"Organic"}'::jsonb),
    ('Aster Tripod Floor Lamp', 'aster-tripod-floor-lamp', 'A tripod floor lamp with a fabric shade that creates a warm pool of light beside a sofa or reading chair.', 'A warm accent lamp for seating corners.', 'lighting', 6299.00, 7499.00, 'DN-LGT-005', 14, false, 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=1000&q=85&sat=10', '{"material":"Wood and fabric","color":"Natural and ivory","style":"Scandinavian"}'::jsonb),
    ('Cove Round Coffee Table', 'cove-round-coffee-table', 'A round coffee table with a softly curved wood base that makes a welcoming center for the living room.', 'A warm wood coffee table with a rounded profile.', 'furniture-accents', 11999.00, 14499.00, 'DN-FUR-005', 8, true, 'https://images.unsplash.com/photo-1499933374294-4584851497cc?auto=format&fit=crop&w=1000&q=85', '{"material":"Solid mango wood","color":"Honey oak","shape":"Round"}'::jsonb),
    ('Olive Branch Decorative Wall Clock', 'olive-branch-decorative-wall-clock', 'A quiet wall clock with a clean face and subtle wood detailing for a kitchen, study, or living room.', 'A simple wall accent that keeps time.', 'wall-decor', 2499.00, 2999.00, 'DN-WAL-004', 18, false, 'https://images.unsplash.com/photo-1563861826100-9cb868fdbe1c?auto=format&fit=crop&w=1000&q=85', '{"material":"Wood and metal","color":"Natural and black","diameter":"40 cm"}'::jsonb),
    ('Sora Ceramic Tabletop Fountain', 'sora-ceramic-tabletop-fountain', 'A small recirculating tabletop fountain with a soft water sound for a calm shelf or meditation corner.', 'A compact accent for calm corners.', 'furniture-accents', 3299.00, 3999.00, 'DN-FUR-006', 9, false, 'https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?auto=format&fit=crop&w=1000&q=85&sat=-15', '{"material":"Ceramic","color":"Sand","use":"Indoor tabletop"}'::jsonb),
    ('Mosaic Glass Candle Holder Set', 'mosaic-glass-candle-holder-set', 'A set of three tinted glass candle holders that add a gentle glow to dining tables and sideboards.', 'Three glass accents for candlelight.', 'wall-decor', 1799.00, 2199.00, 'DN-WAL-005', 24, false, 'https://images.unsplash.com/photo-1602874801007-bd458bb1b8b6?auto=format&fit=crop&w=1000&q=85', '{"material":"Colored glass","color":"Amber and smoke","quantity":"Set of 3"}'::jsonb)
)
INSERT INTO public.products (
  name, slug, description, short_description, category_id, price,
  compare_at_price, sku, stock_quantity, is_active, is_featured, images, specifications
)
SELECT
  catalog.name,
  catalog.slug,
  catalog.description,
  catalog.short_description,
  category.id,
  catalog.price,
  catalog.compare_at_price,
  catalog.sku,
  catalog.stock_quantity,
  true,
  catalog.is_featured,
  ARRAY[catalog.image_url],
  catalog.specifications
FROM catalog
JOIN public.categories AS category ON category.slug = catalog.category_slug
ON CONFLICT (slug) DO UPDATE
SET name = EXCLUDED.name,
    description = EXCLUDED.description,
    short_description = EXCLUDED.short_description,
    category_id = EXCLUDED.category_id,
    price = EXCLUDED.price,
    compare_at_price = EXCLUDED.compare_at_price,
    is_active = EXCLUDED.is_active,
    is_featured = EXCLUDED.is_featured,
    images = EXCLUDED.images,
    specifications = EXCLUDED.specifications,
    updated_at = now();
