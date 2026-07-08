import api from "../api/interceptors";

export const getInbox = async (folder = "inbox") => {
    const response = await api.get("/emails/", {
        params: { folder },
    });
    return response.data;
};

export const getEmail = async (messageId) => {
    const response = await api.get(`/emails/${messageId}/`);
    return response.data;
};

export const searchEmails = async (query) => {
    const response = await api.post("/emails/search/", {
        query,
    });

    return response.data;
};

export const sendEmail = async (payload) => {
    const response = await api.post("/emails/send/", payload);
    return response.data;
};

export const replyEmail = async (payload) => {
    const response = await api.post("/emails/reply/", payload);
    return response.data;
};

export const starEmail = async (messageId) => {
    const response = await api.post("/emails/star/", {
        message_id: messageId,
    });

    return response.data;
};

export const unstarEmail = async (messageId) => {
    const response = await api.post("/emails/unstar/", {
        message_id: messageId,
    });

    return response.data;
};

export const deleteEmail = async (messageId) => {
    const response = await api.post("/emails/delete/", {
        message_id: messageId,
    });

    return response.data;
};

export const getTrash = async () => {
    const response = await api.get("/emails/trash/");
    return response.data;
};

export const restoreEmail = async (messageId) => {
    const response = await api.post("/emails/restore/", {
        message_id: messageId,
    });

    return response.data;
};

export const permanentlyDeleteEmail = async (messageId) => {
    const response = await api.post("/emails/permanent-delete/", {
        message_id: messageId,
    });

    return response.data;
};

export const emptyTrash = async () => {
    const response = await api.post("/emails/trash/empty/");
    return response.data;
};