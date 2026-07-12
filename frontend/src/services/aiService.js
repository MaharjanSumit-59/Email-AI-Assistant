import api from "../api/interceptors";

export const summarizeEmail = async (messageId) => {
    const response = await api.post("/ai/summarize/", {
        message_id: messageId,
    });

    return response.data;
};

export const generateReply = async (messageId) => {
    const response = await api.post("/ai/reply/", {
        message_id: messageId,
    });

    return response.data;
};

export const analyzeEmail = async (messageId) => {
    const response = await api.post("/ai/analyze/", {
        message_id: messageId,
    });

    return response.data;
};

export const extractTasks = async (messageId) => {
    const response = await api.post("/ai/tasks/", {
        message_id: messageId,
    });

    return response.data;
};

export const getActionLogs = async (action) => {
    const response = await api.get("/ai/logs/", {
        params: action ? { action } : {},
    });

    return response.data;
};

export const deleteActionLog = async (logId) => {
    const response = await api.delete(`/ai/logs/${logId}/`);

    return response.data;
};

export const runAutomationNow = async () => {
    const response = await api.post("/ai/run-now/");

    return response.data;
};

export const translateEmail = async (messageId) => {
    const response = await api.post("/ai/translate/", {
        message_id: messageId,
    });

    return response.data;
};