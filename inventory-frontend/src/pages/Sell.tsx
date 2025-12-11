import { useState, useEffect } from 'react';
import { productsApi, type Product } from '../services/productsApi';
import { locationsApi, type Location } from '../services/locationsApi';
import { salesApi } from '../services/salesApi';
import Loader from '../components/Loader';
import SearchableSelect from '../components/SearchableSelect';
import { getCurrencySymbol } from '../utils/currency';

const Sell = () => {
  const [activeTab, setActiveTab] = useState<'sell' | 'sales'>('sell');
  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [salesLoading, setSalesLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [selectedSale, setSelectedSale] = useState<any | null>(null);
  
  // Pagination states for products
  const [productsPage] = useState(1);
  const [productsLimit] = useState(50);
  const [productsSearch] = useState('');
  
  // Pagination states for sales
  const [salesPage, setSalesPage] = useState(1);
  const [salesLimit] = useState(50);
  const [salesSearch, setSalesSearch] = useState('');
  const [salesSearchInput, setSalesSearchInput] = useState(''); // For immediate UI update
  const [salesStartDate, setSalesStartDate] = useState('');
  const [salesEndDate, setSalesEndDate] = useState('');
  const [salesTotal, setSalesTotal] = useState(0);
  const [salesTotalPages, setSalesTotalPages] = useState(0);

  const [formData, setFormData] = useState({
    productId: '',
    locationId: '',
    quantity: '',
    price: '',
    notes: ''
  });

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [availableQuantity, setAvailableQuantity] = useState(0);

  // Calculate profit helper
  const calculateProfit = (costPrice: number, sellingPrice: number) => {
    if (!costPrice || !sellingPrice) return null;
    const profit = sellingPrice - costPrice;
    const profitPercentage = costPrice > 0 ? ((profit / costPrice) * 100) : 0;
    return { profit, profitPercentage };
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Debounce sales search - wait 3 seconds after user stops typing
  useEffect(() => {
    if (activeTab === 'sales') {
      const timer = setTimeout(() => {
        setSalesSearch(salesSearchInput);
        setSalesPage(1); // Reset to first page on search
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [salesSearchInput, activeTab]);

  useEffect(() => {
    if (activeTab === 'sales') {
      fetchSales();
    }
  }, [activeTab, salesPage, salesSearch, salesStartDate, salesEndDate]);

  useEffect(() => {
    if (formData.productId && formData.locationId) {
      const product = products.find(p => p._id === formData.productId);
      if (product) {
        setSelectedProduct(product);
        const location = product.locations.find(
          loc => loc.locationId._id === formData.locationId
        );
        if (location) {
          setAvailableQuantity(location.quantity);
          // Set suggested price if product has selling price
          if (product.sellingPrice !== undefined && product.sellingPrice !== null && !formData.price) {
            setFormData(prev => ({ ...prev, price: product.sellingPrice!.toString() }));
          }
        } else {
          setAvailableQuantity(0);
        }
      }
    } else {
      setSelectedProduct(null);
      setAvailableQuantity(0);
    }
  }, [formData.productId, formData.locationId, products]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [productsResponse, locationsData] = await Promise.all([
        productsApi.fetchProducts({
          page: productsPage,
          limit: productsLimit,
          search: productsSearch || undefined,
        }),
        locationsApi.fetchLocations(),
      ]);
      // Store products from paginated response
      setProducts(productsResponse.data);
      setLocations(locationsData);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const fetchSales = async () => {
    try {
      setSalesLoading(true);
      const salesResponse = await salesApi.fetchSales({
        page: salesPage,
        limit: salesLimit,
        search: salesSearch || undefined,
        startDate: salesStartDate || undefined,
        endDate: salesEndDate || undefined,
      });
      setSales(salesResponse.data);
      setSalesTotal(salesResponse.total);
      setSalesTotalPages(salesResponse.totalPages);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch sales');
    } finally {
      setSalesLoading(false);
    }
  };

  const handleSalesSearchChange = (value: string) => {
    setSalesSearchInput(value); // Update input immediately for UI
    // Search will be triggered after 3 seconds via useEffect
  };

  const handleSalesDateFilter = (start: string, end: string) => {
    setSalesStartDate(start);
    setSalesEndDate(end);
    setSalesPage(1);
  };

  const clearSalesFilters = () => {
    setSalesSearch('');
    setSalesSearchInput('');
    setSalesStartDate('');
    setSalesEndDate('');
    setSalesPage(1);
  };

  // Get available products for selected location
  const getAvailableProducts = () => {
    if (!formData.locationId) {
      // If no location selected, show all products with stock anywhere
      return products.filter(p => {
        const totalQuantity = p.locations.reduce((sum, loc) => sum + loc.quantity, 0);
        return totalQuantity > 0;
      });
    }
    // Filter products that have stock at the selected location
    return products.filter(p => {
      const location = p.locations.find(loc => loc.locationId._id === formData.locationId);
      return location && location.quantity > 0;
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess(false);

    // Validate
    if (!formData.productId || !formData.locationId || !formData.quantity || !formData.price) {
      setError('Please fill in all required fields');
      setSubmitting(false);
      return;
    }

    const quantity = parseInt(formData.quantity);
    const price = parseFloat(formData.price);

    if (isNaN(quantity) || quantity <= 0) {
      setError('Quantity must be a positive number');
      setSubmitting(false);
      return;
    }

    if (quantity > availableQuantity) {
      setError(`Insufficient stock. Available: ${availableQuantity}`);
      setSubmitting(false);
      return;
    }

    if (isNaN(price) || price <= 0) {
      setError('Price must be a positive number');
      setSubmitting(false);
      return;
    }

    try {
      await salesApi.createSale({
        productId: formData.productId,
        locationId: formData.locationId,
        quantity,
        price,
        notes: formData.notes || undefined
      });

      setSuccess(true);
      setFormData({
        productId: '',
        locationId: '',
        quantity: '',
        price: '',
        notes: ''
      });
      setSelectedProduct(null);
      setAvailableQuantity(0);

      // Refresh data to update stock levels
      await fetchData();
      
      // Refresh sales list if on sales tab
      if (activeTab === 'sales') {
        await fetchSales();
      }

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create sale');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader size="lg" text="Loading..." color="blue" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Sell Product</h1>
              <p className="text-sm text-gray-600 mt-1">Record a sale and update inventory</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 sm:px-6 lg:px-8 py-6">
        <div className="max-w-6xl mx-auto">
          {/* Tabs */}
          <div className="mb-6">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setActiveTab('sell')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === 'sell'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Make Sale
                  </div>
                </button>
                <button
                  onClick={() => {
                    setActiveTab('sales');
                    if (sales.length === 0) {
                      fetchSales();
                    }
                  }}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === 'sales'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    Sales List
                    {salesTotal > 0 && (
                      <span className="ml-2 bg-blue-100 text-blue-800 text-xs font-medium px-2 py-0.5 rounded-full">
                        {salesTotal}
                      </span>
                    )}
                  </div>
                </button>
              </nav>
            </div>
          </div>

          {/* Make Sale Tab */}
          {activeTab === 'sell' && (
            <div className="w-full">
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
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

              {success && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-green-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-sm text-green-800">Sale recorded successfully! Inventory updated.</span>
                  </div>
                </div>
              )}

              {/* Location Selection - First */}
              <div>
                <label htmlFor="locationId" className="block text-sm font-medium text-gray-700 mb-2">
                  Shop/Location *
                </label>
                <SearchableSelect
                  options={locations}
                  value={formData.locationId}
                  onChange={(value) => {
                    setFormData(prev => ({
                      ...prev,
                      locationId: value,
                      productId: '',
                      quantity: '',
                      price: ''
                    }));
                    setSelectedProduct(null);
                    setAvailableQuantity(0);
                  }}
                  getOptionLabel={(location) => location.name}
                  getOptionValue={(location) => location._id}
                  placeholder="Select shop/location..."
                  limit={50}
                />
              </div>

              {/* Product Selection */}
              <div>
                <label htmlFor="productId" className="block text-sm font-medium text-gray-700 mb-2">
                  Product *
                </label>
                <SearchableSelect
                  options={getAvailableProducts()}
                  value={formData.productId}
                  onChange={(value) => setFormData(prev => ({ ...prev, productId: value }))}
                  getOptionLabel={(product) => {
                    const location = product.locations.find(loc => loc.locationId._id === formData.locationId);
                    const stock = location ? location.quantity : 0;
                    return `${product.description} (#${product.partsNumber}) - ${stock} in stock`;
                  }}
                  getOptionValue={(product) => product._id}
                  placeholder="Select a product..."
                  disabled={!formData.locationId}
                  limit={50}
                />
                {!formData.locationId && (
                  <p className="mt-1 text-xs text-gray-500">
                    Please select a location first to see available products
                  </p>
                )}
                {formData.locationId && getAvailableProducts().length === 0 && (
                  <p className="mt-1 text-xs text-red-600">
                    No products available at this location
                  </p>
                )}
              </div>

              {/* Stock Info */}
              {formData.productId && formData.locationId && availableQuantity > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm font-medium text-green-800">
                      Available stock: {availableQuantity} units
                    </span>
                  </div>
                </div>
              )}

              {/* Product Price Info */}
              {selectedProduct && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Product Pricing Information</h3>
                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div>
                      <span className="text-xs text-gray-500">Cost Price:</span>
                      <div className="text-sm font-medium text-gray-900">{getCurrencySymbol()}{selectedProduct.unitPrice.toLocaleString()}</div>
                    </div>
                    {selectedProduct.sellingPrice && (
                      <div>
                        <span className="text-xs text-gray-500">Suggested Selling Price:</span>
                        <div className="text-sm font-medium text-gray-900">{getCurrencySymbol()}{selectedProduct.sellingPrice.toLocaleString()}</div>
                      </div>
                    )}
                  </div>
                  {selectedProduct.sellingPrice && (
                    (() => {
                      const profitCalc = calculateProfit(selectedProduct.unitPrice, selectedProduct.sellingPrice);
                      return profitCalc ? (
                        <div className={`p-2 rounded-lg ${profitCalc.profit >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                          <div className="flex items-center justify-between text-xs">
                            <span className={profitCalc.profit >= 0 ? 'text-green-700' : 'text-red-700'}>
                              {profitCalc.profit >= 0 ? 'Profit' : 'Loss'} per unit:
                            </span>
                            <span className={`font-semibold ${profitCalc.profit >= 0 ? 'text-green-800' : 'text-red-800'}`}>
                              {getCurrencySymbol()}{Math.abs(profitCalc.profit).toLocaleString()} ({profitCalc.profitPercentage >= 0 ? '+' : ''}{profitCalc.profitPercentage.toFixed(1)}%)
                            </span>
                          </div>
                        </div>
                      ) : null;
                    })()
                  )}
                  
                  {/* Price Comparisons */}
                  {selectedProduct.priceComparisons && selectedProduct.priceComparisons.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <h4 className="text-xs font-semibold text-gray-700 mb-2">Price Comparisons from Import Locations:</h4>
                      <div className="space-y-1">
                        {selectedProduct.priceComparisons
                          .filter(pc => pc && pc.importLocationId && pc.price !== undefined && pc.price !== null)
                          .map((pc, idx) => (
                            <div key={idx} className="flex items-center justify-between text-xs bg-white rounded p-2">
                              <span className="text-gray-600">
                                {pc.importLocationId && typeof pc.importLocationId === 'object' && pc.importLocationId !== null
                                  ? `${pc.importLocationId.name || 'Unknown'}${pc.importLocationId.country ? ` (${pc.importLocationId.country})` : ''}`
                                  : 'Unknown Location'}:
                              </span>
                              <span className="font-medium text-gray-900">{getCurrencySymbol()}{pc.price?.toLocaleString() || '0'}</span>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Quantity and Price */}
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
                    max={availableQuantity}
                    disabled={!formData.locationId || availableQuantity === 0}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed"
                    placeholder="0"
                  />
                </div>

                <div>
                  <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-2">
                    Selling Price *
                    {selectedProduct?.sellingPrice && (
                      <span className="ml-2 text-xs text-gray-500 font-normal">
                        (Suggested: {getCurrencySymbol()}{selectedProduct.sellingPrice.toLocaleString()})
                      </span>
                    )}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 text-sm">{getCurrencySymbol()}</span>
                    </div>
                    <input
                      type="number"
                      id="price"
                      name="price"
                      value={formData.price}
                      onChange={handleChange}
                      required
                      min="0"
                      step="0.01"
                      className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      placeholder="0.00"
                    />
                  </div>
                  {formData.price && selectedProduct && parseFloat(formData.price) > 0 && (
                    (() => {
                      const profitCalc = calculateProfit(selectedProduct.unitPrice, parseFloat(formData.price));
                      return profitCalc ? (
                        <div className={`mt-2 p-2 rounded-lg text-xs ${profitCalc.profit >= 0 ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                          <div className="flex items-center justify-between">
                            <span className={profitCalc.profit >= 0 ? 'text-green-700' : 'text-red-700'}>
                              {profitCalc.profit >= 0 ? '✓ Profit' : '⚠ Loss'} per unit:
                            </span>
                            <span className={`font-semibold ${profitCalc.profit >= 0 ? 'text-green-800' : 'text-red-800'}`}>
                              {getCurrencySymbol()}{Math.abs(profitCalc.profit).toLocaleString()} ({profitCalc.profitPercentage >= 0 ? '+' : ''}{profitCalc.profitPercentage.toFixed(1)}%)
                            </span>
                          </div>
                        </div>
                      ) : null;
                    })()
                  )}
                </div>
              </div>

              {/* Notes */}
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
                  placeholder="Add any notes about this sale..."
                />
              </div>

              {/* Sale Summary */}
              {formData.quantity && formData.price && parseFloat(formData.quantity) > 0 && parseFloat(formData.price) > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-blue-900 mb-2">Sale Summary</h3>
                  <div className="space-y-1 text-sm text-blue-800">
                    <div className="flex justify-between">
                      <span>Quantity:</span>
                      <span className="font-medium">{formData.quantity} units</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Price per unit:</span>
                      <span className="font-medium">{getCurrencySymbol()}{parseFloat(formData.price).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-blue-200">
                      <span className="font-semibold">Total Amount:</span>
                      <span className="font-bold text-lg">{getCurrencySymbol()}{(parseFloat(formData.quantity) * parseFloat(formData.price)).toLocaleString()}</span>
                    </div>
                    {selectedProduct && (
                      (() => {
                        const profitCalc = calculateProfit(selectedProduct.unitPrice, parseFloat(formData.price));
                        const totalProfit = profitCalc ? profitCalc.profit * parseFloat(formData.quantity) : null;
                        return profitCalc && totalProfit !== null ? (
                          <div className={`flex justify-between pt-2 border-t border-blue-200 ${profitCalc.profit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                            <span className="font-semibold">
                              Total {profitCalc.profit >= 0 ? 'Profit' : 'Loss'}:
                            </span>
                            <span className="font-bold text-lg">
                              {getCurrencySymbol()}{Math.abs(totalProfit).toLocaleString()} ({profitCalc.profitPercentage >= 0 ? '+' : ''}{profitCalc.profitPercentage.toFixed(1)}%)
                            </span>
                          </div>
                        ) : null;
                      })()
                    )}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setFormData({
                      productId: '',
                      locationId: '',
                      quantity: '',
                      price: '',
                      notes: ''
                    });
                    setSelectedProduct(null);
                    setAvailableQuantity(0);
                    setError('');
                    setSuccess(false);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Clear
                </button>
                <button
                  type="submit"
                  disabled={submitting || !formData.productId || !formData.locationId || availableQuantity === 0}
                  className="px-6 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
                >
                  {submitting ? (
                    <>
                      <Loader size="sm" text="" color="blue" className="mr-2" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Complete Sale
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
          )}

          {/* Sales List Tab */}
          {activeTab === 'sales' && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">All Sales</h2>
                    <p className="text-sm text-gray-600 mt-1">View and manage your sales records</p>
                  </div>
                  <button
                    onClick={fetchSales}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Refresh
                  </button>
                </div>

                {/* Search and Filters */}
                <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 mb-6">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* Search */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Search Product</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                        </div>
                        <input
                          type="text"
                          value={salesSearchInput}
                          onChange={(e) => handleSalesSearchChange(e.target.value)}
                          placeholder="Search by product name..."
                          className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        {salesSearchInput !== salesSearch && (
                          <p className="mt-1 text-xs text-gray-500">Searching in 3 seconds...</p>
                        )}
                      </div>
                    </div>

                    {/* Start Date */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                      <input
                        type="date"
                        value={salesStartDate}
                        onChange={(e) => handleSalesDateFilter(e.target.value, salesEndDate)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    {/* End Date */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                      <input
                        type="date"
                        value={salesEndDate}
                        onChange={(e) => handleSalesDateFilter(salesStartDate, e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    {/* Clear Filters */}
                    <div className="flex items-end">
                      <button
                        onClick={clearSalesFilters}
                        className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        Clear Filters
                      </button>
                    </div>
                  </div>
                </div>

                {salesLoading ? (
                  <div className="flex justify-center py-12">
                    <Loader size="md" text="Loading sales..." color="blue" />
                  </div>
                ) : sales.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No sales yet</h3>
                    <p className="text-gray-600 mb-4">Sales records will appear here once you make your first sale</p>
                    <button
                      onClick={() => setActiveTab('sell')}
                      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Make Your First Sale
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Product
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Location
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Quantity
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Price
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Total
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Date
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Sold By
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {sales.map((sale) => (
                          <tr key={sale._id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4">
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {sale.productId && typeof sale.productId === 'object' && sale.productId !== null 
                                    ? sale.productId.description 
                                    : 'Unknown Product'}
                                </div>
                                <div className="text-xs text-gray-500">
                                  #{sale.productId && typeof sale.productId === 'object' && sale.productId !== null 
                                    ? sale.productId.partsNumber 
                                    : 'N/A'}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-sm text-gray-900">
                                {sale.locationId && typeof sale.locationId === 'object' && sale.locationId !== null 
                                  ? sale.locationId.name 
                                  : 'Unknown Location'}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-sm text-gray-900">{sale.quantity}</span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-sm text-gray-900">{getCurrencySymbol()}{sale.price.toLocaleString()}</span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-sm font-semibold text-green-600">
                                {getCurrencySymbol()}{(sale.quantity * sale.price).toLocaleString()}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-sm text-gray-500">
                                {new Date(sale.soldAt).toLocaleDateString()}
                              </span>
                              <div className="text-xs text-gray-400">
                                {new Date(sale.soldAt).toLocaleTimeString()}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-sm text-gray-500">
                                {sale.soldBy && typeof sale.soldBy === 'object' && sale.soldBy !== null
                                  ? (sale.soldBy.name || sale.soldBy.email || 'Unknown')
                                  : 'Unknown'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <button
                                onClick={() => setSelectedSale(sale)}
                                className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                              >
                                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                View Details
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Pagination */}
                {salesTotalPages > 1 && (
                  <div className="mt-6 flex items-center justify-between bg-gray-50 rounded-xl border border-gray-200 p-4">
                    <div className="text-sm text-gray-700">
                      Showing <span className="font-medium">{(salesPage - 1) * salesLimit + 1}</span> to{' '}
                      <span className="font-medium">{Math.min(salesPage * salesLimit, salesTotal)}</span> of{' '}
                      <span className="font-medium">{salesTotal}</span> results
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setSalesPage(p => Math.max(1, p - 1))}
                        disabled={salesPage === 1}
                        className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Previous
                      </button>
                      <div className="flex items-center space-x-1">
                        {Array.from({ length: Math.min(5, salesTotalPages) }, (_, i) => {
                          let pageNum;
                          if (salesTotalPages <= 5) {
                            pageNum = i + 1;
                          } else if (salesPage <= 3) {
                            pageNum = i + 1;
                          } else if (salesPage >= salesTotalPages - 2) {
                            pageNum = salesTotalPages - 4 + i;
                          } else {
                            pageNum = salesPage - 2 + i;
                          }
                          return (
                            <button
                              key={pageNum}
                              onClick={() => setSalesPage(pageNum)}
                              className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                                salesPage === pageNum
                                  ? 'bg-blue-600 text-white'
                                  : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                      </div>
                      <button
                        onClick={() => setSalesPage(p => Math.min(salesTotalPages, p + 1))}
                        disabled={salesPage === salesTotalPages}
                        className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sale Detail Modal */}
      {selectedSale && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div 
              className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
              onClick={() => setSelectedSale(null)}
            />
            
            <div className="relative bg-white rounded-xl shadow-xl max-w-2xl w-full mx-auto">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Sale Details</h2>
                  <p className="text-sm text-gray-600 mt-1">View complete sale information</p>
                </div>
                <button
                  onClick={() => setSelectedSale(null)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {/* Product Info */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-gray-500 mb-3">Product Information</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Description:</span>
                      <span className="text-sm font-medium text-gray-900">
                        {selectedSale.productId && typeof selectedSale.productId === 'object' && selectedSale.productId !== null
                          ? selectedSale.productId.description 
                          : 'Unknown Product'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Parts Number:</span>
                      <span className="text-sm font-medium text-gray-900">
                        #{selectedSale.productId && typeof selectedSale.productId === 'object' && selectedSale.productId !== null
                          ? selectedSale.productId.partsNumber 
                          : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Sale Details */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="text-xs font-medium text-blue-600 uppercase mb-1">Location</div>
                    <div className="text-sm font-semibold text-blue-900">
                      {selectedSale.locationId && typeof selectedSale.locationId === 'object' && selectedSale.locationId !== null
                        ? selectedSale.locationId.name 
                        : 'Unknown Location'}
                    </div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4">
                    <div className="text-xs font-medium text-green-600 uppercase mb-1">Quantity</div>
                    <div className="text-sm font-semibold text-green-900">{selectedSale.quantity} units</div>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-4">
                    <div className="text-xs font-medium text-purple-600 uppercase mb-1">Price per Unit</div>
                    <div className="text-sm font-semibold text-purple-900">{getCurrencySymbol()}{selectedSale.price.toLocaleString()}</div>
                  </div>
                  <div className="bg-yellow-50 rounded-lg p-4">
                    <div className="text-xs font-medium text-yellow-600 uppercase mb-1">Total Amount</div>
                    <div className="text-lg font-bold text-yellow-900">
                      {getCurrencySymbol()}{(selectedSale.quantity * selectedSale.price).toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Additional Info */}
                <div className="border-t border-gray-200 pt-4 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Sold By:</span>
                    <span className="font-medium text-gray-900">
                      {selectedSale.soldBy && typeof selectedSale.soldBy === 'object' && selectedSale.soldBy !== null
                        ? (selectedSale.soldBy.name || selectedSale.soldBy.email || 'Unknown')
                        : 'Unknown'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Date & Time:</span>
                    <span className="font-medium text-gray-900">
                      {new Date(selectedSale.soldAt).toLocaleString()}
                    </span>
                  </div>
                  {selectedSale.notes && (
                    <div>
                      <span className="text-sm text-gray-600">Notes:</span>
                      <p className="text-sm text-gray-900 mt-1 bg-gray-50 rounded-lg p-3">
                        {selectedSale.notes}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="flex justify-end p-6 border-t border-gray-200">
                <button
                  onClick={() => setSelectedSale(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sell;

