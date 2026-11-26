INSERT INTO public.categories (name, slug, description, image_url, is_active)
VALUES
  ('Lighting', 'lighting', 'Ambient and accent lighting for every room.', 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=900&q=85', true),
  ('Wall Decor', 'wall-decor', 'Art and decorative accents to make a space your own.', 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?auto=format&fit=crop&w=900&q=85', true),
  ('Textiles', 'textiles', 'Soft furnishings, cushions, and throws for a layered home.', 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=900&q=85', true),
  ('Planters & Vases', 'planters-vases', 'Planters and vases that bring natural texture indoors.', 'https://images.unsplash.com/photo-1485955900006-10f4d324d411?auto=format&fit=crop&w=900&q=85', true),
  ('Furniture & Accents', 'furniture-accents', 'Useful finishing pieces for comfortable, considered rooms.', 'https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?auto=format&fit=crop&w=900&q=85', true)
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
    ('Arc Ceramic Table Lamp', 'arc-ceramic-table-lamp', 'A sculptural ceramic base and softly tapered linen shade bring a warm, calm glow to bedside tables and reading corners.', 'A sculptural lamp with a warm linen shade.', 'lighting', 3499.00, 4299.00, 'DN-LGT-001', 18, true, 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=1000&q=85', '{"material":"Ceramic and linen","color":"Warm white","style":"Contemporary"}'::jsonb),
    ('Mira Brass Floor Lamp', 'mira-brass-floor-lamp', 'A slim brushed-brass floor lamp with a directional shade, made for a quiet reading nook or a softly lit living room.', 'A refined floor lamp for reading corners.', 'lighting', 7299.00, 8999.00, 'DN-LGT-002', 9, true, 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=1000&q=85&sat=-15', '{"material":"Metal","color":"Brushed brass","style":"Modern"}'::jsonb),
    ('Luna Woven Pendant Light', 'luna-woven-pendant-light', 'A handwoven natural-fiber pendant that casts a gentle patterned light over dining tables and relaxed living spaces.', 'A natural woven pendant with soft ambient light.', 'lighting', 5899.00, 6999.00, 'DN-LGT-003', 12, false, 'https://images.unsplash.com/photo-1524484485831-a92ffc0de03f?auto=format&fit=crop&w=1000&q=85', '{"material":"Woven natural fiber","color":"Natural","style":"Bohemian"}'::jsonb),
    ('Still Life Botanical Print', 'still-life-botanical-print', 'A botanical art print with a muted palette, designed to bring a subtle touch of nature to gallery walls and small spaces.', 'A muted botanical print for an easy gallery wall.', 'wall-decor', 1899.00, 2499.00, 'DN-WAL-001', 32, true, 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?auto=format&fit=crop&w=1000&q=85', '{"material":"Archival paper","color":"Olive and cream","style":"Botanical"}'::jsonb),
    ('Sculpted Arch Wall Mirror', 'sculpted-arch-wall-mirror', 'An arched mirror with a softly rounded silhouette that reflects light and adds a sense of space to an entryway or bedroom.', 'A light-enhancing arched accent mirror.', 'wall-decor', 6499.00, 7999.00, 'DN-WAL-002', 11, true, 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1000&q=85', '{"material":"Glass and wood","color":"Natural oak","style":"Minimalist"}'::jsonb),
    ('Coastal Lines Canvas', 'coastal-lines-canvas', 'A contemporary canvas with soft coastal tones and organic forms, sized to sit above a sofa, console, or bed.', 'Soft coastal tones for a relaxed room.', 'wall-decor', 4299.00, 5499.00, 'DN-WAL-003', 14, false, 'https://images.unsplash.com/photo-1577083552431-6e5fd01aa342?auto=format&fit=crop&w=1000&q=85', '{"material":"Canvas","color":"Sand and blue","style":"Coastal"}'::jsonb),
    ('Kora Textured Cushion Cover', 'kora-textured-cushion-cover', 'A tactile cotton cushion cover in a versatile neutral shade, easy to mix with patterned pillows and natural materials.', 'A soft neutral layer for sofas and beds.', 'textiles', 899.00, 1199.00, 'DN-TEX-001', 50, true, 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?auto=format&fit=crop&w=1000&q=85', '{"material":"Cotton","color":"Oatmeal","size":"45 x 45 cm"}'::jsonb),
    ('Meadow Block-Print Cushion', 'meadow-block-print-cushion', 'A cotton cushion cover with an understated block-print motif that adds pattern without overwhelming a room.', 'A handcrafted-looking print in earthy colors.', 'textiles', 1299.00, 1599.00, 'DN-TEX-002', 36, false, 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?auto=format&fit=crop&w=1000&q=85&sat=-25', '{"material":"Cotton","color":"Terracotta and cream","size":"45 x 45 cm"}'::jsonb),
    ('Cloud Knit Throw', 'cloud-knit-throw', 'A soft, medium-weight knit throw for layering over a sofa or the end of a bed through every season.', 'A cozy knit throw in a soft neutral.', 'textiles', 2499.00, 3199.00, 'DN-TEX-003', 24, true, 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1000&q=85', '{"material":"Cotton blend","color":"Ivory","size":"130 x 170 cm"}'::jsonb),
    ('Terra Ribbed Stoneware Vase', 'terra-ribbed-stoneware-vase', 'A ribbed stoneware vase with a matte finish, beautiful with a few stems or displayed as a sculptural accent.', 'A matte stoneware vase with tactile detail.', 'planters-vases', 1799.00, 2299.00, 'DN-PLT-001', 28, true, 'https://images.unsplash.com/photo-1578500494198-246f612d3b3d?auto=format&fit=crop&w=1000&q=85', '{"material":"Stoneware","color":"Sand","style":"Organic"}'::jsonb),
    ('Sage Tabletop Planter', 'sage-tabletop-planter', 'A compact ceramic planter in a muted sage glaze, sized for a windowsill, shelf, or desk. Plant not included.', 'A small pop of green for shelves and desks.', 'planters-vases', 1199.00, 1499.00, 'DN-PLT-002', 40, false, 'https://images.unsplash.com/photo-1485955900006-10f4d324d411?auto=format&fit=crop&w=1000&q=85', '{"material":"Ceramic","color":"Sage green","size":"12 cm"}'::jsonb),
    ('Dune Handled Ceramic Vase', 'dune-handled-ceramic-vase', 'A generously proportioned ceramic vase with sculptural handles and a softly textured glaze for console tables and dining rooms.', 'A sculptural statement vase in a warm neutral.', 'planters-vases', 2899.00, 3599.00, 'DN-PLT-003', 15, false, 'https://images.unsplash.com/photo-1578500494198-246f612d3b3d?auto=format&fit=crop&w=1000&q=85&sat=-20', '{"material":"Ceramic","color":"Warm white","style":"Contemporary"}'::jsonb),
    ('Nook Solid Wood Side Table', 'nook-solid-wood-side-table', 'A compact solid-wood side table with a clean profile for a favorite book, a lamp, and everyday essentials.', 'A versatile bedside or sofa-side table.', 'furniture-accents', 8499.00, 9999.00, 'DN-FUR-001', 7, true, 'https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?auto=format&fit=crop&w=1000&q=85', '{"material":"Solid mango wood","color":"Natural wood","style":"Scandinavian"}'::jsonb),
    ('Forma Oak Display Shelf', 'forma-oak-display-shelf', 'A wall-mounted oak display shelf for books, framed art, and a few small decorative objects.', 'A clean-lined shelf for curated displays.', 'furniture-accents', 5299.00, 6499.00, 'DN-FUR-002', 10, false, 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1000&q=85&sat=-10', '{"material":"Engineered wood with oak veneer","color":"Natural oak","style":"Modern"}'::jsonb),
    ('Pebble Round Pouf', 'pebble-round-pouf', 'A versatile woven pouf that works as a footrest, occasional seat, or soft accent in a relaxed living room.', 'Flexible extra seating with a woven texture.', 'furniture-accents', 3999.00, 4999.00, 'DN-FUR-003', 13, true, 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1000&q=85&sat=-10', '{"material":"Cotton and jute blend","color":"Natural","style":"Bohemian"}'::jsonb),
    ('Haven Accent Tray', 'haven-accent-tray', 'A low-profile decorative tray for gathering candles, coasters, and small objects on a coffee table or dresser.', 'An easy way to style everyday essentials.', 'furniture-accents', 1499.00, 1899.00, 'DN-FUR-004', 26, false, 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1000&q=85&sat=10', '{"material":"Acacia wood","color":"Walnut","style":"Contemporary"}'::jsonb),
    ('Bela Cotton Floor Cushion', 'bela-cotton-floor-cushion', 'A generously filled floor cushion that creates a comfortable, informal seat for reading corners and low-slung spaces.', 'A relaxed floor seat for extra comfort.', 'textiles', 2199.00, 2799.00, 'DN-TEX-004', 18, false, 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?auto=format&fit=crop&w=1000&q=85&sat=10', '{"material":"Cotton","color":"Rust","size":"60 x 60 cm"}'::jsonb),
    ('Riva Jute Area Rug', 'riva-jute-area-rug', 'A hand-finished jute-blend rug that adds natural texture and helps anchor a seating area. Available in a versatile medium size.', 'Natural texture to ground a room.', 'textiles', 6999.00, 8499.00, 'DN-TEX-005', 8, true, 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1000&q=85&sat=5', '{"material":"Jute blend","color":"Natural","size":"150 x 210 cm"}'::jsonb),
    ('Aster Glass Bud Vase Set', 'aster-glass-bud-vase-set', 'A set of three petite glass bud vases in complementary shapes for styling a shelf, dining table, or bedside.', 'Three small vases for simple floral moments.', 'planters-vases', 1599.00, 1999.00, 'DN-PLT-004', 22, false, 'https://images.unsplash.com/photo-1578500494198-246f612d3b3d?auto=format&fit=crop&w=1000&q=85&sat=15', '{"material":"Glass","color":"Clear","quantity":"Set of 3"}'::jsonb),
    ('Sora Pleated Pendant Shade', 'sora-pleated-pendant-shade', 'A softly pleated fabric shade that adds a gentle, diffused glow above a dining table or in a bedroom.', 'Soft, diffused light with a pleated silhouette.', 'lighting', 4699.00, 5799.00, 'DN-LGT-004', 10, false, 'https://images.unsplash.com/photo-1524484485831-a92ffc0de03f?auto=format&fit=crop&w=1000&q=85&sat=10', '{"material":"Fabric and metal","color":"Cream","style":"Contemporary"}'::jsonb)
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
