import API_BASE_URL from "@/src/config/apiConfig";

export const chatApi = {
  health: async () => {
    const response = await fetch(`${API_BASE_URL}/health`);
    if (!response.ok)
      throw new Error(`Health check failed: ${response.statusText}`);
    return response.json();
  },

  search: async (query, conversationHistory = [], conversationId = null) => {
    const response = await fetch(`${API_BASE_URL}/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query,
        top_k: 5,
        similarity_threshold: 0.7,
        conversation_history: conversationHistory,
        conversation_id: conversationId,
      }),
    });
    if (!response.ok) throw new Error(`API error: ${response.statusText}`);
    return response.json();
  },

  escalateTicket: async (
    userQuery,
    aiAnswer,
    userFeedback,
    conversationHistory = [],
  ) => {
    const response = await fetch(`${API_BASE_URL}/escalate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_query: userQuery,
        ai_answer: aiAnswer,
        user_feedback: userFeedback,
        conversation_history: conversationHistory,
      }),
    });
    if (!response.ok)
      throw new Error(`Failed to escalate ticket: ${response.statusText}`);
    return response.json();
  },

  getEscalatedTickets: async (status = null) => {
    const url = new URL(`${API_BASE_URL}/admin/tickets`);
    if (status) url.searchParams.append("status", status);
    const response = await fetch(url.toString());
    if (!response.ok)
      throw new Error(`Failed to fetch tickets: ${response.statusText}`);
    return response.json();
  },

  resolveTicket: async (ticketId, solution) => {
    const response = await fetch(`${API_BASE_URL}/admin/resolve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticket_id: ticketId, solution }),
    });
    if (!response.ok)
      throw new Error(`Failed to resolve ticket: ${response.statusText}`);
    return response.json();
  },

  addComment: async (
    ticketId,
    content,
    author,
    authorName,
    isResolution = false,
  ) => {
    const response = await fetch(`${API_BASE_URL}/tickets/comment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ticket_id: ticketId,
        content,
        author,
        author_name: authorName,
        is_resolution: isResolution,
      }),
    });
    if (!response.ok)
      throw new Error(`Failed to add comment: ${response.statusText}`);
    return response.json();
  },

  getTicketDetails: async (ticketId) => {
    const response = await fetch(`${API_BASE_URL}/tickets/${ticketId}`);
    if (!response.ok)
      throw new Error(`Failed to fetch ticket: ${response.statusText}`);
    return response.json();
  },
};

export default chatApi;
