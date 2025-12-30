import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { productsApi, type Product, type LocationStats } from '../services/productsApi';
import { movementsApi, type Movement } from '../services/movementsApi';
import { locationsApi, type Location } from '../services/locationsApi';
import Loader from '../components/Loader';
import { formatCurrency, getCurrencySymbol } from '../utils/currency';

const Dashboard = () => {
  const { user } = useAuthStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [locationStats, setLocationStats] = useState<LocationStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [movementsLoading, setMovementsLoading] = useState(true);

  useEffect(() => {
    console.log('[Dashboard] Component mounted, fetching data');
    const authState = useAuthStore.getState();
    console.log('[Dashboard] Auth state on mount:', {
      isAuthenticated: authState.isAuthenticated,
      hasUser: !!authState.user,
      hasToken: !!authState.token,
      tokenInStorage: !!localStorage.getItem('token')
    });
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      console.log('[Dashboard] Starting fetchData()');
      setLoading(true);
      setMovementsLoading(true);
      
      const token = localStorage.getItem('token');
      console.log('[Dashboard] Token before API calls:', token ? token.substring(0, 20) + '...' : 'NO TOKEN');
      
      console.log('[Dashboard] Calling productsApi.fetchProducts()');
      const productsResponse = await productsApi.fetchProducts({
        page: 1,
        limit: 50,
      });
      console.log('[Dashboard] Products fetched successfully, count:', productsResponse.data.length);
      
      console.log('[Dashboard] Calling movementsApi.fetchMovements()');
      const movementsResponse = await movementsApi.fetchMovements({
        page: 1,
        limit: 5,
      });
      console.log('[Dashboard] Movements fetched successfully, count:', movementsResponse.data.length);
      
      console.log('[Dashboard] Calling locationsApi.fetchLocations()');
      const locationsData = await locationsApi.fetchLocations();
      console.log('[Dashboard] Locations fetched successfully, count:', locationsData.length);
      
      console.log('[Dashboard] Calling productsApi.getProductsByLocationStats()');
      const locationStatsData = await productsApi.getProductsByLocationStats();
      console.log('[Dashboard] Location stats fetched successfully, count:', locationStatsData.length);
      
      setProducts(productsResponse.data);
      setMovements(movementsResponse.data); // Get latest 5 movements
      setLocations(locationsData);
      setLocationStats(locationStatsData);
      console.log('[Dashboard] Data fetch completed successfully');
    } catch (error: any) {
      console.error('[Dashboard] Failed to fetch data:', error);
      console.error('[Dashboard] Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        url: error.config?.url
      });
    } finally {
      setLoading(false);
      setMovementsLoading(false);
    }
  };

  const getTotalItems = () => {
    // Count unique products
    return products.length;
  };

  const getInStockItems = () => {
    // Count products that have stock > 0
    return products.filter(product => {
      const totalQuantity = product.locations.reduce((sum, loc) => sum + loc.quantity, 0);
      return totalQuantity > 0;
    }).length;
  };

  const getLowStockItems = () => {
    // Count products with total quantity < 10
    return products.filter(product => {
      const totalQuantity = product.locations.reduce((sum, loc) => sum + loc.quantity, 0);
      return totalQuantity > 0 && totalQuantity < 10;
    }).length;
  };

  const getTotalValue = () => {
    return products.reduce((total, product) => {
      const totalQuantity = product.locations.reduce((sum, loc) => sum + loc.quantity, 0);
      return total + (totalQuantity * product.unitPrice);
    }, 0);
  };

  const getProductsByLocation = (locationId: string): number => {
    return products.filter(product => {
      const location = product.locations.find(
        loc => loc.locationId._id === locationId && loc.quantity > 0
      );
      return location !== undefined;
    }).length;
  };

  const getMovementIcon = (type: string) => {
    switch (type) {
      case 'import':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
          </svg>
        );
      case 'transfer':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
        );
      case 'export':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  const getMovementColor = (type: string) => {
    switch (type) {
      case 'import':
        return 'bg-gradient-to-r from-emerald-100 to-green-100 text-emerald-800 border-emerald-300 shadow-sm';
      case 'transfer':
        return 'bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-800 border-blue-300 shadow-sm';
      case 'export':
        return 'bg-gradient-to-r from-rose-100 to-red-100 text-rose-800 border-rose-300 shadow-sm';
      default:
        return 'bg-gradient-to-r from-gray-100 to-slate-100 text-gray-800 border-gray-300 shadow-sm';
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };


  const stats = [
    {
      name: 'Total Products',
      value: loading ? '...' : getTotalItems().toLocaleString(),
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
      gradient: 'from-blue-500 via-blue-600 to-indigo-600',
      bgGradient: 'from-blue-50 via-blue-100/50 to-indigo-50',
      iconBg: 'bg-gradient-to-br from-blue-400 to-indigo-500',
      textColor: 'text-blue-700',
      borderColor: 'border-blue-200',
      href: '/dashboard/inventory'
    },
    {
      name: 'In Stock',
      value: loading ? '...' : getInStockItems().toLocaleString(),
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      gradient: 'from-emerald-500 via-green-500 to-teal-600',
      bgGradient: 'from-emerald-50 via-green-100/50 to-teal-50',
      iconBg: 'bg-gradient-to-br from-emerald-400 to-teal-500',
      textColor: 'text-emerald-700',
      borderColor: 'border-emerald-200',
      href: '/dashboard/inventory'
    },
    {
      name: 'Low Stock',
      value: loading ? '...' : getLowStockItems().toLocaleString(),
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      ),
      gradient: 'from-amber-500 via-orange-500 to-yellow-500',
      bgGradient: 'from-amber-50 via-orange-100/50 to-yellow-50',
      iconBg: 'bg-gradient-to-br from-amber-400 to-orange-500',
      textColor: 'text-amber-700',
      borderColor: 'border-amber-200',
      href: '/dashboard/inventory'
    },
    {
      name: 'Total Value',
      value: loading ? '...' : formatCurrency(getTotalValue()),
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
        </svg>
      ),
      gradient: 'from-blue-800 via-pink-500 to-rose-500',
      bgGradient: 'from-blue-50 via-pink-100/50 to-rose-50',
      iconBg: 'bg-gradient-to-br from-blue-400 to-pink-500',
      textColor: 'text-blue-800',
      borderColor: 'border-blue-200',
      href: '/dashboard/inventory'
    }
  ];

  const quickActions = [
    {
      name: 'Add Product',
      description: 'Import new items to inventory',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
      ),
      href: '/dashboard/inventory',
      gradient: 'from-blue-500 to-cyan-500',
      hoverGradient: 'from-blue-600 to-cyan-600',
      bgGradient: 'from-blue-50 to-cyan-50',
      textColor: 'text-blue-700'
    },
    {
      name: 'View Inventory',
      description: 'Browse all products and stock',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
      href: '/dashboard/inventory',
      gradient: 'from-indigo-500 to-blue-800',
      hoverGradient: 'from-indigo-600 to-blue-600',
      bgGradient: 'from-indigo-50 to-blue-50',
      textColor: 'text-indigo-700'
    },
    {
      name: 'Movement History',
      description: 'Track all inventory movements',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      href: '/dashboard/movements',
      gradient: 'from-teal-500 to-emerald-500',
      hoverGradient: 'from-teal-600 to-emerald-600',
      bgGradient: 'from-teal-50 to-emerald-50',
      textColor: 'text-teal-700'
    }
  ];

  return (
    <>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-lg">
        <div className="px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-gray-600 mt-1 font-medium">Welcome back, {user?.email}</p>
            </div>
            <div className="hidden sm:block">
              <div className="text-right bg-gray-50 rounded-lg px-4 py-2 border border-gray-200">
                <div className="text-xs text-gray-500 font-medium uppercase tracking-wide">Last updated</div>
                <div className="text-sm font-bold text-gray-900">
                  {new Date().toLocaleDateString()}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 sm:px-6 lg:px-8 py-6 bg-gradient-to-br from-gray-50 via-blue-50/30 to-blue-50/30 min-h-screen">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <a key={index} href={stat.href} className={`block bg-gradient-to-br ${stat.bgGradient} rounded-2xl border-2 ${stat.borderColor} p-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 cursor-pointer`}>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className={`text-sm font-semibold ${stat.textColor} mb-1`}>{stat.name}</p>
                  <p className={`text-3xl font-bold ${stat.textColor} mt-1`}>{stat.value}</p>
                </div>
                <div className={`p-4 rounded-xl ${stat.iconBg} shadow-lg transform rotate-3 hover:rotate-6 transition-transform`}>
                  <div className="text-white">
                    {stat.icon}
                  </div>
                </div>
              </div>
              <div className={`mt-4 h-1.5 rounded-full bg-gradient-to-r ${stat.gradient} opacity-60`}></div>
            </a>
          ))}
        </div>

        {/* Location Stats Grid */}
        {locations.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-cyan-600 bg-clip-text text-transparent mb-4">Products by Location</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {locations.map((location, index) => {
                const locationGradients = [
                  { gradient: 'from-violet-500 via-purple-500 to-fuchsia-500', bgGradient: 'from-violet-50 via-purple-100/50 to-fuchsia-50', iconBg: 'bg-gradient-to-br from-violet-400 to-fuchsia-500', textColor: 'text-violet-700', borderColor: 'border-violet-200' },
                  { gradient: 'from-cyan-500 via-blue-500 to-indigo-500', bgGradient: 'from-cyan-50 via-blue-100/50 to-indigo-50', iconBg: 'bg-gradient-to-br from-cyan-400 to-indigo-500', textColor: 'text-cyan-700', borderColor: 'border-cyan-200' },
                  { gradient: 'from-emerald-500 via-teal-500 to-cyan-500', bgGradient: 'from-emerald-50 via-teal-100/50 to-cyan-50', iconBg: 'bg-gradient-to-br from-emerald-400 to-cyan-500', textColor: 'text-emerald-700', borderColor: 'border-emerald-200' },
                  { gradient: 'from-rose-500 via-pink-500 to-fuchsia-500', bgGradient: 'from-rose-50 via-pink-100/50 to-fuchsia-50', iconBg: 'bg-gradient-to-br from-rose-400 to-fuchsia-500', textColor: 'text-rose-700', borderColor: 'border-rose-200' },
                  { gradient: 'from-orange-500 via-amber-500 to-yellow-500', bgGradient: 'from-orange-50 via-amber-100/50 to-yellow-50', iconBg: 'bg-gradient-to-br from-orange-400 to-yellow-500', textColor: 'text-orange-700', borderColor: 'border-orange-200' },
                  { gradient: 'from-sky-500 via-blue-500 to-indigo-500', bgGradient: 'from-sky-50 via-blue-100/50 to-indigo-50', iconBg: 'bg-gradient-to-br from-sky-400 to-indigo-500', textColor: 'text-sky-700', borderColor: 'border-sky-200' },
                ];
                const locationStyle = locationGradients[index % locationGradients.length];
                const productCount = loading ? '...' : getProductsByLocation(location._id).toLocaleString();
                
                // Get total quantity for this location from locationStats
                const locationStat = locationStats.find(stat => stat.locationName === location.name);
                const totalQuantity = loading ? '...' : (locationStat?.totalQuantity || 0).toLocaleString();
                
                return (
                  <a key={location._id} href="/dashboard/inventory" className={`block bg-gradient-to-br ${locationStyle.bgGradient} rounded-2xl border-2 ${locationStyle.borderColor} p-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 cursor-pointer`}>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex-1">
                        <p className={`text-sm font-semibold ${locationStyle.textColor} mb-1`}>{location.name}</p>
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
                    
                    {/* Two rows of stats */}
                    <div className="space-y-4">
                      <div className="bg-white/50 rounded-lg p-3">
                        <p className={`text-xs ${locationStyle.textColor} opacity-70 mb-1`}>Products</p>
                        <p className={`text-2xl font-bold ${locationStyle.textColor}`}>{productCount}</p>
                      </div>
                      <div className="bg-white/50 rounded-lg p-3">
                        <p className={`text-xs ${locationStyle.textColor} opacity-70 mb-1`}>Total Quantity</p>
                        <p className={`text-2xl font-bold ${locationStyle.textColor}`}>{totalQuantity}</p>
                      </div>
                    </div>
                    
                    <div className={`mt-4 h-1.5 rounded-full bg-gradient-to-r ${locationStyle.gradient} opacity-60`}></div>
                  </a>
                );
              })}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border-2 border-blue-200 shadow-xl">
          <div className="px-6 py-4 border-b-2 border-gradient-to-r from-blue-200 to-pink-200 bg-gradient-to-r from-blue-50 to-pink-50 rounded-t-2xl">
            <h2 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-pink-600 bg-clip-text text-transparent">Quick Actions</h2>
            <p className="text-sm text-gray-600 mt-1 font-medium">Common tasks and shortcuts</p>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {quickActions.map((action, index) => (
                <a
                  key={index}
                  href={action.href}
                  className={`group block p-5 rounded-xl bg-gradient-to-br ${action.bgGradient} border-2 border-transparent hover:border-opacity-50 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 hover:scale-105`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`p-3 rounded-xl bg-gradient-to-br ${action.gradient} text-white shadow-lg group-hover:scale-110 group-hover:shadow-xl transition-all duration-300`}>
                      {action.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className={`text-sm font-bold ${action.textColor} group-hover:scale-105 transition-transform`}>
                        {action.name}
                      </h3>
                      <p className="text-xs text-gray-600 mt-1 font-medium">{action.description}</p>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Activity Timeline */}
        <div className="mt-8 bg-white/80 backdrop-blur-sm rounded-2xl border-2 border-indigo-200 shadow-xl">
          <div className="px-6 py-4 border-b-2 border-indigo-200 bg-gradient-to-r from-indigo-50 via-blue-50 to-cyan-50 rounded-t-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-cyan-600 bg-clip-text text-transparent">Recent Activity</h2>
                <p className="text-sm text-gray-700 mt-1 font-medium">Latest inventory movements</p>
              </div>
              <button
                onClick={fetchData}
                className="px-4 py-2 text-sm bg-gradient-to-r from-indigo-500 to-cyan-500 text-white font-semibold rounded-lg hover:from-indigo-600 hover:to-cyan-600 shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105"
              >
                Refresh
              </button>
            </div>
          </div>
          <div className="p-6">
            {movementsLoading ? (
              <div className="flex justify-center py-8">
                <Loader size="md" text="Loading activity..." color="blue" />
              </div>
            ) : movements.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-indigo-100 to-blue-100 rounded-full flex items-center justify-center shadow-lg border-2 border-indigo-200">
                  <svg className="w-10 h-10 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <h3 className="text-base font-bold text-gray-800 mb-2">No recent activity</h3>
                <p className="text-sm text-gray-600 font-medium">Activity will appear here as you manage your inventory</p>
              </div>
            ) : (
              <div className="space-y-0">
                {movements.map((movement, index) => (
                  <div key={movement._id}>
                    <div className="flex items-start space-x-4 py-4">
                      {/* Timeline line */}
                      <div className="flex flex-col items-center">
                        <div className={`p-3 rounded-full ${getMovementColor(movement.movementType)} shadow-lg`}>
                          <div className="text-current">
                            {getMovementIcon(movement.movementType)}
                          </div>
                        </div>
                        {index < movements.length - 1 && (
                          <div className="w-1 h-12 bg-gradient-to-b from-indigo-300 via-blue-300 to-cyan-300 mt-2 rounded-full"></div>
                        )}
                      </div>
                      
                      {/* Activity content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${getMovementColor(movement.movementType)} shadow-md`}>
                              {movement.movementType}
                            </span>
                            <span className="text-sm font-semibold text-gray-700 bg-gray-100 px-2 py-1 rounded-lg">
                              {movement.quantity} units
                            </span>
                          </div>
                          <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-lg">
                            {formatTimeAgo(movement.createdAt)}
                          </span>
                        </div>
                        
                        <div className="mt-1">
                          <p className="text-sm font-medium text-gray-900">
                            {movement.productId?.description || 'Unknown Product'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {movement.productId?.partsNumber || 'N/A'} • {getCurrencySymbol()}{movement.unitPrice.toFixed(2)}
                          </p>
                        </div>
                        
                        {(movement.fromLocationId || movement.toLocationId) && (
                          <div className="mt-2 text-xs text-gray-500">
                            {movement.fromLocationId && (
                              <span>From: <span className="font-medium">{movement.fromLocationId.name}</span></span>
                            )}
                            {movement.fromLocationId && movement.toLocationId && <span> • </span>}
                            {movement.toLocationId && (
                              <span>To: <span className="font-medium">{movement.toLocationId.name}</span></span>
                            )}
                          </div>
                        )}
                        
                        {movement.notes && (
                          <div className="mt-2 text-xs text-gray-700 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-3 border border-blue-200 shadow-sm">
                            "{movement.notes}"
                          </div>
                        )}
                        {movement.movedBy && (
                          <div className="mt-2 text-xs text-gray-500">
                            <span>By: <span className="font-medium text-gray-700">
                              {typeof movement.movedBy === 'object' 
                                ? (movement.movedBy.name || movement.movedBy.email || 'Unknown')
                                : 'Unknown'}
                            </span></span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Separator line */}
                    {index < movements.length - 1 && (
                      <div className="ml-8 border-t border-gray-100"></div>
                    )}
                  </div>
                ))}
                
                {movements.length >= 5 && (
                  <div className="text-center pt-4">
                    <a
                      href="/dashboard/movements"
                      className="inline-flex items-center px-4 py-2 text-sm bg-gradient-to-r from-indigo-500 to-blue-800 text-white font-semibold rounded-lg hover:from-indigo-600 hover:to-blue-600 shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105"
                    >
                      View all movements
                      <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default Dashboard;