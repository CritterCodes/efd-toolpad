import { GOOGLE_API_BASE, GOOGLE_PLACES_NEW_API_BASE, getGoogleApiKey } from './shared';
export const googleFetch = async (path, params) => {
  const apiKey = getGoogleApiKey();
  if (!apiKey) throw new Error('GOOGLE_PLACES_API_KEY is not configured');
  const url = new URL(`${GOOGLE_API_BASE}/${path}/json`);
  Object.entries({ ...params, key: apiKey }).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
  });
  const response = await fetch(url);
  const payload = await response.json();
  if (!response.ok || !['OK', 'ZERO_RESULTS'].includes(payload.status)) {
    const error = new Error(payload.error_message || `Google Places ${path} failed: ${payload.status || response.status}`);
    error.googleStatus = payload.status;
    error.googlePath = path;
    throw error;
  }
  return payload;
};

export const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const parseLatLng = (location) => {
  const [lat, lng] = String(location || '').split(',').map((value) => Number(value.trim()));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { latitude: lat, longitude: lng };
};

export const distanceMilesBetween = (from, to) => {
  if (!from || !to) return null;
  const earthMiles = 3958.8;
  const toRadians = (degrees) => degrees * (Math.PI / 180);
  const dLat = toRadians(to.latitude - from.latitude);
  const dLng = toRadians(to.longitude - from.longitude);
  const lat1 = toRadians(from.latitude);
  const lat2 = toRadians(to.latitude);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(earthMiles * c * 10) / 10;
};

export const googlePlacesNewTextSearch = async ({ textQuery, location, radiusMeters, pageToken }) => {
  const apiKey = getGoogleApiKey();
  if (!apiKey) throw new Error('GOOGLE_PLACES_API_KEY is not configured');

  const body = {
    textQuery,
    pageSize: 20,
  };

  if (pageToken) body.pageToken = pageToken;

  const center = parseLatLng(location);
  if (center && radiusMeters) {
    body.locationBias = {
      circle: {
        center,
        radius: Math.min(Number(radiusMeters), 50000),
      },
    };
  }

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
        'nextPageToken',
      ].join(','),
    },
    body: JSON.stringify(body),
  });

  const payload = await response.json();
  if (!response.ok) {
    const message = payload?.error?.message || `Google Places text search failed: ${response.status}`;
    const error = new Error(message);
    error.googleStatus = payload?.error?.status;
    throw error;
  }

  return payload;
};

export const mapPlacesNewSearchResult = (place = {}) => ({
  place_id: place.id,
  name: place.displayName?.text || '',
  formatted_address: place.formattedAddress || '',
  rating: place.rating ?? null,
  user_ratings_total: place.userRatingCount ?? null,
  types: place.types || [],
});

export const googlePlacesNewTextSearchPages = async ({ query, location, radiusMeters }, maxPages = 3) => {
  const pages = [];
  let payload = await googlePlacesNewTextSearch({ textQuery: query, location, radiusMeters });
  pages.push({ results: (payload.places || []).map(mapPlacesNewSearchResult) });

  for (let page = 1; page < maxPages && payload.nextPageToken; page += 1) {
    const pageToken = payload.nextPageToken;
    let pagePayload = null;

    for (let attempt = 1; attempt <= 5; attempt += 1) {
      await delay(attempt === 1 ? 2200 : 1600);
      try {
        pagePayload = await googlePlacesNewTextSearch({
          textQuery: query,
          location,
          radiusMeters,
          pageToken,
        });
        break;
      } catch (error) {
        if (error.googleStatus !== 'INVALID_ARGUMENT' || attempt === 5) throw error;
      }
    }

    payload = pagePayload;
    pages.push({ results: (payload.places || []).map(mapPlacesNewSearchResult) });
  }

  return pages;
};

