import { api } from "./index";

import { Painting, PaintingsResponse, } from "../types/painting.types";
import { CreatePaintingDto } from "../types/create-painting.types";

class PaintingsService {
    async getPaintings(
        page = 1,
        limit = 12,
    ): Promise<PaintingsResponse> {
        const response = await api.get(
            "/paintings",
            {
                params: {
                    page,
                    limit,
                },
            }
        );
        return response.data;
    }

    async getPainting(
        id: number,
    ): Promise<Painting> {
        const response = await api.get(
            `/paintings/${id}`
        );
        return response.data;
    }

    async createPainting(
        data: CreatePaintingDto
    ): Promise<Painting> {
        const response = await api.post(
            "/paintings",
            data
        );
        return response.data;
    }

    async updatePainting(
        id: number,
        data: Partial<CreatePaintingDto>
    ): Promise<Painting> {
        const response = await api.patch(
            `/paintings/${id}`,
            data
        );
        return response.data;
    }

    async deletePainting(
        id: number
    ) {
        const response = await api.delete(
            `/paintings/${id}`
        );
        return response.data;
    }
}

export const paintingsService = new PaintingsService();