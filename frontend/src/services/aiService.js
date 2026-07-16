import api from "../api/interceptors";

// `includeAttachments` defaults to true: when the email has readable
// attachments (images, PDFs, .docx), the backend downloads and reads
// them automatically. Pass false to analyze the email text only.
export const summarizeEmail = async (messageId, includeAttachments = true) => {
    const response = await api.post("/ai/summarize/", {
        message_id: messageId,
        include_attachments: includeAttachments,
    });

    return response.data;
};

export const generateReply = async (messageId, includeAttachments = true) => {
    const response = await api.post("/ai/reply/", {
        message_id: messageId,
        include_attachments: includeAttachments,
    });

    return response.data;
};

export const analyzeEmail = async (messageId, includeAttachments = true) => {
    const response = await api.post("/ai/analyze/", {
        message_id: messageId,
        include_attachments: includeAttachments,
    });

    return response.data;
};

export const extractTasks = async (messageId, includeAttachments = true) => {
    const response = await api.post("/ai/tasks/", {
        message_id: messageId,
        include_attachments: includeAttachments,
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