"use client";
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { apiService } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

// Helper function to render text and remove ** markdown formatting
const renderFormattedText = (text) => {
  if (!text) return null;
  // Remove ** markers and return clean text
  return text.replace(/\*\*/g, "");
};

export default function AdminPanel() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  // Redirect non-admin users
  useEffect(() => {
    if (!authLoading && user?.role !== "admin") {
      router.push("/ticket");
    }
  }, [user, authLoading, router]);

  const [escalatedTickets, setEscalatedTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [adminSolution, setAdminSolution] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("pending");
  const [stats, setStats] = useState(null);
  const [copySuccess, setCopySuccess] = useState("");
  const [newComment, setNewComment] = useState("");

  useEffect(() => {
    loadEscalatedTickets();
    loadStats();
  }, [statusFilter]);

  const loadEscalatedTickets = async () => {
    try {
      setIsLoading(true);
      const tickets = await apiService.getEscalatedTickets(statusFilter);
      setEscalatedTickets(tickets);
    } catch (err) {
      setError("Failed to load escalated tickets");
      console.error("Error loading tickets:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const adminStats = await apiService.getAdminStats();
      setStats(adminStats);
    } catch (err) {
      console.error("Error loading stats:", err);
    }
  };

  const handleResolveTicket = async () => {
    if (!selectedTicket || !adminSolution.trim()) {
      setError("Please provide a solution");
      return;
    }

    try {
      setIsLoading(true);
      await apiService.resolveEscalatedTicket(selectedTicket.id, adminSolution);

      // Refresh tickets and clear selection
      await loadEscalatedTickets();
      await loadStats();
      setSelectedTicket(null);
      setAdminSolution("");
      setError("");
    } catch (err) {
      setError("Failed to resolve ticket");
      console.error("Error resolving ticket:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddComment = async (isResolution = false) => {
    if (!selectedTicket || !newComment.trim()) {
      setError("Please provide a comment");
      return;
    }

    try {
      setIsLoading(true);
      setError("");

      await apiService.addCommentToTicket(
        selectedTicket.id,
        newComment,
        "admin",
        "Support Admin",
        isResolution,
      );

      // Refresh tickets and clear comment
      await loadEscalatedTickets();
      await loadStats();
      setNewComment("");

      // If it was a resolution, clear selection
      if (isResolution) {
        setSelectedTicket(null);
        setAdminSolution("");
      }
    } catch (err) {
      setError("Failed to add comment");
      console.error("Error adding comment:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyText = async (text, type = "text") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess(`${type} copied!`);
      setTimeout(() => setCopySuccess(""), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="p-6 max-w-7xl mx-auto font-mazda">
      <div className="bg-[#2953CD] text-white rounded-xl p-6 shadow-sm mb-6">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">
              Admin Panel - Escalated Tickets
            </h1>
            <p className="text-blue-100 text-sm mt-1">
              Manage conversations and resolve escalated tickets
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={loadEscalatedTickets}
              disabled={isLoading}
              variant="outline"
              className="bg-white/10 border-white/30 text-white hover:bg-white/20"
            >
              {isLoading ? "Refreshing..." : "Refresh"}
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-600">
                {stats.total_escalated_tickets}
              </div>
              <div className="text-sm text-gray-600">Total Escalated</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-yellow-600">
                {stats.pending_tickets}
              </div>
              <div className="text-sm text-gray-600">Pending</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">
                {stats.resolved_tickets}
              </div>
              <div className="text-sm text-gray-600">Resolved</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-purple-600">
                {stats.resolution_rate}%
              </div>
              <div className="text-sm text-gray-600">Resolution Rate</div>
            </CardContent>
          </Card>
        </div>
      )}

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {copySuccess && (
        <div className="fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50">
          ✅ {copySuccess}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Panel - Ticket List */}
        <div>
          <div className="flex gap-4 mb-4">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border rounded px-3 py-2 font-mazda shadow-sm"
            >
              <option value="pending">Pending</option>
              <option value="resolved">Resolved</option>
              <option value="">All</option>
            </select>
            <Button
              onClick={loadEscalatedTickets}
              disabled={isLoading}
              className="shadow-sm"
            >
              {isLoading ? "Loading..." : "Refresh"}
            </Button>
          </div>

          <Card className="shadow-sm ring-1 ring-gray-200">
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold mb-4">
                Escalated Tickets ({escalatedTickets.length})
              </h2>

              {escalatedTickets.length === 0 ? (
                <div className="text-gray-600 text-center py-12 bg-gray-50 border border-dashed border-gray-200 rounded-lg">
                  <p className="font-medium mb-1">No tickets found</p>
                  <p className="text-sm">
                    Try switching filters or refresh to check for new items.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {escalatedTickets.map((ticket) => (
                    <div
                      key={ticket.id}
                      onClick={() => {
                        setSelectedTicket(ticket);
                        setAdminSolution(ticket.admin_solution || "");
                        setError("");
                      }}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors shadow-sm ${
                        selectedTicket?.id === ticket.id
                          ? "border-blue-500 bg-blue-50/70"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-medium text-blue-600 text-sm">
                          {ticket.id}
                        </span>
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            ticket.status === "pending"
                              ? "bg-yellow-100 text-yellow-800"
                              : ticket.status === "resolved"
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {ticket.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 mb-2">
                        <strong>Query:</strong>{" "}
                        {renderFormattedText(
                          ticket.user_query.length > 80
                            ? ticket.user_query.substring(0, 80) + "..."
                            : ticket.user_query,
                        )}
                      </p>
                      <p className="text-sm text-gray-600 mb-2">
                        <strong>Feedback:</strong>{" "}
                        {renderFormattedText(
                          ticket.user_feedback.length > 60
                            ? ticket.user_feedback.substring(0, 60) + "..."
                            : ticket.user_feedback,
                        )}
                      </p>
                      <p className="text-xs text-gray-500">
                        Submitted:{" "}
                        {new Date(ticket.submitted_at).toLocaleString()}
                        {ticket.resolved_at && (
                          <span className="ml-2 text-green-600">
                            | Resolved:{" "}
                            {new Date(ticket.resolved_at).toLocaleString()}
                          </span>
                        )}
                      </p>
                      <div className="mt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(`/tickets/${ticket.id}`, "_blank");
                          }}
                          className="h-6 px-2 text-xs font-mazda shadow-sm"
                        >
                          View Conversation
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Panel - Ticket Details & Resolution */}
        <div>
          {selectedTicket ? (
            <div className="space-y-6">
              {/* Ticket Details */}
              <Card className="shadow-sm ring-1 ring-gray-200">
                <CardContent className="p-6">
                  <h2 className="text-xl font-semibold mb-4">
                    Ticket Details: {selectedTicket.id}
                  </h2>

                  <div className="space-y-4">
                    <div>
                      <Label className="font-semibold">Status:</Label>
                      <span
                        className={`ml-2 px-2 py-1 rounded text-xs ${
                          selectedTicket.status === "pending"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-green-100 text-green-800"
                        }`}
                      >
                        {selectedTicket.status.toUpperCase()}
                      </span>
                    </div>

                    <div>
                      <Label className="font-semibold">
                        Original Question:
                      </Label>
                      <div className="mt-1 p-3 bg-gray-50 rounded text-sm font-medium">
                        {/* Show only the first user question from conversation history, or fallback to user_query */}
                        {selectedTicket.conversation_history &&
                        selectedTicket.conversation_history.length > 0
                          ? renderFormattedText(
                              selectedTicket.conversation_history.find(
                                (msg) => msg.role === "user",
                              )?.content || selectedTicket.user_query,
                            )
                          : renderFormattedText(selectedTicket.user_query)}
                      </div>
                    </div>

                    {/* Full Conversation History - All Q&A pairs with scroller */}
                    {selectedTicket.conversation_history &&
                      selectedTicket.conversation_history.length > 0 && (
                        <div>
                          <Label className="font-semibold text-purple-700">
                            Chatbot Conversation (
                            {selectedTicket.conversation_history.length}{" "}
                            messages):
                          </Label>
                          <div className="mt-2 max-h-80 overflow-y-auto p-3 bg-gray-50 rounded border border-gray-200 space-y-2">
                            {selectedTicket.conversation_history.map(
                              (msg, index) => (
                                <div
                                  key={index}
                                  className={`p-3 rounded-lg ${
                                    msg.role === "user"
                                      ? "bg-blue-100 border-l-4 border-blue-500 ml-0 mr-8"
                                      : "bg-green-100 border-l-4 border-green-500 ml-8 mr-0"
                                  }`}
                                >
                                  <div
                                    className={`text-xs font-bold mb-1 ${
                                      msg.role === "user"
                                        ? "text-blue-700"
                                        : "text-green-700"
                                    }`}
                                  >
                                    {msg.role === "user"
                                      ? "👤 User Question"
                                      : "AI Answer"}
                                  </div>
                                  <div
                                    className={`text-sm whitespace-pre-wrap ${
                                      msg.role === "user"
                                        ? "font-semibold text-blue-900"
                                        : "text-gray-700"
                                    }`}
                                  >
                                    {renderFormattedText(msg.content)}
                                  </div>
                                </div>
                              ),
                            )}
                          </div>
                        </div>
                      )}

                    <div>
                      <Label className="font-semibold">Escalated Query:</Label>
                      <div className="mt-1 p-3 bg-red-50 rounded text-sm">
                        {renderFormattedText(selectedTicket.user_feedback)}
                      </div>
                    </div>

                    {selectedTicket.admin_solution && (
                      <div>
                        <Label className="font-semibold">
                          Previous Admin Solution:
                        </Label>
                        <div className="mt-1 relative">
                          <div className="p-3 bg-green-50 border border-green-200 rounded text-sm whitespace-pre-wrap ring-1 ring-green-100">
                            {renderFormattedText(selectedTicket.admin_solution)}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Conversation */}
              <Card className="shadow-sm ring-1 ring-gray-200">
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Conversation</h3>

                  {selectedTicket.comments &&
                  selectedTicket.comments.length > 0 ? (
                    <div className="space-y-4 max-h-96 overflow-y-auto">
                      {selectedTicket.comments.map((comment, index) => (
                        <div
                          key={comment.id}
                          className={`flex ${
                            comment.author === "admin"
                              ? "justify-end"
                              : "justify-start"
                          }`}
                        >
                          <div
                            className={`max-w-2xl w-full ${
                              comment.author === "admin"
                                ? "text-right"
                                : "text-left"
                            }`}
                          >
                            <div
                              className={`inline-block p-3 rounded-lg shadow-sm ${
                                comment.author === "admin"
                                  ? "bg-green-50 ring-1 ring-green-100"
                                  : "bg-blue-50 ring-1 ring-blue-100"
                              }`}
                            >
                              <div className="flex items-center gap-2 mb-2">
                                <span className="font-semibold text-sm">
                                  {comment.author_name}
                                </span>
                                {comment.type === "resolution" && (
                                  <span className="bg-green-600/90 text-white px-2 py-0.5 rounded text-xs">
                                    Resolution
                                  </span>
                                )}
                              </div>

                              <div className="relative">
                                <div className="whitespace-pre-wrap text-sm">
                                  {renderFormattedText(comment.content)}
                                </div>
                              </div>

                              <div className="text-xs text-gray-500 mt-2">
                                {formatTimestamp(comment.timestamp)}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-gray-600 text-center py-12 bg-gray-50 border border-dashed border-gray-200 rounded-lg">
                      <p className="font-medium mb-1">No conversation yet</p>
                      <p className="text-sm">
                        Add a comment below to start communicating with the
                        customer.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Add Comment */}
              {selectedTicket.status === "pending" && (
                <Card className="shadow-sm ring-1 ring-gray-200">
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Add Comment</h3>

                    <div className="space-y-4">
                      <div>
                        <Label className="font-semibold">Your Message</Label>
                        <Textarea
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          placeholder="Type your message or solution here..."
                          rows={6}
                          className="mt-2 font-mazda shadow-sm"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          {newComment.length} characters
                        </p>
                      </div>

                      <div className="flex gap-3">
                        <Button
                          onClick={() => handleAddComment(false)}
                          disabled={isLoading || !newComment.trim()}
                          className="bg-blue-600 hover:bg-blue-700 font-mazda shadow-sm"
                        >
                          {isLoading ? "Sending..." : "Send Comment"}
                        </Button>

                        <Button
                          onClick={() => handleAddComment(true)}
                          disabled={isLoading || !newComment.trim()}
                          className="bg-green-600 hover:bg-green-700 font-mazda shadow-sm"
                        >
                          {isLoading ? "Resolving..." : "Send & Resolve Ticket"}
                        </Button>

                        <Button
                          variant="outline"
                          onClick={() => {
                            setSelectedTicket(null);
                            setAdminSolution("");
                            setNewComment("");
                            setError("");
                          }}
                          className="font-mazda shadow-sm"
                        >
                          Cancel
                        </Button>
                      </div>

                      <div className="bg-blue-50 p-3 rounded text-sm text-blue-800 ring-1 ring-blue-100">
                        <strong>Admin Actions:</strong>
                        <ul className="list-disc list-inside mt-2 space-y-1">
                          <li>
                            <strong>Send Comment:</strong> Continue the
                            conversation with the customer
                          </li>
                          <li>
                            <strong>Send & Resolve:</strong> Provide final
                            solution and close the ticket
                          </li>
                          <li>
                            You can copy the AI answer above as a starting point
                          </li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {selectedTicket.status === "resolved" && (
                <Card className="shadow-sm ring-1 ring-gray-200">
                  <CardContent className="p-6 text-center">
                    <div className="text-green-600 py-8">
                      <h3 className="text-lg font-medium mb-2">
                        Ticket Resolved
                      </h3>
                      <p className="text-sm text-gray-600">
                        This ticket was resolved on{" "}
                        {new Date(selectedTicket.resolved_at).toLocaleString()}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <Card>
              <CardContent className="p-6 text-center">
                <div className="text-gray-500 py-12">
                  <h3 className="text-lg font-medium mb-2">Select a Ticket</h3>
                  <p>
                    Choose a ticket from the left panel to view details and
                    provide resolution.
                  </p>
                  {stats && stats.pending_tickets > 0 && (
                    <p className="text-yellow-600 mt-4">
                      ⚠️ {stats.pending_tickets} ticket
                      {stats.pending_tickets > 1 ? "s" : ""} awaiting your
                      attention
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
