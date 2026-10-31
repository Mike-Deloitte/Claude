// Fixed taxonomy. The ids are stored in user data, so do NOT rename them.
// Labels can change freely; ids cannot.

export const VALUES = [
  { id: 'fairness', label: 'Fairness' },
  { id: 'loyalty', label: 'Loyalty' },
  { id: 'honesty', label: 'Honesty' },
  { id: 'care', label: 'Care' },
  { id: 'autonomy', label: 'Autonomy' },
  { id: 'achievement', label: 'Achievement' },
  { id: 'tradition', label: 'Tradition' },
  { id: 'security', label: 'Security' },
];

export const PHILOSOPHIES = [
  { id: 'consequentialist', label: 'Consequentialist' },
  { id: 'duty', label: 'Duty-based' },
  { id: 'virtue', label: 'Virtue ethics' },
  { id: 'egalitarian', label: 'Egalitarian' },
];

// Written answers count more than a standard choice because the user chose the words.
export const WRITTEN_WEIGHT = 1.5;

const KNOWN_IDS = new Set([...VALUES, ...PHILOSOPHIES].map((t) => t.id));

export function isTagId(id) {
  return KNOWN_IDS.has(id);
}

// Keeps only taxonomy ids and clamps each strength to 0..1.
// Used on every tag set that enters the app (scenario options, analysis output),
// so a future API response cannot inject unknown tags.
export function sanitizeTags(tags) {
  const clean = {};
  for (const [id, strength] of Object.entries(tags ?? {})) {
    if (!isTagId(id) || typeof strength !== 'number' || !Number.isFinite(strength)) {
      continue;
    }
    clean[id] = Math.min(1, Math.max(0, strength));
  }
  return clean;
}
