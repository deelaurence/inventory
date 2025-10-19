import { useState, useEffect } from 'react';
import { productsApi, type TransferProductDto, type Product } from '../services/productsApi';
import { type Location } from '../services/locationsApi';

interface TransferProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  product: Product | null;
  locations: Location[];
}

const TransferProductModal = ({ isOpen, onClose, onSuccess, product, locations }: TransferProductModalProps) => {
  const [formData, setFormData] = useState<TransferProductDto>({
    fromLocationId: '',
    toLocationId: '',
    quantity: 0,
    unitPrice: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [maxQuantity, setMaxQuantity] = useState(0);

  useEffect(() => {
    if (product && formData.fromLocationId) {
      const location = product.locations.find(loc => loc.locationId._id === formData.fromLocationId);
      if (location) {
        setMaxQuantity(location.quantity);
        setFormData(prev => ({
          ...prev,
          unitPrice: location.unitPrice,
        }));
      }
    }
  }, [product, formData.fromLocationId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;

    setLoading(true);
    setError('');

    try {
      await productsApi.transferProduct(product._id, formData);
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to transfer product');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'quantity' || name === 'unitPrice' ? Number(value) : value,
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
              Transfer Product: {product.description}
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

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="fromLocationId" className="block text-sm font-medium text-gray-700">
                From Location
              </label>
              <select
                name="fromLocationId"
                id="fromLocationId"
                required
                value={formData.fromLocationId}
                onChange={handleChange}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              >
                <option value="">Select source location</option>
                {getAvailableLocations().map((location) => (
                  <option key={location.locationId._id} value={location.locationId._id}>
                    {location.locationId.name} ({location.quantity} available)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="toLocationId" className="block text-sm font-medium text-gray-700">
                To Location
              </label>
              <select
                name="toLocationId"
                id="toLocationId"
                required
                value={formData.toLocationId}
                onChange={handleChange}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              >
                <option value="">Select destination location</option>
                {locations.map((location) => (
                  <option key={location._id} value={location._id}>
                    {location.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="quantity" className="block text-sm font-medium text-gray-700">
                Quantity
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

            <div>
              <label htmlFor="unitPrice" className="block text-sm font-medium text-gray-700">
                Unit Price
              </label>
              <input
                type="number"
                name="unitPrice"
                id="unitPrice"
                min="0"
                step="0.01"
                required
                value={formData.unitPrice}
                onChange={handleChange}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
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
                disabled={loading || !formData.fromLocationId || !formData.toLocationId}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {loading ? 'Transferring...' : 'Transfer Product'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default TransferProductModal;
