import { api } from "./index";
import {
    AuthResponse,
    RegisterDto,
    LoginDto,
    JwtUser,
    ProfileResponse
} from "../types/auth.types";

export const register = async (
    data: RegisterDto
): Promise<AuthResponse> => {
    try {
        console.log("before register");

        const response = await api.post(
            "/auth/register",
            data
        );

        console.log("success");
        console.log(response.data);

        return response.data;
    } catch (error: any) {
        console.log("register error");

        console.log(error.response?.data);
        console.log(error.response?.status);
        console.log(error.response?.data);

        throw error;
    }
};
export const login = async (
    data: LoginDto
): Promise<AuthResponse> => {

    const response = await api.post(
        "/auth/login",
        data
    );

    return response.data;
};
export const getMe = async (
    accessToken: string,
): Promise<ProfileResponse> => {
    const response = await api.get(
        "/auth/me",
        {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        }
    );

    return response.data;
};