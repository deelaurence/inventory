import { api } from '../lib/axios';

export interface Movement {
  _id: string;
  productId: {
    _id: string;
    description: string;
    partsNumber: string;
  };
  fromLocationId?: {
    _id: string;
    name: string;
  };
  toLocationId?: {
    _id: string;
    name: string;
  };
  quantity: number;
  unitPrice: number;
  movedBy: {
    _id: string;
    name: string;
    email: string;
  };
  movementType: 'IMPORT' | 'TRANSFER' | 'EXPORT';
  timestamp: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
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

export const movementsApi = {
  fetchMovements: async (params?: PaginationParams): Promise<PaginatedResponse<Movement>> => {
    const response = await api.get('/movements', { params });
    return response.data;
  },

  fetchProductMovements: async (productId: string): Promise<Movement[]> => {
    const response = await api.get(`/movements/product/${productId}`);
    return response.data;
  },
};
