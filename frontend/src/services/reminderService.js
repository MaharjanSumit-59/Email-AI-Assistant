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

export const updateReminder = async (id, payload) => {
    const response = await api.patch(`/reminders/${id}/`, payload);
    return response.data;
};

export const deleteReminder = async (id) => {
    const response = await api.delete(`/reminders/${id}/`);
    return response.data;
};

export const checkConflicts = async (scheduledTime, durationMinutes = 30) => {
    const response = await api.get("/reminders/check-conflicts/", {
        params: {
            scheduled_time: scheduledTime,
            duration_minutes: durationMinutes,
        },
    });
    return response.data;
};

export const confirmReminder = async (id, payload = {}) => {
    const response = await api.post(`/reminders/${id}/confirm/`, payload);
    return response.data;
};