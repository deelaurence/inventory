import { useState, useEffect } from 'react';
import { productsApi } from '../services/productsApi';
import type { Location } from '../services/locationsApi';
import type { Product } from '../services/productsApi';
import Loader from './Loader';

interface ExportProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  product: Product | null;
  locations: Location[];
}

const ExportProductModal = ({ isOpen, onClose, onSuccess, product, locations }: ExportProductModalProps) => {
  const [formData, setFormData] = useState({
    fromLocation: '',
    quantity: '',
    notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [availableQuantity, setAvailableQuantity] = useState(0);

  useEffect(() => {
    if (product && formData.fromLocation) {
      const location = product.locations.find(loc => loc.locationId._id === formData.fromLocation);
      setAvailableQuantity(location ? location.quantity : 0);
    }
  }, [product, formData.fromLocation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!product) return;

    try {
      await productsApi.exportProduct(product._id, {
        locationId: formData.fromLocation,
        quantity: parseInt(formData.quantity)
      });

      onSuccess();
      setFormData({
        fromLocation: '',
        quantity: '',
        notes: ''
      });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to export product');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  if (!isOpen || !product) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={onClose}
        />
        
        {/* Modal */}
        <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Export Product</h2>
              <p className="text-sm text-gray-600 mt-1">Remove items from inventory</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Product Info */}
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{product.description}</h3>
                <p className="text-sm text-gray-500">#{product.partsNumber}</p>
              </div>
            </div>
          </div>

          {/* Warning */}
          <div className="px-6 py-4 bg-yellow-50 border-b border-yellow-200">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-yellow-400 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <div>
                <h4 className="text-sm font-medium text-yellow-800">Warning</h4>
                <p className="text-sm text-yellow-700 mt-1">
                  This action will permanently reduce the inventory quantity. This cannot be undone.
                </p>
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <span className="text-sm text-red-800">{error}</span>
                </div>
              </div>
            )}

            <div>
              <label htmlFor="fromLocation" className="block text-sm font-medium text-gray-700 mb-2">
                From Location *
              </label>
              <SearchableSelect
                options={product.locations
                  .filter(loc => loc.quantity > 0)
                  .map(location => {
                    const locationName = locations.find(l => l._id === location.locationId._id)?.name || 'Unknown';
                    return {
                      ...location,
                      displayName: locationName,
                    };
                  })}
                value={formData.fromLocation}
                onChange={(value) => setFormData(prev => ({ ...prev, fromLocation: value }))}
                getOptionLabel={(location: any) => `${location.displayName} (${location.quantity} available)`}
                getOptionValue={(location: any) => location.locationId._id}
                placeholder="Select location to export from"
                limit={50}
              />
            </div>

            <div>
              <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-2">
                Quantity to Export *
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  id="quantity"
                  name="quantity"
                  value={formData.quantity}
                  onChange={handleChange}
                  required
                  min="1"
                  max={availableQuantity}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
                  placeholder="0"
                />
                <div className="text-sm text-gray-500 whitespace-nowrap">
                  Max: {availableQuantity}
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
                Reason for Export *
              </label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                required
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors resize-none"
                placeholder="Please provide a reason for this export (e.g., sold, damaged, returned to supplier)..."
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || availableQuantity === 0}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
              >
                {loading ? (
                  <div className="flex items-center">
                    <Loader size="sm" text="" color="red" className="mr-2" />
                    Exporting...
                  </div>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Export Product
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ExportProductModal;