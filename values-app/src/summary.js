import { RELATIONS } from './relations';

// Builds the executive summary from computeScores() output. Pure: no storage, no network.
// Only the top LEAD items in each category are used to describe relationships.
const LEAD = 3;
const EARLY_RESPONSES = 10;

function listNames(items) {
  return items.map((i) => `${i.label} (${i.percent}%)`).join(', ');
}

// Returns null when there is nothing to summarise yet.
export function buildExecutiveSummary(scores) {
  const { responseCount, values, philosophies, morals } = scores;
  if (responseCount === 0) return null;

  const leadValues = values.slice(0, LEAD);
  const leadPhilosophies = philosophies.slice(0, LEAD);
  const leadMorals = morals.slice(0, LEAD);
  const allTagged = [...values, ...philosophies, ...morals];

  if (allTagged.length === 0) {
    return {
      lead: 'No values, philosophies, or moral foundations were detected in your answers yet.',
      findings: [],
      relations: [],
      early: responseCount < EARLY_RESPONSES,
      caveat: CAVEAT,
    };
  }

  const leadParts = [];
  if (leadValues[0]) leadParts.push(`Your leading value is ${leadValues[0].label}.`);
  if (leadPhilosophies[0]) leadParts.push(`Your strongest philosophical lens is ${leadPhilosophies[0].label}.`);
  if (leadMorals[0]) leadParts.push(`Your strongest moral foundation is ${leadMorals[0].label}.`);

  const findings = [];
  if (leadValues.length) findings.push(`Values: ${listNames(leadValues)}.`);
  if (leadPhilosophies.length) findings.push(`Philosophies: ${listNames(leadPhilosophies)}.`);
  if (leadMorals.length) findings.push(`Moral foundations: ${listNames(leadMorals)}.`);

  const leadIds = new Set([...leadValues, ...leadPhilosophies, ...leadMorals].map((i) => i.id));
  const byId = Object.fromEntries(allTagged.map((i) => [i.id, i]));
  const relations = [];
  for (const rel of RELATIONS) {
    if (!leadIds.has(rel.a) || !leadIds.has(rel.b)) continue;
    const pair = `${byId[rel.a].label} and ${byId[rel.b].label}`;
    relations.push(
      rel.kind === 'aligned'
        ? `${pair} both lead. They tend to go together: ${rel.note}.`
        : `${pair} both lead, which can pull in different directions: ${rel.note}.`
    );
  }
  if (relations.length === 0) {
    relations.push('Your leading items do not show a clear link with each other yet.');
  }

  const early = responseCount < EARLY_RESPONSES;
  return {
    lead: leadParts.join(' ') || 'Some tags were detected, but none are strong enough to lead yet.',
    findings,
    relations,
    early,
    caveat: CAVEAT,
  };
}

const CAVEAT =
  'These findings describe patterns in your answers to scenarios. They are not a diagnosis or a measure of character, and they are not a validated psychological test.';
