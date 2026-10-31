// STUB: scenarios and written-answer analysis are local for this prototype.
// Both functions are async and return the same shapes the planned backend will return
// (POST /scenarios and POST /analyze), so callers will not change when that lands.

import { newId } from './storage';
import { sanitizeTags } from './taxonomy';

// Each option's tags are { tagId: strength 0..1 }. Ids come from taxonomy.js only.
const SCENARIO_BANK = [
  {
    title: 'The group project',
    text: 'A teammate missed their part of a group project, and the deadline is tomorrow. You could cover for them, or you could raise it.',
    options: [
      {
        text: 'Cover for them quietly so the team meets the deadline.',
        tags: { loyalty: 0.8, care: 0.6, consequentialist: 0.5 },
      },
      {
        text: 'Tell the instructor what happened, with the facts.',
        tags: { honesty: 0.9, fairness: 0.5, duty: 0.7 },
      },
      {
        text: 'Talk to your teammate first and agree on a plan together.',
        tags: { care: 0.6, autonomy: 0.3, virtue: 0.5 },
      },
    ],
  },
  {
    title: 'A job with a trade-off',
    text: 'You have two job offers. One pays significantly more but demands long hours. The other pays less and leaves your evenings free.',
    options: [
      {
        text: 'Take the higher-paying role and push for results.',
        tags: { achievement: 0.9, consequentialist: 0.4 },
      },
      {
        text: 'Take the role with more time for the people you care about.',
        tags: { care: 0.6, autonomy: 0.6, virtue: 0.3 },
      },
      {
        text: 'Negotiate for a middle path before you decide.',
        tags: { autonomy: 0.4, consequentialist: 0.6, fairness: 0.3 },
      },
    ],
  },
  {
    title: 'A limited supply',
    text: 'A community kitchen has enough food for only half the people waiting. You decide how it is shared out.',
    options: [
      {
        text: 'Serve people in the order they arrived.',
        tags: { fairness: 0.5, duty: 0.6 },
      },
      {
        text: 'Prioritise families with young children and those who are most in need.',
        tags: { care: 0.8, consequentialist: 0.5 },
      },
      {
        text: 'Split the food evenly among everyone present.',
        tags: { egalitarian: 1, fairness: 0.7 },
      },
    ],
  },
  {
    title: 'A family tradition',
    text: 'A relative insists on a holiday ritual that you find pointless, and everyone else seems to enjoy it.',
    options: [
      {
        text: 'Keep the ritual to honour the family and its history.',
        tags: { tradition: 0.9, loyalty: 0.6 },
      },
      {
        text: 'Suggest changing it gently so it fits everyone better.',
        tags: { autonomy: 0.5, care: 0.5, virtue: 0.3 },
      },
      {
        text: 'Skip it and explain your reasons openly.',
        tags: { autonomy: 0.8, honesty: 0.6 },
      },
    ],
  },
  {
    title: 'An error in your own work',
    text: 'You find a mistake in a report you already sent to a client. So far it has not caused any harm.',
    options: [
      {
        text: 'Correct it immediately and tell the client.',
        tags: { honesty: 1, duty: 0.7 },
      },
      {
        text: 'Weigh how much it matters before deciding what to do.',
        tags: { consequentialist: 0.9, security: 0.4 },
      },
      {
        text: 'Fix it quietly in the next version of the report.',
        tags: { achievement: 0.5, security: 0.5, consequentialist: 0.3 },
      },
    ],
  },
  {
    title: 'A risky opportunity',
    text: 'A friend invites you into a new venture with uncertain returns. It would use a large part of your savings.',
    options: [
      {
        text: 'Decline and keep your savings secure.',
        tags: { security: 0.9, duty: 0.3 },
      },
      {
        text: 'Invest only an amount you could afford to lose.',
        tags: { achievement: 0.6, autonomy: 0.6, consequentialist: 0.6 },
      },
      {
        text: 'Ask for more information before deciding anything.',
        tags: { honesty: 0.3, virtue: 0.5, security: 0.5 },
      },
    ],
  },
];

function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// Returns `count` scenarios with unique ids. Shuffles the bank once and cycles through it
// if more scenarios are requested than the bank holds.
export async function generateScenarios(count) {
  const shuffled = shuffle(SCENARIO_BANK);
  const scenarios = [];
  for (let i = 0; i < count; i++) {
    const base = shuffled[i % shuffled.length];
    scenarios.push({
      id: newId('scn'),
      title: base.title,
      text: base.text,
      options: base.options.map((option) => ({
        text: option.text,
        tags: sanitizeTags(option.tags),
      })),
    });
  }
  return scenarios;
}

// Keyword map used by the stub. Each hit adds 0.5 to a tag's strength, capped at 1.
const KEYWORDS = {
  fairness: ['fair', 'unfair', 'justice', 'deserve', 'bias'],
  loyalty: ['loyal', 'family', 'friend', 'team', 'stand by', 'commitment'],
  honesty: ['honest', 'truth', 'transparent', 'admit', 'lie', 'tell the'],
  care: ['care', 'kind', 'help', 'support', 'comfort', 'vulnerable', 'compassion'],
  autonomy: ['choice', 'choose', 'freedom', 'independent', 'decide', 'my own decision'],
  achievement: ['goal', 'success', 'achieve', 'achievement', 'career', 'ambition', 'progress'],
  tradition: ['tradition', 'custom', 'heritage', 'ritual', 'history'],
  security: ['safe', 'secure', 'security', 'stable', 'risk', 'protect', 'savings'],
  consequentialist: ['outcome', 'consequence', 'result', 'benefit', 'harm', 'overall', 'most people'],
  duty: ['duty', 'obligation', 'promise', 'right thing', 'rules'],
  virtue: ['character', 'integrity', 'courage', 'virtue', 'who i want to be'],
  egalitarian: ['equal', 'equality', 'everyone', 'share equally'],
};

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Whole words only, with a few common endings (fairness, caring, helped, honesty).
// Whole-word matching stops "care" from matching "career".
const ENDINGS = '(?:s|es|ed|d|ing|ly|y|ness|ty)?';
const KEYWORD_PATTERNS = Object.entries(KEYWORDS).map(([tagId, words]) => ({
  tagId,
  patterns: words.map(
    (word) => new RegExp(`\\b${escapeRegExp(word)}${ENDINGS}\\b`, 'i')
  ),
}));

// Returns { tagId: strength } for the text. Unmatched tags are omitted.
export async function analyzeWritten(text) {
  const tags = {};
  for (const { tagId, patterns } of KEYWORD_PATTERNS) {
    const hits = patterns.filter((pattern) => pattern.test(text ?? '')).length;
    if (hits > 0) tags[tagId] = Math.min(1, hits * 0.5);
  }
  return sanitizeTags(tags);
}
