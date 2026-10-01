export const STATUSES = [
  'new',
  'researching',
  'qualified',
  'contacted',
  'follow_up',
  'interested',
  'invited',
  'applied',
  'approved',
  'not_fit',
  'no_response',
];

export const DEFAULT_QUERIES = [
  'independent jeweler',
  'jewelry repair',
  'watch repair',
  'pawn shop jewelry',
  'bridal jewelry store',
  'local jewelry store',
];

export const DEFAULT_LOCATIONS = [
  'Arkansas',
  'Oklahoma',
  'Missouri',
  'Texas',
  'Tennessee',
  'Kansas',
];

export const METERS_PER_MILE = 1609.344;
export const DEFAULT_WHOLESALE_APPLICATION_URL = 'https://shop.engelfinedesign.com/wholesale/request';

export const FIT_VIEWS = [
  { value: 'all', label: 'Active Leads' },
  { value: 'strong', label: 'Strong Fits' },
  { value: 'possible', label: 'Possible Fits' },
  { value: 'weak', label: 'Weak Fits' },
  { value: 'reached_out', label: 'Reached Out' },
  { value: 'current', label: 'Current Accounts' },
  { value: 'not_fit', label: 'Archived Not Fit' },
  { value: 'unscored', label: 'Unscored' },
];

export const BUSINESS_FILTERS = [
  { value: '', label: 'All business types' },
  { value: 'jewelry_business', label: 'Jewelry stores' },
  { value: 'pawn_shop', label: 'Pawn shops' },
  { value: 'watch_or_clock_business', label: 'Watch repair' },
  { value: 'bridal_or_fine_jewelry_store', label: 'Bridal/fine jewelry' },
  { value: 'known_repair', label: 'Mentions repair' },
  { value: 'refurbishment', label: 'Refurb opportunity' },
];

export const SORT_OPTIONS = [
  { value: 'score_desc', label: 'Highest score' },
  { value: 'proximity', label: 'Closest to EFD' },
  { value: 'newest', label: 'Newest' },
  { value: 'follow_up', label: 'Next follow-up' },
];

export const statusLabel = (status) => String(status || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
export const tierLabel = (tier) => String(tier || '').replace(/^tier_\d_/, 'Tier ').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export const hasScore = (score) => score !== null && score !== undefined && score !== '' && Number.isFinite(Number(score));

export const formatDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export const inferClientBusinessHints = (lead = {}) => {
  if (lead.businessProfileHints) return lead.businessProfileHints;
  const text = [
    lead.storeName,
    lead.website,
    lead.notes,
    lead.likelyRepairNeed,
    lead.googleReviewSummary,
    lead.googleReviewResearch?.summary,
    ...(Array.isArray(lead.googleReviews) ? lead.googleReviews.map((review) => review.text) : []),
    ...(Array.isArray(lead.googleBusinessTypes) ? lead.googleBusinessTypes : []),
  ].join(' ').toLowerCase();
  const pawnSignal = /\bpawn|pawnshop|pawn shop/.test(text);
  const knownRepairSignal = /\brepair|service|watch repair|jewelry repair|jewellery repair|bench/.test(text);
  const refurbishmentOpportunity = pawnSignal || /\brefurb|restore|restoration|polish|clean|cleaning|pre-owned|preowned|used|estate|resale|secondhand|second-hand|scrap gold|gold buyer|cash for gold/.test(text);
  const jewelrySignal = /\bjewel|jewelry|jewellery|diamond|gold|bridal|engagement|ring/.test(text);
  const watchSignal = /\bwatch|clock/.test(text);
  const bridalSignal = /\bbridal|engagement|wedding/.test(text);
  return {
    likelyBusinessType: pawnSignal
      ? 'pawn_shop'
      : watchSignal
        ? 'watch_or_clock_business'
        : bridalSignal
          ? 'bridal_or_fine_jewelry_store'
          : jewelrySignal
            ? 'jewelry_business'
            : 'unclear',
    knownRepairSignal,
    refurbishmentOpportunity,
  };
};

export const matchesBusinessFilter = (lead, filter) => {
  if (!filter) return true;
  const hints = inferClientBusinessHints(lead);
  if (filter === 'known_repair') return Boolean(hints.knownRepairSignal);
  if (filter === 'refurbishment') return Boolean(hints.refurbishmentOpportunity);
  return hints.likelyBusinessType === filter;
};

export const emptyLeadForm = {
  storeName: '',
  contactName: '',
  email: '',
  phone: '',
  website: '',
  address: '',
  city: '',
  state: '',
  notes: '',
  shippingRequired: false,
};

export const EMAIL_TEMPLATES = [
  {
    label: 'Repair outsourcing intro',
    subject: 'Wholesale jewelry repair support',
    body: [
      'Hi {{storeName}},',
      '',
      'I wanted to reach out because Engel Fine Design helps stores add, expand, or organize jewelry repair work without needing to build a full repair operation in-house.',
      '',
      'We can receive repair jobs from your team, keep the work organized, and give your store free access to our repair management software so you are not stuck tracking client repairs with paper envelopes, notes, or a messy manual process.',
      '',
      'If jewelry repair is already part of what you do, this can help with overflow and cleaner tracking. If it is not something you currently offer, it may be a simple way to add repair or refurbishment as another service for your customers.',
      '',
      '{{applicationUrl}}',
      '',
      'No pressure to schedule a call first. If it looks useful, you can get access and see whether the workflow fits your store.',
      '',
      'If you have questions, you can reply here or call me at 479-546-6740.',
      '',
      'Best,',
      'Jake Engel',
    ].join('\n'),
  },
  {
    label: 'Short follow-up',
    subject: 'Repair partner follow-up',
    body: [
      'Hi {{storeName}},',
      '',
      'Following up to see if wholesale repair support would be useful for your business.',
      '',
      'Engel Fine Design can help with outsourced jewelry repair work, whether you already handle repairs manually or want a simple way to offer repair/refurbishment without adding bench capacity. Wholesale partners also get free access to our repair management software for intake and tracking.',
      '',
      'You can apply for free wholesale account access here:',
      '',
      '{{applicationUrl}}',
      '',
      'If you have questions, you can reply here or call me at 479-546-6740.',
      '',
      'Best,',
      'Jake Engel',
    ].join('\n'),
  },
];

