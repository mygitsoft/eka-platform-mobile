const DEFAULT_API_BASE_URL = 'https://transmitted-signal-translations-mesa.trycloudflare.com/api';

const normalizeApiBaseUrl = (value) => {
  const trimmed = value?.trim().replace(/\/+$/, '');
  if (!trimmed) {
    return null;
  }

  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
};

export const getApiBaseUrl = () => {
  return normalizeApiBaseUrl(import.meta.env.VITE_API_BASE_URL) || DEFAULT_API_BASE_URL;
};

export const buildApiUrl = (path) => {
  const baseUrl = getApiBaseUrl();
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${normalizedPath}`;
};
