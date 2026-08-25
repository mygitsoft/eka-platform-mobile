import { getAccessToken } from '../auth/tokenStorage';

export async function fetchWithAuth(url, options = {}) {
  const token = await getAccessToken();
  const headers = { ...options.headers };

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  console.log("FETCHING ", options.method || 'GET', url, "with headers", headers);
  return fetch(url, {
    ...options,
    headers,
  });
}

export async function fetchWithAuthJson(url, options = {}) {
  const response = await fetchWithAuth(url, options);
  if (!response.ok) {
    const text = await response.text();
    console.error("API error", response.status, response.statusText, text);
    throw new Error(`API error ${response.status} ${response.statusText} ${text}`);
  }
  return response.json();
}

export async function fetchWithAuthFormData(url, options = {}) {
  const token = await getAccessToken();
  const headers = { ...options.headers };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  console.log("FETCHING ", options.method || 'GET', url, "with headers", headers);
  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const text = await response.text();
    console.error("API error", response.status, response.statusText, text);
    throw new Error(`API error ${response.status} ${response.statusText} ${text}`);
  }

  return response.json();
}
