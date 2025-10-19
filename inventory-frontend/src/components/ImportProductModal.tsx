import { useState, useEffect } from 'react';
import { productsApi } from '../services/productsApi';
import type { Location } from '../services/locationsApi';
import { importLocationsApi, type ImportLocation } from '../services/importLocationsApi';
import Loader from './Loader';

interface ImportProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  locations: Location[];
}

const ImportProductModal = ({ isOpen, onClose, onSuccess, locations }: ImportProductModalProps) => {
  const [formData, setFormData] = useState({
    description: '',
    partsNumber: '',
    quantity: '',
    unitPrice: '',
    importLocation: '',
    importLocationId: '',
    sellingPrice: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [importLocations, setImportLocations] = useState<ImportLocation[]>([]);

  useEffect(() => {
    if (isOpen) {
      fetchImportLocations();
    }
  }, [isOpen]);

  const fetchImportLocations = async () => {
    try {
      const data = await importLocationsApi.fetchImportLocations();
      setImportLocations(data);
    } catch (err) {
      console.error('Failed to fetch import locations:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await productsApi.importProduct({
        description: formData.description,
        partsNumber: formData.partsNumber,
        quantity: parseInt(formData.quantity),
        unitPrice: parseFloat(formData.unitPrice),
        locationId: formData.importLocation,
        importLocationId: formData.importLocationId || undefined,
        sellingPrice: formData.sellingPrice ? parseFloat(formData.sellingPrice) : undefined
      });

      onSuccess();
      setFormData({
        description: '',
        partsNumber: '',
        quantity: '',
        unitPrice: '',
        importLocation: '',
        importLocationId: '',
        sellingPrice: ''
      });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to import product');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  if (!isOpen) return null;

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
              <h2 className="text-xl font-semibold text-gray-900">Import Product</h2>
              <p className="text-sm text-gray-600 mt-1">Add a new product to your inventory</p>
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
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                Product Description *
              </label>
              <input
                type="text"
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="Enter product description"
              />
            </div>

            <div>
              <label htmlFor="partsNumber" className="block text-sm font-medium text-gray-700 mb-2">
                Parts Number *
              </label>
              <input
                type="text"
                id="partsNumber"
                name="partsNumber"
                value={formData.partsNumber}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="Enter parts number"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-2">
                  Quantity *
                </label>
                <input
                  type="number"
                  id="quantity"
                  name="quantity"
                  value={formData.quantity}
                  onChange={handleChange}
                  required
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="0"
                />
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
              <label htmlFor="importLocation" className="block text-sm font-medium text-gray-700 mb-2">
                Storage Location *
              </label>
              <select
                id="importLocation"
                name="importLocation"
                value={formData.importLocation}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              >
                <option value="">Select storage location</option>
                {locations.map((location) => (
                  <option key={location._id} value={location._id}>
                    {location.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="importLocationId" className="block text-sm font-medium text-gray-700 mb-2">
                Import Location
              </label>
              <select
                id="importLocationId"
                name="importLocationId"
                value={formData.importLocationId}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              >
                <option value="">Select import location (optional)</option>
                {importLocations.map((location) => (
                  <option key={location._id} value={location._id}>
                    {location.name} {location.country && `(${location.country})`}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="sellingPrice" className="block text-sm font-medium text-gray-700 mb-2">
                Selling Price
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 text-sm">₦</span>
                </div>
                <input
                  type="number"
                  id="sellingPrice"
                  name="sellingPrice"
                  value={formData.sellingPrice}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="0.00"
                />
              </div>
              {/* Profit/Loss Badge */}
              {formData.sellingPrice && formData.unitPrice && (
                <div className="mt-2">
                  {(() => {
                    const sellingPrice = parseFloat(formData.sellingPrice);
                    const unitPrice = parseFloat(formData.unitPrice);
                    const difference = sellingPrice - unitPrice;
                    const isProfit = difference > 0;
                    const isLoss = difference < 0;
                    const isBreakEven = difference === 0;
                    
                    return (
                      <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        isProfit 
                          ? 'bg-green-100 text-green-800' 
                          : isLoss 
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {isProfit && (
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                          </svg>
                        )}
                        {isLoss && (
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                          </svg>
                        )}
                        {isBreakEven && (
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                          </svg>
                        )}
                        {isProfit && `+₦${difference.toFixed(2)} profit`}
                        {isLoss && `-₦${Math.abs(difference).toFixed(2)} loss`}
                        {isBreakEven && 'Break even'}
                      </div>
                    );
                  })()}
                </div>
              )}
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
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
              >
                {loading ? (
                  <div className="flex items-center">
                    <Loader size="sm" text="" color="blue" className="mr-2" />
                    Importing...
                  </div>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Import Product
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

export default ImportProductModal;