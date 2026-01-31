const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

class ApiService {
  async searchTickets(query, topK = 5, threshold = 0.7) {
    const response = await fetch(`${API_BASE_URL}/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query,
        top_k: topK,
        similarity_threshold: threshold,
      }),
    });
    if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
    return response.json();
  }

  async healthCheck() {
    const response = await fetch(`${API_BASE_URL}/health`);
    if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
    return response.json();
  }

  async getAdminStats() {
    const response = await fetch(`${API_BASE_URL}/admin/stats`);
    if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
    return response.json();
  }

  async escalateTicket(userQuery, aiAnswer, userFeedback) {
    const response = await fetch(`${API_BASE_URL}/escalate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_query: userQuery,
        ai_answer: aiAnswer,
        user_feedback: userFeedback,
      }),
    });
    if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
    return response.json();
  }

  async getEscalatedTickets(status = null) {
    const url = status
      ? `${API_BASE_URL}/admin/tickets?status=${status}`
      : `${API_BASE_URL}/admin/tickets`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
    return response.json();
  }

  async resolveEscalatedTicket(ticketId, solution) {
    const response = await fetch(`${API_BASE_URL}/admin/resolve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticket_id: ticketId, solution }),
    });
    if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
    return response.json();
  }

  async addCommentToTicket(
    ticketId,
    content,
    author,
    authorName,
    isResolution = false,
  ) {
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
    if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
    return response.json();
  }

  async getTicketDetails(ticketId) {
    const response = await fetch(`${API_BASE_URL}/tickets/${ticketId}`);
    if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
    return response.json();
  }
}

export const apiService = new ApiService();
export default apiService;
