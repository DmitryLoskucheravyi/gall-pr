import { api } from "./index";

export const uploadImage = async (
    uri: string
) => {
    const formData = new FormData();

    formData.append(
        "image",
        {
            uri,
            type: "image/jpeg",
            name: "image.jpg",
        } as any
    );

    const response = await api.post(
        "/uploads/image",
        formData,
        {
            headers: {
                "Content-Type":
                    "multipart/form-data",
            },
        }
    );

    return response.data;
};