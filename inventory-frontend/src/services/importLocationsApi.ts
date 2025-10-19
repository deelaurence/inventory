import { api } from '../lib/axios';

export interface ImportLocation {
  _id: string;
  name: string;
  country?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export const importLocationsApi = {
  fetchImportLocations: async (): Promise<ImportLocation[]> => {
    const response = await api.get('/import-locations');
    return response.data;
  },

  createImportLocation: async (data: {
    name: string;
    country?: string;
    description?: string;
  }): Promise<ImportLocation> => {
    const response = await api.post('/import-locations', data);
    return response.data;
  },

  updateImportLocation: async (id: string, data: {
    name?: string;
    country?: string;
    description?: string;
  }): Promise<ImportLocation> => {
    const response = await api.patch(`/import-locations/${id}`, data);
    return response.data;
  },

  deleteImportLocation: async (id: string): Promise<void> => {
    await api.delete(`/import-locations/${id}`);
  },
};
