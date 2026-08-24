/**
 * FixMate Service Catalogue
 *
 * Client-side service/problem mapping that powers instant autocomplete.
 * Each category contains services (what FixMate offers) and problems
 * (what users search for), all mapped back to a category name that
 * matches the backend ServiceCategory.name.
 */

const CATALOGUE = [
  {
    category: 'Plumbing',
    icon: '🔧',
    services: [
      'Plumber',
      'Tap repair',
      'Pipe leakage repair',
      'Bathroom plumbing',
      'Toilet repair',
      'Drain blockage',
      'Water tank repair',
      'Faucet installation',
      'Sink repair',
      'Shower repair',
      'Water pipe repair',
      'Bathroom fitting',
    ],
    problems: [
      'Leaking tap',
      'Blocked toilet',
      'Pipe burst',
      'Water leakage',
      'Clogged drain',
      'Running toilet',
      'Low water pressure',
      'Sewer backup',
      'Dripping faucet',
      'Water heater issue',
      'Tap is leaking',
      'Pipe is leaking',
      'Water pipe burst',
      'Toilet blocked',
      'Drain blocked',
      'No water',
      'Leaking pipe',
    ],
    keywords: ['plumb', 'water', 'tap', 'pipe', 'leak', 'drain', 'toilet', 'faucet', 'shower', 'sink', 'sewage'],
  },
  {
    category: 'Electrical',
    icon: '⚡',
    services: [
      'Electrician',
      'Fan repair',
      'Fan installation',
      'Switch repair',
      'Socket repair',
      'Wiring',
      'Light installation',
      'MCB repair',
      'Inverter installation',
      'Voltage stabilizer repair',
      'Mains power repair',
    ],
    problems: [
      'Power failure',
      'Short circuit',
      'Tripping MCB',
      'Flickering lights',
      'Sparking switch',
      'No power in room',
      'Earth leakage',
      'Overheating wires',
      'Fan not working',
      'Generator repair',
      'Fan making noise',
      'Fan not spinning',
      'Switch not working',
      'Light not working',
      'Power cut',
      'Electric shock',
      'Wiring problem',
    ],
    keywords: ['electr', 'power', 'fan', 'light', 'switch', 'socket', 'wire', 'wiring', 'spark', 'mcb', 'inverter'],
  },
  {
    category: 'AC & Appliances',
    icon: '❄',
    services: [
      'AC repair',
      'AC servicing',
      'AC installation',
      'AC gas refill',
      'Washing machine repair',
      'Refrigerator repair',
      'Microwave repair',
      'Water purifier repair',
      'Dishwasher repair',
      'Geyser repair',
    ],
    problems: [
      'AC not cooling',
      'AC making noise',
      'AC leaking water',
      'AC not turning on',
      'Fridge not cooling',
      'Washing machine not draining',
      'Microwave not heating',
      'Water purifier not working',
      'AC compressor issue',
      'AC gas leak',
      'AC water leakage',
      'AC gas issue',
      'Refrigerator not working',
      'Washing machine not working',
      'Microwave not working',
      'AC fan not working',
    ],
    keywords: ['ac', 'air condition', 'fridge', 'refriger', 'wash', 'laundry', 'microwave', 'oven', 'purifier', 'dishwash', 'geyser', 'appliance'],
  },
  {
    category: 'Carpentry',
    icon: '🪚',
    services: [
      'Carpenter',
      'Furniture repair',
      'Door repair',
      'Door installation',
      'Cabinet repair',
      'Shelf installation',
      'Furniture assembly',
      'Window repair',
      'Wardrobe repair',
      'Wood polish',
    ],
    problems: [
      'Broken door',
      'Squeaky door',
      'Loose hinge',
      'Cracked furniture',
      'Drawer stuck',
      'Table wobbling',
      'Shelf falling',
      'Wardrobe jammed',
      'Window stuck',
      'Wood rot',
      'Door not closing',
      'Furniture broken',
    ],
    keywords: ['carpent', 'furniture', 'door', 'window', 'cabinet', 'shelf', 'wardrobe', 'wood', 'hinge', 'drawer'],
  },
  {
    category: 'Painting',
    icon: '🎨',
    services: [
      'House painting',
      'Wall painting',
      'Touch-up painting',
      'Waterproofing',
      'Wall crack repair',
      'Texture painting',
      'Exterior painting',
      'Wood painting',
      'Metal painting',
      'Primer application',
    ],
    problems: [
      'Peeling paint',
      'Wall cracks',
      'Damp walls',
      'Paint bubbling',
      'Faded walls',
      'Water seepage',
      'Stain on wall',
      'Mold on wall',
      'Color consultation',
      'Renovation painting',
      'Wall paint peeling',
    ],
    keywords: ['paint', 'painting', 'wall', 'color', 'colour', 'texture', 'waterproof', 'damp', 'seepage'],
  },
  {
    category: 'Cleaning',
    icon: '🧹',
    services: [
      'Home cleaning',
      'Bathroom cleaning',
      'Kitchen cleaning',
      'Sofa cleaning',
      'Carpet cleaning',
      'Deep cleaning',
      'Pest control',
      'Tank cleaning',
      'Office cleaning',
      'Post-construction cleaning',
    ],
    problems: [
      'Cockroach problem',
      'Termite infestation',
      'Rat problem',
      'Mosquito control',
      'Bed bugs',
      'Stained carpet',
      'Dirty bathroom',
      'Greasy kitchen',
      'Dust allergy',
      'Foul smell in house',
      'House needs cleaning',
      'Pest problem',
    ],
    keywords: ['clean', 'cleaning', 'pest', 'cockroach', 'termite', 'rat', 'bug', 'hygien', 'dirt', 'sofa', 'carpet'],
  },
];

/**
 * Flatten all entries into a searchable list.
 * Each entry has: { category, icon, name, type }
 */
function buildSearchIndex() {
  const index = [];
  for (const cat of CATALOGUE) {
    for (const service of cat.services) {
      index.push({ category: cat.category, icon: cat.icon, name: service, type: 'service', keywords: cat.keywords || [] });
    }
    for (const problem of cat.problems) {
      index.push({ category: cat.category, icon: cat.icon, name: problem, type: 'problem', keywords: cat.keywords || [] });
    }
  }
  return index;
}

const SEARCH_INDEX = buildSearchIndex();

/**
 * All unique category names for display and matching.
 */
export const ALL_CATEGORIES = CATALOGUE.map((c) => ({ name: c.category, icon: c.icon }));

/**
 * Popular services shown when the search bar is opened without text.
 */
export const POPULAR_SERVICES = [
  { category: 'Plumbing', icon: '🔧', name: 'Plumber', type: 'service' },
  { category: 'Electrical', icon: '⚡', name: 'Electrician', type: 'service' },
  { category: 'AC & Appliances', icon: '❄', name: 'AC Repair', type: 'service' },
  { category: 'Cleaning', icon: '🧹', name: 'Home Cleaning', type: 'service' },
  { category: 'Carpentry', icon: '🪚', name: 'Carpenter', type: 'service' },
  { category: 'Painting', icon: '🎨', name: 'House Painting', type: 'service' },
  { category: 'AC & Appliances', icon: '❄', name: 'Washing Machine Repair', type: 'service' },
  { category: 'Plumbing', icon: '🔧', name: 'Tap Repair', type: 'service' },
];

/**
 * Common problems shown when the search bar is opened without text.
 */
export const COMMON_PROBLEMS = [
  { category: 'Plumbing', icon: '🚰', name: 'Leaking tap', type: 'problem' },
  { category: 'Plumbing', icon: '🚽', name: 'Blocked toilet', type: 'problem' },
  { category: 'Electrical', icon: '💡', name: 'Power failure', type: 'problem' },
  { category: 'AC & Appliances', icon: '❄', name: 'AC not cooling', type: 'problem' },
  { category: 'Electrical', icon: '🔌', name: 'Switch/socket repair', type: 'problem' },
  { category: 'Cleaning', icon: '🐛', name: 'Pest control', type: 'problem' },
];

/**
 * Search the catalogue by query string.
 * Returns results sorted by relevance:
 *   1. Exact service match
 *   2. Exact problem match
 *   3. Starts-with match
 *   4. Contains match
 *
 * @param {string} query
 * @param {number} limit max results to return
 * @returns {Array<{category, icon, name, type}>}
 */
export function searchCatalogue(query, limit = 12) {
  if (!query || !query.trim()) return [];

  const q = query.toLowerCase().trim();

  // Score each entry
  const scored = SEARCH_INDEX.map((entry) => {
    const name = entry.name.toLowerCase();
    const category = entry.category.toLowerCase();

    let score = 0;

    // Exact full match
    if (name === q) score = 100;
    // Category exact match
    else if (category === q) score = 90;
    // Name starts with query
    else if (name.startsWith(q)) score = 80;
    // Category starts with query
    else if (category.startsWith(q)) score = 70;
    // Name contains as whole word
    else if (name.split(/\s+/).some((w) => w.startsWith(q))) score = 60;
    // Multi-word: all words present in name
    else if (q.split(/\s+/).every((word) => name.includes(word))) score = 50;
    // Name contains query
    else if (name.includes(q)) score = 40;
    // Category contains query
    else if (category.includes(q)) score = 30;
    // Fuzzy: remove spaces and check containment
    else if (name.replace(/\s+/g, '').includes(q.replace(/\s+/g, ''))) score = 20;
    // Keyword match: check if any category keyword is a prefix of the query
    else if (entry.keywords && entry.keywords.some((kw) => q.startsWith(kw) || kw.startsWith(q))) score = 25;

    // Boost services slightly over problems for generic searches
    if (entry.type === 'service') score += 2;

    return { ...entry, score };
  });

  return scored
    .filter((e) => e.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * Given a search result entry, return the backend category name
 * to use for the nearby search. This MUST match the ServiceCategory.name
 * stored in the database.
 */
export function resolveCategoryName(entry) {
  if (!entry) return null;
  return entry.category || null;
}

/**
 * Get recent searches from localStorage.
 */
export function getRecentSearches() {
  try {
    return JSON.parse(localStorage.getItem('fixmate-recent-searches') || '[]');
  } catch {
    return [];
  }
}

/**
 * Save a search query to recent searches.
 */
export function saveRecentSearch(query) {
  if (!query || !query.trim()) return;
  const trimmed = query.trim();
  const recent = getRecentSearches().filter((r) => r.query !== trimmed);
  recent.unshift({ query: trimmed, timestamp: Date.now() });
  // Keep only the last 8
  localStorage.setItem('fixmate-recent-searches', JSON.stringify(recent.slice(0, 8)));
}

/**
 * Remove a single recent search.
 */
export function removeRecentSearch(query) {
  const recent = getRecentSearches().filter((r) => r.query !== query);
  localStorage.setItem('fixmate-recent-searches', JSON.stringify(recent));
}

/**
 * Clear all recent searches.
 */
export function clearRecentSearches() {
  localStorage.removeItem('fixmate-recent-searches');
}

export default CATALOGUE;
