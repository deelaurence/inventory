import React, { useState, useEffect } from 'react';
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
  const [productsLimit] = useState(100);
  const [productsSearch] = useState('');
  
  // Pagination states for sales
  const [salesPage, setSalesPage] = useState(1);
  const [salesLimit] = useState(100);
  const [salesSearch, setSalesSearch] = useState('');
  const [salesSearchInput, setSalesSearchInput] = useState(''); // For immediate UI update
  const [salesStartDate, setSalesStartDate] = useState('');
  const [salesEndDate, setSalesEndDate] = useState('');
  const [salesTotal, setSalesTotal] = useState(0);
  const [salesTotalPages, setSalesTotalPages] = useState(0);

  // Multi-product sale state
  const [productsInSale, setProductsInSale] = useState([
    { productId: '', locationId: '', quantity: '', unitPrice: '', availableQuantity: 0, selectedProduct: null as Product | null }
  ]);
  const [notes, setNotes] = useState('');

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

  // Debounce sales search — trigger API with current input after short delay
  useEffect(() => {
    if (activeTab !== 'sales') return;

    console.log('[Sell] debounce effect start', { salesSearchInput, salesSearch, activeTab });
    const delay = 500; // ms
    const timer = setTimeout(() => {
      const inputTrim = salesSearchInput.trim();
      const currentTrim = salesSearch.trim();
      if (inputTrim !== currentTrim) {
        console.log('[Sell] Debounced search ->', salesSearchInput);
        setSalesSearch(salesSearchInput);
        setSalesPage(1); // Reset to first page on search
        // call API with current input to avoid relying on state update timing
        fetchSales(salesSearchInput);
      } else {
        console.log('[Sell] Debounce: trimmed input equals current search, skipping fetch');
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [salesSearchInput, activeTab, salesSearch]);

  useEffect(() => {
    if (activeTab === 'sales') {
      fetchSales();
    }
  }, [activeTab, salesPage, salesSearch, salesStartDate, salesEndDate]);

  // Update availableQuantity and selectedProduct for each row
  useEffect(() => {
    setProductsInSale((rows) => rows.map((row) => {
      if (row.productId && row.locationId) {
        const product = products.find(p => p._id === row.productId);
        if (product) {
          const location = product.locations.find((loc) => {
            const lid = loc.locationId && typeof loc.locationId === 'object' ? loc.locationId._id : loc.locationId;
            return lid === row.locationId;
          });
          let autoPrice = row.unitPrice;
          if (product.sellingPrice !== undefined && product.sellingPrice !== null && !row.unitPrice) {
            autoPrice = product.sellingPrice.toString();
          }
          return {
            ...row,
            selectedProduct: product,
            availableQuantity: location ? location.quantity : 0,
            unitPrice: autoPrice
          };
        }
        // If product not found in global list, but the row already holds a selectedProduct
        // (e.g. chosen from remote search), preserve it and compute availability from it.
        if (row.selectedProduct && row.selectedProduct._id === row.productId) {
          const location = row.selectedProduct.locations.find((loc) => {
            const lid = loc.locationId && typeof loc.locationId === 'object' ? loc.locationId._id : loc.locationId;
            return lid === row.locationId;
          });
          let autoPrice = row.unitPrice;
          if (row.selectedProduct.sellingPrice !== undefined && row.selectedProduct.sellingPrice !== null && !row.unitPrice) {
            autoPrice = row.selectedProduct.sellingPrice.toString();
          }
          return {
            ...row,
            selectedProduct: row.selectedProduct,
            availableQuantity: location ? location.quantity : 0,
            unitPrice: autoPrice
          };
        }
      }
      return { ...row, selectedProduct: null, availableQuantity: 0 };
    }));
  }, [products, productsInSale.map(r => r.productId).join(), productsInSale.map(r => r.locationId).join()]);

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

  // fetchSales accepts an optional search override so callers can force a request
  // with the latest input without waiting for state to settle.
  const fetchSales = async (searchOverride?: string | React.MouseEvent) => {
    try {
      const searchParam = (typeof searchOverride === 'string' ? searchOverride : salesSearch) || undefined;
      console.log('[Sell] fetchSales called', { page: salesPage, limit: salesLimit, search: searchParam, startDate: salesStartDate, endDate: salesEndDate });
      setSalesLoading(true);
      const salesResponse = await salesApi.fetchSales({
        page: salesPage,
        limit: salesLimit,
        search: searchParam,
        startDate: salesStartDate || undefined,
        endDate: salesEndDate || undefined,
      });
      console.log('[Sell] fetchSales response', salesResponse);
      setSales(salesResponse.data);
      setSalesTotal(salesResponse.total);
      setSalesTotalPages(salesResponse.totalPages);
    } catch (err: any) {
      console.error('[Sell] fetchSales error', err);
      setError(err.response?.data?.message || 'Failed to fetch sales');
    } finally {
      setSalesLoading(false);
    }
  };

  const handleSalesSearchChange = (value: string) => {
    console.log('[Sell] handleSalesSearchChange', value);
    setSalesSearchInput(value); // Update input immediately for UI
    // Search will be triggered after short debounce via useEffect
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

  // Get available products for a given location, excluding products already picked in other rows for the same location
  const getAvailableProducts = (locationId: string, excludeProductIds: string[] = []) => {
    const exclude = new Set(excludeProductIds.filter(Boolean));
    if (!locationId) {
      return products
        .filter(p => p.locations.some(loc => loc.quantity > 0))
        .filter(p => !exclude.has(p._id));
    }

    return products
      .filter(p => {
        const location = p.locations.find(loc => {
          const lid = loc.locationId && typeof loc.locationId === 'object' ? loc.locationId._id : loc.locationId;
          return lid === locationId;
        });
        return location && location.quantity > 0;
      })
      .filter(p => !exclude.has(p._id));
  };

  // Handle change for a product row
  const handleProductRowChange = (idx: number, field: string, value: string) => {
    setProductsInSale(rows => rows.map((row, i) => {
      if (i !== idx) return row;

      // If location changes, clear dependent fields so we don't keep an invalid product/qty/price
      if (field === 'locationId') {
        return {
          ...row,
          locationId: value,
          productId: '',
          quantity: '',
          unitPrice: '',
          availableQuantity: 0,
          selectedProduct: null,
        };
      }

      return { ...row, [field]: value };
    }));
  };

  // Server-side product search used by SearchableSelect when open
  const searchProducts = async (q: string) => {
    // fetch first page with higher limit to present more options
    const resp = await productsApi.fetchProducts({ page: 1, limit: 100, search: q || undefined });
    return resp.data;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess(false);

    // Validate all product rows
    for (const [idx, row] of productsInSale.entries()) {
      if (!row.productId || !row.locationId || !row.quantity || !row.unitPrice) {
        setError(`Please fill in all required fields for product #${idx + 1}`);
        setSubmitting(false);
        return;
      }
      const quantity = parseInt(row.quantity);
      if (isNaN(quantity) || quantity <= 0) {
        setError(`Quantity must be a positive number for product #${idx + 1}`);
        setSubmitting(false);
        return;
      }
      if (quantity > row.availableQuantity) {
        setError(`Insufficient stock for product #${idx + 1}. Available: ${row.availableQuantity}`);
        setSubmitting(false);
        return;
      }
      const price = parseFloat(row.unitPrice);
      if (isNaN(price) || price <= 0) {
        setError(`Price must be a positive number for product #${idx + 1}`);
        setSubmitting(false);
        return;
      }
    }

    try {
      await salesApi.createSale({
        products: productsInSale.map(row => ({
          productId: row.productId,
          locationId: row.locationId,
          quantity: parseInt(row.quantity),
          unitPrice: parseFloat(row.unitPrice)
        })),
        notes: notes || undefined
      });

      setSuccess(true);
      setProductsInSale([
        { productId: '', locationId: '', quantity: '', unitPrice: '', availableQuantity: 0, selectedProduct: null }
      ]);
      setNotes('');

      // Refresh data to update stock levels
      await fetchData();
      if (activeTab === 'sales') {
        await fetchSales();
      }
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-emerald-50/30 to-teal-50/30">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-md">
        <div className="px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">Sell Product</h1>
              <p className="text-sm text-gray-600 mt-1 font-medium">Record a sale and update inventory</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 sm:px-6 lg:px-8 py-6">
        <div className="max-w-6xl mx-auto">
          {/* Tabs */}
          <div className="mb-6">
            <div className="border-b-2 border-gray-200">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setActiveTab('sell')}
                  className={`py-4 px-1 border-b-2 font-semibold text-sm transition-all duration-300 ${
                    activeTab === 'sell'
                      ? 'border-emerald-500 text-emerald-600 bg-gradient-to-b from-emerald-50 to-transparent'
                      : 'border-transparent text-gray-500 hover:text-emerald-600 hover:border-emerald-300'
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
                    setSalesSearch(salesSearchInput);
                    setSalesPage(1);
                    fetchSales(salesSearchInput);
                  }}
                  className={`py-4 px-1 border-b-2 font-semibold text-sm transition-all duration-300 ${
                    activeTab === 'sales'
                      ? 'border-teal-500 text-teal-600 bg-gradient-to-b from-teal-50 to-transparent'
                      : 'border-transparent text-gray-500 hover:text-teal-600 hover:border-teal-300'
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
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl border-2 border-emerald-200 shadow-xl">
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                  {error && (
                    <div className="bg-gradient-to-r from-red-50 to-rose-50 border-2 border-red-300 rounded-xl p-4 shadow-lg">
                      <div className="flex items-center">
                        <svg className="w-5 h-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                        <span className="text-sm font-semibold text-red-800">{error}</span>
                      </div>
                    </div>
                  )}
                  {success && (
                    <div className="bg-gradient-to-r from-emerald-50 to-green-50 border-2 border-emerald-300 rounded-xl p-4 shadow-lg">
                      <div className="flex items-center">
                        <svg className="w-5 h-5 text-emerald-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-sm font-semibold text-emerald-800">Sale recorded successfully! Inventory updated.</span>
                      </div>
                    </div>
                  )}

                  {/* Dynamic product rows */}
                  {productsInSale.map((row, idx) => (
                    <div key={idx} className="border-b-2 border-gray-500 pb-6 mb-6">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-md font-semibold text-gray-800">Product #{idx + 1}</h3>
                        {productsInSale.length > 1 && (
                          <button type="button" className="text-red-600 text-xs font-bold" onClick={() => setProductsInSale(rows => rows.filter((_, i) => i !== idx))}>
                            Remove
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {/* Location */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Shop/Location *</label>
                          <SearchableSelect
                            options={locations}
                            value={row.locationId}
                            onChange={value => handleProductRowChange(idx, 'locationId', value)}
                            getOptionLabel={location => location.name}
                            getOptionValue={location => location._id}
                            placeholder="Select shop/location..."
                            limit={20}
                          />
                        </div>
                        {/* Product */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Product *</label>
                          <SearchableSelect
                            options={getAvailableProducts(
                              row.locationId,
                              productsInSale
                                .filter((_, i) => i !== idx)
                                .filter(r => r.locationId === row.locationId)
                                .map(r => r.productId)
                            )}
                            value={row.productId}
                            onChange={value => handleProductRowChange(idx, 'productId', value)}
                            onSearch={searchProducts}
                              getOptionLabel={product => {
                              const location = product.locations.find((loc) => {
                                const lid = loc.locationId && typeof loc.locationId === 'object' ? loc.locationId._id : loc.locationId;
                                return lid === row.locationId;
                              });
                              const stock = location ? location.quantity : 0;
                              return `${product.description} (${product.partsNumber}) - ${stock} in stock`;
                            }}
                            getOptionValue={product => product._id}
                            placeholder="Select a product..."
                            disabled={!row.locationId}
                            limit={20}
                              onSelect={(product) => {
                                const location = product.locations.find((loc) => {
                                  const lid = loc.locationId && typeof loc.locationId === 'object' ? loc.locationId._id : loc.locationId;
                                  return lid === row.locationId;
                                });
                                const stock = location ? location.quantity : 0;
                                setProductsInSale(rows => rows.map((r, i) => {
                                  if (i !== idx) return r;
                                  return {
                                    ...r,
                                    productId: product._id,
                                    selectedProduct: product,
                                    availableQuantity: stock,
                                    unitPrice: r.unitPrice || (product.sellingPrice !== undefined && product.sellingPrice !== null ? product.sellingPrice.toString() : r.unitPrice)
                                  };
                                }));
                              }}
                          />
                          {!row.locationId && (
                            <p className="mt-1 text-xs text-gray-500">Please select a location first to see available products</p>
                          )}
                          {row.locationId && getAvailableProducts(
                            row.locationId,
                            productsInSale
                              .filter((_, i) => i !== idx)
                              .filter(r => r.locationId === row.locationId)
                              .map(r => r.productId)
                          ).length === 0 && (
                            <p className="mt-1 text-xs text-red-600">No products available at this location</p>
                          )}
                        </div>
                        {/* Quantity */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Quantity *</label>
                          <input
                            type="number"
                            value={row.quantity}
                            onChange={e => handleProductRowChange(idx, 'quantity', e.target.value)}
                            required
                            min="1"
                            max={row.availableQuantity}
                            disabled={!row.locationId || row.availableQuantity === 0}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed"
                            placeholder="0"
                          />
                          {row.productId && row.locationId && row.availableQuantity > 0 && (
                            <div className="text-xs text-green-700 mt-1">Available: {row.availableQuantity}</div>
                          )}
                        </div>
                        {/* Price */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Selling Price *</label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <span className="text-gray-500 text-sm">{getCurrencySymbol()}</span>
                            </div>
                            <input
                              type="number"
                              value={row.unitPrice}
                              onChange={e => handleProductRowChange(idx, 'unitPrice', e.target.value)}
                              required
                              min="0"
                              step="0.01"
                              className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                              placeholder="0.00"
                            />
                          </div>
                          {row.selectedProduct && row.unitPrice && parseFloat(row.unitPrice) > 0 && (() => {
                            const profitCalc = calculateProfit(row.selectedProduct.unitPrice, parseFloat(row.unitPrice));
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
                          })()}
                        </div>
                      </div>
                      {/* Product Price Info */}
                      {row.selectedProduct && (
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mt-4">
                          <h3 className="text-sm font-semibold text-gray-900 mb-3">Product Pricing Information</h3>
                          <div className="grid grid-cols-2 gap-4 mb-3">
                            <div>
                              <span className="text-xs text-gray-500">Cost Price:</span>
                              <div className="text-sm font-medium text-gray-900">{getCurrencySymbol()}{row.selectedProduct.unitPrice.toLocaleString()}</div>
                            </div>
                            {row.selectedProduct.sellingPrice && (
                              <div>
                                <span className="text-xs text-gray-500">Suggested Selling Price:</span>
                                <div className="text-sm font-medium text-gray-900">{getCurrencySymbol()}{row.selectedProduct.sellingPrice.toLocaleString()}</div>
                              </div>
                            )}
                          </div>
                          {row.selectedProduct.sellingPrice && (() => {
                            const profitCalc = calculateProfit(row.selectedProduct.unitPrice, row.selectedProduct.sellingPrice);
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
                          })()}
                        </div>
                      )}
                    </div>
                  ))}
                  {/* Add product button */}
                  <div className="flex justify-end mt-4">
                    <button type="button" className="px-4 py-2 bg-blue-100 text-blue-800 rounded-lg font-semibold text-sm hover:bg-blue-200 transition-all" onClick={() => setProductsInSale(rows => [...rows, { productId: '', locationId: '', quantity: '', unitPrice: '', availableQuantity: 0, selectedProduct: null }])}>
                      + Add Another Product
                    </button>
                  </div>
                  {/* Notes */}
                  <div>
                    <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">Notes (Optional)</label>
                    <textarea
                      id="notes"
                      name="notes"
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
                      placeholder="Add any notes about this sale..."
                    />
                  </div>
                  {/* Sale Summary */}
                  {productsInSale.length > 0 && productsInSale.every(row => row.quantity && row.unitPrice && parseFloat(row.quantity) > 0 && parseFloat(row.unitPrice) > 0) && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                      <h3 className="text-sm font-semibold text-blue-900 mb-2">Sale Summary</h3>
                      <div className="space-y-1 text-sm text-blue-800">
                        {productsInSale.map((row, idx) => {
                          const name = row.selectedProduct ? row.selectedProduct.description : `Product #${idx + 1}`;
                          const qty = parseFloat(row.quantity);
                          const price = parseFloat(row.unitPrice);
                          const qtySafe = isNaN(qty) ? 0 : qty;
                          const priceSafe = isNaN(price) ? 0 : price;
                          return (
                            <div key={idx} className="flex justify-between">
                              <span>{name}:</span>
                              <span className="font-medium">{qtySafe} × {getCurrencySymbol()}{(typeof priceSafe === 'number' && !isNaN(priceSafe) ? priceSafe.toLocaleString() : '0')} = {getCurrencySymbol()}{(typeof qtySafe === 'number' && typeof priceSafe === 'number' && !isNaN(qtySafe) && !isNaN(priceSafe) ? (qtySafe * priceSafe).toLocaleString() : '0')}</span>
                            </div>
                          );
                        })}
                        <div className="flex justify-between pt-2 border-t border-blue-200">
                          <span className="font-semibold">Total Amount:</span>
                          <span className="font-bold text-lg">{getCurrencySymbol()}{productsInSale.reduce((sum, row) => {
                            const qty = parseFloat(row.quantity) || 0;
                            const price = parseFloat(row.unitPrice) || 0;
                            return sum + (qty * price);
                          }, 0).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  )}
                  {/* Actions */}
                  <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={() => {
                        setProductsInSale([{ productId: '', locationId: '', quantity: '', unitPrice: '', availableQuantity: 0, selectedProduct: null }]);
                        setNotes('');
                        setError('');
                        setSuccess(false);
                      }}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Clear
                    </button>
                    <button
                      type="submit"
                      disabled={submitting || productsInSale.some(row => !row.productId || !row.locationId || row.availableQuantity === 0)}
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
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border-2 border-teal-200 shadow-xl">
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
                          onInput={(e) => console.log('[Sell] input event', (e.target as HTMLInputElement).value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              setSalesSearch(salesSearchInput);
                              setSalesPage(1);
                              fetchSales(salesSearchInput);
                            }
                          }}
                          placeholder="Search by product name..."
                          className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        {salesSearchInput !== salesSearch && (
                          <p className="mt-1 text-xs text-gray-500">Searching...</p>
                        )}
                        {/* Debug badge: shows immediate input vs current search state */}
                        <div className="mt-2 text-xs text-gray-600">
                          <span className="mr-3">Input: <strong>{salesSearchInput || '—'}</strong></span>
                          <span>Search: <strong>{salesSearch || '—'}</strong></span>
                        </div>
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
                      <thead className="bg-gradient-to-r from-teal-50 via-emerald-50 to-cyan-50">
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
                        {sales.map((sale) => {
                          const productsArr = Array.isArray(sale.products) ? sale.products : [];
                          const extraCount = Math.max(0, productsArr.length - 1);
                          const firstItem = productsArr[0];
                          const firstProduct = firstItem?.productId && typeof firstItem.productId === 'object' ? firstItem.productId : null;
                          const firstLocation = firstItem?.locationId && typeof firstItem.locationId === 'object' ? firstItem.locationId : null;
                          const firstUnitPrice = (() => {
                            const v = firstItem?.unitPrice;
                            return typeof v === 'number' ? v : parseFloat(v) || 0;
                          })();

                          const totalQuantity = productsArr.reduce((s: number, p: any) => s + (p?.quantity || 0), 0);
                          const totalAmount = productsArr.reduce((s: number, p: any) => {
                            const price = typeof p?.unitPrice === 'number' ? p.unitPrice : parseFloat(p?.unitPrice) || 0;
                            return s + ((p?.quantity || 0) * price);
                          }, 0);

                          return (
                          <tr
                            key={sale._id}
                            className="hover:bg-gray-50 transition-colors cursor-pointer"
                            onClick={() => setSelectedSale(sale)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                setSelectedSale(sale);
                              }
                            }}
                          >
                            <td className="px-6 py-4">
                              {productsArr.length === 0 ? (
                                <div className="text-sm font-medium text-gray-900">No products</div>
                              ) : (
                                <div>
                                  <div className="text-sm font-medium text-gray-900">{firstProduct?.description || 'Unknown Product'}</div>
                                  <div className="text-xs text-gray-500">{firstProduct?.partsNumber || 'N/A'}</div>
                                  {extraCount > 0 && (
                                    <div className="mt-1 text-xs text-gray-500">+{extraCount} more</div>
                                  )}
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              {productsArr.length === 0 ? (
                                <span className="text-sm text-gray-900">Unknown Location</span>
                              ) : (
                                <div>
                                  <div className="text-sm text-gray-900">{firstLocation?.name || 'Unknown Location'}</div>
                                  {extraCount > 0 && (
                                    <div className="mt-1 text-xs text-gray-500">+{extraCount} more</div>
                                  )}
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm text-gray-900 font-medium">{totalQuantity}</div>
                              {productsArr.length > 0 && (
                                <div className="text-xs text-gray-500">{productsArr.length} line item{productsArr.length === 1 ? '' : 's'}</div>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              {productsArr.length === 0 ? (
                                <span className="text-sm text-gray-500">—</span>
                              ) : (
                                <div>
                                  <div className="text-sm text-gray-900">{getCurrencySymbol()}{firstUnitPrice.toLocaleString()}</div>
                                  {extraCount > 0 && (
                                    <div className="mt-1 text-xs text-gray-500">+{extraCount} more</div>
                                  )}
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-sm font-semibold text-green-600">{getCurrencySymbol()}{totalAmount.toLocaleString()}</span>
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
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedSale(sale);
                                }}
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
                          );
                        })}
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
                {/* Products in Sale */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-gray-500 mb-3">Products</h3>
                  <div className="space-y-2">
                    {(Array.isArray(selectedSale.products) ? selectedSale.products : []).map((p: any, i: number) => (
                      <div key={i} className="grid grid-cols-3 gap-4 items-center">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{p?.productId && typeof p.productId === 'object' ? p.productId.description : 'Unknown Product'}</div>
                          <div className="text-xs text-gray-500">{p?.productId && typeof p.productId === 'object' ? p.productId.partsNumber : 'N/A'}</div>
                        </div>
                        <div className="text-sm text-gray-700">{p?.locationId && typeof p.locationId === 'object' ? p.locationId.name : 'Unknown Location'}</div>
                        <div className="text-sm font-medium text-gray-900">{p?.quantity ?? 0} × {getCurrencySymbol()}{(typeof p?.unitPrice === 'number' ? p.unitPrice : parseFloat(p?.unitPrice) || 0).toLocaleString()}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Sale Totals */}
                <div className="grid grid-cols-4 gap-4">
                  <div className="bg-blue-50 rounded-lg p-4 col-span-1">
                    <div className="text-xs font-medium text-blue-600 uppercase mb-1">Total Quantity</div>
                    <div className="text-sm font-semibold text-blue-900">
                      {(Array.isArray(selectedSale.products) ? selectedSale.products : []).reduce((s: number, p: any) => s + (p?.quantity || 0), 0)} units
                    </div>
                  </div>
                  <div className="bg-yellow-50 rounded-lg p-4 col-span-3">
                    <div className="text-xs font-medium text-yellow-600 uppercase mb-1">Total Amount</div>
                    <div className="text-lg font-bold text-yellow-900">
                      {getCurrencySymbol()}{((Array.isArray(selectedSale.products) ? selectedSale.products : []).reduce((s: number, p: any) => s + ((p?.quantity || 0) * (typeof p?.unitPrice === 'number' ? p.unitPrice : parseFloat(p?.unitPrice) || 0)), 0)).toLocaleString()}
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

