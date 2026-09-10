// ============================================
// Standard Workwear Product Catalog Presets & Intelligence Engine
// ============================================

export interface ProductPreset {
  name: string;
  code: string;
  category: string;
  aliases: string[];
  description?: string;
}

export const PRODUCT_PRESETS: ProductPreset[] = [
  // --------------------------------------------
  // Shirts & Polos
  // --------------------------------------------
  {
    name: 'Ladies Classic Shirt',
    code: 'UC106',
    category: 'Shirts & Polos',
    aliases: [
      'ladies classic shirt',
      'women classic shirt',
      'womens classic shirt',
      'woman classic shirt',
      'ladies shirt',
      'womens shirt',
      'women shirt',
      'woman shirt',
      'ladies classic polo',
      'women classic polo',
      'womens classic polo',
      'ladies polo',
      'women polo',
      'womens polo',
      'ladies classic',
      'women classic',
      'uc106',
      'uc 106',
      'uc-106',
    ],
    description: 'Uneek UC106 Ladies / Women Classic Shirt / Polo',
  },
  {
    name: 'Polo T-Shirt',
    code: 'UC101',
    category: 'Shirts & Polos',
    aliases: [
      'polo',
      'polos',
      'polo shirt',
      'polo t-shirt',
      'polo tee',
      'classic polo',
      'mens polo',
      'unisex polo',
      'uc101',
      'uc 101',
      'uc-101',
    ],
    description: 'Uneek UC101 Classic Polo Shirt',
  },
  {
    name: 'T-Shirt',
    code: 'UC301',
    category: 'Shirts & Polos',
    aliases: [
      't-shirt',
      'tshirt',
      't shirt',
      'tee',
      'tees',
      'classic t-shirt',
      'round neck t-shirt',
      'crew neck t-shirt',
      'uc301',
      'uc 301',
      'uc-301',
    ],
    description: 'Uneek UC301 Classic T-Shirt',
  },

  // --------------------------------------------
  // Sweats & Hoodies
  // --------------------------------------------
  {
    name: 'Hoodie',
    code: 'UX4',
    category: 'Sweats & Hoodies',
    aliases: [
      'hoodie',
      'hoodies',
      'hoody',
      'hooded sweatshirt',
      'pullover hoodie',
      'ux4',
      'ux 4',
      'ux-4',
    ],
    description: 'UX4 Classic Hooded Sweatshirt',
  },
  {
    name: 'Sweatshirt',
    code: 'UX3',
    category: 'Sweats & Hoodies',
    aliases: [
      'sweatshirt',
      'sweatshirts',
      'sweat',
      'sweats',
      'sweater',
      'jumper',
      'crewneck sweatshirt',
      'ux3',
      'ux 3',
      'ux-3',
    ],
    description: 'UX3 Classic Sweatshirt',
  },
  {
    name: 'Fleece',
    code: 'UX5',
    category: 'Sweats & Hoodies',
    aliases: [
      'fleece',
      'fleeces',
      'fleece jacket',
      'microfleece',
      'polar fleece',
      'full zip fleece',
      'ux5',
      'ux 5',
      'ux-5',
    ],
    description: 'UX5 Classic Full Zip Fleece Jacket',
  },

  // --------------------------------------------
  // Outerwear & Safety
  // --------------------------------------------
  {
    name: 'Padded Gilet',
    code: 'R230',
    category: 'Outerwear & Safety',
    aliases: [
      'padded gilet',
      'gilet',
      'gilets',
      'bodywarmer',
      'body warmer',
      'padded bodywarmer',
      'padded vest',
      'winter vest',
      'r230',
      'r 230',
      'r-230',
    ],
    description: 'Result R230 Core Padded Bodywarmer / Gilet',
  },
  {
    name: 'Jacket',
    code: 'TRA628',
    category: 'Outerwear & Safety',
    aliases: [
      'jacket',
      'jackets',
      'regatta jacket',
      'softshell',
      'softshell jacket',
      'waterproof jacket',
      'outer jacket',
      'tra628',
      'tra 628',
      'tra-628',
    ],
    description: 'Regatta TRA628 Waterproof / Softshell Jacket',
  },
  {
    name: 'Hi-Vis / Waistcoat',
    code: 'UC801',
    category: 'Outerwear & Safety',
    aliases: [
      'hi-vis',
      'hivis',
      'hi vis',
      'high vis',
      'waistcoat',
      'safety waistcoat',
      'safety vest',
      'reflective vest',
      'hi-vis vest',
      'uc801',
      'uc 801',
      'uc-801',
    ],
    description: 'Uneek UC801 High Visibility Waistcoat',
  },

  // --------------------------------------------
  // Headwear
  // --------------------------------------------
  {
    name: 'Cap (Cotton)',
    code: 'B18',
    category: 'Headwear',
    aliases: [
      'cap',
      'caps',
      'cotton cap',
      'baseball cap',
      'drill cap',
      'beechfield cap',
      'b18',
      'b 18',
      'b-18',
    ],
    description: 'Beechfield B18 5 Panel Cotton Cap',
  },
  {
    name: 'Cap (Snapback)',
    code: 'B640',
    category: 'Headwear',
    aliases: [
      'snapback',
      'snapback cap',
      'trucker cap',
      'flat peak',
      'flat peak cap',
      'b640',
      'b 640',
      'b-640',
    ],
    description: 'Beechfield B640 Snapback Trucker / Flat Peak Cap',
  },
];

// ============================================
// Intelligent Code Intelligence & Resolvers
// ============================================

export interface IntelligenceResult {
  preset: ProductPreset;
  confidence: 'exact' | 'high' | 'medium';
  matchReason: string;
}

/**
 * Normalizes a product code (e.g. "uc 106" -> "UC106", "tra-628" -> "TRA628").
 * If the normalized string matches a known preset, returns the canonical code.
 */
export function normalizeProductCode(rawCode: string): string {
  if (!rawCode) return '';
  const cleaned = rawCode.trim().replace(/[\s\-_]+/g, '').toUpperCase();

  const found = PRODUCT_PRESETS.find(
    (p) => p.code.replace(/[\s\-_]+/g, '').toUpperCase() === cleaned
  );
  return found ? found.code : cleaned;
}

/**
 * Intelligent resolver: Takes user input from product name or code input,
 * analyzes semantics, codes, gendered context, and aliases to detect the exact matching catalog item.
 */
export function resolveProductIntelligence(input: string): IntelligenceResult | null {
  if (!input || !input.trim()) return null;

  const raw = input.trim();
  const lower = raw.toLowerCase();
  const cleanedCode = raw.replace(/[\s\-_]+/g, '').toUpperCase();

  // 1. Direct code match (e.g. "UC106", "uc 106", "UC-106")
  const directCodePreset = PRODUCT_PRESETS.find(
    (p) => p.code.replace(/[\s\-_]+/g, '').toUpperCase() === cleanedCode
  );
  if (directCodePreset) {
    return {
      preset: directCodePreset,
      confidence: 'exact',
      matchReason: `Direct code match [${directCodePreset.code}]`,
    };
  }

  // 2. Embedded code search in text (e.g. "Order 2x UC106", "ladies polo (UC 106)")
  const embeddedCodeRegex = /\b(uc\s*106|uc106|uc\s*101|uc101|uc\s*301|uc301|ux\s*4|ux4|ux\s*3|ux3|ux\s*5|ux5|r\s*230|r230|tra\s*628|tra628|uc\s*801|uc801|b\s*18|b18|b\s*640|b640)\b/i;
  const embeddedMatch = lower.match(embeddedCodeRegex);
  if (embeddedMatch) {
    const matchedToken = embeddedMatch[1].replace(/[\s\-_]+/g, '').toUpperCase();
    const preset = PRODUCT_PRESETS.find(
      (p) => p.code.replace(/[\s\-_]+/g, '').toUpperCase() === matchedToken
    );
    if (preset) {
      return {
        preset,
        confidence: 'exact',
        matchReason: `Embedded code [${preset.code}] in text`,
      };
    }
  }

  // 3. Exact preset name match
  const exactNamePreset = PRODUCT_PRESETS.find(
    (p) => p.name.toLowerCase() === lower
  );
  if (exactNamePreset) {
    return {
      preset: exactNamePreset,
      confidence: 'exact',
      matchReason: `Exact name match "${exactNamePreset.name}"`,
    };
  }

  // 4. High-Priority Semantic / Disambiguation Rules
  const hasLadiesOrWomen = /\b(ladies|women|womens|woman)\b/i.test(lower);
  const hasShirtOrPolo = /\b(shirt|shirts|polo|polos|classic)\b/i.test(lower);

  // A. Ladies / Women classic shirt / polo -> UC106
  if (hasLadiesOrWomen && hasShirtOrPolo) {
    const uc106 = PRODUCT_PRESETS.find((p) => p.code === 'UC106')!;
    return {
      preset: uc106,
      confidence: 'high',
      matchReason: 'Recognized Ladies/Women Classic Shirt / Polo',
    };
  }

  // B. Snapback Cap -> B640
  if (/\b(snapback|flat\s*peak|trucker)\b/i.test(lower)) {
    const b640 = PRODUCT_PRESETS.find((p) => p.code === 'B640')!;
    return {
      preset: b640,
      confidence: 'high',
      matchReason: 'Recognized Snapback Cap',
    };
  }

  // C. Padded Gilet / Bodywarmer -> R230
  if (/\b(gilet|gilets|bodywarmer|body\s*warmer)\b/i.test(lower)) {
    const r230 = PRODUCT_PRESETS.find((p) => p.code === 'R230')!;
    return {
      preset: r230,
      confidence: 'high',
      matchReason: 'Recognized Padded Gilet / Bodywarmer',
    };
  }

  // D. Hi-Vis / Safety Vest -> UC801
  if (/\b(hi-?vis|high\s*vis|waistcoat|safety\s*vest|reflective)\b/i.test(lower)) {
    const uc801 = PRODUCT_PRESETS.find((p) => p.code === 'UC801')!;
    return {
      preset: uc801,
      confidence: 'high',
      matchReason: 'Recognized Hi-Vis / Waistcoat',
    };
  }

  // E. Hoodie -> UX4
  if (/\b(hoodie|hoodies|hoody|hooded)\b/i.test(lower)) {
    const ux4 = PRODUCT_PRESETS.find((p) => p.code === 'UX4')!;
    return {
      preset: ux4,
      confidence: 'high',
      matchReason: 'Recognized Hoodie',
    };
  }

  // F. Sweatshirt / Jumper -> UX3
  if (/\b(sweatshirt|sweatshirts|sweater|jumper|crewneck)\b/i.test(lower)) {
    const ux3 = PRODUCT_PRESETS.find((p) => p.code === 'UX3')!;
    return {
      preset: ux3,
      confidence: 'high',
      matchReason: 'Recognized Sweatshirt / Jumper',
    };
  }

  // G. Fleece -> UX5
  if (/\b(fleece|fleeces|microfleece)\b/i.test(lower)) {
    const ux5 = PRODUCT_PRESETS.find((p) => p.code === 'UX5')!;
    return {
      preset: ux5,
      confidence: 'high',
      matchReason: 'Recognized Fleece Jacket',
    };
  }

  // H. Jacket / Softshell -> TRA628
  if (/\b(jacket|jackets|softshell|regatta)\b/i.test(lower)) {
    const tra628 = PRODUCT_PRESETS.find((p) => p.code === 'TRA628')!;
    return {
      preset: tra628,
      confidence: 'high',
      matchReason: 'Recognized Jacket / Softshell',
    };
  }

  // I. Polo (when NOT ladies/women) -> UC101
  if (/\b(polo|polos)\b/i.test(lower)) {
    const uc101 = PRODUCT_PRESETS.find((p) => p.code === 'UC101')!;
    return {
      preset: uc101,
      confidence: 'high',
      matchReason: 'Recognized Polo T-Shirt',
    };
  }

  // J. T-Shirt / Tee -> UC301
  if (/\b(t-?shirt|tshirt|tee|tees)\b/i.test(lower)) {
    const uc301 = PRODUCT_PRESETS.find((p) => p.code === 'UC301')!;
    return {
      preset: uc301,
      confidence: 'high',
      matchReason: 'Recognized T-Shirt',
    };
  }

  // K. Cap / Hat -> B18
  if (/\b(cap|caps|baseball\s*cap|hat)\b/i.test(lower)) {
    const b18 = PRODUCT_PRESETS.find((p) => p.code === 'B18')!;
    return {
      preset: b18,
      confidence: 'high',
      matchReason: 'Recognized Cotton Cap',
    };
  }

  // 5. Fallback: Search all aliases for substring matches (ranked by longest matching alias)
  let bestMatch: { preset: ProductPreset; alias: string } | null = null;
  for (const preset of PRODUCT_PRESETS) {
    for (const alias of preset.aliases) {
      if (lower.includes(alias.toLowerCase())) {
        if (!bestMatch || alias.length > bestMatch.alias.length) {
          bestMatch = { preset, alias };
        }
      }
    }
  }

  if (bestMatch) {
    return {
      preset: bestMatch.preset,
      confidence: 'medium',
      matchReason: `Matched synonym "${bestMatch.alias}"`,
    };
  }

  return null;
}

/**
 * Searches the catalog across names, codes, categories, and aliases for autocomplete dropdowns.
 */
export function searchProductCatalog(query: string): ProductPreset[] {
  if (!query || !query.trim()) return PRODUCT_PRESETS;
  const q = query.toLowerCase().trim();
  const qClean = q.replace(/[\s\-_]+/g, '');

  return PRODUCT_PRESETS.filter((p) => {
    if (p.name.toLowerCase().includes(q)) return true;
    if (p.code.toLowerCase().includes(q)) return true;
    if (p.code.replace(/[\s\-_]+/g, '').toLowerCase().includes(qClean)) return true;
    if (p.category.toLowerCase().includes(q)) return true;
    if (p.aliases.some((alias) => alias.toLowerCase().includes(q))) return true;
    return false;
  });
}

/**
 * Group presets by category for organized optgroup dropdowns.
 */
export function getPresetsByCategory(): Record<string, ProductPreset[]> {
  const groups: Record<string, ProductPreset[]> = {};
  for (const preset of PRODUCT_PRESETS) {
    if (!groups[preset.category]) {
      groups[preset.category] = [];
    }
    groups[preset.category].push(preset);
  }
  return groups;
}
