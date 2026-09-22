import { buildApiUrl } from './config';
import { fetchWithAuth, fetchWithAuthJson } from './apiClient';

const buildUrl = (path) => buildApiUrl(path);

export async function fetchStocks() {
  return fetchWithAuthJson(buildUrl('/stock'));
}

export async function fetchLowStockItems() {
  return fetchWithAuthJson(buildUrl('/stock/low'));
}

export async function fetchZeroStockItems() {
  return fetchWithAuthJson(buildUrl('/stock/zero'));
}

export async function fetchOldStockItems() {
  return fetchWithAuthJson(buildUrl('/stock/old'));
}

export async function fetchDeadStockItems() {
  return fetchWithAuthJson(buildUrl('/stock/dead'));
}

export async function fetchAgedItemCount() {
  const data = await fetchWithAuthJson(buildUrl('/itemmaster/old'));
  return Number(data || 0);
}

export async function fetchStock(itemcode, inventorycode = null) {
  const path = inventorycode == null ? `/stock/${itemcode}` : `/stock/${itemcode}/${inventorycode}`;
  return fetchWithAuthJson(buildUrl(path));
}

export async function fetchSites() {
  return fetchWithAuthJson(buildUrl('/sites'));
}

export async function fetchItemMasters() {
  return fetchWithAuthJson(buildUrl('/itemmaster'));
}

export async function createItemMaster(itemMaster) {
  return fetchWithAuthJson(buildUrl('/itemmaster'), {
    method: 'POST',
    body: JSON.stringify(itemMaster)
  });
}

export async function createStock(stock) {
  return fetchWithAuthJson(buildUrl('/stock'), {
    method: 'POST',
    body: JSON.stringify(stock)
  });
}

export async function createStockLedger(stockLedger) {
  return fetchWithAuthJson(buildUrl('/stockledger'), {
    method: 'POST',
    body: JSON.stringify(stockLedger)
  });
}

export async function deleteStock(itemcode, inventorycode) {
  const res = await fetchWithAuth(buildUrl(`/stock/${itemcode}/${inventorycode}`), {
    method: 'DELETE'
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return null;
}

export async function updateStock(itemcode, inventorycode, stock) {
  return fetchWithAuthJson(buildUrl(`/stock/${itemcode}/${inventorycode}`), {
    method: 'PUT',
    body: JSON.stringify(stock)
  });
}

export async function fetchStockLedger() {
  return fetchWithAuthJson(buildUrl('/stockledger'));
}
