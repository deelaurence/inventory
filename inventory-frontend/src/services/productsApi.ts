import { api } from '../lib/axios';

export interface ProductLocation {
  locationId: {
    _id: string;
    name: string;
  };
  quantity: number;
}

export interface PriceComparison {
  importLocationId: {
    _id: string;
    name: string;
    country?: string;
  };
  price: number;
}

export interface Product {
  _id: string;
  description: string;
  partsNumber: string;
  locations: ProductLocation[];
  importLocationId?: {
    _id: string;
    name: string;
    country?: string;
  };
  unitPrice: number;
  sellingPrice?: number;
  priceComparisons?: PriceComparison[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductDto {
  description: string;
  partsNumber: string;
  quantity: number;
  unitPrice: number;
  locationId: string;
  importLocationId?: string;
  sellingPrice?: number;
}

export interface TransferProductDto {
  fromLocationId: string;
  toLocationId: string;
  quantity: number;
}

export interface ExportProductDto {
  locationId: string;
  quantity: number;
}

export interface PriceComparisonDto {
  importLocationId: string;
  price: number;
}

export interface UpdateProductDto {
  description?: string;
  unitPrice?: number;
  sellingPrice?: number | null;
  priceComparisons?: PriceComparisonDto[];
}

export interface UpdateProductInventoryDto {
  unitPrice: number;
  sellingPrice?: number;
  quantity: number;
  locationId: string;
  importLocationId?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  startDate?: string;
  endDate?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const productsApi = {
  fetchProducts: async (params?: PaginationParams): Promise<PaginatedResponse<Product>> => {
    const response = await api.get('/products', { params });
    return response.data;
  },

  fetchProduct: async (id: string): Promise<Product> => {
    const response = await api.get(`/products/${id}`);
    return response.data;
  },

  importProduct: async (data: CreateProductDto): Promise<Product> => {
    const response = await api.post('/products', data);
    return response.data;
  },

  transferProduct: async (id: string, data: TransferProductDto): Promise<Product> => {
    const response = await api.patch(`/products/${id}/transfer`, data);
    return response.data;
  },

  exportProduct: async (id: string, data: ExportProductDto): Promise<Product> => {
    const response = await api.delete(`/products/${id}/export`, { data });
    return response.data;
  },

  updateProduct: async (id: string, data: UpdateProductDto): Promise<Product> => {
    const response = await api.patch(`/products/${id}`, data);
    return response.data;
  },

  updateProductAndInventory: async (data: UpdateProductInventoryDto & { productId: string }): Promise<Product> => {
    const { productId, ...updateData } = data;
    const response = await api.patch(`/products/${productId}/update-inventory`, updateData);
    return response.data;
  },
};
