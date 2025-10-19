import { useState, useEffect } from 'react';
import { productsApi, type Product } from '../services/productsApi';
import { locationsApi, type Location } from '../services/locationsApi';
import ImportProductModal from '../components/ImportProductModal.tsx';
import TransferProductModal from '../components/TransferProductModal.tsx';
import ExportProductModal from '../components/ExportProductModal.tsx';

const Inventory = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [productsData, locationsData] = await Promise.all([
        productsApi.fetchProducts(),
        locationsApi.fetchLocations(),
      ]);
      setProducts(productsData);
      setLocations(locationsData);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const getQuantityAtLocation = (product: Product, locationId: string): number => {
    const location = product.locations.find(loc => loc.locationId._id === locationId);
    return location ? location.quantity : 0;
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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Loading inventory...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="text-red-800">{error}</div>
        <button
          onClick={fetchData}
          className="mt-2 text-red-600 hover:text-red-800 underline"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Inventory Management</h1>
        <button
          onClick={() => setShowImportModal(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium"
        >
          Import New Product
        </button>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Parts Number
                </th>
                {locations.map((location) => (
                  <th key={location._id} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {location.name} Qty
                  </th>
                ))}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {products.map((product) => (
                <tr key={product._id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {product.description}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {product.partsNumber}
                  </td>
                  {locations.map((location) => (
                    <td key={location._id} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {getQuantityAtLocation(product, location._id)}
                    </td>
                  ))}
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button
                      onClick={() => openTransferModal(product)}
                      className="text-indigo-600 hover:text-indigo-900"
                    >
                      Transfer
                    </button>
                    <button
                      onClick={() => openExportModal(product)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Export
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {products.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-500 text-lg">No products found</div>
          <div className="text-gray-400 text-sm mt-2">Import your first product to get started</div>
        </div>
      )}

      <ImportProductModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
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
    </div>
  );
};

export default Inventory;
