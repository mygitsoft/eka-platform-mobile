import { buildApiUrl } from './config';
import { fetchWithAuth, fetchWithAuthJson } from './apiClient';

const buildUrl = (path) => buildApiUrl(path);

export async function fetchSalesOrders() {
  const payload = await fetchWithAuthJson(buildUrl('/salesorders'));

  if (Array.isArray(payload)) {
    return payload;
  }

  if (payload && Array.isArray(payload.data)) {
    return payload.data;
  }

  return [];
}

export async function updateSalesOrderStatus(orderId, statusPayload) {
  return fetchWithAuthJson(buildUrl(`/salesorders/${encodeURIComponent(orderId)}/deliverystatus`), {
    method: 'PUT',
    body: JSON.stringify(statusPayload)
  });
}

export async function createSalesRecord(salesPayload) {
  return fetchWithAuthJson(buildUrl('/sales'), {
    method: 'POST',
    body: JSON.stringify(salesPayload)
  });

  if (!res.ok) {
    throw new Error(`API error ${res.status}`);
  }

  return res.json();
}
