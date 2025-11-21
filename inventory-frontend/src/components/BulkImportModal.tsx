import { useState, useEffect } from 'react';
import { productsApi, type Product } from '../services/productsApi';
import type { Location } from '../services/locationsApi';
import { importLocationsApi, type ImportLocation } from '../services/importLocationsApi';
import Loader from './Loader';
import SearchableSelect from './SearchableSelect';

interface BulkProductItem {
  id: string;
  productId?: string; // If existing product
  description: string;
  partsNumber: string;
  quantity: string;
  unitPrice: string;
  sellingPrice: string;
  isNew: boolean; // True if this is a new product being added
}

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  locations: Location[];
}

const BulkImportModal = ({ isOpen, onClose, onSuccess, locations }: BulkImportModalProps) => {
  const [products, setProducts] = useState<BulkProductItem[]>([]);
  const [existingProducts, setExistingProducts] = useState<Product[]>([]);
  const [importLocations, setImportLocations] = useState<ImportLocation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedImportLocation, setSelectedImportLocation] = useState('');

  // Form for adding new product to bulk list
  const [newProductForm, setNewProductForm] = useState({
    description: '',
    partsNumber: '',
    quantity: '',
    unitPrice: '',
    sellingPrice: ''
  });
  const [showNewProductForm, setShowNewProductForm] = useState(false);
  const [selectedExistingProductId, setSelectedExistingProductId] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchExistingProducts();
      fetchImportLocations();
      setProducts([]);
      setSelectedLocation('');
      setSelectedImportLocation('');
      setShowNewProductForm(false);
      setNewProductForm({
        description: '',
        partsNumber: '',
        quantity: '',
        unitPrice: '',
        sellingPrice: ''
      });
    }
  }, [isOpen]);

  const fetchExistingProducts = async () => {
    try {
      const response = await productsApi.fetchProducts({
        page: 1,
        limit: 50,
      });
      setExistingProducts(response.data);
    } catch (err) {
      console.error('Failed to fetch existing products:', err);
    }
  };

  const fetchImportLocations = async () => {
    try {
      const data = await importLocationsApi.fetchImportLocations();
      setImportLocations(data);
    } catch (err) {
      console.error('Failed to fetch import locations:', err);
    }
  };

  const handleAddExistingProduct = (productId: string) => {
    if (!productId) return;

    const product = existingProducts.find(p => p._id === productId);
    if (!product) {
      setError('Product not found');
      setTimeout(() => setError(''), 3000);
      return;
    }

    // Check if product is already in the list
    if (products.some(p => p.productId === productId)) {
      setError('This product is already in the list');
      setTimeout(() => setError(''), 3000);
      return;
    }

    // Validate that product has required fields
    if (!product.unitPrice) {
      setError(`Product ${product.description} does not have a cost price set`);
      setTimeout(() => setError(''), 3000);
      return;
    }

    const newItem: BulkProductItem = {
      id: `existing-${Date.now()}`,
      productId: product._id,
      description: product.description || '',
      partsNumber: product.partsNumber || '',
      quantity: '',
      unitPrice: product.unitPrice ? product.unitPrice.toString() : '',
      sellingPrice: product.sellingPrice ? product.sellingPrice.toString() : '',
      isNew: false
    };

    setProducts([...products, newItem]);
  };

  const handleAddNewProduct = () => {
    if (!newProductForm.description || !newProductForm.partsNumber || !newProductForm.quantity || !newProductForm.unitPrice) {
      setError('Please fill in all required fields (Description, Parts Number, Quantity, Cost Price)');
      setTimeout(() => setError(''), 3000);
      return;
    }

    // Check if parts number already exists in list
    if (products.some(p => p.partsNumber === newProductForm.partsNumber)) {
      setError('This parts number is already in the list');
      setTimeout(() => setError(''), 3000);
      return;
    }

    const newItem: BulkProductItem = {
      id: `new-${Date.now()}`,
      description: newProductForm.description,
      partsNumber: newProductForm.partsNumber,
      quantity: newProductForm.quantity,
      unitPrice: newProductForm.unitPrice,
      sellingPrice: newProductForm.sellingPrice,
      isNew: true
    };

    setProducts([...products, newItem]);
    setNewProductForm({
      description: '',
      partsNumber: '',
      quantity: '',
      unitPrice: '',
      sellingPrice: ''
    });
    setShowNewProductForm(false);
  };

  const handleRemoveProduct = (id: string) => {
    setProducts(products.filter(p => p.id !== id));
  };

  const handleUpdateProduct = (id: string, field: keyof BulkProductItem, value: string) => {
    setProducts(products.map(p => 
      p.id === id ? { ...p, [field]: value } : p
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (products.length === 0) {
      setError('Please add at least one product to the list');
      setLoading(false);
      return;
    }

    if (!selectedLocation) {
      setError('Please select a storage location');
      setLoading(false);
      return;
    }

    // Validate all products
    for (const product of products) {
      if (!product.quantity || parseFloat(product.quantity) <= 0) {
        setError(`Quantity must be a positive number for ${product.description}`);
        setLoading(false);
        return;
      }
      if (!product.unitPrice || parseFloat(product.unitPrice) <= 0) {
        setError(`Cost price must be a positive number for ${product.description}`);
        setLoading(false);
        return;
      }
    }

    try {
      // Process each product
      for (const product of products) {
        if (product.isNew) {
          // Create new product
          await productsApi.importProduct({
            description: product.description,
            partsNumber: product.partsNumber,
            quantity: parseInt(product.quantity),
            unitPrice: parseFloat(product.unitPrice),
            locationId: selectedLocation,
            importLocationId: selectedImportLocation || undefined,
            sellingPrice: product.sellingPrice ? parseFloat(product.sellingPrice) : undefined
          });
        } else if (product.productId) {
          // Update existing product
          await productsApi.updateProductAndInventory({
            productId: product.productId,
            unitPrice: parseFloat(product.unitPrice),
            quantity: parseInt(product.quantity),
            locationId: selectedLocation,
            sellingPrice: product.sellingPrice ? parseFloat(product.sellingPrice) : undefined,
            importLocationId: selectedImportLocation || undefined
          });
        }
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to import products');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={onClose}
        />
        
        <div className="relative bg-white rounded-xl shadow-xl max-w-4xl w-full mx-auto max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Bulk Import Products</h2>
              <p className="text-sm text-gray-600 mt-1">Add multiple products at once</p>
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

          {/* Content */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
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

            {/* Add Products Section */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-3 border-2 border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Add Products to List</h3>
                {products.length > 0 && (
                  <span className="text-xs font-medium text-gray-600 bg-white px-2 py-1 rounded">
                    {products.length} in list
                  </span>
                )}
              </div>
              
              {/* Select Existing Product */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Existing Product
                </label>
                <div className="flex space-x-2">
                  <div className="flex-1">
                    <SearchableSelect
                      options={existingProducts.filter(p => !products.some(listItem => listItem.productId === p._id))}
                      value={selectedExistingProductId}
                      onChange={(value) => setSelectedExistingProductId(value)}
                      getOptionLabel={(product) => `${product.description} (#${product.partsNumber})`}
                      getOptionValue={(product) => product._id}
                      placeholder="Choose existing product..."
                      limit={50}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedExistingProductId) {
                        handleAddExistingProduct(selectedExistingProductId);
                        setSelectedExistingProductId('');
                      }
                    }}
                    disabled={!selectedExistingProductId}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm font-medium flex items-center"
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Add to List
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowNewProductForm(!showNewProductForm);
                      if (showNewProductForm) {
                        setNewProductForm({
                          description: '',
                          partsNumber: '',
                          quantity: '',
                          unitPrice: '',
                          sellingPrice: ''
                        });
                      }
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                  >
                    {showNewProductForm ? 'Cancel' : '+ New Product'}
                  </button>
                </div>
              </div>

              {/* New Product Form */}
              {showNewProductForm && (
                <div className="bg-amber-50 border-2 border-amber-300 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-gray-900 flex items-center">
                      <svg className="w-5 h-5 mr-2 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Entering New Product Details
                    </h4>
                    <span className="text-xs font-medium text-amber-700 bg-amber-200 px-2 py-1 rounded">Not in list yet</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Description *</label>
                      <input
                        type="text"
                        value={newProductForm.description}
                        onChange={(e) => setNewProductForm({...newProductForm, description: e.target.value})}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="Product description"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Parts Number *</label>
                      <input
                        type="text"
                        value={newProductForm.partsNumber}
                        onChange={(e) => setNewProductForm({...newProductForm, partsNumber: e.target.value})}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="Parts number"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Quantity *</label>
                      <input
                        type="number"
                        value={newProductForm.quantity}
                        onChange={(e) => setNewProductForm({...newProductForm, quantity: e.target.value})}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="0"
                        min="1"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Cost Price *</label>
                      <input
                        type="number"
                        value={newProductForm.unitPrice}
                        onChange={(e) => setNewProductForm({...newProductForm, unitPrice: e.target.value})}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Selling Price</label>
                      <input
                        type="number"
                        value={newProductForm.sellingPrice}
                        onChange={(e) => setNewProductForm({...newProductForm, sellingPrice: e.target.value})}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                      />
                      {newProductForm.sellingPrice && newProductForm.unitPrice && parseFloat(newProductForm.sellingPrice) > 0 && parseFloat(newProductForm.unitPrice) > 0 && (
                        (() => {
                          const costPrice = parseFloat(newProductForm.unitPrice);
                          const sellPrice = parseFloat(newProductForm.sellingPrice);
                          const profit = sellPrice - costPrice;
                          const profitPercentage = costPrice > 0 ? ((profit / costPrice) * 100) : 0;
                          return (
                            <div className={`mt-1 p-1.5 rounded text-xs ${profit >= 0 ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                              <div className="flex items-center justify-between">
                                <span className={profit >= 0 ? 'text-green-700' : 'text-red-700'}>
                                  {profit >= 0 ? 'Profit' : 'Loss'}:
                                </span>
                                <span className={`font-semibold ${profit >= 0 ? 'text-green-800' : 'text-red-800'}`}>
                                  ₦{Math.abs(profit).toLocaleString()} ({profitPercentage >= 0 ? '+' : ''}{profitPercentage.toFixed(1)}%)
                                </span>
                              </div>
                            </div>
                          );
                        })()
                      )}
                    </div>
                    <div className="flex items-end">
                      <button
                        type="button"
                        onClick={handleAddNewProduct}
                        className="w-full px-4 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium flex items-center justify-center"
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Add to List
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Products List */}
            {products.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900">
                    Products in List ({products.length})
                  </h3>
                  <span className="text-xs font-medium text-green-700 bg-green-100 px-3 py-1 rounded-full">
                    ✓ Ready to import
                  </span>
                </div>
                <div className="border-2 border-green-300 rounded-lg overflow-hidden bg-green-50/30">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-green-200">
                      <thead className="bg-green-100">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-green-800 uppercase">Product</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-green-800 uppercase">Quantity</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-green-800 uppercase">Cost Price</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-green-800 uppercase">Selling Price</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-green-800 uppercase">Action</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-green-200">
                        {products.map((product) => (
                          <tr key={product.id} className="bg-white hover:bg-green-50 transition-colors">
                            <td className="px-4 py-3">
                              <div>
                                <div className="text-sm font-medium text-gray-900">{product.description}</div>
                                <div className="text-xs text-gray-500">#{product.partsNumber}</div>
                                {product.isNew ? (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 mt-1">
                                    New Product
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 mt-1">
                                    Existing
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="number"
                                value={product.quantity}
                                onChange={(e) => handleUpdateProduct(product.id, 'quantity', e.target.value)}
                                className="w-20 px-2 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                min="1"
                                required
                              />
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="number"
                                value={product.unitPrice}
                                onChange={(e) => handleUpdateProduct(product.id, 'unitPrice', e.target.value)}
                                className="w-24 px-2 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                min="0"
                                step="0.01"
                                required
                              />
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="number"
                                value={product.sellingPrice}
                                onChange={(e) => handleUpdateProduct(product.id, 'sellingPrice', e.target.value)}
                                className="w-24 px-2 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                min="0"
                                step="0.01"
                              />
                            </td>
                            <td className="px-4 py-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveProduct(product.id)}
                                className="text-red-600 hover:text-red-800"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Location Selection */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Storage Location *
                </label>
                <SearchableSelect
                  options={locations}
                  value={selectedLocation}
                  onChange={(value) => setSelectedLocation(value)}
                  getOptionLabel={(location) => location.name}
                  getOptionValue={(location) => location._id}
                  placeholder="Select storage location"
                  limit={50}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Import Location
                </label>
                <SearchableSelect
                  options={importLocations}
                  value={selectedImportLocation}
                  onChange={(value) => setSelectedImportLocation(value)}
                  getOptionLabel={(location) => `${location.name}${location.country ? ` (${location.country})` : ''}`}
                  getOptionValue={(location) => location._id}
                  placeholder="Select import location (optional)"
                  limit={50}
                />
              </div>
            </div>
          </form>

          {/* Footer */}
          <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              onClick={handleSubmit}
              disabled={loading || products.length === 0}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
            >
              {loading ? (
                <>
                  <Loader size="sm" text="" color="blue" className="mr-2" />
                  Importing...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Import {products.length} Product{products.length !== 1 ? 's' : ''}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BulkImportModal;

