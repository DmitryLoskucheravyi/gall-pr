import axios from "axios";
import { useAuthStore } from "../store/authStore";

export const api = axios.create({
    baseURL: "http://192.168.0.104:3000",
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
                        "http://192.168.0.101:3000/auth/refresh",
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