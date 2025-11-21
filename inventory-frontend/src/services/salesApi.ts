import { api } from '../lib/axios';

export interface Sale {
  _id: string;
  productId: {
    _id: string;
    description: string;
    partsNumber: string;
  };
  locationId: {
    _id: string;
    name: string;
  };
  quantity: number;
  price: number;
  soldBy: {
    _id: string;
    name: string;
    email: string;
  };
  soldAt: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSaleDto {
  productId: string;
  locationId: string;
  quantity: number;
  price: number;
  notes?: string;
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

export const salesApi = {
  createSale: async (data: CreateSaleDto): Promise<Sale> => {
    const response = await api.post('/sales', data);
    return response.data;
  },

  fetchSales: async (params?: PaginationParams): Promise<PaginatedResponse<Sale>> => {
    const response = await api.get('/sales', { params });
    return response.data;
  },

  fetchSale: async (id: string): Promise<Sale> => {
    const response = await api.get(`/sales/${id}`);
    return response.data;
  },

  fetchSalesByLocation: async (locationId: string): Promise<Sale[]> => {
    const response = await api.get(`/sales/location/${locationId}`);
    return response.data;
  },
};

