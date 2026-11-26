UPDATE public.products AS product
SET description = concat_ws(
  E'\n\n',
  nullif(trim(product.description), ''),
  'Catalog visual attributes: ' || (
    SELECT string_agg(
      initcap(replace(attribute.key, '_', ' ')) || ': ' || attribute.value,
      '; ' ORDER BY attribute.key
    )
    FROM jsonb_each_text(product.specifications) AS attribute(key, value)
  )
)
WHERE product.sku LIKE 'DN-%'
  AND jsonb_typeof(product.specifications) = 'object'
  AND product.specifications <> '{}'::jsonb
  AND product.description NOT LIKE '%Catalog visual attributes:%';
