import { api } from '../lib/axios';

export interface SaleProduct {
  productId: { _id: string; description: string; partsNumber?: string } | string;
  locationId: { _id: string; name: string } | string;
  quantity: number;
  unitPrice: number;
}

export interface Sale {
  _id: string;
  products: SaleProduct[];
  soldBy: { _id: string; name?: string; email?: string } | string;
  soldAt: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}


export interface SaleProductDto {
  productId: string;
  locationId: string;
  quantity: number;
  unitPrice: number;
}

export interface CreateSaleDto {
  products: SaleProductDto[];
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

export interface SalesStats {
  totalSales: number;
  totalQuantity: number;
  salesToday: number;
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

  getTotalSales: async (startDate?: string, endDate?: string): Promise<SalesStats> => {
    const response = await api.get('/sales/stats/total', {
      params: {
        startDate,
        endDate,
      },
    });
    return response.data;
  },
};

