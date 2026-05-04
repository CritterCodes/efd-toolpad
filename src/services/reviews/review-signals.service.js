const clamp01 = (value) => Math.max(0, Math.min(1, Number(value) || 0));

const normalizeReviewText = (review) => String(
  typeof review === 'string'
    ? review
    : review?.text || review?.reviewText || review?.comment || '',
).toLowerCase();

const includesAny = (text, patterns) => patterns.some((pattern) => pattern.test(text));

const REPAIR_PATTERNS = [
  /\bfixed\b/,
  /\bfix(ed|ing)?\b/,
  /\brepair(ed|s|ing)?\b/,
  /\bresize(d|s|ing)?\b/,
  /\bsiz(e|ed|ing)\b/,
  /\bchain\b/,
  /\bstone\b/,
  /\bstone setting\b/,
  /\bprong\b/,
  /\bwatch battery\b/,
  /\bwatch repair\b/,
  /\bpolish(ed|ing)?\b/,
];

const OUTSOURCING_PATTERNS = [
  /\bsent it off\b/,
  /\bsend it off\b/,
  /\bhad to send\b/,
  /\bthey ship it\b/,
  /\bshipped it\b/,
  /\bship(ped)? out\b/,
  /\boff-?site\b/,
  /\bsent out\b/,
  /\boutsourc(ed|e|ing)\b/,
  /\bpartner jeweler\b/,
  /\btook weeks\b/,
];

const TURNAROUND_PATTERNS = [
  /\btook too long\b/,
  /\btook weeks\b/,
  /\bweeks\b/,
  /\blong wait\b/,
  /\bdelayed\b/,
  /\bstill waiting\b/,
  /\bnot ready\b/,
  /\bwaited\b/,
];

const REPEAT_ISSUE_PATTERNS = [
  /\bbroke again\b/,
  /\bcame loose again\b/,
  /\bfell out again\b/,
  /\bagain\b.{0,40}\brepair/,
  /\brepair\b.{0,40}\bagain\b/,
];

export function extractReviewSignals(reviews = []) {
  const texts = (Array.isArray(reviews) ? reviews : [])
    .map(normalizeReviewText)
    .filter(Boolean);
  const totalReviews = texts.length;
  const repairMentions = texts.filter((text) => includesAny(text, REPAIR_PATTERNS)).length;
  const outsourcingEvidence = texts.some((text) => includesAny(text, OUTSOURCING_PATTERNS));
  const turnaroundComplaints = texts.some((text) => includesAny(text, TURNAROUND_PATTERNS));
  const repeatIssues = texts.some((text) => includesAny(text, REPEAT_ISSUE_PATTERNS));

  return {
    repairVolume: totalReviews ? clamp01(repairMentions / Math.max(3, totalReviews)) : 0,
    outsourcingEvidence,
    turnaroundComplaints,
    repeatIssues,
    mentionsSpecificRepairs: repairMentions > 0,
    repairMentions,
    totalReviews,
  };
}
