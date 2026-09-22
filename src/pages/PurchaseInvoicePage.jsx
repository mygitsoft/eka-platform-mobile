import { useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { DocumentScanner } from '@capacitor-mlkit/document-scanner';
import { FiFilePlus, FiUpload } from 'react-icons/fi';
import { fetchWithAuthFormData, fetchWithAuthJson } from '../api/apiClient';
import { getApiBaseUrl } from '../api/config';
import '../App.css';

function formatDate(value) {
  if (!value) return 'N/A';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

function PurchaseInvoicePage() {
  const [distributors, setDistributors] = useState([]);
  const [selectedDistributorId, setSelectedDistributorId] = useState('');
  const [loadingDistributors, setLoadingDistributors] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [purchaseInfo, setPurchaseInfo] = useState([]);
  const [loadingPurchaseInfo, setLoadingPurchaseInfo] = useState(true);
  const [captureDialogOpen, setCaptureDialogOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [pullRefreshOffset, setPullRefreshOffset] = useState(0);
  const [isPullRefreshing, setIsPullRefreshing] = useState(false);
  const pullStartY = useRef(null);
  const listRef = useRef(null);

  const loadPurchaseInfo = async () => {
    setLoadingPurchaseInfo(true);

    try {
      const data = await fetchWithAuthJson(`${getApiBaseUrl()}/purchaseinfo`);
      const records = Array.isArray(data) ? data : data?.data || data?.purchaseinfo || [];
      setPurchaseInfo(Array.isArray(records) ? records : []);
    } catch (err) {
      setError(err?.message || 'Unable to load purchase information.');
    } finally {
      setLoadingPurchaseInfo(false);
    }
  };

  const handleRefresh = async () => {
    if (loadingPurchaseInfo || uploading) return;
    setIsPullRefreshing(true);
    try {
      await loadPurchaseInfo();
    } finally {
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

  useEffect(() => {
    const loadDistributors = async () => {
      setLoadingDistributors(true);
      setError('');

      try {
        const data = await fetchWithAuthJson(`${getApiBaseUrl()}/suppliermaster`);
        setDistributors(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(err?.message || 'Unable to load distributors.');
      } finally {
        setLoadingDistributors(false);
      }
    };

    loadDistributors();
    loadPurchaseInfo();
  }, []);

  const handleUploadInvoice = async () => {
    if (!selectedDistributorId) {
      setError('Please select a distributor before uploading an invoice.');
      return;
    }

    setUploading(true);
    setMessage('');
    setError('');

    try {
      const scanResult = await DocumentScanner.scanDocument({
        pageLimit: 1,
        resultFormats: 'JPEG',
        scannerMode: 'FULL',
      });

      if (scanResult.status === 'cancel' || !scanResult.scannedImages?.length) {
        setError('');
        return;
      }

      const imagePath = scanResult.scannedImages[0];
      const imageUrl = Capacitor.convertFileSrc(imagePath);
      if (!imageUrl) {
        throw new Error('The document scanner did not return an image.');
      }

      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        throw new Error('Unable to read the captured invoice image.');
      }

      const imageBlob = await imageResponse.blob();
      const formData = new FormData();
      formData.append('file', imageBlob, `purchase-invoice-${Date.now()}.jpg`);
      formData.append('distributorid', selectedDistributorId);

      const processedInvoice = await fetchWithAuthFormData(`${getApiBaseUrl()}/ocr/invoice`, {
        method: 'POST',
        body: formData,
      });

      setMessage(`Invoice ${processedInvoice?.invoiceno || ''} processed successfully. Waiting for Review`);
      setCaptureDialogOpen(false);
      await loadPurchaseInfo();
    } catch (err) {
      if (err?.message?.toLowerCase().includes('cancel')) {
        setError('');
      } else {
        setError(err?.message || 'Unable to upload the purchase invoice.');
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <div
      className="dashboard-shell purchase-invoice-screen"
      onTouchStart={handlePullStart}
      onTouchMove={handlePullMove}
      onTouchEnd={handlePullEnd}
      onTouchCancel={handlePullEnd}
    >
      <div className={`pull-refresh-indicator ${isPullRefreshing || pullRefreshOffset > 0 ? 'visible' : ''}`} style={{ height: `${Math.max(pullRefreshOffset, isPullRefreshing ? 48 : 0)}px` }}>
        {isPullRefreshing ? 'Refreshing…' : pullRefreshOffset >= 70 ? 'Release to refresh' : 'Pull to refresh'}
      </div>
      <div className="dashboard-header">
        <p className="eyebrow">Process Purchase</p>
        <h1>Purchase Invoice</h1>
        <p className="subtitle">Review purchase invoices and capture a new invoice.</p>
      </div>

      <div className="purchase-info-header">
        <h2>Purchase Information</h2>
        <button
          type="button"
          className="icon-btn primary-icon-btn"
          onClick={() => setCaptureDialogOpen(true)}
          disabled={uploading}
          aria-label="Capture purchase invoice"
          title="Capture purchase invoice"
        >
          <FiFilePlus aria-hidden="true" />
        </button>
      </div>

      {message ? <p className="form-message success">{message}</p> : null}
      {error ? <p className="form-error">{error}</p> : null}

      {loadingPurchaseInfo ? (
        <div className="empty-card">Loading purchase information...</div>
      ) : purchaseInfo.length === 0 ? (
        <div className="empty-card">No purchase invoices found.</div>
      ) : (
        <div ref={listRef} className="stock-list purchase-info-list">
          {purchaseInfo.map((purchase, index) => {
            const invoiceNumber = purchase.invoiceno || purchase.invoiceNo || 'N/A';
            const distributor = purchase.supplier?.suppliername || purchase.distributor || purchase.suppliername || purchase.distributorname || 'N/A';
            const invoiceDate = formatDate(purchase.invoicedatetime || purchase.invoicedate || purchase.invoiceDate);
            const paymentStatus = purchase.paymentstatus || purchase.paymentStatus || 'N/A';
            const isPaymentPending = String(paymentStatus).toUpperCase() === 'PENDING';
            const paymentStatusLabel = isPaymentPending ? 'PMT PENDING' : paymentStatus;
            const invoiceAmount = purchase.invoiceamt ?? purchase.invoiceamount ?? purchase.invoiceAmount ?? 'N/A';
            const updationStatus = purchase.updationstatus || purchase.updationStatus || 'N/A';
            const isUpdationPending = String(updationStatus).toUpperCase() === 'UPDATION_PENDING';
            const updationStatusLabel = isUpdationPending ? 'PENDING' : updationStatus;

            return (
              <div key={purchase.purchaseid || purchase.invoiceid || invoiceNumber || index} className="stock-card purchase-info-card">
                <div className="stock-card-top">
                  <div className="stock-card-title">{invoiceNumber}</div>
                  <span className={`status-badge${isPaymentPending ? ' payment-pending' : ''}`}>{paymentStatusLabel}</span>
                  <div className="stock-card-site">{distributor}</div>
                </div>
                <div className="stock-card-body">
                  <div className="stock-field-row">
                    <span className="stock-field-label">Invoice date</span>
                    <span className="stock-field-value">{invoiceDate}</span>
                  </div>
                  <div className="stock-field-row">
                    <span className="stock-field-label">Payment status</span>
                    <span className={`stock-field-value${isPaymentPending ? ' payment-pending-text' : ''}`}>{paymentStatusLabel}</span>
                  </div>
                  <div className="stock-field-row">
                    <span className="stock-field-label">Invoice amount</span>
                    <span className="stock-field-value">{invoiceAmount}</span>
                  </div>
                  <div className="stock-field-row">
                    <span className="stock-field-label">Stock Updation Status</span>
                    <span className={`status-badge${isUpdationPending ? ' updation-pending' : ''}`}>{updationStatusLabel}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {captureDialogOpen ? (
        <div className="modal-backdrop" role="presentation" onClick={(event) => event.target === event.currentTarget && setCaptureDialogOpen(false)}>
          <div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="purchase-capture-title">
            <div className="modal-header">
              <h3 id="purchase-capture-title">Capture purchase invoice</h3>
            </div>
            <label>
              <span>Select Distributor</span>
              <select
                value={selectedDistributorId}
                onChange={(event) => setSelectedDistributorId(event.target.value)}
                disabled={loadingDistributors || uploading}
              >
                <option value="">Select distributor</option>
                {distributors.map((distributor) => (
                  <option key={distributor.supplierid} value={distributor.supplierid}>
                    {distributor.suppliername}
                  </option>
                ))}
              </select>
            </label>
            <div className="modal-actions">
              <button type="button" className="ghost-btn" onClick={() => setCaptureDialogOpen(false)} disabled={uploading}>
                Cancel
              </button>
              <button
                type="button"
                className="primary-btn"
                onClick={handleUploadInvoice}
                disabled={loadingDistributors || uploading || !selectedDistributorId}
              >
                <FiUpload aria-hidden="true" />
                <span>{uploading ? 'Uploading...' : 'Capture invoice'}</span>
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {uploading ? (
        <div className="purchase-invoice-busy" role="status" aria-live="polite" aria-label="Processing invoice">
          <div className="purchase-invoice-spinner" aria-hidden="true" />
          <span>Processing invoice...</span>
        </div>
      ) : null}
    </div>
  );
}

export default PurchaseInvoicePage;