import api from "../api/interceptors";

export const googleLogin = async (credential) => {
    const response = await api.post("/auth/google/", {
        credential,
    });

    return response.data;
};