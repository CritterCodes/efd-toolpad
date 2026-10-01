import { detectInHouseStrength } from '@/services/signals/inhouse-detection.service.js';
import { extractReviewSignals } from '@/services/reviews/review-signals.service.js';
import { normalizeString } from './shared';
export const normalizeWebsiteUrl = (website) => {
  const raw = normalizeString(website);
  if (!raw) return null;
  try {
    return new URL(raw.startsWith('http') ? raw : `https://${raw}`);
  } catch {
    return null;
  }
};

export const SOCIAL_RESEARCH_HOSTS = [
  'facebook.com',
  'instagram.com',
  'linkedin.com',
  'x.com',
  'twitter.com',
  'tiktok.com',
  'youtube.com',
  'yelp.com',
];

export const isUnsupportedResearchHost = (url) => {
  const host = String(url?.hostname || '').replace(/^www\./, '').toLowerCase();
  return SOCIAL_RESEARCH_HOSTS.some((blocked) => host === blocked || host.endsWith(`.${blocked}`));
};

export const decodeHtmlEntities = (value = '') => String(value)
  .replace(/&#64;|&commat;/gi, '@')
  .replace(/&#46;|&period;/gi, '.')
  .replace(/&amp;/gi, '&');

export const cleanEmailCandidate = (email) => normalizeString(email)
  .toLowerCase()
  .replace(/^mailto:/, '')
  .replace(/[?].*$/, '')
  .replace(/^[^a-z0-9]+|[^a-z0-9.]+$/gi, '');

export const isUsefulEmail = (email) => {
  if (!email || !email.includes('@')) return false;
  const lower = email.toLowerCase();
  return ![
    '.png',
    '.jpg',
    '.jpeg',
    '.gif',
    '.webp',
    '.svg',
    'example.com',
    'sentry.io',
    'wixpress.com',
    'shopify.com',
    'wordpress.com',
  ].some((blocked) => lower.includes(blocked));
};

export const extractEmailsFromHtml = (html = '') => {
  const decoded = decodeHtmlEntities(html);
  const emails = new Set();
  const mailtoRegex = /mailto:([^"'<>\s?]+)/gi;
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  for (const match of decoded.matchAll(mailtoRegex)) {
    const email = cleanEmailCandidate(match[1]);
    if (isUsefulEmail(email)) emails.add(email);
  }
  for (const match of decoded.matchAll(emailRegex)) {
    const email = cleanEmailCandidate(match[0]);
    if (isUsefulEmail(email)) emails.add(email);
  }
  return [...emails];
};

export const extractVisibleWebsiteText = (html = '') => decodeHtmlEntities(html)
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
  .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

export const includesAny = (text, patterns) => patterns.some((pattern) => pattern.test(text));

export const buildWebsiteSignals = (text = '') => {
  const normalized = text.toLowerCase();
  const inHouseDetection = detectInHouseStrength(normalized);
  const outsourcingEvidence = includesAny(normalized, [/\bsend out\b/, /\bsent out\b/, /\bsend it off\b/, /\bsent it off\b/, /\boff-?site\b/, /\bpartner jeweler\b/, /\bhandled by partner\b/, /\boutsourc/]);
  const timeEstimateMentioned = includesAny(normalized, [/\b\d+\s*-\s*\d+\s*(business\s*)?days\b/, /\b\d+\s*-\s*\d+\s*weeks\b/, /\bweeks?\b/, /\b7\s*-\s*10\s*days\b/]);
  const vagueRepairMention = includesAny(normalized, [/\bwe offer repair\b/, /\brepair services available\b/, /\bask us about repair\b/]) && !inHouseDetection.hasStrongInHouse;
  return {
    jewelryMentioned: includesAny(normalized, [/\bjewel/, /\bdiamond/, /\bgold/, /\bring/, /\bbridal/, /\bengagement/]),
    repairMentioned: includesAny(normalized, [/\brepair/, /\bfix/, /\bbench jeweler/, /\bsizing/, /\bstone setting/, /\bwatch battery/]),
    refurbishmentMentioned: includesAny(normalized, [/\brefurb/, /\brestore/, /\brestoration/, /\bpolish/, /\bcleaning/, /\bpre-owned/, /\bpreowned/, /\bestate jewelry/, /\bused jewelry/]),
    pawnMentioned: includesAny(normalized, [/\bpawn/, /\bcollateral loan/, /\bcash loan/]),
    goldBuyingMentioned: includesAny(normalized, [/\bbuy gold/, /\bcash for gold/, /\bgold buyer/, /\bscrap gold/]),
    inHouseRepairMentioned: inHouseDetection.inHouseRepairStrength > 0,
    strongInHouseRepairMentioned: inHouseDetection.hasStrongInHouse,
    inHouseRepairStrength: inHouseDetection.inHouseRepairStrength,
    staffJewelerMentioned: Boolean(inHouseDetection.staffSignal),
    outsourcingEvidence,
    timeEstimateMentioned,
    vagueRepairMention,
    manualSystemOpportunity: includesAny(normalized, [/\bpaper/, /\benvelope/, /\bmanual/, /\bdrop off/, /\bintake/, /\btracking/, /\bticket/]),
  };
};

export const buildRepairTextSignals = (text = '') => {
  const normalized = String(text || '').toLowerCase();
  return {
    jewelryMentioned: includesAny(normalized, [/\bjewel/, /\bdiamond/, /\bgold/, /\bring/, /\bbridal/, /\bengagement/]),
    repairMentioned: includesAny(normalized, [/\brepair/, /\bfix/, /\bchain repair/, /\bring sizing/, /\bresizing/, /\bsizing/, /\bstone setting/, /\bwatch battery/, /\bwatch repair/]),
    refurbishmentMentioned: includesAny(normalized, [/\brefurb/, /\brestore/, /\brestoration/, /\bpolish/, /\bcleaning/, /\bcleaned/, /\bpre-owned/, /\bpreowned/, /\bestate jewelry/, /\bused jewelry/]),
    ownerJewelerMentioned: includesAny(normalized, [/\bowner[^.!?]{0,80}\bjeweler/, /\bjeweler[^.!?]{0,80}\bowner/, /\bmaster jeweler/, /\bbench jeweler/, /\bgoldsmith/]),
    chainRepairMentioned: includesAny(normalized, [/\bchain repair/, /\brepaired my chain/, /\bfixed my chain/, /\bnecklace repair/]),
    ringSizingMentioned: includesAny(normalized, [/\bring sizing/, /\bresized my ring/, /\bring resized/, /\bsized my ring/]),
    watchRepairMentioned: includesAny(normalized, [/\bwatch repair/, /\bwatch battery/, /\brepaired my watch/]),
    stoneSettingMentioned: includesAny(normalized, [/\bstone setting/, /\bset my stone/, /\bstone reset/, /\bprong/]),
    repeatIssueMentioned: includesAny(normalized, [/\bbroke again/, /\bcame loose again/, /\bfell out again/]),
    outsourcingEvidence: includesAny(normalized, [/\bsent it off/, /\bsend it off/, /\bhad to send/, /\bthey ship it/, /\boff-?site/, /\bsent out/]),
    turnaroundComplaint: includesAny(normalized, [/\btook weeks/, /\bweeks to repair/, /\btook too long/, /\blong wait/, /\bdelayed/, /\bstill waiting/, /\bsent it off/, /\bsend it off/, /\bshipped.*repair/]),
  };
};

export const summarizeGoogleReviews = (reviews = []) => {
  const normalizedReviews = reviews
    .map((review) => ({
      authorName: review.authorName || review.author_name || '',
      rating: review.rating ?? null,
      relativeTimeDescription: review.relativeTimeDescription || review.relative_time_description || '',
      text: normalizeString(review.text).slice(0, 1000),
      time: review.time instanceof Date
        ? review.time
        : review.time
          ? new Date(typeof review.time === 'number' ? review.time * 1000 : review.time)
          : null,
    }))
    .filter((review) => review.text);
  const snippets = normalizedReviews
    .map((review) => normalizeString(review.text || review.relativeTimeDescription || ''))
    .filter(Boolean)
    .slice(0, 5)
    .map((text) => text.slice(0, 450));
  const combinedText = snippets.join(' ');
  const reviewTruthSignals = extractReviewSignals(normalizedReviews);
  const textSignals = buildRepairTextSignals(combinedText);
  return {
    reviews: normalizedReviews.slice(0, 5),
    snippets,
    summary: snippets.join(' ').slice(0, 1200),
    signals: {
      ...textSignals,
      repairVolume: reviewTruthSignals.repairVolume,
      repairMentions: reviewTruthSignals.repairMentions,
      outsourcingEvidence: textSignals.outsourcingEvidence || reviewTruthSignals.outsourcingEvidence,
      turnaroundComplaint: textSignals.turnaroundComplaint || reviewTruthSignals.turnaroundComplaints,
      repeatIssueMentioned: textSignals.repeatIssueMentioned || reviewTruthSignals.repeatIssues,
      mentionsSpecificRepairs: reviewTruthSignals.mentionsSpecificRepairs,
    },
    truthSignals: reviewTruthSignals,
    checkedAt: new Date(),
  };
};

export const buildWebsiteSummary = (pages = [], maxLength = 900) => {
  const snippets = [];
  const signalWords = [
    'pawn',
    'jewel',
    'repair',
    'restore',
    'polish',
    'cleaning',
    'pre-owned',
    'estate',
    'gold',
    'watch',
    'bridal',
    'loan',
    'cash',
    'service',
  ];

  for (const page of pages) {
    const sentences = page.text
      .split(/(?<=[.!?])\s+/)
      .map((sentence) => sentence.trim())
      .filter(Boolean);
    for (const sentence of sentences) {
      const lower = sentence.toLowerCase();
      if (signalWords.some((word) => lower.includes(word))) snippets.push(sentence.slice(0, 220));
      if (snippets.length >= 10) break;
    }
    if (snippets.length >= 10) break;
  }

  const summary = snippets.join(' ').replace(/\s+/g, ' ').trim();
  if (summary) return summary.slice(0, maxLength);
  return pages.map((page) => page.text).join(' ').replace(/\s+/g, ' ').trim().slice(0, maxLength);
};

export const sameHostUrl = (baseUrl, path) => {
  try {
    const nextUrl = new URL(path, baseUrl);
    return nextUrl.hostname === baseUrl.hostname ? nextUrl : null;
  } catch {
    return null;
  }
};

export const isSameOrSubHost = (baseUrl, url) => url.hostname === baseUrl.hostname || url.hostname.endsWith(`.${baseUrl.hostname}`);

export async function fetchPageText(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 9000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 EngelFineDesign wholesale lead research',
        Accept: 'text/html,application/xhtml+xml',
      },
    });
    const contentType = response.headers.get('content-type') || '';
    if (!response.ok || !contentType.includes('text/html')) return '';
    return response.text();
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchTextUrl(url, { accept = '*/*', timeoutMs = 9000 } = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 EngelFineDesign wholesale lead research',
        Accept: accept,
      },
    });
    if (!response.ok) return '';
    return response.text();
  } finally {
    clearTimeout(timeout);
  }
}

export const parseRobotsTxt = (robotsText = '') => {
  const sitemapUrls = [];
  const disallowPaths = [];
  for (const line of String(robotsText || '').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const sitemapMatch = trimmed.match(/^sitemap:\s*(.+)$/i);
    if (sitemapMatch) sitemapUrls.push(sitemapMatch[1].trim());
    const disallowMatch = trimmed.match(/^disallow:\s*(.+)$/i);
    if (disallowMatch) {
      const path = disallowMatch[1].trim();
      if (path && path !== '/') disallowPaths.push(path);
    }
  }
  return { sitemapUrls, disallowPaths };
};

export async function fetchRobotsTxt(baseUrl) {
  const robotsUrl = new URL('/robots.txt', baseUrl);
  try {
    const robotsText = await fetchTextUrl(robotsUrl.toString(), { accept: 'text/plain,*/*', timeoutMs: 6000 });
    const parsed = parseRobotsTxt(robotsText);
    return {
      url: robotsUrl.toString(),
      found: Boolean(robotsText),
      ...parsed,
    };
  } catch {
    return { url: robotsUrl.toString(), found: false, sitemapUrls: [], disallowPaths: [] };
  }
}

export const parseSitemapUrls = (xml = '') => {
  const decoded = decodeHtmlEntities(xml);
  return [...decoded.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)]
    .map((match) => normalizeString(match[1]))
    .filter(Boolean);
};

export const normalizeResearchUrl = (baseUrl, value) => {
  try {
    const url = new URL(value, baseUrl);
    url.hash = '';
    return isSameOrSubHost(baseUrl, url) ? url.toString() : '';
  } catch {
    return '';
  }
};

export const isLikelyXmlSitemap = (url = '') => /\.xml(\?|$)/i.test(url) || /sitemap/i.test(url);

export async function discoverSitemapUrls(baseUrl, robots = null, depth = 0) {
  const candidates = [
    ...(robots?.sitemapUrls || []),
    '/sitemap.xml',
    '/sitemap_index.xml',
    '/wp-sitemap.xml',
  ]
    .map((url) => normalizeResearchUrl(baseUrl, url))
    .filter(Boolean);

  const sitemapUrls = [];
  const pageUrls = [];
  const seenSitemaps = new Set();

  for (const sitemapUrl of [...new Set(candidates)]) {
    if (seenSitemaps.has(sitemapUrl)) continue;
    seenSitemaps.add(sitemapUrl);
    try {
      const xml = await fetchTextUrl(sitemapUrl, { accept: 'application/xml,text/xml,*/*', timeoutMs: 7000 });
      if (!xml) continue;
      sitemapUrls.push(sitemapUrl);
      for (const loc of parseSitemapUrls(xml)) {
        const normalized = normalizeResearchUrl(baseUrl, loc);
        if (!normalized) continue;
        if (isLikelyXmlSitemap(normalized) && depth < 1) {
          const nested = await discoverSitemapUrls(baseUrl, { sitemapUrls: [normalized] }, depth + 1);
          sitemapUrls.push(...nested.sitemapUrls);
          pageUrls.push(...nested.pageUrls);
        } else {
          pageUrls.push(normalized);
        }
      }
    } catch {
      // Sitemap discovery is a quality boost, not a blocker.
    }
  }

  return {
    sitemapUrls: [...new Set(sitemapUrls)],
    pageUrls: [...new Set(pageUrls)],
  };
}

export const isDisallowedByRobots = (url, disallowPaths = []) => {
  if (!disallowPaths.length) return false;
  let pathname = '';
  try {
    pathname = new URL(url).pathname || '/';
  } catch {
    return false;
  }
  return disallowPaths.some((path) => {
    if (!path || path === '/') return true;
    const normalized = path.endsWith('*') ? path.slice(0, -1) : path;
    return normalized && pathname.startsWith(normalized);
  });
};

export const rankWebsiteResearchUrl = (url = '') => {
  const lower = String(url || '').toLowerCase();
  if (/(cart|checkout|account|login|privacy|terms|policy|shipping|returns|blog|news|category|collections|product|products|cdn|image|jpg|jpeg|png|webp|pdf)(\/|$|-|_|\.)/.test(lower)) return -100;
  let score = 0;
  if (/(jewelry-?repair|repair|repairs|watch-?repair|services?)(\/|$|-|_|\.)/.test(lower)) score += 100;
  if (/(about|team|staff|jewelers?|goldsmith|watchmaker|bench)(\/|$|-|_|\.)/.test(lower)) score += 85;
  if (/(pawn|estate|appraisal|custom|restore|restoration|sizing)(\/|$|-|_|\.)/.test(lower)) score += 45;
  if (lower.endsWith('/')) score += 5;
  return score;
};

export const rankedWebsiteResearchUrls = async (baseUrl, fallbackPaths = []) => {
  const robots = await fetchRobotsTxt(baseUrl);
  const sitemap = await discoverSitemapUrls(baseUrl, robots);
  const sitemapTargets = sitemap.pageUrls
    .map((url) => ({ url, score: rankWebsiteResearchUrl(url), source: 'sitemap' }))
    .filter((item) => item.score > 0 && !isDisallowedByRobots(item.url, robots.disallowPaths))
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);
  const fallbackTargets = fallbackPaths
    .map((path) => sameHostUrl(baseUrl, path)?.toString())
    .filter(Boolean)
    .filter((url) => !isDisallowedByRobots(url, robots.disallowPaths))
    .map((url) => ({ url, score: rankWebsiteResearchUrl(url), source: 'fallback' }));

  const seen = new Set();
  const targets = [];
  for (const target of [...sitemapTargets, ...fallbackTargets]) {
    if (seen.has(target.url)) continue;
    seen.add(target.url);
    targets.push(target);
  }

  return {
    targets,
    robots,
    sitemap,
  };
};

