import { api } from "./index";

import {
    Painting,
    PaintingsResponse,
} from "../types/painting.types";

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