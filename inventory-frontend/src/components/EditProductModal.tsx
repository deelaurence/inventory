import { useState, useEffect } from 'react';
import { productsApi, type PriceComparisonDto } from '../services/productsApi';
import type { Product } from '../services/productsApi';
import { importLocationsApi, type ImportLocation } from '../services/importLocationsApi';
import Loader from './Loader';
import { getCurrencySymbol } from '../utils/currency';

interface EditProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  product: Product | null;
}

const EditProductModal = ({ isOpen, onClose, onSuccess, product }: EditProductModalProps) => {
  const [formData, setFormData] = useState({
    description: '',
    unitPrice: '',
    sellingPrice: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showCostPriceEdit, setShowCostPriceEdit] = useState(false);
  const [priceComparisons, setPriceComparisons] = useState<Array<{ importLocationId: string; price: string }>>([]);
  const [importLocations, setImportLocations] = useState<ImportLocation[]>([]);
  const [showAddPriceComparison, setShowAddPriceComparison] = useState(false);
  const [newPriceComparison, setNewPriceComparison] = useState({
    importLocationId: '',
    price: ''
  });

  useEffect(() => {
    if (isOpen) {
      fetchImportLocations();
    }
  }, [isOpen]);

  useEffect(() => {
    if (product && isOpen) {
      setFormData({
        description: product.description || '',
        unitPrice: product.unitPrice?.toString() || '',
        sellingPrice: product.sellingPrice?.toString() || ''
      });
      setShowCostPriceEdit(false);
      
      // Load existing price comparisons
      if (product.priceComparisons && product.priceComparisons.length > 0) {
        setPriceComparisons(product.priceComparisons.map(pc => ({
          importLocationId: typeof pc.importLocationId === 'object' && pc.importLocationId ? pc.importLocationId._id : (pc.importLocationId as any),
          price: pc.price ? pc.price.toString() : '0'
        })));
      } else {
        setPriceComparisons([]);
      }
    }
  }, [product, isOpen]);

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

    if (!product) return;

    // Validate cost price if editing
    if (showCostPriceEdit && formData.unitPrice) {
      const unitPrice = parseFloat(formData.unitPrice);
      if (isNaN(unitPrice) || unitPrice <= 0) {
        setError('Cost price must be a positive number');
        setLoading(false);
        return;
      }
    }

    try {
      const updateData: { description: string; unitPrice?: number; sellingPrice?: number | null; priceComparisons?: PriceComparisonDto[] } = {
        description: formData.description
      };
      
      // Add unitPrice if editing cost price
      if (showCostPriceEdit && formData.unitPrice) {
        updateData.unitPrice = parseFloat(formData.unitPrice);
      }
      
      // If sellingPrice field is empty, send null to remove it
      // If it has a value, parse and send it
      if (formData.sellingPrice === '') {
        updateData.sellingPrice = null;
      } else if (formData.sellingPrice) {
        updateData.sellingPrice = parseFloat(formData.sellingPrice);
      }

      // Add price comparisons (always send the array, even if empty)
      updateData.priceComparisons = priceComparisons.map(pc => ({
        importLocationId: pc.importLocationId,
        price: parseFloat(pc.price)
      }));
      
      await productsApi.updateProduct(product._id, updateData);

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update product');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleAddPriceComparison = () => {
    if (!newPriceComparison.importLocationId || !newPriceComparison.price) {
      setError('Please select an import location and enter a price');
      setTimeout(() => setError(''), 3000);
      return;
    }

    const price = parseFloat(newPriceComparison.price);
    if (isNaN(price) || price <= 0) {
      setError('Price must be a positive number');
      setTimeout(() => setError(''), 3000);
      return;
    }

    // Check if this import location already has a price comparison
    if (priceComparisons.some(pc => pc.importLocationId === newPriceComparison.importLocationId)) {
      setError('This import location already has a price comparison');
      setTimeout(() => setError(''), 3000);
      return;
    }

    setPriceComparisons([...priceComparisons, {
      importLocationId: newPriceComparison.importLocationId,
      price: newPriceComparison.price // Keep as string in state, convert to number when submitting
    }]);

    setNewPriceComparison({
      importLocationId: '',
      price: ''
    });
    setShowAddPriceComparison(false);
  };

  const handleRemovePriceComparison = (importLocationId: string) => {
    setPriceComparisons(priceComparisons.filter(pc => pc.importLocationId !== importLocationId));
  };

  const getImportLocationName = (importLocationId: string) => {
    const location = importLocations.find(loc => loc._id === importLocationId);
    return location ? `${location.name}${location.country ? ` (${location.country})` : ''}` : 'Unknown';
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
              <h2 className="text-xl font-semibold text-gray-900">Edit Product</h2>
              <p className="text-sm text-gray-600 mt-1">Update product details</p>
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
                <p className="text-sm font-medium text-gray-500">Parts Number</p>
                <p className="text-sm font-semibold text-gray-900">#{product.partsNumber}</p>
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

            {/* Cost Price Edit Toggle */}
            <div className="border-t border-gray-200 pt-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Cost Price (Unit Price)
                  </label>
                  <p className="text-xs text-gray-500 mt-1">Current: {getCurrencySymbol()}{product.unitPrice?.toLocaleString() || 'N/A'}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCostPriceEdit(!showCostPriceEdit)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    showCostPriceEdit
                      ? 'bg-red-100 text-red-700 hover:bg-red-200'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {showCostPriceEdit ? 'Cancel Edit' : 'Edit Cost Price'}
                </button>
              </div>

              {showCostPriceEdit && (
                <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4 mb-4">
                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-red-600 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold text-red-900 mb-1">⚠️ Warning: Changing Cost Price</h4>
                      <ul className="text-xs text-red-800 space-y-1 list-disc list-inside">
                        <li>This will affect the total inventory value calculation</li>
                        <li>Profit/loss calculations will be recalculated based on the new cost</li>
                        <li>Historical movement records will retain the old cost price</li>
                        <li>This change cannot be easily undone</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {showCostPriceEdit && (
                <div>
                  <label htmlFor="unitPrice" className="block text-sm font-medium text-gray-700 mb-2">
                    New Cost Price *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 text-sm">{getCurrencySymbol()}</span>
                    </div>
                    <input
                      type="number"
                      id="unitPrice"
                      name="unitPrice"
                      value={formData.unitPrice}
                      onChange={handleChange}
                      min="0"
                      step="0.01"
                      required={showCostPriceEdit}
                      className="w-full pl-7 pr-3 py-2 border-2 border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors bg-white"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="sellingPrice" className="block text-sm font-medium text-gray-700 mb-2">
                Selling Price
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 text-sm">{getCurrencySymbol()}</span>
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
              <p className="mt-1 text-xs text-gray-500">Leave empty to remove selling price</p>
              {formData.sellingPrice && formData.unitPrice && parseFloat(formData.sellingPrice) > 0 && parseFloat(formData.unitPrice) > 0 && (
                (() => {
                  const costPrice = parseFloat(formData.unitPrice);
                  const sellPrice = parseFloat(formData.sellingPrice);
                  const profit = sellPrice - costPrice;
                  const profitPercentage = costPrice > 0 ? ((profit / costPrice) * 100) : 0;
                  return (
                    <div className={`mt-2 p-2 rounded-lg text-xs ${profit >= 0 ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                      <div className="flex items-center justify-between">
                        <span className={profit >= 0 ? 'text-green-700' : 'text-red-700'}>
                          {profit >= 0 ? '✓ Profit' : '⚠ Loss'} per unit:
                        </span>
                        <span className={`font-semibold ${profit >= 0 ? 'text-green-800' : 'text-red-800'}`}>
                          {getCurrencySymbol()}{Math.abs(profit).toLocaleString()} ({profitPercentage >= 0 ? '+' : ''}{profitPercentage.toFixed(1)}%)
                        </span>
                      </div>
                    </div>
                  );
                })()
              )}
            </div>

            {/* Price Comparison Section */}
            <div className="border-t border-gray-200 pt-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Price Comparison</h3>
                  <p className="text-xs text-gray-500 mt-1">Compare prices from different import locations (for reference only)</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddPriceComparison(!showAddPriceComparison)}
                  className="px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Add Compare Price
                </button>
              </div>

              {/* Add Price Comparison Form */}
              {showAddPriceComparison && (
                <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mb-4">
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Import Location *
                      </label>
                      <select
                        value={newPriceComparison.importLocationId}
                        onChange={(e) => setNewPriceComparison({...newPriceComparison, importLocationId: e.target.value})}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Select import location...</option>
                        {importLocations
                          .filter(loc => !priceComparisons.some(pc => pc.importLocationId === loc._id))
                          .map((location) => (
                            <option key={location._id} value={location._id}>
                              {location.name} {location.country && `(${location.country})`}
                            </option>
                          ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Price *
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <span className="text-gray-500 text-xs">{getCurrencySymbol()}</span>
                        </div>
                        <input
                          type="number"
                          value={newPriceComparison.price}
                          onChange={(e) => setNewPriceComparison({...newPriceComparison, price: e.target.value})}
                          className="w-full pl-7 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="0.00"
                          min="0"
                          step="0.01"
                        />
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        type="button"
                        onClick={handleAddPriceComparison}
                        className="flex-1 px-3 py-2 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      >
                        Add to List
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddPriceComparison(false);
                          setNewPriceComparison({ importLocationId: '', price: '' });
                        }}
                        className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Price Comparisons List */}
              {priceComparisons.length > 0 && (
                <div className="space-y-2">
                  {priceComparisons.map((pc) => (
                    <div key={pc.importLocationId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">
                          {getImportLocationName(pc.importLocationId)}
                        </div>
                        <div className="text-sm text-gray-600">
                          {getCurrencySymbol()}{Number(pc.price).toLocaleString()}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemovePriceComparison(pc.importLocationId)}
                        className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                        title="Remove"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {priceComparisons.length === 0 && !showAddPriceComparison && (
                <p className="text-xs text-gray-500 text-center py-4">
                  No price comparisons added yet. Click "Add Compare Price" to add one.
                </p>
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
                    Updating...
                  </div>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Update Product
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

export default EditProductModal;

