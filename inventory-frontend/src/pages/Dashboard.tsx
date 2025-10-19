import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { productsApi, type Product } from '../services/productsApi';
import { movementsApi, type Movement } from '../services/movementsApi';
import Loader from '../components/Loader';

const Dashboard = () => {
  const { user } = useAuthStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [movementsLoading, setMovementsLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setMovementsLoading(true);
      
      const [productsData, movementsData] = await Promise.all([
        productsApi.fetchProducts(),
        movementsApi.fetchMovements()
      ]);
      
      setProducts(productsData);
      setMovements(movementsData.slice(0, 5)); // Get latest 5 movements
    } catch (error) {
      console.error('Failed to fetch data:', error);
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
      return total + product.locations.reduce((sum, loc) => sum + (loc.quantity * loc.unitPrice), 0);
    }, 0);
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
        return 'bg-green-100 text-green-800 border-green-200';
      case 'transfer':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'export':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
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

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) {
      return `₦${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `₦${(amount / 1000).toFixed(1)}K`;
    } else {
      return `₦${amount.toLocaleString()}`;
    }
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
      color: 'bg-blue-500',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600'
    },
    {
      name: 'In Stock',
      value: loading ? '...' : getInStockItems().toLocaleString(),
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: 'bg-green-500',
      bgColor: 'bg-green-50',
      textColor: 'text-green-600'
    },
    {
      name: 'Low Stock',
      value: loading ? '...' : getLowStockItems().toLocaleString(),
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      ),
      color: 'bg-yellow-500',
      bgColor: 'bg-yellow-50',
      textColor: 'text-yellow-600'
    },
    {
      name: 'Total Value',
      value: loading ? '...' : formatCurrency(getTotalValue()),
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
        </svg>
      ),
      color: 'bg-purple-500',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-600'
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
      color: 'bg-blue-600 hover:bg-blue-700'
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
      color: 'bg-gray-600 hover:bg-gray-700'
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
      color: 'bg-gray-600 hover:bg-gray-700'
    },
    {
      name: 'Settings',
      description: 'Configure system preferences',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      href: '/dashboard/settings',
      color: 'bg-gray-600 hover:bg-gray-700'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-gray-600 mt-1">Welcome back, {user?.email}</p>
            </div>
            <div className="hidden sm:block">
              <div className="text-right">
                <div className="text-sm text-gray-500">Last updated</div>
                <div className="text-sm font-medium text-gray-900">
                  {new Date().toLocaleDateString()}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 sm:px-6 lg:px-8 py-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((stat, index) => (
            <div key={index} className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                  <div className={`${stat.textColor}`}>
                    {stat.icon}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
            <p className="text-sm text-gray-600 mt-1">Common tasks and shortcuts</p>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {quickActions.map((action, index) => (
                <a
                  key={index}
                  href={action.href}
                  className="group block p-4 rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-200"
                >
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${action.color} text-white group-hover:scale-110 transition-transform`}>
                      {action.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-gray-900 group-hover:text-gray-700">
                        {action.name}
                      </h3>
                      <p className="text-xs text-gray-500 mt-1">{action.description}</p>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Activity Timeline */}
        <div className="mt-8 bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
                <p className="text-sm text-gray-600 mt-1">Latest inventory movements</p>
              </div>
              <button
                onClick={fetchData}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
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
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <h3 className="text-sm font-medium text-gray-900 mb-1">No recent activity</h3>
                <p className="text-xs text-gray-500">Activity will appear here as you manage your inventory</p>
              </div>
            ) : (
              <div className="space-y-0">
                {movements.map((movement, index) => (
                  <div key={movement._id}>
                    <div className="flex items-start space-x-4 py-4">
                      {/* Timeline line */}
                      <div className="flex flex-col items-center">
                        <div className={`p-2 rounded-full ${getMovementColor(movement.movementType).split(' ')[0]}`}>
                          <div className={`${getMovementColor(movement.movementType).split(' ')[1]}`}>
                            {getMovementIcon(movement.movementType)}
                          </div>
                        </div>
                        {index < movements.length - 1 && (
                          <div className="w-0.5 h-12 bg-gray-200 mt-2"></div>
                        )}
                      </div>
                      
                      {/* Activity content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getMovementColor(movement.movementType)}`}>
                              {movement.movementType}
                            </span>
                            <span className="text-sm text-gray-500">
                              {movement.quantity} units
                            </span>
                          </div>
                          <span className="text-xs text-gray-400">
                            {formatTimeAgo(movement.createdAt)}
                          </span>
                        </div>
                        
                        <div className="mt-1">
                          <p className="text-sm font-medium text-gray-900">
                            {movement.productId?.description || 'Unknown Product'}
                          </p>
                          <p className="text-xs text-gray-500">
                            #{movement.productId?.partsNumber || 'N/A'} • ₦{movement.unitPrice.toFixed(2)}
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
                          <div className="mt-2 text-xs text-gray-600 bg-gray-50 rounded-lg p-2">
                            "{movement.notes}"
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
                      className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                      View all movements →
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;