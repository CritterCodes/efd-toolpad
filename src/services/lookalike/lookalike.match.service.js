const GOOGLE_API_BASE = 'https://maps.googleapis.com/maps/api/place';
const GOOGLE_PLACES_NEW_API_BASE = 'https://places.googleapis.com/v1';
const STALE_MS = 30 * 24 * 60 * 60 * 1000;

const normalizeString = (value) => String(value || '').trim();
const normalizeKey = (value) => normalizeString(value).toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const normalizeTokens = (value) => normalizeKey(value).split(' ').filter((token) => token.length > 1);

const tokenSimilarity = (left, right) => {
  const leftTokens = new Set(normalizeTokens(left));
  const rightTokens = new Set(normalizeTokens(right));
  if (!leftTokens.size || !rightTokens.size) return 0;
  const overlap = [...leftTokens].filter((token) => rightTokens.has(token)).length;
  return overlap / Math.max(leftTokens.size, rightTokens.size);
};

const stateKey = (value) => normalizeKey(value).replace(/\barkansas\b/g, 'ar').replace(/\boklahoma\b/g, 'ok');

const getGoogleApiKey = () => process.env.GOOGLE_PLACES_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY;

const googleFetch = async (path, params) => {
  const apiKey = getGoogleApiKey();
  if (!apiKey) throw new Error('GOOGLE_PLACES_API_KEY is not configured');
  const url = new URL(`${GOOGLE_API_BASE}/${path}/json`);
  Object.entries({ ...params, key: apiKey }).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
  });
  const response = await fetch(url);
  const payload = await response.json();
  if (!response.ok || !['OK', 'ZERO_RESULTS'].includes(payload.status)) {
    throw new Error(payload.error_message || `Google Places ${path} failed: ${payload.status || response.status}`);
  }
  return payload;
};

const textSearch = async (textQuery) => {
  const apiKey = getGoogleApiKey();
  if (!apiKey) throw new Error('GOOGLE_PLACES_API_KEY is not configured');
  const response = await fetch(`${GOOGLE_PLACES_NEW_API_BASE}/places:searchText`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': [
        'places.id',
        'places.displayName',
        'places.formattedAddress',
        'places.rating',
        'places.userRatingCount',
        'places.types',
      ].join(','),
    },
    body: JSON.stringify({ textQuery, pageSize: 5 }),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload?.error?.message || `Google Places text search failed: ${response.status}`);
  return (payload.places || []).map((place) => ({
    place_id: place.id,
    name: place.displayName?.text || '',
    formatted_address: place.formattedAddress || '',
    rating: place.rating ?? null,
    user_ratings_total: place.userRatingCount ?? null,
    types: place.types || [],
  }));
};

const stalePlaceMatch = (placeMatch) => !placeMatch?.lastMatchedAt || Date.now() - new Date(placeMatch.lastMatchedAt).getTime() > STALE_MS;

const accountQuery = (account = {}) => [
  account.businessName || account.business || account.wholesaleApplication?.businessName,
  account.businessCity || account.wholesaleApplication?.businessCity,
  account.businessState || account.wholesaleApplication?.businessState,
  account.contactPhone || account.phoneNumber || account.wholesaleApplication?.contactPhone,
  account.website || account.wholesaleApplication?.website,
].map(normalizeString).filter(Boolean).join(' ');

const accountLocation = (account = {}) => ({
  address: normalizeString(account.businessAddress || account.wholesaleApplication?.businessAddress),
  city: normalizeString(account.businessCity || account.wholesaleApplication?.businessCity),
  state: normalizeString(account.businessState || account.wholesaleApplication?.businessState),
});

const assessMatch = (account = {}, place = {}, details = {}) => {
  const businessName = account.businessName || account.business || account.wholesaleApplication?.businessName || '';
  const location = accountLocation(account);
  const placeName = details.name || place.name || '';
  const placeAddress = details.formatted_address || place.formatted_address || '';
  const nameSimilarity = tokenSimilarity(businessName, placeName);
  const cityMatches = Boolean(location.city && normalizeKey(placeAddress).includes(normalizeKey(location.city)));
  const stateMatches = Boolean(location.state && stateKey(placeAddress).includes(stateKey(location.state)));
  const streetSimilarity = location.address ? tokenSimilarity(location.address, placeAddress) : 0;
  const hasVerificationInput = Boolean(location.address || location.city || location.state || account.contactPhone || account.phoneNumber);

  let confidence = nameSimilarity * 0.65;
  if (cityMatches) confidence += 0.15;
  if (stateMatches) confidence += 0.1;
  if (streetSimilarity >= 0.5) confidence += 0.25;

  const locationVerified = streetSimilarity >= 0.45 || (cityMatches && stateMatches);
  return {
    confidence: Math.min(1, Math.round(confidence * 100) / 100),
    accepted: Boolean(hasVerificationInput && nameSimilarity >= 0.45 && locationVerified && confidence >= 0.55),
    nameSimilarity: Math.round(nameSimilarity * 100) / 100,
    cityMatches,
    stateMatches,
    streetSimilarity: Math.round(streetSimilarity * 100) / 100,
    placeName,
    placeAddress,
  };
};

export async function matchAccountToPlace(account = {}) {
  if (account.placeMatch?.matched && !stalePlaceMatch(account.placeMatch)) {
    return account.placeMatch;
  }

  const query = accountQuery(account);
  if (!query) return { matched: false, confidence: 0, reason: 'missing_search_terms', lastMatchedAt: new Date() };

  const candidates = await textSearch(query);
  let best = null;
  for (const candidate of candidates) {
    const detailsPayload = await googleFetch('details', {
      place_id: candidate.place_id,
      fields: 'name,formatted_address,address_component,formatted_phone_number,website,rating,user_ratings_total,type,url,geometry,reviews',
    });
    const details = detailsPayload.result || {};
    const assessment = assessMatch(account, candidate, details);
    if (!best || assessment.confidence > best.assessment.confidence) {
      best = { candidate, details, assessment };
    }
  }

  if (!best?.assessment.accepted) {
    return {
      matched: false,
      confidence: best?.assessment.confidence || 0,
      assessment: best?.assessment || {},
      lastMatchedAt: new Date(),
    };
  }

  return {
    matched: true,
    placeId: best.candidate.place_id,
    name: best.details.name || best.candidate.name,
    address: best.details.formatted_address || best.candidate.formatted_address,
    latitude: best.details.geometry?.location?.lat ?? null,
    longitude: best.details.geometry?.location?.lng ?? null,
    categories: best.details.types || best.candidate.types || [],
    website: best.details.website || null,
    phone: best.details.formatted_phone_number || null,
    rating: best.details.rating ?? best.candidate.rating ?? null,
    reviewCount: best.details.user_ratings_total ?? best.candidate.user_ratings_total ?? null,
    googleUrl: best.details.url || null,
    details: best.details,
    confidence: best.assessment.confidence,
    assessment: best.assessment,
    lastMatchedAt: new Date(),
  };
}
