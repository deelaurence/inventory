import { useState, useEffect } from 'react';
import { productsApi } from '../services/productsApi';
import type { Location } from '../services/locationsApi';
import type { Product } from '../services/productsApi';
import Loader from './Loader';

interface TransferProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  product: Product | null;
  locations: Location[];
}

const TransferProductModal = ({ isOpen, onClose, onSuccess, product, locations }: TransferProductModalProps) => {
  const [formData, setFormData] = useState({
    fromLocation: '',
    toLocation: '',
    quantity: '',
    unitPrice: '',
    notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [availableQuantity, setAvailableQuantity] = useState(0);

  useEffect(() => {
    if (product && formData.fromLocation) {
      const location = product.locations.find(loc => loc.locationId._id === formData.fromLocation);
      if (location) {
        setAvailableQuantity(location.quantity);
        setFormData(prev => ({
          ...prev,
          unitPrice: location.unitPrice.toString()
        }));
      } else {
        setAvailableQuantity(0);
      }
    }
  }, [product, formData.fromLocation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!product) return;

    try {
      await productsApi.transferProduct(product._id, {
        fromLocationId: formData.fromLocation,
        toLocationId: formData.toLocation,
        quantity: parseInt(formData.quantity),
        unitPrice: parseFloat(formData.unitPrice)
      });

      onSuccess();
      setFormData({
        fromLocation: '',
        toLocation: '',
        quantity: '',
        unitPrice: '',
        notes: ''
      });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to transfer product');
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
              <h2 className="text-xl font-semibold text-gray-900">Transfer Product</h2>
              <p className="text-sm text-gray-600 mt-1">Move inventory between locations</p>
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
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{product.description}</h3>
                <p className="text-sm text-gray-500">#{product.partsNumber}</p>
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
              <select
                id="fromLocation"
                name="fromLocation"
                value={formData.fromLocation}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              >
                <option value="">Select source location</option>
                {product.locations
                  .filter(loc => loc.quantity > 0)
                  .map((location) => {
                    const locationName = locations.find(l => l._id === location.locationId._id)?.name || 'Unknown';
                    return (
                      <option key={location.locationId._id} value={location.locationId._id}>
                        {locationName} ({location.quantity} available)
                      </option>
                    );
                  })}
              </select>
            </div>

            <div>
              <label htmlFor="toLocation" className="block text-sm font-medium text-gray-700 mb-2">
                To Location *
              </label>
              <select
                id="toLocation"
                name="toLocation"
                value={formData.toLocation}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              >
                <option value="">Select destination location</option>
                {locations
                  .filter(loc => loc._id !== formData.fromLocation)
                  .map((location) => (
                    <option key={location._id} value={location._id}>
                      {location.name}
                    </option>
                  ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-2">
                  Quantity *
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
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="0"
                  />
                  <div className="text-sm text-gray-500 whitespace-nowrap">
                    Max: {availableQuantity}
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="unitPrice" className="block text-sm font-medium text-gray-700 mb-2">
                  Unit Price *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 text-sm">₦</span>
                  </div>
                  <input
                    type="number"
                    id="unitPrice"
                    name="unitPrice"
                    value={formData.unitPrice}
                    onChange={handleChange}
                    required
                    min="0"
                    step="0.01"
                    className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
                Notes (Optional)
              </label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
                placeholder="Add any notes about this transfer..."
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
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
              >
                {loading ? (
                  <div className="flex items-center">
                    <Loader size="sm" text="" color="blue" className="mr-2" />
                    Transferring...
                  </div>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                    Transfer Product
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

export default TransferProductModal;