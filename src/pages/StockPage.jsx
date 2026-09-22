import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FiRefreshCw, FiSave } from 'react-icons/fi';
import {
  fetchStocks,
  fetchSites,
  fetchItemMasters,
  updateStock,
  createStock,
  deleteStock,
  createItemMaster,
  createStockLedger
} from '../api/stock';

function normalizeStock(stock, index) {
  return {
    ...stock,
    _rowKey: stock._rowKey || `${stock.itemcode ?? index}-${stock.inventorycode ?? 'site'}`
  };
}

export default function StockPage() {
  const [stocks, setStocks] = useState([]);
  const [sites, setSites] = useState([]);
  const [itemMasters, setItemMasters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState(null);
  const [toast, setToast] = useState(null);
  const [editedStocks, setEditedStocks] = useState({});
  const [pendingLedgerEntries, setPendingLedgerEntries] = useState([]);
  const [swapModal, setSwapModal] = useState(null);
  const [swapLockActive, setSwapLockActive] = useState(false);
  const [invalidateLockActive, setInvalidateLockActive] = useState(false);
  const [createModal, setCreateModal] = useState(null);
  const [invalidateModal, setInvalidateModal] = useState(null);
  const [highlightedRowKey, setHighlightedRowKey] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [pullRefreshOffset, setPullRefreshOffset] = useState(0);
  const [isPullRefreshing, setIsPullRefreshing] = useState(false);
  const pullStartY = useRef(null);
  const listRef = useRef(null);

  const inStockCount = useMemo(
    () => stocks.filter((stock) => Number(stock.inventorycode) === 1 && Number(stock.availablestock || 0) > 0).length,
    [stocks]
  );

  const itemNameSuggestions = useMemo(() => {
    if (!createModal?.itemname || createModal.itemname.trim().length < 2) {
      return [];
    }
    const searchTerm = createModal.itemname.trim().toLowerCase();
    return itemMasters
      .filter((item) => (item.itemname || '').toLowerCase().includes(searchTerm))
      .slice(0, 8);
  }, [createModal?.itemname, itemMasters]);

  const outOfStockCount = useMemo(
    () => stocks.filter((stock) => Number(stock.inventorycode) === 1 && Number(stock.availablestock || 0) <= 0).length,
    [stocks]
  );

  const showToast = (message, variant = 'success') => {
    setToast({ message, variant });
    window.setTimeout(() => setToast(null), 3800);
  };

  const refreshStocksFromApi = async () => {
    const stockData = await fetchStocks();
    setStocks(Array.isArray(stockData) ? stockData.map(normalizeStock) : []);
    return stockData;
  };

  useEffect(() => {
    let mounted = true;
    Promise.all([fetchStocks(), fetchSites(), fetchItemMasters()])
      .then(([stockData, siteData, itemMasterData]) => {
        if (!mounted) return;
        setStocks(Array.isArray(stockData) ? stockData.map(normalizeStock) : []);
        setSites(Array.isArray(siteData) ? siteData : []);
        setItemMasters(Array.isArray(itemMasterData) ? itemMasterData : []);
      })
      .catch((err) => {
        if (mounted) setError(err.message || 'Failed to load inventory');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaveMessage(null);

    const rowsToDelete = Object.values(editedStocks).filter(
      (stock) => Number(stock.siteqty || 0) === 0 && !stock._isNew && stock._deleteOnZeroQty && Number(stock.inventorycode) !== 1
    );
    const rowsToSave = Object.values(editedStocks).filter((stock) => {
      if (stock._isNew) return true;
      if (Number(stock.inventorycode) === 1) return true;
      if (stock._preserveZeroQty) return true;
      if (stock._invalidateUpdated) return Number(stock.siteqty || 0) > 0;
      return Number(stock.siteqty || 0) > 0;
    });
    const officeInventoryRows = Object.values(editedStocks).filter(
      (stock) => Number(stock.inventorycode) === 1 && stock._invalidateUpdated
    );
    const cleanedStocks = stocks.filter(
      (stock) => Number(stock.siteqty || 0) > 0 || stock._preserveZeroQty || stock._invalidateUpdated || Number(stock.inventorycode) === 1
    );
    const cleanedEditedStocks = Object.fromEntries(
      Object.entries(editedStocks).filter(
        ([, stock]) => stock._preserveZeroQty || stock._invalidateUpdated || Number(stock.siteqty || 0) > 0 || Number(stock.inventorycode) === 1
      )
    );

    if (cleanedStocks.length !== stocks.length) {
      setStocks(cleanedStocks);
      setEditedStocks(cleanedEditedStocks);
    }

    try {
      const deletePromises = rowsToDelete.map((stock) => deleteStock(stock.itemcode, stock.inventorycode));
      const savePromises = rowsToSave.map((stock) => {
        if (stock._isNew) {
          return createStock(stock);
        }
        return updateStock(stock.itemcode, stock.inventorycode, stock);
      });

      if (deletePromises.length + savePromises.length === 0) {
        setSaveMessage('No changes to save.');
        setSwapLockActive(false);
        showToast('No changes to save.');
        return;
      }

      await Promise.all([...deletePromises, ...savePromises]);

      let ledgerSaved = false;
      if (pendingLedgerEntries.length > 0) {
        for (let i = 0; i < pendingLedgerEntries.length; i += 1) {
          const entry = { ...pendingLedgerEntries[i] };
          entry.transactiondate = entry.transactiondate || new Date().toISOString();
          await createStockLedger(entry);
        }
        setPendingLedgerEntries([]);
        ledgerSaved = true;
      }

      setEditedStocks({});
      setSwapLockActive(false);
      setInvalidateLockActive(false);
      setHighlightedRowKey(null);
      setStocks((prev) => prev.map((stock) => ({ ...stock, _isNew: false })));
      await refreshStocksFromApi();
      setSaveMessage('Inventory changes saved successfully.');
      if (ledgerSaved) {
        showToast('Inventory changes saved and stock ledger updated successfully.');
      } else {
        showToast('Inventory changes saved successfully.');
      }
    } catch (err) {
      setError(err.message || 'Failed to save inventory changes');
      showToast(err.message || 'Failed to save inventory changes');
    } finally {
      setSaving(false);
    }
  };

  const handleRefresh = async () => {
    if (loading) return;
    setLoading(true);
    setError(null);
    setIsPullRefreshing(true);
    try {
      await refreshStocksFromApi();
    } catch (err) {
      setError(err.message || 'Failed to refresh inventory');
    } finally {
      setLoading(false);
      setIsPullRefreshing(false);
      setPullRefreshOffset(0);
    }
  };

  const handlePullStart = (event) => {
    if (event.touches.length !== 1) return;
    const container = listRef.current;
    if (!container) return;
    const atTop = container.scrollTop <= 0;
    if (!atTop) return;
    pullStartY.current = event.touches[0].clientY;
  };

  const handlePullMove = (event) => {
    if (pullStartY.current == null) return;
    const container = listRef.current;
    if (!container) return;
    const delta = event.touches[0].clientY - pullStartY.current;
    if (delta <= 0) return;
    event.preventDefault();
    setPullRefreshOffset(Math.min(delta, 90));
  };

  const handlePullEnd = async () => {
    if (pullStartY.current == null) return;
    pullStartY.current = null;
    if (pullRefreshOffset >= 70) {
      await handleRefresh();
    } else {
      setPullRefreshOffset(0);
    }
  };

  const openSwapModal = (stock) => {
    if (swapLockActive || invalidateLockActive || Object.keys(editedStocks).length > 0) {
      showToast('Save pending changes before swapping another item.');
      return;
    }

    const initialQty = Number(stock.siteqty || 0) > 0 ? 1 : 0;
    setSwapModal({
      stock,
      targetSiteId: '',
      targetQty: initialQty,
      refNo: '',
      error: ''
    });
  };

  const handleSwapQtyChange = (value) => {
    const currentQty = Number(swapModal?.stock?.siteqty || 0);
    const numericValue = Number(value);

    if (value === '' || Number.isNaN(numericValue)) {
      setSwapModal((prev) => (prev ? { ...prev, targetQty: value, error: '' } : prev));
      return;
    }

    if (numericValue > currentQty) {
      setSwapModal((prev) => (prev ? { ...prev, targetQty: value, error: `Qty cannot exceed current site qty (${currentQty})` } : prev));
      return;
    }

    setSwapModal((prev) => (prev ? { ...prev, targetQty: value, error: '' } : prev));
  };

  const handleSwapSubmit = () => {
    if (!swapModal?.stock) return;

    const source = swapModal.stock;
    const targetQty = Number(swapModal.targetQty);
    const targetSiteId = Number(swapModal.targetSiteId);
    const movementRefNo = (swapModal.refNo || '').trim();

    if (!swapModal.targetSiteId || Number.isNaN(targetSiteId) || Number.isNaN(targetQty) || targetQty <= 0) {
      setSwapModal((prev) => (prev ? { ...prev, error: 'Please select a site and enter a valid quantity.' } : prev));
      return;
    }

    if (targetQty > Number(source.siteqty || 0)) {
      setSwapModal((prev) => (prev ? { ...prev, error: `Qty cannot exceed current site qty (${source.siteqty || 0})` } : prev));
      return;
    }

    if (targetSiteId === Number(source.inventorycode)) {
      setSwapModal((prev) => (prev ? { ...prev, error: 'Target site must be different from the source site.' } : prev));
      return;
    }

    const targetSiteName = sites.find((site) => site.siteid === targetSiteId)?.sitename || '';
    const updatedSourceQty = Math.max(0, Number(source.siteqty || 0) - targetQty);
    const sourceOpeningQty = Number(source.siteqty || 0);
    const now = new Date();
    const firstLedgerTimestamp = now.toISOString();
    const secondLedgerTimestamp = new Date(now.getTime() + 1000).toISOString();
    const targetRow = stocks.find((stock) => stock.itemcode === source.itemcode && stock.inventorycode === targetSiteId);
    const targetOpeningQty = targetRow ? Number(targetRow.siteqty || 0) : 0;
    const targetUpdatedQty = targetOpeningQty + targetQty;

    const outLedgerEntry = {
      itemcode: source.itemcode,
      itemname: source.itemname,
      inventorycode: source.inventorycode,
      outqty: targetQty,
      openingqty: sourceOpeningQty,
      totalavailableqty: updatedSourceQty,
      transactiondate: firstLedgerTimestamp,
      frominventory: source.inventorycode,
      toinventory: targetSiteId,
      movementrefno: movementRefNo
    };

    const inLedgerEntry = {
      itemcode: source.itemcode,
      itemname: source.itemname,
      inventorycode: targetSiteId,
      inqty: targetQty,
      openingqty: targetOpeningQty,
      totalavailableqty: targetUpdatedQty,
      transactiondate: secondLedgerTimestamp,
      frominventory: source.inventorycode,
      toinventory: targetSiteId,
      movementrefno: movementRefNo
    };

    setPendingLedgerEntries((prev) => [...prev, outLedgerEntry, inLedgerEntry]);

    if (targetRow) {
      setStocks((prev) =>
        prev.map((stock) => {
          if (stock._rowKey === source._rowKey) {
            return { ...stock, siteqty: updatedSourceQty, stockexitdate: now };
          }
          if (stock._rowKey === targetRow._rowKey) {
            return {
              ...stock,
              siteqty: Number(stock.siteqty || 0) + targetQty,
              stockentrydate: now
            };
          }
          return stock;
        })
      );

      setEditedStocks((prev) => ({
        ...prev,
        [source._rowKey]: {
          ...(prev[source._rowKey] || source),
          itemcode: source.itemcode,
          inventorycode: source.inventorycode,
          siteqty: updatedSourceQty,
          stockexitdate: now,
          _rowKey: source._rowKey
        },
        [targetRow._rowKey]: {
          ...(prev[targetRow._rowKey] || targetRow),
          itemcode: targetRow.itemcode,
          inventorycode: targetRow.inventorycode,
          site: targetRow.site,
          siteqty: Number(targetRow.siteqty || 0) + targetQty,
          stockentrydate: now,
          _rowKey: targetRow._rowKey
        }
      }));
    } else {
      const { stockentrydate: _unusedEntry, stockexitdate: _unusedExit, availablestock: _unusedAvailableStock, ...sourceWithoutDates } = source;
      const newRow = {
        ...sourceWithoutDates,
        _rowKey: `swap-${source._rowKey}-${targetSiteId}-${Date.now()}`,
        _isNew: true,
        inventorycode: targetSiteId,
        site: targetSiteName,
        siteqty: targetQty,
        itemcode: source.itemcode,
        itemname: source.itemname,
        stockstatus: source.stockstatus,
        stockentrydate: now,
        originalRowKey: source._rowKey
      };

      setStocks((prev) =>
        prev
          .map((stock) => (stock._rowKey === source._rowKey ? { ...stock, siteqty: updatedSourceQty, stockexitdate: now } : stock))
          .concat(newRow)
      );

      setEditedStocks((prev) => ({
        ...prev,
        [source._rowKey]: {
          ...(prev[source._rowKey] || source),
          itemcode: source.itemcode,
          inventorycode: source.inventorycode,
          siteqty: updatedSourceQty,
          stockexitdate: now,
          _rowKey: source._rowKey
        },
        [newRow._rowKey]: newRow
      }));
    }

    setSwapLockActive(true);
    setSwapModal(null);
  };

  const openCreateModal = (defaults = {}) => {
    setCreateModal({
      itemname: defaults.itemname || '',
      availablestock: defaults.availablestock ?? '',
      newqty: defaults.newqty ?? '',
      threshold: defaults.threshold ?? '',
      unit: defaults.unit || '',
      siteid: defaults.siteid ?? defaults.inventorycode ?? 1,
      inventorycode: defaults.inventorycode ?? defaults.siteid ?? 1,
      existingStock: defaults.existingStock ?? null,
      selectedExistingItem: Boolean(defaults.existingStock),
      infoMessage: defaults.infoMessage ?? '',
      error: '',
      fieldError: '',
      showSuggestions: false
    });
  };

  const openInvalidateModal = (stock) => {
    if (swapLockActive || invalidateLockActive || Object.keys(editedStocks).length > 0) {
      showToast('Save pending changes before invalidating another item.');
      return;
    }

    setInvalidateModal({
      stock,
      qty: '',
      remarks: '',
      error: ''
    });
  };

  const handleInvalidateQtyChange = (value) => {
    const currentQty = Number(invalidateModal?.stock?.siteqty || 0);
    const numericValue = Number(value);

    if (value === '' || Number.isNaN(numericValue)) {
      setInvalidateModal((prev) => (prev ? { ...prev, qty: value, error: '' } : prev));
      return;
    }

    if (numericValue <= 0) {
      setInvalidateModal((prev) => (prev ? { ...prev, qty: value, error: 'Quantity must be greater than zero.' } : prev));
      return;
    }

    if (numericValue > currentQty) {
      setInvalidateModal((prev) => (prev ? { ...prev, qty: value, error: `Qty cannot exceed current site qty (${currentQty})` } : prev));
      return;
    }

    setInvalidateModal((prev) => (prev ? { ...prev, qty: value, error: '' } : prev));
  };

  const handleInvalidateSubmit = () => {
    if (!invalidateModal?.stock) return;

    const stock = invalidateModal.stock;
    const qty = Number(invalidateModal.qty);
    const invalidationRemarks = (invalidateModal.remarks || '').trim();
    const currentSiteQty = Number(stock.siteqty || 0);
    const officeRow = stocks.find((item) => item.itemcode === stock.itemcode && Number(item.inventorycode) === 1);
    const currentOfficeQty = Number(officeRow?.availablestock || 0);

    if (!invalidateModal.qty || Number.isNaN(qty) || qty <= 0) {
      setInvalidateModal((prev) => (prev ? { ...prev, error: 'Please enter a valid quantity.' } : prev));
      return;
    }

    if (qty > currentSiteQty) {
      setInvalidateModal((prev) => (prev ? { ...prev, error: `Qty cannot exceed current site qty (${currentSiteQty})` } : prev));
      return;
    }

    const updatedSiteQty = Math.max(0, currentSiteQty - qty);
    const updatedOfficeQty = Math.max(0, currentOfficeQty - qty);
    const isOfficeInventory = Number(stock.inventorycode) === 1;
    const now = new Date();
    const firstLedgerTimestamp = now.toISOString();
    const secondLedgerTimestamp = new Date(now.getTime() + 1000).toISOString();

    const ledgerEntries = [];
    const siteLedgerEntry = {
      itemcode: stock.itemcode,
      itemname: stock.itemname,
      inventorycode: stock.inventorycode,
      outqty: qty,
      openingqty: currentSiteQty,
      totalavailableqty: updatedSiteQty,
      transactiondate: firstLedgerTimestamp,
      frominventory: stock.inventorycode,
      toinventory: stock.inventorycode,
      invalremarks: invalidationRemarks
    };
    ledgerEntries.push(siteLedgerEntry);

    if (!isOfficeInventory && officeRow && officeRow._rowKey !== stock._rowKey) {
      const officeLedgerEntry = {
        itemcode: officeRow.itemcode,
        itemname: officeRow.itemname || stock.itemname,
        inventorycode: officeRow.inventorycode,
        outqty: qty,
        openingqty: currentOfficeQty,
        totalavailableqty: updatedOfficeQty,
        transactiondate: secondLedgerTimestamp,
        frominventory: stock.inventorycode,
        toinventory: officeRow.inventorycode,
        invalremarks: invalidationRemarks
      };
      ledgerEntries.push(officeLedgerEntry);
    }

    setPendingLedgerEntries((prev) => [...prev, ...ledgerEntries]);

    setStocks((prev) =>
      prev.map((item) => {
        if (item._rowKey === stock._rowKey) {
          return {
            ...item,
            siteqty: updatedSiteQty,
            ...(isOfficeInventory ? { availablestock: updatedOfficeQty, stockstatus: updatedOfficeQty > 0 ? 'In Stock' : 'Out of Stock' } : {})
          };
        }
        if (officeRow && item._rowKey === officeRow._rowKey) {
          return {
            ...item,
            availablestock: updatedOfficeQty,
            stockstatus: updatedOfficeQty > 0 ? 'In Stock' : 'Out of Stock'
          };
        }
        return item;
      })
    );

    setEditedStocks((prev) => {
      const next = { ...prev };
      next[stock._rowKey] = {
        ...(prev[stock._rowKey] || stock),
        itemcode: stock.itemcode,
        inventorycode: stock.inventorycode,
        siteqty: updatedSiteQty,
        _deleteOnZeroQty: !isOfficeInventory && updatedSiteQty === 0,
        _preserveZeroQty: isOfficeInventory,
        _invalidateUpdated: true,
        ...(isOfficeInventory ? {
          availablestock: updatedOfficeQty,
          stockstatus: updatedOfficeQty > 0 ? 'In Stock' : 'Out of Stock'
        } : {}),
        _rowKey: stock._rowKey
      };

      if (officeRow) {
        next[officeRow._rowKey] = {
          ...(prev[officeRow._rowKey] || officeRow),
          itemcode: officeRow.itemcode,
          inventorycode: officeRow.inventorycode,
          availablestock: updatedOfficeQty,
          stockstatus: updatedOfficeQty > 0 ? 'In Stock' : 'Out of Stock',
          ...(officeRow._rowKey === stock._rowKey ? { siteqty: updatedSiteQty } : {}),
          _rowKey: officeRow._rowKey
        };
      }

      return next;
    });

    setInvalidateModal(null);
    setInvalidateLockActive(true);
    setHighlightedRowKey(stock._rowKey);
    showToast(`Updated to table: invalidated ${qty} unit(s) for ${stock.itemname || 'selected item'}.`);
  };

  const getMatchingSiteStock = (itemName, siteId) => {
    const normalizedName = (itemName || '').trim().toLowerCase();
    const normalizedSiteId = Number(siteId);

    if (!normalizedName || !Number.isFinite(normalizedSiteId) || normalizedSiteId <= 0) {
      return null;
    }

    return stocks.find((stock) =>
      (stock.itemname || '').trim().toLowerCase() === normalizedName &&
      Number(stock.inventorycode) === normalizedSiteId
    );
  };

  const handleCreateChange = (field, value) => {
    setCreateModal((prev) => {
      if (!prev) return prev;

      if (field === 'itemname' || field === 'siteid') {
        const nextItemName = field === 'itemname' ? value : prev.itemname;
        const nextSiteId = field === 'siteid' ? value : prev.siteid;
        const matchedSiteStock = getMatchingSiteStock(nextItemName, nextSiteId);
        const hasBothFieldsSelected = Boolean((nextItemName || '').trim()) && Boolean(nextSiteId && nextSiteId !== '');

        return {
          ...prev,
          [field]: value,
          selectedExistingItem: hasBothFieldsSelected && Boolean(matchedSiteStock),
          availablestock: hasBothFieldsSelected && matchedSiteStock ? String(matchedSiteStock.siteqty ?? '') : prev.availablestock,
          threshold: hasBothFieldsSelected && matchedSiteStock ? String(matchedSiteStock.threshold ?? '') : prev.threshold,
          unit: hasBothFieldsSelected && matchedSiteStock ? matchedSiteStock.unit || '' : prev.unit,
          inventorycode: hasBothFieldsSelected && matchedSiteStock ? matchedSiteStock.inventorycode ?? 1 : prev.inventorycode,
          showSuggestions: field === 'itemname' ? (value || '').trim().length > 0 : prev.showSuggestions,
          error: ''
        };
      }

      const next = { ...prev, [field]: value, error: '' };
      if (field === 'availablestock') {
        next.fieldError = '';
      }
      return next;
    });
  };

  const handleCreateSubmit = async () => {
    if (!createModal) return;

    const itemname = createModal.itemname.trim();
    const requestedQty = Number(createModal.newqty);
    const selectedExistingItem = Boolean(createModal.selectedExistingItem);
    const quantityToApply = Number.isFinite(requestedQty) && requestedQty > 0 ? requestedQty : null;
    const thresholdValue = createModal.threshold.toString().trim();
    const threshold = thresholdValue === '' ? null : Number(thresholdValue);
    const unit = (createModal.unit || '').toString().trim();
    const selectedSiteIdValue = (createModal.siteid ?? '').toString().trim();
    const selectedSiteId = selectedSiteIdValue === '' ? null : Number(selectedSiteIdValue);

    if (!itemname) {
      setCreateModal((prev) => (prev ? { ...prev, error: 'Item name is required.' } : prev));
      return;
    }
    if (!selectedSiteId || Number.isNaN(selectedSiteId) || selectedSiteId <= 0) {
      setCreateModal((prev) => (prev ? { ...prev, error: 'Please select a site.' } : prev));
      return;
    }
    if (!quantityToApply || !Number.isFinite(quantityToApply) || quantityToApply <= 0) {
      setCreateModal((prev) => (prev ? { ...prev, error: 'New qty is required and must be a positive number.' } : prev));
      return;
    }
    if (threshold === null) {
      setCreateModal((prev) => (prev ? { ...prev, error: 'Threshold is required.' } : prev));
      return;
    }
    if (!Number.isFinite(threshold) || threshold < 0) {
      setCreateModal((prev) => (prev ? { ...prev, error: 'Threshold must be zero or a positive number.' } : prev));
      return;
    }
    if (Number.isFinite(threshold) && !selectedExistingItem && quantityToApply < threshold) {
      setCreateModal((prev) => (prev ? { ...prev, error: 'Entered qty should not be less than threshold.' } : prev));
      return;
    }

    setSaving(true);
    setError(null);
    setSaveMessage(null);

    try {
      const now = new Date().toISOString();
      const normalizedItemName = (itemname || '').trim().toLowerCase();
      const matchedStock = stocks.find((stock) => (stock.itemname || '').trim().toLowerCase() === normalizedItemName);
      const officeSiteStock = stocks.find(
        (stock) => (stock.itemname || '').trim().toLowerCase() === normalizedItemName && Number(stock.inventorycode) === 1
      );
      const selectedSiteStock = stocks.find(
        (stock) => (stock.itemname || '').trim().toLowerCase() === normalizedItemName && Number(stock.inventorycode) === selectedSiteId
      );

      const baseItemCode = matchedStock?.itemcode;
      const itemCodeToUse = baseItemCode || (await createItemMaster({ itemname }))?.itemid;

      const createBaseStockPayload = (inventoryCode, availableStockValue, siteQtyValue) => ({
        itemcode: itemCodeToUse,
        inventorycode: inventoryCode,
        itemname,
        availablestock: availableStockValue,
        siteqty: siteQtyValue,
        threshold,
        unit,
        stockentrydate: now,
        stockstatus: 'In Stock'
      });

      if (selectedSiteId === 1) {
        if (officeSiteStock) {
          const updatedAvailableStock = Number(officeSiteStock.availablestock || 0) + quantityToApply;
          const updatedSiteQty = Number(officeSiteStock.siteqty || 0) + quantityToApply;
          const updatedThreshold = Number.isFinite(threshold) && threshold >= 0 ? threshold : Number(officeSiteStock.threshold || 0);
          const updatedUnit = unit || officeSiteStock.unit || '';

          const updatedOfficeStockPayload = {
            ...officeSiteStock,
            itemcode: officeSiteStock.itemcode,
            inventorycode: 1,
            itemname,
            availablestock: updatedAvailableStock,
            siteqty: updatedSiteQty,
            threshold: updatedThreshold,
            unit: updatedUnit,
            stockstatus: updatedAvailableStock > 0 ? 'In Stock' : 'Out of Stock',
            stockentrydate: officeSiteStock.stockentrydate || now,
            stockexitdate: officeSiteStock.stockexitdate || null
          };

          await updateStock(officeSiteStock.itemcode, 1, updatedOfficeStockPayload);

          const ledgerPayload = {
            itemcode: officeSiteStock.itemcode,
            itemname,
            inventorycode: 1,
            inqty: quantityToApply,
            openingqty: Number(officeSiteStock.siteqty || 0),
            totalavailableqty: updatedAvailableStock,
            unit: updatedUnit,
            transactiondate: now,
            frominventory: null,
            toinventory: 1
          };
          await createStockLedger(ledgerPayload);
        } else {
          const createdStock = await createStock(createBaseStockPayload(1, quantityToApply, quantityToApply));

          const ledgerPayload = {
            itemcode: createdStock.itemcode,
            itemname: createdStock.itemname,
            inventorycode: createdStock.inventorycode,
            inqty: Number(createdStock.availablestock || 0),
            openingqty: 0,
            totalavailableqty: Number(createdStock.availablestock || 0),
            unit: createdStock.unit || unit,
            transactiondate: now,
            frominventory: null,
            toinventory: createdStock.inventorycode
          };
          await createStockLedger(ledgerPayload);
        }
      } else {
        const shouldUpdateOfficeSite = !selectedSiteStock;
        let createdOfficeStock = null;
        let officeLedgerOpening = Number(officeSiteStock?.availablestock || 0);
        if (shouldUpdateOfficeSite && officeSiteStock) {
          const updatedAvailableStock = Number(officeSiteStock.availablestock || 0) + quantityToApply;
          const updatedUnit = unit || officeSiteStock.unit || '';

          const updatedOfficeStockPayload = {
            ...officeSiteStock,
            itemcode: officeSiteStock.itemcode,
            inventorycode: 1,
            itemname,
            availablestock: updatedAvailableStock,
            threshold,
            unit: updatedUnit,
            stockstatus: updatedAvailableStock > 0 ? 'In Stock' : 'Out of Stock',
            stockentrydate: officeSiteStock.stockentrydate || now,
            stockexitdate: officeSiteStock.stockexitdate || null
          };

          await updateStock(officeSiteStock.itemcode, 1, updatedOfficeStockPayload);
          officeLedgerOpening = Number(officeSiteStock.siteqty || 0);
        } else if (shouldUpdateOfficeSite) {
          createdOfficeStock = await createStock(createBaseStockPayload(1, quantityToApply, null));
          officeLedgerOpening = 0;
        }

        if (selectedSiteStock) {
          const updatedSiteQty = Number(selectedSiteStock.siteqty || 0) + quantityToApply;
          const updatedUnit = unit || selectedSiteStock.unit || '';

          const updatedSelectedSiteStockPayload = {
            ...selectedSiteStock,
            itemcode: selectedSiteStock.itemcode,
            inventorycode: selectedSiteId,
            itemname,
            siteqty: updatedSiteQty,
            unit: updatedUnit,
            stockstatus: updatedSiteQty > 0 ? 'In Stock' : 'Out of Stock',
            stockentrydate: selectedSiteStock.stockentrydate || now,
            stockexitdate: selectedSiteStock.stockexitdate || null
          };

          await updateStock(selectedSiteStock.itemcode, selectedSiteId, updatedSelectedSiteStockPayload);
        } else {
          await createStock(createBaseStockPayload(selectedSiteId, null, quantityToApply));
        }

        const selectedSiteLedgerPayload = {
          itemcode: (selectedSiteStock || { itemcode: itemCodeToUse }).itemcode,
          itemname,
          inventorycode: selectedSiteId,
          inqty: quantityToApply,
          openingqty: Number(selectedSiteStock?.siteqty || 0),
          totalavailableqty: Number(selectedSiteStock?.siteqty || 0) + quantityToApply,
          unit: (selectedSiteStock?.unit || unit),
          transactiondate: now,
          frominventory: null,
          toinventory: selectedSiteId
        };
        await createStockLedger(selectedSiteLedgerPayload);
      }

      const refreshedStockData = await fetchStocks();
      setStocks(Array.isArray(refreshedStockData) ? refreshedStockData.map(normalizeStock) : []);
      const refreshedItemMasters = await fetchItemMasters();
      setItemMasters(Array.isArray(refreshedItemMasters) ? refreshedItemMasters : []);
      setCreateModal(null);
      showToast(`Item ${itemname} created successfully and stock ledger entry created.`);
    } catch (err) {
      setError(err.message || 'Failed to create item.');
      showToast(err.message || 'Failed to create item.');
    } finally {
      setSaving(false);
    }
  };

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const visibleStocks = normalizedSearch.length >= 3
    ? stocks.filter((stock) => (stock.itemname || '').toLowerCase().includes(normalizedSearch))
    : stocks;

  const changedCount = Object.keys(editedStocks).length;
  const hasPendingTableChanges = swapLockActive || invalidateLockActive || changedCount > 0;

  if (loading) return <p>Loading inventory...</p>;
  if (error) return <p style={{ color: 'red' }}>Error: {error}</p>;

  return (
    <div className="stock-page-shell">
      <div className="stock-page-header">
        <button type="button" className="icon-btn primary-icon-btn" onClick={() => openCreateModal()} aria-label="Create stock item">
          +
        </button>
        <div className="stock-page-title">
          <h1>Stock</h1>
        </div>
        <button
          type="button"
          className="stock-save-btn"
          onClick={handleSave}
          disabled={saving || changedCount === 0}
          aria-label="Save stock changes"
          aria-busy={saving}
        >
          {saving ? <><FiRefreshCw className="spin-icon" /> Saving</> : <><FiSave /> Save</>}
        </button>
      </div>

      <div className="stock-summary-row">
        <div className="summary-pill success">In stock: {inStockCount}</div>
        <div className="summary-pill danger">Out of stock: {outOfStockCount}</div>
        <button type="button" className="refresh-btn" onClick={handleRefresh} disabled={loading} aria-label="Refresh stock">
          <FiRefreshCw />
        </button>
      </div>

      <div className="stock-toolbar">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by item name"
        />
      </div>

      {saveMessage ? <p className="form-message">{saveMessage}</p> : null}

      {visibleStocks.length === 0 ? (
        <div className="empty-card">No stock found.</div>
      ) : (
        <div
          ref={listRef}
          className="stock-list"
          onTouchStart={handlePullStart}
          onTouchMove={handlePullMove}
          onTouchEnd={handlePullEnd}
          onTouchCancel={handlePullEnd}
        >
          <div className={`pull-refresh-indicator ${isPullRefreshing || pullRefreshOffset > 0 ? 'visible' : ''}`} style={{ height: `${Math.max(pullRefreshOffset, isPullRefreshing ? 48 : 0)}px` }}>
            {isPullRefreshing ? 'Refreshing…' : pullRefreshOffset >= 70 ? 'Release to refresh' : 'Pull to refresh'}
          </div>
          {visibleStocks.map((s) => {
            const isNewlyAddedSwapRow = Boolean(s._isNew);
            const isHighlightedRow = highlightedRowKey === s._rowKey;
            return (
              <div
                key={s._rowKey}
                className={`stock-card ${isNewlyAddedSwapRow || isHighlightedRow ? 'highlighted' : ''}`}
              >
                <div className="stock-card-top">
                  <div className="stock-card-title">
                    <strong>{s.itemname || s.itemcode}</strong>
                  </div>
                  <span className={`status-badge ${String(s.stockstatus || '').toLowerCase() === 'in stock' ? 'in-stock' : 'out-stock'}`}>
                    {s.stockstatus || 'N/A'}
                  </span>
                  <div className="stock-card-site">{s.site || ''}</div>
                </div>
                <div className="stock-card-body">
                  <div className="stock-field-row">
                    <span className="stock-field-label">Available stock</span>
                    <span className="stock-field-value">{s.availablestock}</span>
                  </div>
                  <div className="stock-field-row">
                    <span className="stock-field-label">Qty at site</span>
                    <span className="stock-field-value">{s.siteqty ?? 0}</span>
                  </div>
                  <div className="stock-field-row">
                    <span className="stock-field-label">Bar Code Id</span>
                    <span className="stock-field-value">{s.barcodeprodid || 'N/A'}</span>
                  </div>
                  <div className="stock-field-row">
                    <span className="stock-field-label">Entry date</span>
                    <span className="stock-field-value">{formatDate(s.stockentrydate)}</span>
                  </div>
                  <div className="stock-field-row">
                    <span className="stock-field-label">Exit date</span>
                    <span className="stock-field-value">{formatDate(s.stockexitdate)}</span>
                  </div>
                </div>
                <div className="stock-card-actions">
                  <button type="button" className="icon-btn" onClick={() => openSwapModal(s)} disabled={hasPendingTableChanges}>
                    ⇄
                  </button>
                  <button type="button" className="icon-btn danger" onClick={() => openInvalidateModal(s)} disabled={hasPendingTableChanges}>
                    ⛔
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {swapModal && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h3>Swap stock</h3>
            <label>
              <span>Item Code</span>
              <input value={swapModal.stock.itemcode || ''} readOnly />
            </label>
            <label>
              <span>Item Name</span>
              <input value={swapModal.stock.itemname || ''} readOnly />
            </label>
            <label>
              <span>Unit</span>
              <input value={swapModal.stock.unit || ''} readOnly />
            </label>
            <label>
              <span>Qty at Site</span>
              <input value={swapModal.stock.siteqty ?? 0} readOnly />
            </label>
            <label>
              <span>Target Site</span>
              <select value={swapModal.targetSiteId} onChange={(e) => setSwapModal((prev) => (prev ? { ...prev, targetSiteId: e.target.value } : prev))}>
                <option value="">Select site</option>
                {sites.map((site) => (
                  <option key={site.siteid} value={site.siteid}>
                    {site.siteid} - {site.sitename}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Target Qty</span>
              <input type="number" min="1" value={swapModal.targetQty} onChange={(e) => handleSwapQtyChange(e.target.value)} />
            </label>
            <label>
              <span>Ref No</span>
              <input
                type="text"
                value={swapModal.refNo}
                onChange={(e) => setSwapModal((prev) => (prev ? { ...prev, refNo: e.target.value } : prev))}
              />
            </label>
            {swapModal.error ? <div className="form-error">{swapModal.error}</div> : null}
            <div className="modal-actions">
              <button type="button" className="ghost-btn" onClick={() => setSwapModal(null)}>
                Cancel
              </button>
              <button type="button" className="primary-btn" onClick={handleSwapSubmit}>
                Update
              </button>
            </div>
          </div>
        </div>
      )}

      {invalidateModal && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h3>Invalidate stock</h3>
            <div><strong>Item Name:</strong> {invalidateModal.stock.itemname || ''}</div>
            <div><strong>Site Qty:</strong> {invalidateModal.stock.siteqty ?? 0}</div>
            <label>
              <span>Qty to invalidate</span>
              <input type="number" min="1" value={invalidateModal.qty} onChange={(e) => handleInvalidateQtyChange(e.target.value)} />
            </label>
            <label>
              <span>Remarks</span>
              <input
                type="text"
                value={invalidateModal.remarks}
                onChange={(e) => setInvalidateModal((prev) => (prev ? { ...prev, remarks: e.target.value } : prev))}
              />
            </label>
            {invalidateModal.error ? <div className="form-error">{invalidateModal.error}</div> : null}
            <div className="modal-actions">
              <button type="button" className="ghost-btn" onClick={() => setInvalidateModal(null)}>
                Cancel
              </button>
              <button type="button" className="danger-btn" onClick={handleInvalidateSubmit}>
                Invalidate
              </button>
            </div>
          </div>
        </div>
      )}

      {createModal && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h3>Create inventory item</h3>
            <label className="autocomplete-label">
              <span>Item Name</span>
              <div className="dropdown-field">
                <input
                  type="text"
                  value={createModal.itemname}
                  onChange={(e) => handleCreateChange('itemname', e.target.value)}
                  autoComplete="off"
                />
                {createModal.showSuggestions && itemNameSuggestions.length > 0 && (
                  <ul className="autocomplete-dropdown">
                    {itemNameSuggestions.map((item) => (
                      <li
                        key={item.itemid || item.itemname}
                        className="autocomplete-item"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          handleCreateChange('itemname', item.itemname || '');
                          setCreateModal((prev) => (prev ? { ...prev, showSuggestions: false, infoMessage: '' } : prev));
                        }}
                      >
                        {item.itemname}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </label>
            <label>
              <span>Site</span>
              <select value={createModal.siteid} onChange={(e) => handleCreateChange('siteid', e.target.value)}>
                <option value="">Select a site</option>
                {sites.map((site) => (
                  <option key={site.siteid} value={site.siteid}>
                    {site.sitename || `Site ${site.siteid}`}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>New Qty</span>
              <input
                type="number"
                min="1"
                value={createModal.newqty}
                onChange={(e) => handleCreateChange('newqty', e.target.value)}
                style={createModal.fieldError === 'availablestock' ? { borderColor: 'red' } : undefined}
              />
            </label>
            {createModal.selectedExistingItem ? (
              <label>
                <span>Available Qty</span>
                <input type="text" value={createModal.availablestock} readOnly />
              </label>
            ) : null}
            <label>
              <span>Threshold</span>
              <input type="number" min="0" value={createModal.threshold} onChange={(e) => handleCreateChange('threshold', e.target.value)} />
            </label>
            <label>
              <span>Unit</span>
              <input type="text" value={createModal.unit || ''} onChange={(e) => handleCreateChange('unit', e.target.value)} />
            </label>
            {createModal.infoMessage ? <div className="form-message info">{createModal.infoMessage}</div> : null}
            {createModal.error ? <div className="form-error">{createModal.error}</div> : null}
            <div className="modal-actions">
              <button type="button" className="ghost-btn" onClick={() => setCreateModal(null)}>
                Cancel
              </button>
              <button type="button" className="primary-btn" onClick={handleCreateSubmit} disabled={saving} aria-busy={saving}>
                {saving ? <><FiRefreshCw className="spin-icon" /> Saving</> : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`toast ${toast.variant === 'success' ? 'success' : 'error'}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}

function formatDate(value) {
  if (!value) return '';
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleDateString();
  } catch (e) {
    return value;
  }
}
