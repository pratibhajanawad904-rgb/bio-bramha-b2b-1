export type Role = 'super_admin' | 'admin' | 'warehouse' | 'buyer'
export type IndianState = 'AP' | 'TS' | 'KA' | 'MH'

export type CartItem = {
  productId: string
  quantity: number
}

export type ProductDetail = {
  description: string
  howToUse: string[]
  dosage: string
  targetCrops: string[]
  shelfLife: string
  certification: string[]
  composition: string
}

export type MainCategory = 'bulk' | 'non_bulk'

export type SecondaryCategory = {
  id: string
  name: string
  createdAt: string
}

export type Product = {
  id: string
  name: string
  strain: string
  category: 'Bio-Fertilizer' | 'Biopesticide' | 'Growth Promoter'
  main_category: MainCategory
  /** A product can carry multiple secondary-category tags (e.g. both "Bio-Fertilizer" and "Organic"). */
  secondary_category_ids: string[]
  moq?: number
  crops: string[]
  benefit: string
  price: number
  packSize: string
  image: string
  images: string[]
  stock: number
  badge?: string
  details: ProductDetail
}

export type DeliveryStage = 'placed' | 'accepted' | 'dispatched' | 'delivered' | 'cancelled'

export type OrderTimelineEvent = {
  stage: DeliveryStage
  label: string
  timestamp: string
  note?: string
}

export type Order = {
  id: string
  date: string
  items: { productId: string; name: string; qty: number; price: number; image?: string }[]
  subtotal: number
  total: number
  paymentMethod: string
  paymentTerms?: string
  logisticsCostNote?: string
  status: DeliveryStage
  address: string
  city: string
  pincode: string
  phone: string
  state: IndianState
  warehouseId: string
  warehouseName: string
  buyerId: string
  buyerName: string
  buyerEmail?: string
  timeline: OrderTimelineEvent[]
}

export type ComplaintIssueType =
  | 'Damaged Product'
  | 'Wrong Product Delivered'
  | 'Delay in Delivery'
  | 'Payment / Billing Issue'
  | 'Other Issue'

export type ComplaintStatus = 'open' | 'under_review' | 'resolved' | 'closed'

export type ChatMessage = {
  id: string
  senderRole: Role
  senderName: string
  message: string
  timestamp: string
}

export type Complaint = {
  id: string
  orderId: string
  warehouseId: string
  warehouseName: string
  buyerId: string
  buyerName: string
  buyerEmail?: string
  buyerPhone: string
  issueType: ComplaintIssueType
  subject: string
  description: string
  createdAt: string
  status: ComplaintStatus
  warehouseResponse?: string
  adminResponse?: string
  resolvedAt?: string
  messages?: ChatMessage[]
}

export type Warehouse = {
  id: string
  name: string
  code: string
  state: IndianState
  city: string
  managerName: string
  currentStockUnits: number
  activeOrdersCount: number
  address: string
}

export type UserAccount = {
  id: string
  name: string
  email?: string
  role: Role
  assignedWarehouseId?: string
  joinedDate: string
  state: IndianState
  phone: string
}

export type Offer = {
  id: string
  title: string
  discountPercentage: number
  active: boolean
  productIds: string[]
}

// No fabricated support number: the helpline is configured by an admin (app_settings).
// The legacy seed placeholder is treated as "not configured".
export const DEFAULT_HELPLINE_NUMBER = ''
export const DEFAULT_HELPLINE_EMAIL = 'support@biobramha.com'
const PLACEHOLDER_HELPLINES = ['1800-425-9999 / +91 94400 12345', '1800-425-9999', '+91 94400 12345']

/** Returns a configured, non-placeholder support number or null. */
export function getSupportPhone(helplineNumber: string | undefined | null): string | null {
  const raw = String(helplineNumber || '').trim()
  if (!raw || PLACEHOLDER_HELPLINES.includes(raw)) return null
  const first = raw.split('/')[0].trim()
  return first.replace(/\D/g, '').length >= 6 ? first : null
}

/** tel: href for a display number (digits and leading + only). */
export function telHref(displayNumber: string): string {
  const cleaned = displayNumber.trim().replace(/[^\d+]/g, '')
  return `tel:${cleaned.startsWith('+') ? '+' + cleaned.slice(1).replace(/\+/g, '') : cleaned}`
}

// MVP V1: single default warehouse — Taloja, Mumbai, Maharashtra.
export const DEFAULT_WAREHOUSE_NAME = 'Bio-Bramha Taloja Warehouse Hub'
export const DEFAULT_WAREHOUSE_LOCATION = 'Taloja, Mumbai, Maharashtra'

export const WAREHOUSES: Warehouse[] = [
  {
    id: 'wh-taloja',
    name: DEFAULT_WAREHOUSE_NAME,
    code: 'WH-BB-TALOJA',
    state: 'MH',
    city: 'Taloja, Mumbai',
    managerName: 'Warehouse Manager',
    currentStockUnits: 17400,
    activeOrdersCount: 52,
    address: 'Taloja Industrial Area, Navi Mumbai, Maharashtra'
  }
]

export const USERS: UserAccount[] = [
  {
    id: 'user-super-admin-main',
    name: 'Super Admin',
    phone: '8050946969',
    role: 'super_admin',
    joinedDate: 'Aug 2026',
    state: 'AP'
  },
  {
    id: 'user-wh-main',
    name: 'Warehouse Manager',
    phone: '7975158924',
    role: 'warehouse',
    assignedWarehouseId: 'wh-taloja',
    joinedDate: 'Aug 2026',
    state: 'AP'
  }
]

export const INITIAL_OFFERS: Offer[] = []
export const INITIAL_ORDERS: Order[] = []
export const INITIAL_COMPLAINTS: Complaint[] = []

export const PRODUCTS: Product[] = [
  {
    id: 'prod-azospirillum',
    name: 'Azospirillum Bio-Fertilizer',
    strain: 'Azospirillum brasilense (1x10^8 CFU/ml)',
    category: 'Bio-Fertilizer',
    main_category: 'bulk',
    secondary_category_ids: [],
    moq: 1,
    crops: ['Paddy', 'Sugarcane', 'Cotton', 'Maize', 'Millets'],
    benefit: 'Fixes atmospheric nitrogen up to 25-30 kg/ha and enhances root development.',
    price: 450,
    packSize: '1 Litre Bottle',
    image: '/products/azospirillum.png',
    images: [
      '/products/azospirillum.png',
      '/products/azospirillum-field.png'
    ],
    stock: 150,
    badge: 'Best Seller',
    details: {
      description: 'High-potency liquid bio-fertilizer containing nitrogen-fixing bacteria Azospirillum brasilense. Secretes natural phytohormones (IAA, Gibberellins) that accelerate seed germination and root proliferation in non-legume crops.',
      howToUse: [
        'Seed Treatment: Mix 10ml per kg of seed with suitable starch paste, shade dry for 30 minutes before sowing.',
        'Soil Application: Mix 1 Litre with 100 kg vermicompost or FYM per acre and apply near root zone.',
        'Drip Fertigation: Inject 1 Litre per acre through irrigation line.'
      ],
      dosage: '1 Litre / Acre',
      targetCrops: ['Paddy', 'Sugarcane', 'Cotton', 'Maize', 'Sorghum', 'Banana'],
      shelfLife: '12 Months from MFD',
      certification: ['NPOP Certified Organic Input', 'FCO 1985 Compliant'],
      composition: 'Azospirillum brasilense liquid carrier broth with 1x10^8 CFU/ml minimum load'
    }
  },
  {
    id: 'prod-neem',
    name: 'Neem-Care Pure Biopesticide',
    strain: 'Cold-pressed Azadirachtin (10000 PPM)',
    category: 'Biopesticide',
    main_category: 'non_bulk',
    secondary_category_ids: [],
    crops: ['Chilli', 'Cotton', 'Tomatoes', 'Pulses', 'Horticulture'],
    benefit: 'Effective against sucking pests (thrips, whiteflies, aphids) & caterpillars.',
    price: 620,
    packSize: '1 Litre Bottle',
    image: '/products/neem.png',
    images: [
      '/products/neem.png',
      '/products/neem-field.png'
    ],
    stock: 200,
    badge: '100% Organic',
    details: {
      description: 'Pure cold-pressed neem kernel oil formulation emulsified with organic surfactants. Azadirachtin acts as antifeedant, repellent, oviposition deterrent, and insect growth regulator.',
      howToUse: [
        'Foliar Spray: Mix 3-5ml per Litre of water. Spray thoroughly on both leaf surfaces during evening hours.',
        'Preventive Schedule: Repeat every 10-15 days for continuous pest protection.'
      ],
      dosage: '1.5 Litres / Acre',
      targetCrops: ['Chilli', 'Cotton', 'Bhendi', 'Brinjal', 'Tomato', 'Citrus'],
      shelfLife: '18 Months',
      certification: ['CIB&RC Registered Bio-Insecticide', 'USDA Organic Compliant'],
      composition: 'Azadirachtin EC 1% (10000 PPM) with natural emulsifiers'
    }
  },
  {
    id: 'prod-psb',
    name: 'PSB Phosphate Solubilizer',
    strain: 'Bacillus megaterium var. phosphaticum (1x10^8 CFU/ml)',
    category: 'Bio-Fertilizer',
    main_category: 'bulk',
    secondary_category_ids: [],
    moq: 1,
    crops: ['All Crops', 'Pulses', 'Groundnut', 'Soybean', 'Vegetables'],
    benefit: 'Solubilizes fixed soil phosphorus (up to 40 kg P2O5/ha) making it plant-absorbable.',
    price: 420,
    packSize: '1 Litre Bottle',
    image: '/products/psb.png',
    images: [
      '/products/psb.png',
      '/products/psb-field.png'
    ],
    stock: 180,
    badge: 'Eco-Friendly',
    details: {
      description: 'Phosphate Solubilizing Bacteria (PSB) secretes organic acids (citric, succinic, lactic) that solubilize insoluble rock phosphate and soil-bound tricalcium phosphate into bio-available orthophosphate.',
      howToUse: [
        'Seedling Dip: Mix 250ml in 10 Litres water and dip roots for 15-20 mins before transplanting.',
        'Drip/Drenching: 1 Litre per acre via fertigation system.'
      ],
      dosage: '1 Litre / Acre',
      targetCrops: ['Groundnut', 'Soybean', 'Bengal Gram', 'Pulses', 'Paddy', 'Vegetables'],
      shelfLife: '12 Months',
      certification: ['FCO Compliant Bio-Fertilizer'],
      composition: 'Bacillus megaterium liquid culture broth'
    }
  },
  {
    id: 'prod-seaweed',
    name: 'Seaweed Bio-Extract Growth Booster',
    strain: 'Ascophyllum nodosum marine extract (20% Solids)',
    category: 'Growth Promoter',
    main_category: 'non_bulk',
    secondary_category_ids: [],
    crops: ['Paddy', 'Chilli', 'Cotton', 'Grapes', 'Pomegranate', 'Flowers'],
    benefit: 'Boosts chlorophyll, root branching, flower retention & abiotic stress resistance.',
    price: 580,
    packSize: '500 ml Bottle',
    image: '/products/seaweed.png',
    images: [
      '/products/seaweed.png',
      '/products/seaweed-field.png'
    ],
    stock: 90,
    badge: 'Premium Grade',
    details: {
      description: 'Cold-extracted marine algae concentrate packed with over 60 natural trace elements, amino acids, and plant growth regulators. Protects against drought and thermal stress.',
      howToUse: [
        'Foliar Spray: 2ml per Litre of water at flowering & fruit setting stage.',
        'Drip Fertigation: 500ml per acre every 20 days.'
      ],
      dosage: '500 ml / Acre',
      targetCrops: ['Horticultural crops, Commercial Cash crops, Floriculture'],
      shelfLife: '24 Months',
      certification: ['EcoCert Certified Organic Input'],
      composition: '100% Pure Ascophyllum nodosum marine algae extract'
    }
  },
  {
    id: 'prod-trichoderma',
    name: 'Trichoderma Bio-Fungicide Protection',
    strain: 'Trichoderma viride (2x10^8 CFU/g)',
    category: 'Biopesticide',
    main_category: 'bulk',
    secondary_category_ids: [],
    moq: 1,
    crops: ['Chilli', 'Cotton', 'Ginger', 'Turmeric', 'Banana'],
    benefit: 'Prevents soil-borne fungal wilt, root rot, damping-off & collar rot.',
    price: 390,
    packSize: '1 kg Powder Pack',
    image: '/products/trichoderma.png',
    images: [
      '/products/trichoderma.png',
      '/products/trichoderma-field.png'
    ],
    stock: 110,
    badge: 'Soil Health',
    details: {
      description: 'Antagonistic bio-control fungus that parasitizes pathogenic fungi in soil (Fusarium, Rhizoctonia, Pythium). Re-establishes beneficial micro-ecology around roots.',
      howToUse: [
        'Soil Enrichment: Mix 2 kg with 100 kg farmyard manure, keep moist for 7 days, then apply to soil.',
        'Seed Treatment: 10g per kg of seed.'
      ],
      dosage: '2 kg / Acre',
      targetCrops: ['Chilli', 'Spices', 'Banana', 'Sugarcane', 'Cotton'],
      shelfLife: '12 Months',
      certification: ['CIB&RC Registered Bio-Fungicide'],
      composition: 'Trichoderma viride 2x10^8 CFU/g talc formulation'
    }
  },
  {
    id: 'prod-rhizobium',
    name: 'Rhizobium Bio-Inoculant',
    strain: 'Rhizobium leguminosarum (1x10^9 CFU/ml)',
    category: 'Bio-Fertilizer',
    main_category: 'bulk',
    secondary_category_ids: [],
    moq: 1,
    crops: ['Soybean', 'Groundnut', 'Bengal Gram', 'Red Gram', 'Black Gram'],
    benefit: 'Fixes atmospheric nitrogen 50-100 kg/ha specifically for leguminous crops via root nodulation.',
    price: 380,
    packSize: '5 Litre Jerrycan',
    image: '/products/azospirillum.png',
    images: ['/products/azospirillum.png'],
    stock: 220,
    badge: 'Bulk Pack',
    details: {
      description: 'Highly concentrated liquid bio-inoculant for legume crops. Rhizobium forms symbiotic root nodules that fix atmospheric nitrogen directly into plant-available ammonium.',
      howToUse: [
        'Seed Treatment: 10ml/kg of seed, coat uniformly and shade dry before sowing.',
        'Soil Drenching: 5 Litres per acre mixed with irrigation water.'
      ],
      dosage: '5 Litres / Acre',
      targetCrops: ['Soybean', 'Groundnut', 'All Pulses', 'Lucerne'],
      shelfLife: '12 Months',
      certification: ['FCO 1985 Compliant Bio-Fertilizer'],
      composition: 'Rhizobium leguminosarum 1x10^9 CFU/ml liquid formulation'
    }
  },
  {
    id: 'prod-potash',
    name: 'Potash Mobilizing Bio-Fertilizer',
    strain: 'Frateuria aurantia (1x10^8 CFU/ml)',
    category: 'Bio-Fertilizer',
    main_category: 'bulk',
    secondary_category_ids: [],
    moq: 1,
    crops: ['Banana', 'Sugarcane', 'Potato', 'Turmeric', 'All Crops'],
    benefit: 'Mobilizes bound potassium from soil minerals, reducing chemical KCl usage by 25-30%.',
    price: 440,
    packSize: '5 Litre Jerrycan',
    image: '/products/psb.png',
    images: ['/products/psb.png'],
    stock: 160,
    badge: 'Bulk Pack',
    details: {
      description: 'Potassium Mobilizing Bacteria (KMB) secretes organic acids that release fixed potassium from feldspar and mica minerals in soil, making it available for plant uptake.',
      howToUse: [
        'Soil Application: 5 Litres per acre with FYM or vermicompost.',
        'Drip Fertigation: 2.5 Litres per acre through irrigation.'
      ],
      dosage: '5 Litres / Acre',
      targetCrops: ['Banana', 'Sugarcane', 'Potato', 'Turmeric', 'Vegetables'],
      shelfLife: '12 Months',
      certification: ['FCO Compliant Bio-Fertilizer'],
      composition: 'Frateuria aurantia 1x10^8 CFU/ml liquid carrier'
    }
  },
  {
    id: 'prod-humic',
    name: 'Humic Acid Soil Conditioner',
    strain: 'Leonardite-derived Humic + Fulvic Acid (12% HA)',
    category: 'Growth Promoter',
    main_category: 'non_bulk',
    secondary_category_ids: [],
    crops: ['All Crops', 'Vegetables', 'Flowers', 'Fruit Trees'],
    benefit: 'Improves soil CEC, nutrient retention, and root nutrient uptake efficiency.',
    price: 520,
    packSize: '1 Litre Bottle',
    image: '/products/seaweed.png',
    images: ['/products/seaweed.png'],
    stock: 130,
    badge: 'Soil Health',
    details: {
      description: 'Premium leonardite-sourced humic acid concentrate that improves soil structure, water holding capacity, and chelates micronutrients for enhanced bioavailability.',
      howToUse: [
        'Soil Drenching: 2ml per Litre of water, apply to root zone.',
        'Foliar Spray: 1ml per Litre at vegetative and flowering stages.'
      ],
      dosage: '1 Litre / Acre',
      targetCrops: ['All Crops', 'Vegetables', 'Orchards', 'Floriculture'],
      shelfLife: '24 Months',
      certification: ['NPOP Certified Organic Input'],
      composition: '12% Humic Acid + 3% Fulvic Acid from natural leonardite'
    }
  },
  {
    id: 'prod-amino',
    name: 'Amino Acid Plant Growth Activator',
    strain: 'L-Amino Acids Complex (40% w/v)',
    category: 'Growth Promoter',
    main_category: 'non_bulk',
    secondary_category_ids: [],
    crops: ['Chilli', 'Cotton', 'Grapes', 'Pomegranate', 'Vegetables'],
    benefit: 'Stimulates protein synthesis, enhances flower/fruit set, and improves stress recovery.',
    price: 650,
    packSize: '500 ml Bottle',
    image: '/products/seaweed.png',
    images: ['/products/seaweed.png'],
    stock: 75,
    badge: 'Premium',
    details: {
      description: 'Hydrolyzed L-amino acid complex derived from plant protein. Rapidly absorbed through leaves to boost chlorophyll production, enzyme activity, and stress tolerance.',
      howToUse: [
        'Foliar Spray: 2-3ml per Litre of water at critical growth stages.',
        'Compatible with most pesticides and fertilizers for tank mix.'
      ],
      dosage: '500 ml / Acre',
      targetCrops: ['Chilli', 'Grapes', 'Pomegranate', 'Cotton', 'Vegetables'],
      shelfLife: '18 Months',
      certification: ['EcoCert Certified Organic Input'],
      composition: '40% L-Amino Acids w/v from hydrolyzed plant protein'
    }
  },
  {
    id: 'prod-verticillium',
    name: 'Verticillium Bio-Insecticide',
    strain: 'Verticillium lecanii (2x10^8 CFU/g)',
    category: 'Biopesticide',
    main_category: 'non_bulk',
    secondary_category_ids: [],
    crops: ['Cotton', 'Chilli', 'Coffee', 'Tea', 'Vegetables'],
    benefit: 'Controls whitefly, aphids, thrips, and mealybugs through entomopathogenic action.',
    price: 480,
    packSize: '1 kg Powder Pack',
    image: '/products/trichoderma.png',
    images: ['/products/trichoderma.png'],
    stock: 95,
    badge: 'IPM Approved',
    details: {
      description: 'Entomopathogenic fungus that infects and kills sucking insect pests. Ideal for IPM programs as it targets pests without harming beneficial insects or pollinators.',
      howToUse: [
        'Foliar Spray: 5g per Litre of water, spray during cooler hours (evening/early morning).',
        'Ensure high humidity (>70% RH) for optimal spore germination on pest cuticle.'
      ],
      dosage: '1 kg / Acre',
      targetCrops: ['Cotton', 'Chilli', 'Coffee', 'Tea', 'Vegetables'],
      shelfLife: '12 Months',
      certification: ['CIB&RC Registered Bio-Insecticide'],
      composition: 'Verticillium lecanii 2x10^8 CFU/g wettable powder'
    }
  }
]
