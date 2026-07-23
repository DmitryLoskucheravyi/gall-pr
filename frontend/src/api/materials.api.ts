import { api } from './index';

import { Material } from '../types/dictionaries.types';

class MaterialsService {
  async getMaterials(): Promise<Material[]> {
    const response = await api.get('/materials');
    return response.data;
  }

  async createMaterial(name: string): Promise<Material> {
    const response = await api.post('/materials', { name });
    return response.data;
  }

  async updateMaterial(id: number, name: string): Promise<Material> {
    const response = await api.patch(`/materials/${id}`, { name });
    return response.data;
  }

  async deleteMaterial(id: number) {
    const response = await api.delete(`/materials/${id}`);
    return response.data;
  }
}

export const materialsService = new MaterialsService();
