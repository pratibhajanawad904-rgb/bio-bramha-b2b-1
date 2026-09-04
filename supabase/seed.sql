-- =============================================================================
-- LOCAL DEVELOPMENT SEED
-- =============================================================================
-- Applied automatically by `supabase db reset`. Development data only — this file
-- is never run against the hosted project.
--
-- Gives a fresh local stack enough content to exercise the catalog, tag filters,
-- offers, checkout, and the reserved admin/warehouse logins.
-- =============================================================================

-- Secondary category tags. Fixed ids so seeded products can reference them.
insert into public.secondary_categories (id, name) values
  ('cat-bio-fertilizer', 'Bio-Fertilizer'),
  ('cat-biopesticide',   'Biopesticide'),
  ('cat-growth',         'Growth Promoter')
on conflict (id) do nothing;

-- Products: one bulk and one non-bulk per tag, so segment filters have content.
insert into public.products
  (id, name, strain, category, crops, benefit, price, pack_size, image, images, stock, badge,
   details, main_category, secondary_category_ids, moq)
values
  ('prod-azospirillum', 'Azospirillum Bio-Fertilizer',
   'Azospirillum brasilense (1x10^8 CFU/ml)', 'Bio-Fertilizer',
   array['Paddy','Sugarcane','Cotton','Maize'],
   'Fixes atmospheric nitrogen up to 25-30 kg/ha and enhances root development.',
   450, '1 Litre Bottle', '/products/azospirillum.png',
   array['/products/azospirillum.png','/products/azospirillum-field.png'],
   150, 'Best Seller',
   '{"dosage":"1 Litre / Acre","shelfLife":"12 Months","description":"Nitrogen-fixing liquid bio-fertilizer.","howToUse":["Mix with water and apply to soil."],"targetCrops":["Paddy","Sugarcane"],"certification":["NPOP Certified Organic Input"],"composition":"Azospirillum brasilense broth"}'::jsonb,
   'bulk', array['cat-bio-fertilizer'], 20),

  ('prod-psb', 'PSB Phosphate Solubilizer',
   'Bacillus megaterium var. phosphaticum', 'Bio-Fertilizer',
   array['All Crops','Pulses','Groundnut'],
   'Solubilizes fixed soil phosphorus making it plant-absorbable.',
   420, '1 Litre Bottle', '/products/psb.png',
   array['/products/psb.png','/products/psb-field.png'],
   180, 'Eco-Friendly',
   '{"dosage":"1 Litre / Acre","shelfLife":"12 Months","description":"Phosphate solubilizing bacteria.","howToUse":["Apply via fertigation."],"targetCrops":["Groundnut","Pulses"],"certification":["FCO Compliant"],"composition":"Bacillus megaterium culture"}'::jsonb,
   'bulk', array['cat-bio-fertilizer'], 20),

  ('prod-neem', 'Neem-Care Pure Biopesticide',
   'Cold-pressed Azadirachtin (10000 PPM)', 'Biopesticide',
   array['Chilli','Cotton','Tomatoes'],
   'Effective against sucking pests (thrips, whiteflies, aphids) and caterpillars.',
   620, '1 Litre Bottle', '/products/neem.png',
   array['/products/neem.png','/products/neem-field.png'],
   200, '100% Organic',
   '{"dosage":"1.5 Litres / Acre","shelfLife":"18 Months","description":"Cold-pressed neem kernel oil formulation.","howToUse":["Foliar spray 3-5ml per Litre."],"targetCrops":["Chilli","Cotton"],"certification":["CIB and RC Registered"],"composition":"Azadirachtin EC 1%"}'::jsonb,
   'non_bulk', array['cat-biopesticide'], null),

  ('prod-trichoderma', 'Trichoderma Bio-Fungicide Protection',
   'Trichoderma viride (2x10^8 CFU/g)', 'Biopesticide',
   array['Chilli','Ginger','Turmeric'],
   'Prevents soil-borne fungal wilt, root rot and damping-off.',
   390, '1 kg Powder Pack', '/products/trichoderma.png',
   array['/products/trichoderma.png','/products/trichoderma-field.png'],
   110, 'Soil Health',
   '{"dosage":"2 kg / Acre","shelfLife":"12 Months","description":"Antagonistic bio-control fungus.","howToUse":["Mix with farmyard manure."],"targetCrops":["Chilli","Spices"],"certification":["CIB and RC Registered"],"composition":"Trichoderma viride talc"}'::jsonb,
   'bulk', array['cat-biopesticide'], 20),

  ('prod-seaweed', 'Seaweed Bio-Extract Growth Booster',
   'Ascophyllum nodosum marine extract', 'Growth Promoter',
   array['Chilli','Grapes','Pomegranate'],
   'Boosts chlorophyll, root branching and flower retention.',
   580, '500 ml Bottle', '/products/seaweed.png',
   array['/products/seaweed.png','/products/seaweed-field.png'],
   90, 'Premium Grade',
   '{"dosage":"500 ml / Acre","shelfLife":"24 Months","description":"Cold-extracted marine algae concentrate.","howToUse":["Foliar spray 2ml per Litre."],"targetCrops":["Grapes","Pomegranate"],"certification":["EcoCert Certified"],"composition":"Ascophyllum nodosum extract"}'::jsonb,
   'non_bulk', array['cat-growth'], null),

  ('prod-humic', 'Humic Acid Soil Conditioner',
   'Leonardite-derived Humic + Fulvic Acid', 'Growth Promoter',
   array['All Crops','Vegetables'],
   'Improves soil structure and nutrient uptake efficiency.',
   520, '1 Litre Bottle', '/products/seaweed.png',
   array['/products/seaweed.png'],
   130, 'Soil Health',
   '{"dosage":"1 Litre / Acre","shelfLife":"24 Months","description":"Leonardite humic acid concentrate.","howToUse":["Soil drench 2ml per Litre."],"targetCrops":["All Crops"],"certification":["NPOP Certified"],"composition":"12% Humic Acid"}'::jsonb,
   'non_bulk', array['cat-growth'], null)
on conflict (id) do nothing;

-- Reserved accounts. Roles are also hardcoded in lib/roles.ts, which always wins;
-- these rows make the admin roster render correctly on a fresh database.
insert into public.user_accounts (phone, name, role, assigned_warehouse_id) values
  ('8050946969', 'Super Admin',       'super_admin', null),
  ('7975158924', 'Warehouse Manager', 'warehouse',   'wh-central')
on conflict (phone) do nothing;

-- Support contact and payment instructions shown at checkout.
insert into public.app_settings (id, helpline_number, helpline_email, payment_settings) values
  ('global', '1800-425-9999 / +91 94400 12345', 'support@biobramha.com',
   '{"qrCodeImage":null,"upiId":"biobramha@upi","accountDetails":"Bank: HDFC Bank\nAccount: 12345678901234\nIFSC: HDFC0001234\nName: Bio-Bramha Pvt Ltd"}'::jsonb)
on conflict (id) do nothing;

-- Grievance contact, required alongside the published policies.
insert into public.grievance_contact (id, name, email, phone) values
  ('global', 'Grievance Officer', 'grievance@biobramha.com', '+91 94400 12345')
on conflict (id) do nothing;

-- An active offer so discount rendering and server-side price recalculation can be
-- exercised locally.
insert into public.offers (id, title, discount_percentage, active, product_ids) values
  ('offer-seed-monsoon', 'Monsoon Bio-Fertilizer Deal', 15, true,
   array['prod-azospirillum','prod-psb'])
on conflict (id) do nothing;
