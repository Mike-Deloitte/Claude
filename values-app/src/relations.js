// How the tags relate to each other. Used by the executive summary on the Results screen.
// "aligned": the two often go together. "tension": they can pull in different directions.
// Ids must come from taxonomy.js.

export const RELATIONS = [
  { a: 'honesty', b: 'duty', kind: 'aligned', note: 'both rest on telling the truth and doing what is owed' },
  { a: 'care', b: 'harm-care', kind: 'aligned', note: 'both are concerned with others being hurt or helped' },
  { a: 'fairness', b: 'reciprocity', kind: 'aligned', note: 'both treat fairness as giving back what is due' },
  { a: 'egalitarian', b: 'fairness', kind: 'aligned', note: 'both seek equal treatment for people' },
  { a: 'loyalty', b: 'ingroup-loyalty', kind: 'aligned', note: 'both put the people close to you first' },
  { a: 'tradition', b: 'sanctity', kind: 'aligned', note: 'both value inherited practices and what is sacred' },
  { a: 'tradition', b: 'authority', kind: 'aligned', note: 'both respect established structures' },
  { a: 'autonomy', b: 'liberty', kind: 'aligned', note: 'both prize the freedom to choose for yourself' },
  { a: 'achievement', b: 'consequentialist', kind: 'aligned', note: 'both judge a choice by what it produces' },
  { a: 'virtue', b: 'care', kind: 'aligned', note: 'both see good character in how you treat people' },
  { a: 'autonomy', b: 'authority', kind: 'tension', note: 'deciding for yourself can clash with deferring to rules or leaders' },
  { a: 'achievement', b: 'care', kind: 'tension', note: 'pursuing goals can cost time for the people you care about' },
  { a: 'loyalty', b: 'egalitarian', kind: 'tension', note: 'favouring your own people can clash with treating everyone equally' },
  { a: 'liberty', b: 'harm-care', kind: 'tension', note: 'protecting people from harm can mean limiting their freedom' },
  { a: 'security', b: 'autonomy', kind: 'tension', note: 'seeking safety can limit how freely you choose' },
];
