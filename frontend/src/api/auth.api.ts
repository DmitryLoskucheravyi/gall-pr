import { api } from "./index";
import { AuthResponse, RegisterDto, LoginDto, ProfileResponse } from "../types/auth.types";

export const register = async (data: RegisterDto): Promise<AuthResponse> => {
    try {
        const response = await api.post("/auth/register", data);
        return response.data;
    } catch (error: any) {
        console.log("register error");
        console.log(error.response?.data);
        console.log(error.response?.status);
        console.log(error.response?.data);
        throw error;
    }
};
export const login = async (data: LoginDto): Promise<AuthResponse> => {
    const response = await api.post("/auth/login", data);
    return response.data;
};
export const getMe = async (accessToken: string,): Promise<ProfileResponse> => {
    const response = await api.get("/auth/me");
    return response.data;
};

export const refresh = async (refreshToken: string,) => {
    const response = await api.post("/auth/refresh", { refreshToken, });
    return response.data;
};