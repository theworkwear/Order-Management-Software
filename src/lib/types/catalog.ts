// ============================================
// Standard Workwear Product Catalog Presets
// ============================================

export interface ProductPreset {
  name: string;
  code: string;
}

export const PRODUCT_PRESETS: ProductPreset[] = [
  { name: 'Padded Gilet', code: 'R230' },
  { name: 'T-Shirt', code: 'UC301' },
  { name: 'Polo T-Shirt', code: 'UC101' },
  { name: 'Hoodie', code: 'UX4' },
  { name: 'Sweatshirt', code: 'UX3' },
  { name: 'Fleece', code: 'UX5' },
  { name: 'Jacket', code: 'TRA628' },
  { name: 'Hi-Vis / Waistcoat', code: 'UC801' },
  { name: 'Cap', code: 'B18' },
  { name: 'Cap', code: 'B640' },
];
