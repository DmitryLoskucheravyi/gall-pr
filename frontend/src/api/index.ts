import axios from "axios";
import Constants from "expo-constants";
import { useAuthStore } from "../store/authStore";

function getApiUrl(): string {
    if (__DEV__) {
        const host = Constants.expoConfig?.hostUri?.split(":")[0];
        if (host) return `http://${host}:3000`;
    }
    return process.env.EXPO_PUBLIC_API_URL ?? "";
}

const API_URL = getApiUrl();

export const api = axios.create({
    baseURL: API_URL,
    headers: {
        "Content-Type": "application/json",
    },

});

api.interceptors.request.use(
    (config) => {
        const accessToken =
            useAuthStore
                .getState()
                .accessToken;

        if (accessToken) {
            config.headers.Authorization =
                `Bearer ${accessToken}`;
        }

        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

api.interceptors.response.use(
    (response) => response,

    async (error) => {
        const originalRequest = error.config;

        if (
            error.response?.status === 401 &&
            !originalRequest._retry
        ) {
            originalRequest._retry = true;

            try {
                const store =
                    useAuthStore.getState();

                if (!store.refreshToken) {
                    store.logout();
                    return Promise.reject(error);
                }

                const response =
                    await axios.post(
                        `${API_URL}/auth/refresh`,
                        {
                            refreshToken:
                                store.refreshToken,
                        }
                    );

                const {
                    accessToken,
                    refreshToken,
                } = response.data;

                store.refreshAuth(
                    accessToken,
                    refreshToken
                );

                originalRequest.headers.Authorization =
                    `Bearer ${accessToken}`;

                return api(originalRequest);

            } catch (refreshError) {
                useAuthStore
                    .getState()
                    .logout();

                return Promise.reject(
                    refreshError
                );
            }
        }

        return Promise.reject(error);
    }
);