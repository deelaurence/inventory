import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { productsApi, type Product } from '../services/productsApi';
import { locationsApi, type Location } from '../services/locationsApi';
import ImportProductModal from '../components/ImportProductModal';
import BulkImportModal from '../components/BulkImportModal';
import ImportTypeModal from '../components/ImportTypeModal';
import TransferProductModal from '../components/TransferProductModal';
import ExportProductModal from '../components/ExportProductModal';
import EditProductModal from '../components/EditProductModal';
import Loader from '../components/Loader';
import { getCurrencySymbol } from '../utils/currency';

const Inventory = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showImportTypeModal, setShowImportTypeModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showBulkImportModal, setShowBulkImportModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  
  // Search, filter, and pagination states
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState(''); // For immediate UI update
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [showLowStockOnly, setShowLowStockOnly] = useState(() => {
    return searchParams.get('filter') === 'lowstock';
  });

  // Debounce search - wait 3 seconds after user stops typing
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1); // Reset to first page on search
    }, 3000);

    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    fetchData();
  }, [page, search, startDate, endDate]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [productsResponse, locationsData] = await Promise.all([
        productsApi.fetchProducts({
          page,
          limit,
          search: search || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        }),
        locationsApi.fetchLocations(),
      ]);
      // Extract data array from paginated response
      setProducts(productsResponse.data);
      setTotal(productsResponse.total);
      setTotalPages(productsResponse.totalPages);
      setLocations(locationsData);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (value: string) => {
    setSearchInput(value); // Update input immediately for UI
    // Search will be triggered after 3 seconds via useEffect
  };

  const handleDateFilter = (start: string, end: string) => {
    setStartDate(start);
    setEndDate(end);
    setPage(1); // Reset to first page on filter
  };

  const clearFilters = () => {
    setSearch('');
    setSearchInput('');
    setStartDate('');
    setEndDate('');
    setPage(1);
    clearLowStockFilter();
  };

  const clearLowStockFilter = () => {
    setShowLowStockOnly(false);
    searchParams.delete('filter');
    setSearchParams(searchParams);
  };

  const getQuantityAtLocation = (product: Product, locationId: string): number => {
    const location = product.locations.find(loc => loc.locationId._id === locationId);
    return location ? location.quantity : 0;
  };

  const getTotalQuantity = (product: Product): number => {
    return product.locations.reduce((sum, loc) => sum + loc.quantity, 0);
  };

  const isLowStock = (product: Product): boolean => {
    const totalQuantity = getTotalQuantity(product);
    return totalQuantity > 0 && totalQuantity < 10;
  };

  const getProductsByLocation = (locationId: string): number => {
    return products.filter(product => {
      const location = product.locations.find(
        loc => loc.locationId._id === locationId && loc.quantity > 0
      );
      return location !== undefined;
    }).length;
  };

  const handleImportSuccess = () => {
    setShowImportModal(false);
    fetchData();
  };

  const handleTransferSuccess = () => {
    setShowTransferModal(false);
    setSelectedProduct(null);
    fetchData();
  };

  const handleExportSuccess = () => {
    setShowExportModal(false);
    setSelectedProduct(null);
    fetchData();
  };

  const openTransferModal = (product: Product) => {
    setSelectedProduct(product);
    setShowTransferModal(true);
  };

  const openExportModal = (product: Product) => {
    setSelectedProduct(product);
    setShowExportModal(true);
  };

  const openEditModal = (product: Product, e?: React.MouseEvent) => {
    // Prevent opening edit modal when clicking action buttons
    if (e) {
      e.stopPropagation();
    }
    setSelectedProduct(product);
    setShowEditModal(true);
  };

  const handleEditSuccess = () => {
    setShowEditModal(false);
    setSelectedProduct(null);
    fetchData();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader size="lg" text="Loading inventory..." color="blue" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto mt-8">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <div className="w-12 h-12 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-red-800 mb-2">Error Loading Data</h3>
          <p className="text-red-600 text-sm mb-4">{error}</p>
          <button
            onClick={fetchData}
            className="inline-flex items-center px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/30">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-md">
        <div className="px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Inventory</h1>
              <p className="text-sm text-gray-600 mt-1 font-medium">Manage your products and stock levels</p>
            </div>
            <button
              onClick={() => setShowImportTypeModal(true)}
              className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-sm font-semibold rounded-lg hover:from-blue-600 hover:to-cyan-600 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Product
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 sm:px-6 lg:px-8 py-6">
        {/* Location Statistics */}
        {locations.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-4">Products by Location</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {locations.map((location, index) => {
                const locationGradients = [
                  { gradient: 'from-blue-500 via-indigo-500 to-purple-500', bgGradient: 'from-blue-50 via-indigo-100/50 to-purple-50', iconBg: 'bg-gradient-to-br from-blue-400 to-purple-500', textColor: 'text-blue-700', borderColor: 'border-blue-200' },
                  { gradient: 'from-indigo-500 via-purple-500 to-pink-500', bgGradient: 'from-indigo-50 via-purple-100/50 to-pink-50', iconBg: 'bg-gradient-to-br from-indigo-400 to-pink-500', textColor: 'text-indigo-700', borderColor: 'border-indigo-200' },
                  { gradient: 'from-cyan-500 via-blue-500 to-indigo-500', bgGradient: 'from-cyan-50 via-blue-100/50 to-indigo-50', iconBg: 'bg-gradient-to-br from-cyan-400 to-indigo-500', textColor: 'text-cyan-700', borderColor: 'border-cyan-200' },
                  { gradient: 'from-violet-500 via-purple-500 to-fuchsia-500', bgGradient: 'from-violet-50 via-purple-100/50 to-fuchsia-50', iconBg: 'bg-gradient-to-br from-violet-400 to-fuchsia-500', textColor: 'text-violet-700', borderColor: 'border-violet-200' },
                ];
                const locationStyle = locationGradients[index % locationGradients.length];
                const productCount = loading ? '...' : getProductsByLocation(location._id).toLocaleString();
                
                return (
                  <div key={location._id} className={`bg-gradient-to-br ${locationStyle.bgGradient} rounded-xl border-2 ${locationStyle.borderColor} p-5 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1`}>
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className={`text-sm font-semibold ${locationStyle.textColor} mb-1`}>{location.name}</p>
                        <p className={`text-2xl font-bold ${locationStyle.textColor} mt-1`}>{productCount}</p>
                        <p className={`text-xs ${locationStyle.textColor} opacity-70 mt-1`}>products</p>
                      </div>
                      <div className={`p-3 rounded-xl ${locationStyle.iconBg} shadow-lg transform rotate-3 hover:rotate-6 transition-transform`}>
                        <div className="text-white">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </div>
                      </div>
                    </div>
                    <div className={`mt-3 h-1 rounded-full bg-gradient-to-r ${locationStyle.gradient} opacity-60`}></div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Search and Filters */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border-2 border-blue-200 shadow-xl p-4 mb-6">
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
                  value={searchInput}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder="Search by name or parts number..."
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {searchInput !== search && (
                  <p className="mt-1 text-xs text-gray-500">Searching in 3 seconds...</p>
                )}
              </div>
            </div>

            {/* Start Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => handleDateFilter(e.target.value, endDate)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* End Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => handleDateFilter(startDate, e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Clear Filters */}
            <div className="flex items-end">
              <button
                onClick={clearFilters}
                className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {products.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center shadow-lg border-2 border-blue-200">
              <svg className="w-12 h-12 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">No products yet</h3>
            <p className="text-gray-600 mb-6 font-medium">Get started by adding your first product to the inventory</p>
            <button
              onClick={() => setShowImportTypeModal(true)}
              className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-cyan-600 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Your First Product
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Low Stock Filter Indicator */}
            {showLowStockOnly && (
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 rounded-xl p-4 shadow-md">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <p className="font-semibold text-amber-900">Low Stock Filter Active</p>
                      <p className="text-sm text-amber-700 mt-1">Showing products with 1-9 items in stock across all locations</p>
                    </div>
                  </div>
                  <button
                    onClick={clearLowStockFilter}
                    className="inline-flex items-center px-4 py-2 bg-white text-amber-700 text-sm font-medium border border-amber-300 rounded-lg hover:bg-amber-50 transition-colors flex-shrink-0"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Clear Filter
                  </button>
                </div>
              </div>
            )}

            {/* Mobile Cards View */}
            <div className="block sm:hidden space-y-3">
              {products.filter(p => !showLowStockOnly || isLowStock(p)).map((product) => (
                <div 
                  key={product._id} 
                  onClick={() => openEditModal(product)}
                  className={`rounded-xl border-2 p-4 shadow-lg cursor-pointer hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] ${
                    isLowStock(product)
                      ? 'bg-amber-50/80 backdrop-blur-sm border-amber-300'
                      : 'bg-white/80 backdrop-blur-sm border-blue-200'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900 truncate">{product.description}</h3>
                        {isLowStock(product) && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 whitespace-nowrap flex-shrink-0">
                            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            Low Stock
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mt-1">{product.partsNumber}</p>
                      {product.importLocationId && (
                        <div className="mt-2">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            {typeof product.importLocationId === 'object' ? product.importLocationId.name : 'Loading...'}
                          </span>
                        </div>
                      )}
                      {product.sellingPrice && (
                        <div className="mt-1">
                          <span className="text-sm font-medium text-green-600">
                            Selling: {getCurrencySymbol()}{product.sellingPrice.toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex space-x-1 ml-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openTransferModal(product);
                        }}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Transfer"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openExportModal(product);
                        }}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Export"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    {locations.map((location) => (
                      <div key={location._id} className="bg-gray-50 rounded-lg p-3">
                        <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                          {location.name}
                        </div>
                        <div className="text-lg font-semibold text-gray-900">
                          {getQuantityAtLocation(product, location._id)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden sm:block bg-white/80 backdrop-blur-sm rounded-2xl border-2 border-blue-200 shadow-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gradient-to-r from-blue-50 via-indigo-50 to-cyan-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Product
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Import Location
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Selling Price
                      </th>
                      {locations.map((location) => (
                        <th key={location._id} className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          {location.name}
                        </th>
                      ))}
                      <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {products.filter(p => !showLowStockOnly || isLowStock(p)).map((product) => (
                      <tr 
                        key={product._id} 
                        onClick={() => openEditModal(product)}
                        className={`transition-colors cursor-pointer ${
                          isLowStock(product)
                            ? 'bg-amber-50 hover:bg-amber-100'
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        <td className="px-6 py-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <div className="font-semibold text-gray-900">{product.description}</div>
                              {isLowStock(product) && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 whitespace-nowrap">
                                  <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                  </svg>
                                  Low Stock
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-gray-500">{product.partsNumber}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {product.importLocationId ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              {typeof product.importLocationId === 'object' ? product.importLocationId.name : 'Loading...'}
                            </span>
                          ) : (
                            <span className="text-sm text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {product.sellingPrice ? (
                            <span className="text-sm font-medium text-green-600">
                              {getCurrencySymbol()}{product.sellingPrice.toLocaleString()}
                            </span>
                          ) : (
                            <span className="text-sm text-gray-400">-</span>
                          )}
                        </td>
                        {locations.map((location) => (
                          <td key={location._id} className="px-6 py-4 text-center">
                            <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                              {getQuantityAtLocation(product, location._id)}
                            </div>
                          </td>
                        ))}
                        <td className="px-6 py-4">
                          <div className="flex justify-center space-x-2" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => openTransferModal(product)}
                              className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-blue-700 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg hover:from-blue-100 hover:to-cyan-100 transition-all duration-300 border border-blue-200 shadow-sm hover:shadow-md"
                            >
                              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                              </svg>
                              Transfer
                            </button>
                            <button
                              onClick={() => openExportModal(product)}
                              className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-red-700 bg-gradient-to-r from-red-50 to-rose-50 rounded-lg hover:from-red-100 hover:to-rose-100 transition-all duration-300 border border-red-200 shadow-sm hover:shadow-md"
                            >
                              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              Export
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <div className="text-sm text-gray-700">
              Showing <span className="font-medium">{(page - 1) * limit + 1}</span> to{' '}
              <span className="font-medium">{Math.min(page * limit, total)}</span> of{' '}
              <span className="font-medium">{total}</span> results
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <div className="flex items-center space-x-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (page <= 3) {
                    pageNum = i + 1;
                  } else if (page >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = page - 2 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                        page === pageNum
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
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <ImportTypeModal
        isOpen={showImportTypeModal}
        onClose={() => setShowImportTypeModal(false)}
        onSelectSingle={() => setShowImportModal(true)}
        onSelectBulk={() => setShowBulkImportModal(true)}
      />

      <ImportProductModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onSuccess={handleImportSuccess}
        locations={locations}
      />

      <BulkImportModal
        isOpen={showBulkImportModal}
        onClose={() => setShowBulkImportModal(false)}
        onSuccess={handleImportSuccess}
        locations={locations}
      />

      <TransferProductModal
        isOpen={showTransferModal}
        onClose={() => {
          setShowTransferModal(false);
          setSelectedProduct(null);
        }}
        onSuccess={handleTransferSuccess}
        product={selectedProduct}
        locations={locations}
      />

      <ExportProductModal
        isOpen={showExportModal}
        onClose={() => {
          setShowExportModal(false);
          setSelectedProduct(null);
        }}
        onSuccess={handleExportSuccess}
        product={selectedProduct}
        locations={locations}
      />

      <EditProductModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedProduct(null);
        }}
        onSuccess={handleEditSuccess}
        product={selectedProduct}
      />
    </div>
  );
};

export default Inventory;