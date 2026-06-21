export type CreatePaintingDto = {
    title: string;

    subtitle?: string;

    cardImage: string;

    images: string[];

    price: number;

    discount?: number;

    isFeatured?: boolean;

    author?: string;

    technique?: string;

    material?: string;

    width?: number;

    height?: number;

    year?: number;

    description: string;
};