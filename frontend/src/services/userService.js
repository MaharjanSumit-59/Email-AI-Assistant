import api from "../api/interceptors";

export const getProfile = async () => {
    const response = await api.get("/users/me/");
    return response.data;
};

export const getSummary = async () => {
    const response = await api.get("/users/summary/");
    return response.data;
};

export const getAccountStatus = async () => {
    const response = await api.get("/users/status/");
    return response.data;
};

export const updateProfile = async (data) => {
    const response = await api.patch("/users/me/", data);
    return response.data;
};

export const deleteAccount = async () => {
    const response = await api.delete("/users/delete/");
    return response.data;
};