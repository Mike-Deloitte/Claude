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
      { text: 'Cover for them quietly so the team meets the deadline.', tags: { loyalty: 0.8, care: 0.6, consequentialist: 0.5, 'ingroup-loyalty': 0.7 } },
      { text: 'Tell the instructor what happened, with the facts.', tags: { honesty: 0.9, fairness: 0.5, duty: 0.7, reciprocity: 0.6 } },
      { text: 'Talk to your teammate first and agree on a plan together.', tags: { care: 0.6, autonomy: 0.3, virtue: 0.5, 'harm-care': 0.5 } },
      { text: 'Take over their part and ask the team to share the extra work fairly.', tags: { fairness: 0.6, egalitarian: 0.5, reciprocity: 0.7 } },
    ],
  },
  {
    title: 'A job with a trade-off',
    text: 'You have two job offers. One pays significantly more but demands long hours. The other pays less and leaves your evenings free.',
    options: [
      { text: 'Take the higher-paying role and push for results.', tags: { achievement: 0.9, consequentialist: 0.4 } },
      { text: 'Take the role with more time for the people you care about.', tags: { care: 0.6, autonomy: 0.6, virtue: 0.3, 'harm-care': 0.4 } },
      { text: 'Negotiate for a middle path before you decide.', tags: { autonomy: 0.4, consequentialist: 0.6, fairness: 0.3, reciprocity: 0.4 } },
      { text: 'Stay where you are, a job you know well and trust.', tags: { security: 0.8, tradition: 0.5, duty: 0.5, loyalty: 0.6, 'ingroup-loyalty': 0.5 } },
    ],
  },
  {
    title: 'A limited supply',
    text: 'A community kitchen has enough food for only half the people waiting. You decide how it is shared out.',
    options: [
      { text: 'Serve people in the order they arrived.', tags: { fairness: 0.5, duty: 0.6, reciprocity: 0.5 } },
      { text: 'Prioritise families with young children and those most in need.', tags: { care: 0.8, consequentialist: 0.5, 'harm-care': 0.8 } },
      { text: 'Split the food evenly among everyone present.', tags: { egalitarian: 1, fairness: 0.7, reciprocity: 0.4 } },
      { text: 'Ask the people waiting to decide together.', tags: { autonomy: 0.4, virtue: 0.5, liberty: 0.6 } },
    ],
  },
  {
    title: 'A family tradition',
    text: 'A relative insists on a holiday ritual that you find pointless, and everyone else seems to enjoy it.',
    options: [
      { text: 'Keep the ritual to honour the family and its history.', tags: { tradition: 0.9, loyalty: 0.6, 'ingroup-loyalty': 0.6, sanctity: 0.5 } },
      { text: 'Suggest changing it gently so it fits everyone better.', tags: { autonomy: 0.5, care: 0.5, virtue: 0.3 } },
      { text: 'Skip it and explain your reasons openly.', tags: { autonomy: 0.8, honesty: 0.6, liberty: 0.6 } },
      { text: 'Ask the relative what the ritual means to them before deciding.', tags: { care: 0.7, virtue: 0.5, 'harm-care': 0.5 } },
    ],
  },
  {
    title: 'An error in your own work',
    text: 'You find a mistake in a report you already sent to a client. So far it has not caused any harm.',
    options: [
      { text: 'Correct it immediately and tell the client.', tags: { honesty: 1, duty: 0.7, reciprocity: 0.6 } },
      { text: 'Weigh how much it matters before deciding what to do.', tags: { consequentialist: 0.9, security: 0.4 } },
      { text: 'Fix it quietly in the next version of the report.', tags: { achievement: 0.5, security: 0.5, consequentialist: 0.3 } },
      { text: 'Tell your manager first so they can decide how to handle the client.', tags: { authority: 0.6, duty: 0.5, loyalty: 0.3, 'ingroup-loyalty': 0.3 } },
    ],
  },
  {
    title: 'A risky opportunity',
    text: 'A friend invites you into a new venture with uncertain returns. It would use a large part of your savings.',
    options: [
      { text: 'Decline and keep your savings secure.', tags: { security: 0.9, duty: 0.3 } },
      { text: 'Invest only an amount you could afford to lose.', tags: { achievement: 0.6, autonomy: 0.6, consequentialist: 0.6, liberty: 0.3 } },
      { text: 'Ask for more information before deciding anything.', tags: { honesty: 0.3, virtue: 0.5, security: 0.5 } },
      { text: 'Say no to the pressure to decide fast, and trust your own judgement.', tags: { autonomy: 0.8, virtue: 0.5, liberty: 0.6 } },
    ],
  },
  {
    title: 'A lost wallet',
    text: 'You find a wallet on the bus. It has some cash and an ID card with the owner name and address.',
    options: [
      { text: 'Return the wallet with everything in it, untouched.', tags: { honesty: 0.9, duty: 0.8, reciprocity: 0.7, 'harm-care': 0.4 } },
      { text: 'Return it and keep a small reward for the trouble.', tags: { reciprocity: 0.5, achievement: 0.3, consequentialist: 0.4 } },
      { text: 'Keep the cash, since nobody saw you pick it up.', tags: { security: 0.7, achievement: 0.4 } },
      { text: 'Hand it to the bus driver and let them handle it.', tags: { authority: 0.6, duty: 0.5, security: 0.3, 'ingroup-loyalty': 0.2 } },
    ],
  },
  {
    title: 'A noisy neighbour',
    text: 'A neighbour plays loud music late at night. It has happened several times this month.',
    options: [
      { text: 'Knock on the door and ask them to turn it down.', tags: { virtue: 0.5, autonomy: 0.5, care: 0.4, honesty: 0.4 } },
      { text: 'Call the building manager and ask them to deal with it.', tags: { authority: 0.6, duty: 0.5, security: 0.5 } },
      { text: 'Say nothing. It is one more night, and it will pass.', tags: { consequentialist: 0.5, autonomy: 0.3 } },
      { text: 'Get the other neighbours to raise it together.', tags: { egalitarian: 0.7, reciprocity: 0.5, 'ingroup-loyalty': 0.5, virtue: 0.3 } },
    ],
  },
  {
    title: 'Caring for a parent',
    text: 'Your ageing parent needs more help than you can give on your own.',
    options: [
      { text: 'Move them into your home and take on their care yourself.', tags: { loyalty: 0.8, care: 0.8, 'ingroup-loyalty': 0.6, duty: 0.6 } },
      { text: 'Arrange professional care, paid for jointly with your siblings.', tags: { fairness: 0.6, reciprocity: 0.7, consequentialist: 0.5, security: 0.4 } },
      { text: 'Choose a care home they can afford, and visit them often.', tags: { security: 0.6, consequentialist: 0.5, 'harm-care': 0.5 } },
      { text: 'Ask your parent what they would prefer, and respect their answer.', tags: { autonomy: 0.8, care: 0.6, liberty: 0.5, virtue: 0.4 } },
    ],
  },
  {
    title: 'Credit in a meeting',
    text: 'In a team meeting, your manager presents an idea that a colleague came up with, and does not mention them.',
    options: [
      { text: 'Politely correct the record in the meeting.', tags: { honesty: 0.8, fairness: 0.7, virtue: 0.5, reciprocity: 0.6 } },
      { text: 'Speak to your colleague privately first.', tags: { care: 0.5, virtue: 0.4, loyalty: 0.3 } },
      { text: 'Say nothing now. Your own work will speak for itself.', tags: { achievement: 0.4, security: 0.6, tradition: 0.3 } },
      { text: 'Email your manager afterwards to set out who did what.', tags: { honesty: 0.6, autonomy: 0.5, authority: 0.4, reciprocity: 0.5 } },
    ],
  },
  {
    title: 'A sick day',
    text: 'You feel unwell, but you have a major deadline today.',
    options: [
      { text: 'Go in and push through the day.', tags: { achievement: 0.8, duty: 0.4, consequentialist: 0.4 } },
      { text: 'Stay home and tell your team clearly.', tags: { honesty: 0.6, care: 0.6, 'harm-care': 0.6, duty: 0.5 } },
      { text: 'Work from home for part of the day.', tags: { autonomy: 0.5, consequentialist: 0.6, reciprocity: 0.4 } },
      { text: 'Ask a colleague to take over the most urgent part.', tags: { loyalty: 0.5, reciprocity: 0.6, 'ingroup-loyalty': 0.5, fairness: 0.3 } },
    ],
  },
  {
    title: 'A foul nobody saw',
    text: 'The team your child plays for is winning, and you saw an opponent commit a foul that the referee missed.',
    options: [
      { text: 'Tell the referee what you saw.', tags: { honesty: 0.9, duty: 0.6, reciprocity: 0.5 } },
      { text: 'Say nothing. It is part of the game.', tags: { loyalty: 0.6, 'ingroup-loyalty': 0.8, consequentialist: 0.3 } },
      { text: 'Talk to the coach after the match.', tags: { authority: 0.6, virtue: 0.5, honesty: 0.5 } },
      { text: 'Ask the players to play fairly from now on.', tags: { virtue: 0.5, fairness: 0.5, egalitarian: 0.4 } },
    ],
  },
  {
    title: 'A ceremony that conflicts with your beliefs',
    text: 'A colleague invites you to a cultural ceremony that conflicts with your own beliefs.',
    options: [
      { text: 'Attend to show respect for their tradition.', tags: { tradition: 0.6, care: 0.5, virtue: 0.3 } },
      { text: 'Politely decline and explain your position.', tags: { autonomy: 0.7, honesty: 0.6, liberty: 0.5 } },
      { text: 'Attend briefly, and leave before the most important part.', tags: { virtue: 0.3, consequentialist: 0.5, autonomy: 0.4 } },
      { text: 'Ask them what it means to them before you decide.', tags: { care: 0.6, virtue: 0.6, 'harm-care': 0.4 } },
    ],
  },
  {
    title: 'A year-end surplus',
    text: 'Your company ends the year with a budget surplus. Leadership asks for ideas on how to use it.',
    options: [
      { text: 'Give everyone the same bonus.', tags: { egalitarian: 1, fairness: 0.6, reciprocity: 0.5 } },
      { text: 'Reward the teams with the strongest results.', tags: { achievement: 0.8, consequentialist: 0.7, reciprocity: 0.5 } },
      { text: 'Invest it in training for the people who need it most.', tags: { care: 0.6, consequentialist: 0.6, 'harm-care': 0.5 } },
      { text: 'Keep it in reserve for harder times.', tags: { security: 0.9, duty: 0.4 } },
    ],
  },
  {
    title: 'A request to cover a lie',
    text: 'An old friend asks you to back up a story they have told their partner about where they were last night.',
    options: [
      { text: 'Refuse, and explain why.', tags: { honesty: 0.9, duty: 0.6, virtue: 0.6 } },
      { text: 'Back them up this once.', tags: { loyalty: 0.8, 'ingroup-loyalty': 0.6, care: 0.4 } },
      { text: 'Tell them you will not lie, but offer to help them talk to their partner.', tags: { care: 0.6, virtue: 0.6, honesty: 0.6, autonomy: 0.3 } },
      { text: 'Ask them to explain the whole situation before you decide.', tags: { honesty: 0.4, virtue: 0.5, autonomy: 0.4 } },
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
  'harm-care': ['harm', 'hurt', 'suffer', 'cruel', 'pain'],
  reciprocity: ['reciprocity', 'reciprocal', 'repay', 'pay back', 'return the favour', 'owe'],
  'ingroup-loyalty': ['betray', 'betrayal', 'our side', 'belong', 'stick together'],
  authority: ['authority', 'obey', 'respect', 'chain of command', 'elders', 'law'],
  sanctity: ['sacred', 'holy', 'pure', 'dignity', 'disgust', 'degrad'],
  liberty: ['oppress', 'coerce', 'pressure', 'control', 'liberty', 'free to'],
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
