import { buildStullerAuthHeader, getStullerConfig } from './stullerConfig';

function buildQueryString(query = {}) {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value == null || value === '') return;
    if (Array.isArray(value)) {
      value.filter((entry) => entry != null && entry !== '').forEach((entry) => params.append(key, String(entry)));
      return;
    }
    params.set(key, String(value));
  });
  const encoded = params.toString();
  return encoded ? `?${encoded}` : '';
}

function cleanResponseText(text = '') {
  return text.replace(/\s+/g, ' ').trim().slice(0, 300);
}

async function requestWithConfig(config, path, { method = 'GET', query, body } = {}) {
  const url = `${config.apiUrl}${path}${buildQueryString(query)}`;
  const headers = {
    Authorization: buildStullerAuthHeader(config),
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'User-Agent': 'EFD-CRM/1.0',
  };

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json') || contentType.includes('text/json');

  if (!response.ok) {
    const errorText = isJson
      ? JSON.stringify(await response.json()).slice(0, 300)
      : cleanResponseText(await response.text());
    const err = new Error(`Stuller API error: ${response.status} ${response.statusText}${errorText ? ` - ${errorText}` : ''}`);
    err.status = response.status;
    throw err;
  }

  if (!isJson) {
    const err = new Error('Stuller API returned a non-JSON response');
    err.status = 500;
    throw err;
  }

  return await response.json();
}

export async function stullerRequestWithConfig(config, path, options = {}) {
  return await requestWithConfig(config, path, options);
}

export async function stullerRequest(path, options = {}) {
  const config = await getStullerConfig();
  return await requestWithConfig(config, path, options);
}

export async function testStullerConnection() {
  return await stullerRequest('/v2/products', { method: 'GET', query: { PageSize: 1 } });
}

export async function testStullerConnectionWithConfig(config) {
  return await requestWithConfig(config, '/v2/products', { method: 'GET', query: { PageSize: 1 } });
}
