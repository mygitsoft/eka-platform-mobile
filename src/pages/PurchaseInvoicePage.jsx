import { useState } from 'react';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { FiUpload } from 'react-icons/fi';
import { fetchWithAuthFormData } from '../api/apiClient';
import { getApiBaseUrl } from '../api/config';
import '../App.css';

function PurchaseInvoicePage() {
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleUploadInvoice = async () => {
    setUploading(true);
    setMessage('');
    setError('');

    try {
      const photo = await Camera.getPhoto({
        quality: 100,
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera,
        correctOrientation: true,
      });

      const imageUrl = photo.webPath || photo.path;
      if (!imageUrl) {
        throw new Error('The camera did not return an image.');
      }

      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        throw new Error('Unable to read the captured invoice image.');
      }

      const imageBlob = await imageResponse.blob();
      const formData = new FormData();
      formData.append('file', imageBlob, `purchase-invoice-${Date.now()}.jpg`);

      await fetchWithAuthFormData(`${getApiBaseUrl()}/ocr/invoice`, {
        method: 'POST',
        body: formData,
      });

      setMessage('Purchase invoice uploaded successfully.');
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
    <div className="dashboard-shell purchase-invoice-screen">
      <div className="dashboard-header">
        <p className="eyebrow">Process Purchase</p>
        <h1>Purchase Invoice</h1>
        <p className="subtitle">Capture an invoice and send it for processing.</p>
      </div>

      <div className="purchase-invoice-content">
        <button
          type="button"
          className="purchase-upload-button"
          onClick={handleUploadInvoice}
          disabled={uploading}
          aria-label="Upload Purchase Invoice"
        >
          <FiUpload aria-hidden="true" />
          <span>{uploading ? 'Uploading...' : 'Upload Purchase Invoice'}</span>
        </button>
        {message ? <p className="form-message success">{message}</p> : null}
        {error ? <p className="form-error">{error}</p> : null}
      </div>
    </div>
  );
}

export default PurchaseInvoicePage;