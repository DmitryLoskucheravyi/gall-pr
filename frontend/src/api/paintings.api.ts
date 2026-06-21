import { api } from "./index";

import { Painting, PaintingsResponse, } from "../types/painting.types";
import { CreatePaintingDto } from "../types/create-painting.types";

export const getPaintings = async (
    page = 1,
    limit = 12,
): Promise<PaintingsResponse> => {
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
};

export const getPainting = async (
    id: number,
): Promise<Painting> => {
    const response = await api.get(
        `/paintings/${id}`
    );

    return response.data;
};

export const createPainting = async (
    data: CreatePaintingDto
): Promise<Painting> => {
    const response = await api.post(
        "/paintings",
        data
    );

    return response.data;
};

export const updatePainting = async (
    id: number,
    data: Partial<CreatePaintingDto>
): Promise<Painting> => {
    const response = await api.patch(
        `/paintings/${id}`,
        data
    );

    return response.data;
};

export const deletePainting = async (
    id: number
) => {
    const response = await api.delete(
        `/paintings/${id}`
    );

    return response.data;
};