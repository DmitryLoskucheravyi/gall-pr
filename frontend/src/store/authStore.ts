import {
    AuthResponse,
    User,
} from "../types/auth.types";
import { create } from "zustand";

type AuthStore = {
    user: User | null;
    accessToken: string | null;
    refreshToken: string | null;
    isAuthenticated: boolean;

    setAuth: (
        data: AuthResponse
    ) => void;

    logout: () => void;
    setUser: (user: User) => void;
};


export const useAuthStore =
    create<AuthStore>((set) => ({
        user: null,

        accessToken: null,

        refreshToken: null,
        isAuthenticated: false,
        setAuth: (data) => {
            set({
                user: data.user,
                accessToken: data.accessToken,
                refreshToken: data.refreshToken,
                isAuthenticated: true,
            });
        },

        logout: () => {
            set({
                user: null,
                accessToken: null,
                refreshToken: null,
                isAuthenticated: false,
            });
        },
        setUser: (user) => {
            set({
                user,
            });
        },
    }));