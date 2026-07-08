import api from "./axios";
import { getToken, getRefreshToken, setToken, removeToken } from "../utils/storage";

api.interceptors.request.use(
    (config) => {
        const token = getToken();

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        return config;
    },
    (error) => Promise.reject(error)
);

let isRefreshing = false;
let refreshQueue = [];

function resolveQueue(newToken) {
    refreshQueue.forEach((cb) => cb(newToken));
    refreshQueue = [];
}

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        const isAuthEndpoint =
            originalRequest?.url?.includes("/auth/google/") ||
            originalRequest?.url?.includes("/auth/token/refresh/");

        if (
            error.response?.status === 401 &&
            !originalRequest._retry &&
            !isAuthEndpoint
        ) {
            const refreshToken = getRefreshToken();

            if (!refreshToken) {
                removeToken();
                window.location.href = "/";
                return Promise.reject(error);
            }

            originalRequest._retry = true;

            if (isRefreshing) {
                return new Promise((resolve) => {
                    refreshQueue.push((newToken) => {
                        originalRequest.headers.Authorization = `Bearer ${newToken}`;
                        resolve(api(originalRequest));
                    });
                });
            }

            isRefreshing = true;

            try {
                const { data } = await api.post("/auth/token/refresh/", {
                    refresh: refreshToken,
                });

                setToken(data.access);
                resolveQueue(data.access);

                originalRequest.headers.Authorization = `Bearer ${data.access}`;
                return api(originalRequest);
            } catch (refreshError) {
                resolveQueue(null);
                removeToken();
                window.location.href = "/";
                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }

        return Promise.reject(error);
    }
);

export default api;