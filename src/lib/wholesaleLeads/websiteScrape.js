import { detectInHouseStrength } from '@/services/signals/inhouse-detection.service.js';
import { buildWebsiteSignals, buildWebsiteSummary, extractEmailsFromHtml, extractVisibleWebsiteText, fetchPageText, isUnsupportedResearchHost, normalizeWebsiteUrl, rankedWebsiteResearchUrls, sameHostUrl, summarizeGoogleReviews } from './websiteResearch';
import { buildActivity, normalizeString, objectIdFilter } from './shared';
import { googleFetch } from './googlePlaces';
export async function discoverEmailFromWebsite(website) {
  const baseUrl = normalizeWebsiteUrl(website);
  if (!baseUrl) return { email: null, checkedUrls: [], candidates: [] };
  if (isUnsupportedResearchHost(baseUrl)) return { email: null, checkedUrls: [], candidates: [], skippedReason: 'unsupported_social_or_directory_host' };

  const paths = [
    '/',
    '/contact',
    '/contact-us',
    '/about',
    '/about-us',
    '/repair',
    '/services',
  ];
  const checkedUrls = [];
  const candidates = [];

  for (const path of paths) {
    const url = sameHostUrl(baseUrl, path);
    if (!url) continue;
    const href = url.toString();
    if (checkedUrls.includes(href)) continue;
    checkedUrls.push(href);
    try {
      const html = await fetchPageText(href);
      const emails = extractEmailsFromHtml(html);
      for (const email of emails) {
        if (!candidates.includes(email)) candidates.push(email);
      }
      if (candidates.length) break;
    } catch {
      // Keep discovery best-effort; bad websites should not block imports.
    }
  }

  return { email: candidates[0] || null, checkedUrls, candidates };
}

export async function scrapeWholesaleLeadWebsiteResearch(website) {
  const baseUrl = normalizeWebsiteUrl(website);
  if (!baseUrl) return { checkedUrls: [], pages: [], summary: '', signals: {}, checkedAt: new Date() };
  if (isUnsupportedResearchHost(baseUrl)) {
    return {
      checkedUrls: [],
      pages: [],
      summary: '',
      signals: {},
      skippedReason: 'unsupported_social_or_directory_host',
      checkedAt: new Date(),
    };
  }

  const paths = [
    '/services',
    '/repair',
    '/jewelry-repair',
    '/repairs',
    '/jewelry-services',
    '/watch-repair',
    '/about',
    '/about-us',
    '/team',
    '/our-team',
    '/staff',
    '/jewelers',
    '/goldsmith',
    '/',
    '/pawn',
    '/contact',
    '/contact-us',
  ];
  const discovery = await rankedWebsiteResearchUrls(baseUrl, paths);
  const checkedUrls = [];
  const pages = [];

  for (const target of discovery.targets) {
    const href = target.url;
    if (checkedUrls.includes(href)) continue;
    checkedUrls.push(href);
    try {
      const html = await fetchPageText(href);
      const text = extractVisibleWebsiteText(html);
      if (text) {
        pages.push({
          url: href,
          source: target.source,
          title: normalizeString(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]).slice(0, 120),
          text: text.slice(0, 3500),
        });
      }
    } catch {
      // Website research is best-effort; one bad path should not block scoring.
    }
    if (pages.length >= 5) break;
  }

  const combinedText = pages.map((page) => page.text).join(' ');
  const signals = buildWebsiteSignals(combinedText);
  const inHouseDetection = detectInHouseStrength(combinedText);
  return {
    checkedUrls,
    robots: {
      url: discovery.robots.url,
      found: discovery.robots.found,
      sitemapUrls: discovery.robots.sitemapUrls,
      disallowPaths: discovery.robots.disallowPaths.slice(0, 20),
    },
    sitemap: {
      sitemapUrls: discovery.sitemap.sitemapUrls,
      discoveredPageCount: discovery.sitemap.pageUrls.length,
      selectedPageUrls: discovery.targets.filter((target) => target.source === 'sitemap').map((target) => target.url),
    },
    pages: pages.map((page) => ({ url: page.url, source: page.source, title: page.title, textSnippet: page.text.slice(0, 900) })),
    summary: buildWebsiteSummary(pages),
    signals: {
      ...signals,
      inHouseDetection,
    },
    checkedAt: new Date(),
  };
}

export async function hydrateLeadWebsiteResearch(collection, lead, actor) {
  if (!lead?.website) return lead;
  if ((lead.websiteResearch?.summary || lead.websiteSummary) && (lead.websiteResearch?.robots || lead.websiteResearch?.sitemap || lead.websiteResearch?.skippedReason)) return lead;

  const research = await scrapeWholesaleLeadWebsiteResearch(lead.website);
  const inHouseStrength = Number(research.signals?.inHouseRepairStrength || research.signals?.inHouseDetection?.inHouseRepairStrength || 0);
  const patch = {
    websiteResearch: research,
    websiteSummary: research.summary,
    websiteSignals: research.signals,
    truthSignals: {
      ...(lead.truthSignals || {}),
      strongInHouse: Boolean(lead.truthSignals?.strongInHouse || research.signals?.strongInHouseRepairMentioned || inHouseStrength >= 0.8),
    },
    signalBreakdown: {
      ...(lead.signalBreakdown || {}),
      inHouseDetected: Boolean(lead.signalBreakdown?.inHouseDetected || research.signals?.strongInHouseRepairMentioned || inHouseStrength >= 0.8),
      inHouseRepairStrength: Math.max(Number(lead.signalBreakdown?.inHouseRepairStrength || 0), inHouseStrength),
      websiteOutsourcingDetected: Boolean(research.signals?.outsourcingEvidence),
      websiteVagueRepairMention: Boolean(research.signals?.vagueRepairMention),
      websiteTimeEstimateMentioned: Boolean(research.signals?.timeEstimateMentioned),
    },
    websiteResearchCheckedAt: research.checkedAt,
    updatedAt: new Date(),
    updatedBy: actor || null,
  };
  await collection.updateOne(
    objectIdFilter(lead._id?.toString() || lead.leadId),
    {
      $set: patch,
      $push: {
        activity: buildActivity({
          type: 'website_research',
          message: research.summary ? 'Website research captured for scoring' : 'Website research found no usable page text',
          actor,
          metadata: { checkedUrls: research.checkedUrls, signals: research.signals },
        }),
      },
    },
  );
  return { ...lead, ...patch };
}

export async function hydrateLeadGoogleReviewResearch(collection, lead, actor) {
  if (!lead?.googlePlaceId) return lead;
  if (lead.googleReviewResearch?.summary || lead.googleReviewSummary) return lead;

  if (lead.googleReviews?.length) {
    const googleReviewResearch = summarizeGoogleReviews(lead.googleReviews);
    const patch = {
      googleReviewResearch,
      googleReviewSummary: googleReviewResearch.summary,
      googleReviewSignals: googleReviewResearch.signals,
      truthSignals: {
        ...(lead.truthSignals || {}),
        outsourcingEvidence: Boolean(lead.truthSignals?.outsourcingEvidence || googleReviewResearch.truthSignals.outsourcingEvidence),
        turnaroundComplaints: Boolean(lead.truthSignals?.turnaroundComplaints || googleReviewResearch.truthSignals.turnaroundComplaints),
        repairVolume: Math.max(Number(lead.truthSignals?.repairVolume || 0), Number(googleReviewResearch.truthSignals.repairVolume || 0)),
        repeatIssues: Boolean(lead.truthSignals?.repeatIssues || googleReviewResearch.truthSignals.repeatIssues),
        mentionsSpecificRepairs: Boolean(lead.truthSignals?.mentionsSpecificRepairs || googleReviewResearch.truthSignals.mentionsSpecificRepairs),
      },
      googleReviewCheckedAt: googleReviewResearch.checkedAt,
      updatedAt: new Date(),
      updatedBy: actor || null,
    };
    await collection.updateOne(
      objectIdFilter(lead._id?.toString() || lead.leadId),
      { $set: patch },
    );
    return { ...lead, ...patch };
  }

  const detailsPayload = await googleFetch('details', {
    place_id: lead.googlePlaceId,
    fields: 'reviews,rating,user_ratings_total',
  });
  const googleReviewResearch = summarizeGoogleReviews(detailsPayload.result?.reviews || []);
  const patch = {
    googleReviews: googleReviewResearch.reviews,
    googleReviewResearch,
    googleReviewSummary: googleReviewResearch.summary,
    googleReviewSignals: googleReviewResearch.signals,
    truthSignals: {
      ...(lead.truthSignals || {}),
      outsourcingEvidence: Boolean(lead.truthSignals?.outsourcingEvidence || googleReviewResearch.truthSignals.outsourcingEvidence),
      turnaroundComplaints: Boolean(lead.truthSignals?.turnaroundComplaints || googleReviewResearch.truthSignals.turnaroundComplaints),
      repairVolume: Math.max(Number(lead.truthSignals?.repairVolume || 0), Number(googleReviewResearch.truthSignals.repairVolume || 0)),
      repeatIssues: Boolean(lead.truthSignals?.repeatIssues || googleReviewResearch.truthSignals.repeatIssues),
      mentionsSpecificRepairs: Boolean(lead.truthSignals?.mentionsSpecificRepairs || googleReviewResearch.truthSignals.mentionsSpecificRepairs),
    },
    googleReviewCheckedAt: googleReviewResearch.checkedAt,
    googleRating: detailsPayload.result?.rating ?? lead.googleRating ?? null,
    googleReviewCount: detailsPayload.result?.user_ratings_total ?? lead.googleReviewCount ?? null,
    updatedAt: new Date(),
    updatedBy: actor || null,
  };

  await collection.updateOne(
    objectIdFilter(lead._id?.toString() || lead.leadId),
    {
      $set: patch,
      $push: {
        activity: buildActivity({
          type: 'google_reviews',
          message: googleReviewResearch.summary ? 'Google review snippets captured for scoring' : 'Google reviews found no usable snippets',
          actor,
          metadata: { signals: googleReviewResearch.signals },
        }),
      },
    },
  );
  return { ...lead, ...patch };
}

