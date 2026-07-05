import api from "../api/interceptors";

export const getReminders = async () => {
    const response = await api.get("/reminders/");
    return response.data;
};

export const createReminder = async (payload) => {
    const response = await api.post("/reminders/", payload);
    return response.data;
};

export const getReminder = async (id) => {
    const response = await api.get(`/reminders/${id}/`);
    return response.data;
};