import { api } from './client';
import type { Material } from '../types/dictionaries.types';

type MaterialInput = { name: string; nameEn?: string };

class MaterialsService {
  async getMaterials(): Promise<Material[]> {
    const response = await api.get('/materials');
    return response.data;
  }

  async createMaterial(input: MaterialInput): Promise<Material> {
    const response = await api.post('/materials', input);
    return response.data;
  }

  async updateMaterial(id: number, input: MaterialInput): Promise<Material> {
    const response = await api.patch(`/materials/${id}`, input);
    return response.data;
  }

  async deleteMaterial(id: number) {
    const response = await api.delete(`/materials/${id}`);
    return response.data;
  }
}

export const materialsService = new MaterialsService();
