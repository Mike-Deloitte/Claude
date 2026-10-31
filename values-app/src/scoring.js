import { PHILOSOPHIES, VALUES, WRITTEN_WEIGHT, isTagId } from './taxonomy';

// Scores are computed from the stored responses every time, never cached.
// That way a change to the rules here updates every profile's results.
//
// Rules:
// - raw[tag] = sum over all responses of (weight x strength), across all sessions.
// - weight is WRITTEN_WEIGHT for written answers and 1 for choices.
// - Tags with strength 0 (or unknown ids) are ignored entirely, so they are not evidence.
// - percent = raw / total raw within the same category (values or philosophies), rounded.
// - Tags with zero raw score are left out of the rankings.

// TODO (not yet implemented): consistency. Count the distinct scenarios that support each
// tag and factor that into confidence, so one scenario repeated many times is not "high".

export function confidenceFor(evidenceCount) {
  if (evidenceCount >= 10) return 'high';
  if (evidenceCount >= 4) return 'medium';
  return 'low';
}

function accumulate(sessions) {
  const raw = {};
  const evidence = {};

  for (const session of sessions) {
    for (const response of session.responses) {
      const weight = response.type === 'written' ? WRITTEN_WEIGHT : 1;
      for (const [tagId, strength] of Object.entries(response.tags ?? {})) {
        if (!isTagId(tagId) || !(strength > 0)) continue;
        raw[tagId] = (raw[tagId] ?? 0) + weight * strength;
        evidence[tagId] = (evidence[tagId] ?? 0) + 1;
      }
    }
  }
  return { raw, evidence };
}

function rankCategory(taxonomy, raw, evidence) {
  const total = taxonomy.reduce((sum, tag) => sum + (raw[tag.id] ?? 0), 0);
  if (total <= 0) return [];

  return taxonomy
    .filter((tag) => (raw[tag.id] ?? 0) > 0)
    .map((tag) => ({
      id: tag.id,
      label: tag.label,
      raw: raw[tag.id],
      percent: Math.round((raw[tag.id] / total) * 100),
      evidence: evidence[tag.id],
      confidence: confidenceFor(evidence[tag.id]),
    }))
    .sort((a, b) => b.raw - a.raw);
}

// sessions: the profile's session array. Returns ranked values and philosophies.
export function computeScores(sessions) {
  const { raw, evidence } = accumulate(sessions);
  const responseCount = sessions.reduce((sum, s) => sum + s.responses.length, 0);

  return {
    responseCount,
    values: rankCategory(VALUES, raw, evidence),
    philosophies: rankCategory(PHILOSOPHIES, raw, evidence),
  };
}
