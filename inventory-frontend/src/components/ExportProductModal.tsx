import { useState, useEffect } from 'react';
import { productsApi, type ExportProductDto, type Product } from '../services/productsApi';
import { type Location } from '../services/locationsApi';

interface ExportProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  product: Product | null;
  locations: Location[];
}

const ExportProductModal = ({ isOpen, onClose, onSuccess, product, locations }: ExportProductModalProps) => {
  const [formData, setFormData] = useState<ExportProductDto>({
    locationId: '',
    quantity: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [maxQuantity, setMaxQuantity] = useState(0);

  useEffect(() => {
    if (product && formData.locationId) {
      const location = product.locations.find(loc => loc.locationId._id === formData.locationId);
      if (location) {
        setMaxQuantity(location.quantity);
      }
    }
  }, [product, formData.locationId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;

    setLoading(true);
    setError('');

    try {
      await productsApi.exportProduct(product._id, formData);
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to export product');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'quantity' ? Number(value) : value,
    }));
  };

  const getAvailableLocations = () => {
    if (!product) return [];
    return product.locations.filter(loc => loc.quantity > 0);
  };

  if (!isOpen || !product) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              Export Product: {product.description}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <span className="sr-only">Close</span>
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">
                  Warning
                </h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>This will permanently reduce the inventory quantity. This action cannot be undone.</p>
                </div>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="locationId" className="block text-sm font-medium text-gray-700">
                Location
              </label>
              <select
                name="locationId"
                id="locationId"
                required
                value={formData.locationId}
                onChange={handleChange}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              >
                <option value="">Select location</option>
                {getAvailableLocations().map((location) => (
                  <option key={location.locationId._id} value={location.locationId._id}>
                    {location.locationId.name} ({location.quantity} available)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="quantity" className="block text-sm font-medium text-gray-700">
                Quantity to Export
              </label>
              <input
                type="number"
                name="quantity"
                id="quantity"
                min="1"
                max={maxQuantity}
                required
                value={formData.quantity}
                onChange={handleChange}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
              {maxQuantity > 0 && (
                <p className="mt-1 text-sm text-gray-500">
                  Maximum: {maxQuantity}
                </p>
              )}
            </div>

            {error && (
              <div className="text-red-600 text-sm">{error}</div>
            )}

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !formData.locationId || formData.quantity <= 0}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
              >
                {loading ? 'Exporting...' : 'Export Product'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ExportProductModal;
