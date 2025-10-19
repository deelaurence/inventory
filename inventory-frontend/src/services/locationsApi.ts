import { api } from '../lib/axios';

export interface Location {
  _id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export const locationsApi = {
  fetchLocations: async (): Promise<Location[]> => {
    const response = await api.get('/locations');
    return response.data;
  },
};
