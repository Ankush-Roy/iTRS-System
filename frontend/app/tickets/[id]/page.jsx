"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { apiService } from "@/lib/api";

// Helper function to render markdown-style text
const renderFormattedText = (text) => {
  if (!text) return null;

  // Split by lines first
  const lines = text.split("\n");

  return lines.map((line, lineIndex) => {
    // Process each line for inline formatting
    const parts = [];
    let lastIndex = 0;

    // Match **bold** pattern
    const boldRegex = /\*\*(.+?)\*\*/g;
    let match;
    let partIndex = 0;

    while ((match = boldRegex.exec(line)) !== null) {
      // Add text before the match
      if (match.index > lastIndex) {
        parts.push(
          <span key={`${lineIndex}-${partIndex++}`}>
            {line.substring(lastIndex, match.index)}
          </span>
        );
      }
      // Add bold text
      parts.push(
        <strong
          key={`${lineIndex}-${partIndex++}`}
          className="font-bold text-gray-900"
        >
          {match[1]}
        </strong>
      );
      lastIndex = boldRegex.lastIndex;
    }

    // Add remaining text
    if (lastIndex < line.length) {
      parts.push(
        <span key={`${lineIndex}-${partIndex++}`}>
          {line.substring(lastIndex)}
        </span>
      );
    }

    // If no parts were added (no bold found), just use the line
    if (parts.length === 0) {
      parts.push(<span key={`${lineIndex}-0`}>{line}</span>);
    }

    return (
      <div key={lineIndex} className={lineIndex > 0 ? "mt-1" : ""}>
        {parts}
      </div>
    );
  });
};

export default function TicketDetailsPage() {
  const params = useParams();
  const ticketId = params.id;

  const [ticket, setTicket] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [newComment, setNewComment] = useState("");
  const [isCommenting, setIsCommenting] = useState(false);
  const [copySuccess, setCopySuccess] = useState("");

  useEffect(() => {
    if (ticketId) {
      loadTicketDetails();
    }
  }, [ticketId]);

  const loadTicketDetails = async () => {
    try {
      setIsLoading(true);
      const ticketData = await apiService.getTicketDetails(ticketId);
      setTicket(ticketData);
    } catch (err) {
      setError("Failed to load ticket details");
      console.error("Error loading ticket:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddComment = async (isResolution = false) => {
    if (!newComment.trim()) {
      setError("Please enter a comment");
      return;
    }

    try {
      setIsCommenting(true);
      setError("");

      await apiService.addCommentToTicket(
        ticketId,
        newComment,
        "user",
        "Customer",
        isResolution
      );

      // Reload ticket details to show new comment
      await loadTicketDetails();
      setNewComment("");
    } catch (err) {
      setError("Failed to add comment");
      console.error("Error adding comment:", err);
    } finally {
      setIsCommenting(false);
    }
  };

  // const handleCopyText = async (text, type = "text") => {
  //   try {
  //     await navigator.clipboard.writeText(text);
  //     setCopySuccess(`${type} copied!`);
  //     setTimeout(() => setCopySuccess(""), 2000);
  //   } catch (err) {
  //     console.error("Failed to copy:", err);
  //   }
  // };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  if (isLoading) {
    return (
      <div className="p-6 max-w-4xl mx-auto font-mazda">
        <div className="text-center py-12">
          <div className="text-lg">Loading ticket details...</div>
        </div>
      </div>
    );
  }

  if (error && !ticket) {
    return (
      <div className="p-6 max-w-4xl mx-auto font-mazda">
        <div className="text-center py-12">
          <div className="text-red-600 text-lg">{error}</div>
          <Button onClick={loadTicketDetails} className="mt-4">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto font-mazda">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Ticket Conversation</h1>
        <p className="text-gray-600">Ticket ID: {ticketId}</p>
      </div>

      {copySuccess && (
        <div className="fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50">
          ✅ {copySuccess}
        </div>
      )}

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="space-y-6">
        {/* Ticket Status */}
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Ticket Status</h2>
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  ticket.status === "pending"
                    ? "bg-yellow-100 text-yellow-800"
                    : "bg-green-100 text-green-800"
                }`}
              >
                {ticket.status.toUpperCase()}
              </span>
            </div>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <strong>Submitted:</strong>{" "}
                {formatTimestamp(ticket.submitted_at)}
              </div>
              {ticket.resolved_at && (
                <div>
                  <strong>Resolved:</strong>{" "}
                  {formatTimestamp(ticket.resolved_at)}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Original Issue */}
        <Card>
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold mb-4">Original Issue</h2>

            <div className="space-y-4">
              <div>
                <Label className="font-semibold">Your Query:</Label>
                <div className="mt-1 p-3 bg-gray-50 border border-gray-200 rounded text-sm">
                  {renderFormattedText(ticket.user_query)}
                </div>
              </div>

              <div>
                <Label className="font-semibold">AI Answer:</Label>
                <div className="mt-1 p-3 bg-blue-50 border border-blue-200 rounded text-sm whitespace-pre-wrap">
                  {renderFormattedText(ticket.ai_answer)}
                </div>
              </div>

              <div>
                <Label className="font-semibold">Your Feedback:</Label>
                <div className="mt-1 p-3 bg-red-50 border border-red-200 rounded text-sm">
                  {renderFormattedText(ticket.user_feedback)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Conversation */}
        <Card>
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold mb-4">Conversation</h2>

            {ticket.comments && ticket.comments.length > 0 ? (
              <div className="space-y-4">
                {ticket.comments.map((comment, index) => (
                  <div
                    key={comment.id}
                    className={`flex ${
                      comment.author === "user"
                        ? "justify-end"
                        : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-3xl w-full ${
                        comment.author === "user" ? "text-right" : "text-left"
                      }`}
                    >
                      <div
                        className={`inline-block p-4 rounded-lg ${
                          comment.author === "user"
                            ? "bg-blue-100 border border-blue-200"
                            : "bg-green-100 border border-green-200"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-semibold text-sm">
                            {comment.author_name}
                          </span>
                          {comment.type === "resolution" && (
                            <span className="bg-green-600 text-white px-2 py-1 rounded text-xs">
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
              <div className="text-gray-500 text-center py-8">
                No comments yet. Start the conversation below.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Add Comment */}
        {ticket.status === "pending" && (
          <Card>
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold mb-4">Add Comment</h2>

              <div className="space-y-4">
                <div>
                  <Label className="font-semibold">Your Message</Label>
                  <Textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Type your message or question here..."
                    rows={4}
                    className="mt-2 font-mazda"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {newComment.length} characters
                  </p>
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={() => handleAddComment(false)}
                    disabled={isCommenting || !newComment.trim()}
                    className="bg-blue-600 hover:bg-blue-700 font-mazda"
                  >
                    {isCommenting ? "Sending..." : "Send Comment"}
                  </Button>

                  <Button
                    onClick={() => handleAddComment(true)}
                    disabled={isCommenting || !newComment.trim()}
                    className="bg-green-600 hover:bg-green-700 font-mazda"
                  >
                    {isCommenting ? "Resolving..." : "Send & Mark Resolved"}
                  </Button>
                </div>

                <div className="bg-blue-50 p-3 rounded text-sm text-blue-800">
                  <strong>Tips:</strong>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>
                      <strong>Send Comment:</strong> Continue the conversation
                      with the admin
                    </li>
                    <li>
                      <strong>Send & Mark Resolved:</strong> Use this if your
                      issue has been resolved
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Resolved Status */}
        {ticket.status === "resolved" && (
          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-green-600 py-8">
                <h3 className="text-lg font-medium mb-2">Ticket Resolved</h3>
                <p className="text-sm text-gray-600">
                  This ticket was resolved on{" "}
                  {formatTimestamp(ticket.resolved_at)} by{" "}
                  {ticket.resolved_by === "admin" ? "Support Admin" : "User"}
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
