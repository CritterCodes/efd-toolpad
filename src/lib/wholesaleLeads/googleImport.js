import { buildProfiles } from '@/services/lookalike/lookalike.profile.service.js';
import { distanceMilesBetween, googleFetch, googlePlacesNewTextSearchPages, parseLatLng } from './googlePlaces';
import { summarizeGoogleReviews } from './websiteResearch';
import { DEFAULT_DISCOVER_EMAILS, DEFAULT_IMPORT_MAX_CANDIDATES, DEFAULT_IMPORT_MIN_SCORE, DEFAULT_RADIUS_METERS, DEFAULT_SEARCH_LOCATIONS, DEFAULT_SEARCH_QUERIES, GEMINI_MODEL, METERS_PER_MILE, buildActivity, getLeadsCollection, normalizeLeadKey, normalizeString, serializeLead } from './shared';
import { findDuplicateLead } from './shared';
import { discoverEmailFromWebsite, scrapeWholesaleLeadWebsiteResearch } from './websiteScrape';
import { evaluateWholesaleLead } from './scoring';
export async function getSearchCenter() {
  const placeId = process.env.NEXT_PUBLIC_GOOGLE_PLACE_ID;
  if (!placeId) throw new Error('NEXT_PUBLIC_GOOGLE_PLACE_ID is not configured');
  const details = await googleFetch('details', {
    place_id: placeId,
    fields: 'geometry,name',
  });
  const location = details.result?.geometry?.location;
  if (!location?.lat || !location?.lng) throw new Error('Could not resolve EFD Google Place ID location');
  return `${location.lat},${location.lng}`;
}

export const mapGoogleLead = (place, details = {}, efdCoordinates = null) => {
  const addressComponents = details.address_components || [];
  const getComponent = (type) => addressComponents.find((item) => item.types?.includes(type))?.short_name || '';
  const city = getComponent('locality') || getComponent('postal_town') || getComponent('administrative_area_level_3');
  const state = getComponent('administrative_area_level_1');
  const zip = getComponent('postal_code');
  const coordinates = details.geometry?.location
    ? { latitude: details.geometry.location.lat, longitude: details.geometry.location.lng }
    : null;
  const googleReviewResearch = summarizeGoogleReviews(details.reviews || []);
  return {
    storeName: details.name || place.name,
    phone: details.formatted_phone_number || null,
    website: details.website || null,
    address: details.formatted_address || place.formatted_address || place.vicinity || null,
    city: city || null,
    state: state || null,
    zip: zip || null,
    googlePlaceId: place.place_id,
    googleRating: details.rating ?? place.rating ?? null,
    googleReviewCount: details.user_ratings_total ?? place.user_ratings_total ?? null,
    googleBusinessTypes: details.types || place.types || [],
    googleUrl: details.url || null,
    googleReviews: (details.reviews || []).map((review) => ({
      authorName: review.author_name || '',
      rating: review.rating ?? null,
      relativeTimeDescription: review.relative_time_description || '',
      text: normalizeString(review.text).slice(0, 1000),
      time: review.time ? new Date(review.time * 1000) : null,
    })),
    googleReviewResearch,
    googleReviewSummary: googleReviewResearch.summary,
    googleReviewSignals: googleReviewResearch.signals,
    truthSignals: {
      outsourcingEvidence: googleReviewResearch.truthSignals.outsourcingEvidence,
      turnaroundComplaints: googleReviewResearch.truthSignals.turnaroundComplaints,
      repairVolume: googleReviewResearch.truthSignals.repairVolume,
      repeatIssues: googleReviewResearch.truthSignals.repeatIssues,
      mentionsSpecificRepairs: googleReviewResearch.truthSignals.mentionsSpecificRepairs,
      strongInHouse: false,
    },
    signalBreakdown: {
      inHouseDetected: false,
      inHouseRepairStrength: 0,
      outsourcingDetected: googleReviewResearch.truthSignals.outsourcingEvidence,
      reviewRepairVolume: googleReviewResearch.truthSignals.repairVolume,
      turnaroundIssues: googleReviewResearch.truthSignals.turnaroundComplaints,
      repeatIssues: googleReviewResearch.truthSignals.repeatIssues,
    },
    googleReviewCheckedAt: googleReviewResearch.checkedAt,
    latitude: coordinates?.latitude ?? null,
    longitude: coordinates?.longitude ?? null,
    distanceMiles: distanceMilesBetween(efdCoordinates, coordinates),
            source: 'google_places',
            sourceType: 'prospect',
  };
};

export async function importGoogleWholesaleLeads({
  queries = DEFAULT_SEARCH_QUERIES,
  searchLocations = DEFAULT_SEARCH_LOCATIONS,
  radiusMeters = DEFAULT_RADIUS_METERS,
  autoScore = true,
  minImportScore = DEFAULT_IMPORT_MIN_SCORE,
  maxCandidates = DEFAULT_IMPORT_MAX_CANDIDATES,
  discoverEmails = DEFAULT_DISCOVER_EMAILS,
  onProgress = null,
} = {}, actor) {
  const collection = await getLeadsCollection();
  const normalizedLocations = Array.isArray(searchLocations)
    ? searchLocations.map(normalizeString).filter(Boolean)
    : [];
  const searchLocationList = normalizedLocations.length ? [...new Set(normalizedLocations)] : DEFAULT_SEARCH_LOCATIONS;
  const useLocalCenter = searchLocationList.length === 1 && !searchLocationList[0];
  const location = useLocalCenter ? await getSearchCenter() : null;
  const radiusLimitMiles = useLocalCenter && Number(radiusMeters) > 0
    ? Number(radiusMeters) / METERS_PER_MILE
    : null;
  let efdCoordinates = parseLatLng(location);
  if (!efdCoordinates) {
    try {
      efdCoordinates = parseLatLng(await getSearchCenter());
    } catch {
      efdCoordinates = null;
    }
  }
  const imported = [];
  const duplicates = [];
  const notFit = [];
  const scoringErrors = [];
  const searchErrors = [];
  const detailErrors = [];
  const emailDiscoveries = [];
  const outOfRadius = [];
  const seenPlaceIds = new Set();
  let processedCandidates = 0;
  const updateProgress = async (patch = {}) => {
    if (typeof onProgress === 'function') {
      await onProgress({
        processedCandidates,
        saved: imported.length,
        duplicates: duplicates.length,
        rejected: notFit.length,
        notFit: notFit.length,
        scoringErrors: scoringErrors.length,
        searchErrors: searchErrors.length,
        detailErrors: detailErrors.length,
        emailDiscoveries: emailDiscoveries.length,
        outOfRadius: outOfRadius.length,
        ...patch,
      });
    }
  };

  for (const searchLocation of searchLocationList) {
    if (processedCandidates >= maxCandidates) break;

    for (const query of queries.length ? queries : DEFAULT_SEARCH_QUERIES) {
      if (processedCandidates >= maxCandidates) break;
      const effectiveQuery = searchLocation ? `${query} ${searchLocation}` : query;
      await updateProgress({ phase: 'searching', currentQuery: effectiveQuery });

      let searchPages = [];
      try {
        searchPages = await googlePlacesNewTextSearchPages({
          query: effectiveQuery,
          location,
          radiusMeters: useLocalCenter ? radiusMeters : undefined,
        });
      } catch (error) {
        searchErrors.push({ query: effectiveQuery, error: error.message });
        await updateProgress({ phase: 'search_failed', currentQuery: effectiveQuery, currentCandidate: error.message });
        continue;
      }

      for (const searchPayload of searchPages) {
        for (const place of searchPayload.results || []) {
          if (processedCandidates >= maxCandidates) break;
          if (!place.place_id || seenPlaceIds.has(place.place_id)) continue;
          seenPlaceIds.add(place.place_id);

          const existingByPlace = await collection.findOne({ googlePlaceId: place.place_id });
          if (existingByPlace) {
            duplicates.push(serializeLead(existingByPlace));
            await updateProgress({ phase: 'known_place', currentCandidate: place.name || place.place_id });
            continue;
          }

          processedCandidates += 1;
          await updateProgress({ phase: 'fetching_details', currentCandidate: place.name || place.place_id });

          let detailsPayload = null;
          try {
            detailsPayload = await googleFetch('details', {
              place_id: place.place_id,
              fields: 'name,formatted_address,address_component,formatted_phone_number,website,rating,user_ratings_total,type,url,geometry,reviews',
            });
          } catch (error) {
            detailErrors.push({ placeId: place.place_id, storeName: place.name || '', error: error.message });
            await updateProgress({ phase: 'detail_failed', currentCandidate: place.name || place.place_id });
            continue;
          }

          const leadPayload = mapGoogleLead(place, detailsPayload.result || {}, efdCoordinates);
          if (radiusLimitMiles !== null) {
            const distanceMiles = Number(leadPayload.distanceMiles);
            if (!Number.isFinite(distanceMiles) || distanceMiles > radiusLimitMiles) {
              outOfRadius.push({
                placeId: place.place_id,
                storeName: leadPayload.storeName || place.name || '',
                address: leadPayload.address || '',
                distanceMiles: Number.isFinite(distanceMiles) ? distanceMiles : null,
                radiusMiles: radiusLimitMiles,
              });
              await updateProgress({
                phase: 'outside_radius',
                currentCandidate: `${leadPayload.storeName || place.name || place.place_id}${Number.isFinite(distanceMiles) ? ` (${distanceMiles.toFixed(1)} mi)` : ''}`,
              });
              continue;
            }
          }
          const lead = {
            ...leadPayload,
            leadId: `WLEAD-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            status: 'new',
            contactName: null,
            contactTitle: null,
            email: null,
            fitScore: null,
            scoreSource: null,
            aiScore: null,
            aiConfidence: null,
            aiSummary: '',
            likelyRepairNeed: '',
            aiConcerns: [],
            recommendedOutreachAngle: '',
            outreachDraft: null,
            websiteResearch: null,
            websiteSummary: '',
            websiteSignals: {},
            websiteResearchCheckedAt: null,
            notes: '',
            nextFollowUpAt: null,
            lastContactedAt: null,
            shippingRequired: false,
            preferredCarrier: null,
            shippingNotes: '',
            estimatedMonthlyRepairs: null,
            invitedApplicationEmail: null,
            inviteSentAt: null,
            linkedUserId: null,
            linkedWholesaleApplicationId: null,
            linkedWholesalerUserId: null,
            normalizedName: normalizeLeadKey(leadPayload.storeName),
            normalizedAddress: normalizeLeadKey(leadPayload.address),
            searchLocation: searchLocation || null,
            activity: [buildActivity({ type: 'imported', message: `Imported from Google Places search: ${effectiveQuery}`, actor })],
            createdAt: new Date(),
            updatedAt: new Date(),
            createdBy: actor || null,
            updatedBy: actor || null,
          };

          const duplicate = await findDuplicateLead(collection, lead);
          if (duplicate) {
            duplicates.push(serializeLead(duplicate));
            await updateProgress({ phase: 'duplicate', currentCandidate: lead.storeName });
            continue;
          }

          if (lead.website) {
            try {
              await updateProgress({ phase: 'website_research', currentCandidate: lead.storeName });
              const research = await scrapeWholesaleLeadWebsiteResearch(lead.website);
              lead.websiteResearch = research;
              lead.websiteSummary = research.summary;
              lead.websiteSignals = research.signals;
              lead.websiteResearchCheckedAt = research.checkedAt;
              lead.activity.push(buildActivity({
                type: 'website_research',
                message: research.summary ? 'Website research captured for scoring' : 'Website research found no usable page text',
                actor,
                metadata: { checkedUrls: research.checkedUrls, signals: research.signals },
              }));
            } catch {
              // Keep import moving if a website blocks scraping.
            }
          }

          if (autoScore) {
            try {
              await updateProgress({ phase: 'scoring', currentCandidate: lead.storeName });
              const scoreUpdate = await evaluateWholesaleLead(lead);
              const isNotFit = Number(scoreUpdate.fitScore) < Number(minImportScore);
              Object.assign(lead, {
                ...scoreUpdate,
                status: isNotFit ? 'not_fit' : scoreUpdate.status,
                sourceType: isNotFit ? 'not_fit' : scoreUpdate.sourceType,
                activity: [
                  ...lead.activity,
                  buildActivity({
                    type: 'ai_score',
                    message: `AI fit score set to ${scoreUpdate.fitScore}`,
                    actor,
                    metadata: { model: GEMINI_MODEL, minImportScore },
                  }),
                ],
              });
              if (isNotFit) notFit.push(serializeLead(lead));
            } catch (error) {
              scoringErrors.push({ storeName: lead.storeName, error: error.message });
              Object.assign(lead, {
                status: 'researching',
                sourceType: 'prospect',
                scoreSource: 'score_error',
                scoreError: error.message,
                activity: [
                  ...lead.activity,
                  buildActivity({
                    type: 'score_failed',
                    message: `Scoring failed: ${error.message}`,
                    actor,
                    metadata: { model: GEMINI_MODEL },
                  }),
                ],
              });
              await updateProgress({ phase: 'score_failed_saved_unscored', currentCandidate: lead.storeName });
            }
          }

          if (discoverEmails && lead.website && lead.status !== 'not_fit') {
            await updateProgress({ phase: 'finding_email', currentCandidate: lead.storeName });
            const discovery = await discoverEmailFromWebsite(lead.website);
            if (discovery.email) {
              lead.email = discovery.email;
              lead.emailSource = 'website_scrape';
              lead.emailDiscovery = discovery;
              lead.activity.push(buildActivity({
                type: 'email_found',
                message: `Found email ${discovery.email} from website`,
                actor,
                metadata: { checkedUrls: discovery.checkedUrls },
              }));
              emailDiscoveries.push({ storeName: lead.storeName, email: discovery.email });
            }
          }

          const result = await collection.insertOne(lead);
          imported.push(serializeLead({ ...lead, _id: result.insertedId }));
          await updateProgress({ phase: lead.status === 'not_fit' ? 'saved_not_fit' : 'saved', currentCandidate: lead.storeName });
        }
      }
    }
  }

  await buildProfiles();

  return {
    imported,
    duplicates,
    rejected: notFit,
    notFit,
    scoringErrors,
    searchErrors,
    detailErrors,
    emailDiscoveries,
    outOfRadius,
    searchedQueries: queries,
    searchLocations: searchLocationList,
    radiusMeters,
    autoScore,
    minImportScore,
    maxCandidates,
    discoverEmails,
    processedCandidates,
  };
}

