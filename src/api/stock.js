import { buildApiUrl } from './config';

const buildUrl = (path) => buildApiUrl(path);

export async function fetchStocks() {
  const res = await fetch(buildUrl('/stock'));
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

export async function fetchLowStockItems() {
  const res = await fetch(buildUrl('/stock/low'));
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

export async function fetchZeroStockItems() {
  const res = await fetch(buildUrl('/stock/zero'));
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

export async function fetchOldStockItems() {
  const res = await fetch(buildUrl('/stock/old'));
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

export async function fetchDeadStockItems() {
  const res = await fetch(buildUrl('/stock/dead'));
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

export async function fetchAgedItemCount() {
  const res = await fetch(buildUrl('/itemmaster/old'));
  if (!res.ok) throw new Error(`API error ${res.status}`);
  const data = await res.json();
  return Number(data || 0);
}

export async function fetchStock(itemcode, inventorycode = null) {
  const path = inventorycode == null ? `/stock/${itemcode}` : `/stock/${itemcode}/${inventorycode}`;
  const res = await fetch(buildUrl(path));
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

export async function fetchSites() {
  const res = await fetch(buildUrl('/sites'));
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

export async function fetchItemMasters() {
  const res = await fetch(buildUrl('/itemmaster'));
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

export async function fetchStockByBarcodeProdId(barcodeprodid) {
  const res = await fetch(buildUrl(`/stock/barcode/${encodeURIComponent(barcodeprodid)}`));
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`API error ${res.status}`);
  const data = await res.json();
  return Array.isArray(data) ? data[0] ?? null : data;
}

export async function createItemMaster(itemMaster) {
  const res = await fetch(buildUrl('/itemmaster'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(itemMaster)
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

export async function createStock(stock) {
  const res = await fetch(buildUrl('/stock'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(stock)
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

export async function createStockLedger(stockLedger) {
  const res = await fetch(buildUrl('/stockledger'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(stockLedger)
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

export async function deleteStock(itemcode, inventorycode) {
  const res = await fetch(buildUrl(`/stock/${itemcode}/${inventorycode}`), {
    method: 'DELETE'
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return null;
}

export async function updateStock(itemcode, inventorycode, stock) {
  const res = await fetch(buildUrl(`/stock/${itemcode}/${inventorycode}`), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(stock)
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

export async function fetchStockLedger() {
  const res = await fetch(buildUrl('/stockledger'));
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}
