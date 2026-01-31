"use client";

import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { apiService } from "@/lib/api";

import API_BASE_URL from "@/config/apiConfig";

const renderFormattedText = (text) => {
  if (!text) return null;
  return text.replace(/\*\*/g, "");
};

export default function UserDashboard() {
  // Ticket Creation States
  const [contactType, setContactType] = useState("Transfer Support");
  const [transferType, setTransferType] = useState("2-WAY");
  const [description, setDescription] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [aiAnswer, setAiAnswer] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showEscalationDialog, setShowEscalationDialog] = useState(false);
  const [escalationFeedback, setEscalationFeedback] = useState("");
  const [escalationStatus, setEscalationStatus] = useState(null);

  // Ticket Management States
  const [userTickets, setUserTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [newComment, setNewComment] = useState("");
  const [isCommenting, setIsCommenting] = useState(false);
  const [activeTab, setActiveTab] = useState("create"); // "create" or "manage"

  // Load user tickets on component mount
  useEffect(() => {
    loadUserTickets();
  }, []);

  const loadUserTickets = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/tickets`);
      if (response.ok) {
        const tickets = await response.json();
        setUserTickets(tickets || []);
      }
    } catch (err) {
      console.error("Error loading tickets:", err);
    }
  };

  const handleGenerateSuggestions = async () => {
    if (!description.trim()) {
      setError("Please enter a description to generate suggestions");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await apiService.searchTickets(description, 5, 1.0);
      const aiAnswer = response.answer || "";

      setSuggestions(response.relevant_tickets || []);
      setAiAnswer(aiAnswer);

      // Categorize AI response
      const isShortGuidance =
        aiAnswer.includes("Your query is too short or generic") ||
        aiAnswer.includes("Please provide more details") ||
        aiAnswer.toLowerCase().includes("appropriate query");

      const isErrorLike =
        !aiAnswer ||
        aiAnswer.trim() === "" ||
        aiAnswer.includes("I could not find a specific resolution") ||
        aiAnswer.includes("I apologize, but I encountered an error") ||
        aiAnswer.includes("error while generating") ||
        aiAnswer.includes("Please try again");

      if (isErrorLike) {
        // For genuine errors or no answer, ask for escalation
        setAiAnswer("");
        setShowEscalationDialog(true);
        setError(
          "AI couldn't generate a reliable answer. Please submit the ticket to admin.",
        );
      } else if (isShortGuidance) {
        // Show AI's guidance message instead of escalation
        // Keep aiAnswer visible and do not open the dialog
        setError("");
      }
    } catch (err) {
      setError(
        "Failed to generate suggestions. Please ensure the backend is running.",
      );
      console.error("Error generating suggestions:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEscalateTicket = async () => {
    if (!escalationFeedback.trim()) {
      setError(
        "Please provide feedback about why the AI solution was unsatisfactory",
      );
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await apiService.escalateTicket(
        description,
        aiAnswer,
        escalationFeedback,
      );

      setEscalationStatus({
        type: "success",
        ticketId: response.ticket_id,
        message: response.message,
      });

      setShowEscalationDialog(false);
      setEscalationFeedback("");

      // Refresh tickets list
      await loadUserTickets();

      // Clear form
      setDescription("");
      setAiAnswer("");
      setSuggestions([]);
    } catch (err) {
      setError("Failed to escalate ticket. Please try again.");
      console.error("Escalation failed:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddComment = async (ticketId, isResolution = false) => {
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
        isResolution,
      );

      await loadUserTickets();

      setNewComment("");

      if (isResolution) {
        setSelectedTicket(null);
      } else {
        setTimeout(async () => {
          try {
            const response = await fetch(`${API_BASE_URL}/admin/tickets`);
            if (response.ok) {
              const updatedTickets = await response.json();
              const updatedTicket = updatedTickets.find(
                (t) => t.id === ticketId,
              );
              if (updatedTicket) {
                setSelectedTicket(updatedTicket);
                setUserTickets(updatedTickets);
              }
            }
          } catch (err) {
            console.error("Error refreshing ticket:", err);
          }
        }, 500);
      }
    } catch (err) {
      setError("Failed to add comment");
      console.error("Error adding comment:", err);
    } finally {
      setIsCommenting(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "resolved":
        return "bg-green-100 text-green-800 border-green-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  return (
    <div className="flex flex-col p-6 gap-6 w-full">
      {/* Header with Tabs */}
      <div className="flex justify-between items-center">
        <div className="flex gap-4">
          <Button
            variant={activeTab === "create" ? "default" : "outline"}
            onClick={() => setActiveTab("create")}
            className="font-semibold"
          >
            Create New Ticket
          </Button>
          <Button
            variant={activeTab === "manage" ? "default" : "outline"}
            onClick={() => setActiveTab("manage")}
            className="font-semibold"
          >
            My Tickets ({userTickets.length})
          </Button>
        </div>
      </div>

      {/* Create Ticket Tab */}
      {activeTab === "create" && (
        <div>
          <Card className="border-none p-4 space-y-6">
            <CardContent className="space-y-6">
              <div>
                <div>
                  <Label>Description</Label>
                  <Textarea
                    className="mt-2"
                    rows={4}
                    placeholder="Enter description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                  <div className="flex justify-between items-center mt-2">
                    <div className="text-xs text-gray-400">
                      {2555 - description.length} Characters Left
                    </div>
                    <Button
                      className="bg-black text-white hover:bg-gray-800 disabled:opacity-50"
                      onClick={handleGenerateSuggestions}
                      disabled={isLoading || !description.trim()}
                    >
                      {isLoading ? "Generating..." : "Generate with"}
                      <img className="h-3" src="/iAI1.png" />
                    </Button>
                  </div>
                  {error && (
                    <div className="text-red-500 text-sm mt-2">{error}</div>
                  )}
                </div>
                {/* AI SUGGESTIONS */}
                <p>iAI SUGGESTIONS</p>
                {/* AI Generated Answer */}
                {aiAnswer && (
                  <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200 mb-4 shadow-lg">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className="bg-black rounded-full p-2 shadow-md">
                          <img className="h-5 w-6" src="/iAI.png" alt="AI" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
                            <span className="text-lg"></span>
                            Possible Solutions:
                          </h3>
                          <div className="bg-white border-2 border-blue-200 rounded-xl p-6 text-gray-700 leading-relaxed shadow-inner">
                            <div className="prose prose-blue max-w-none">
                              {aiAnswer.split("\n").map((line, index) => {
                                // Convert **text** to bold formatting
                                const formattedLine = line.replace(
                                  /\*\*(.*?)\*\*/g,
                                  "<strong>$1</strong>",
                                );
                                return (
                                  <p
                                    key={index}
                                    className="mb-4 last:mb-0 text-base font-medium text-gray-800 leading-7 tracking-wide"
                                    dangerouslySetInnerHTML={{
                                      __html: formattedLine,
                                    }}
                                  />
                                );
                              })}
                            </div>
                          </div>
                          <div className="mt-5 pt-4 border-t border-blue-200">
                            <div className="flex items-center justify-end gap-3">
                              <p className="text-sm text-blue-700 font-medium">
                                💡 Need more help?
                              </p>
                              <Button
                                onClick={() => setShowEscalationDialog(true)}
                                variant="outline"
                                className="text-white bg-black hover:bg-white hover:border-black transition-colors duration-200 font-medium hover:cursor-pointer"
                                size="sm"
                              >
                                Raise Ticket to Admin
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
                {/* Historical Tickets */}
                {suggestions.length > 0 && (
                  <div className="mb-4">
                    <h4 className="font-medium text-gray-700 mb-2">
                      Related Historical Tickets ({suggestions.length} found)
                    </h4>
                  </div>
                )}
                <Card>
                  <div className="space-y-2">
                    {!aiAnswer && suggestions.length === 0 && !isLoading && (
                      <div className="p-4 text-gray-500 text-center">
                        No suggestions available. Enter a description and click
                        "Generate" to get AI-powered suggestions.
                      </div>
                    )}
                    {isLoading && (
                      <div className="p-4 text-center">
                        <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
                        <p className="mt-2 text-gray-600">
                          Generating suggestions...
                        </p>
                      </div>
                    )}
                    {aiAnswer && suggestions.length === 0 && !isLoading && (
                      <div className="p-4 text-gray-600 text-center">
                        <p className="font-medium">AI Solution Generated</p>
                        <p className="text-sm">
                          No directly related historical tickets found, but AI
                          has provided a solution above.
                        </p>
                      </div>
                    )}
                    {suggestions.length > 0 && (
                      <Accordion type="single" collapsible>
                        {suggestions.map((suggestion, index) => (
                          <AccordionItem
                            key={suggestion.ticket_id}
                            value={`item-${index}`}
                          >
                            <AccordionTrigger className="text-left">
                              <div className="flex flex-col items-start">
                                <span className="font-medium">
                                  {suggestion.problem.substring(0, 100)}
                                  {suggestion.problem.length > 100 ? "..." : ""}
                                </span>
                                <span className="text-sm text-gray-500">
                                  Ticket ID: {suggestion.ticket_id} | Category:{" "}
                                  {suggestion.category}
                                </span>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent>
                              <div className="space-y-4">
                                <div>
                                  <strong className="text-gray-900">
                                    Problem:
                                  </strong>
                                  <div className="mt-1 p-3 bg-gray-50 border border-gray-200 rounded text-sm font-mono">
                                    {suggestion.problem}
                                  </div>
                                </div>
                                <div>
                                  <strong className="text-gray-900">
                                    Resolution:
                                  </strong>
                                  <div className="mt-1 p-3 bg-blue-50 border border-blue-200 rounded text-sm font-mono whitespace-pre-wrap">
                                    {suggestion.resolution}
                                  </div>
                                </div>
                                <div className="flex justify-between items-center text-xs text-gray-500 pt-2 border-t">
                                  <span>
                                    Ticket ID: {suggestion.ticket_id} |
                                    Category: {suggestion.category}
                                  </span>
                                  <span className="font-medium">
                                    Relevance:{" "}
                                    {(2 - suggestion.distance).toFixed(2)}
                                    /2.0
                                  </span>
                                </div>
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    )}
                  </div>
                </Card>
              </div>
            </CardContent>
          </Card>

          {escalationStatus && escalationStatus.type === "success" && (
            <Card className="bg-green-50 border-green-200 mt-6">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="text-green-600 text-2xl">✅</div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-green-900">
                      Ticket Created Successfully
                    </h3>
                    <p className="text-green-700 mt-1">
                      {escalationStatus.message}
                    </p>
                    <div className="mt-3 p-3 bg-white border border-green-300 rounded-lg">
                      <div>
                        <strong className="text-green-800">Ticket ID:</strong>
                        <span className="ml-2 font-mono text-green-900">
                          {escalationStatus.ticketId}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Escalation Dialog */}
          {showEscalationDialog && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                <h3 className="text-lg font-semibold mb-4">Submit Ticket</h3>
                <p className="text-gray-600 mb-4">
                  Please describe your problem,This will help our admin provide
                  a better solution.
                </p>

                <div className="mb-4">
                  <Label htmlFor="feedback">Your query</Label>
                  <Textarea
                    id="feedback"
                    value={escalationFeedback}
                    onChange={(e) => setEscalationFeedback(e.target.value)}
                    placeholder="e.g., The solution doesn't apply to my specific vehicle model, or I need more detailed steps..."
                    rows={4}
                    className="mt-2"
                  />
                </div>

                <div className="flex gap-3 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowEscalationDialog(false);
                      setEscalationFeedback("");
                    }}
                    disabled={isLoading}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleEscalateTicket}
                    disabled={isLoading || !escalationFeedback.trim()}
                    className="bg-black hover:bg-gray-400"
                  >
                    {isLoading ? "Submitting..." : "Submit Ticket"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Manage Tickets Tab */}
      {activeTab === "manage" && (
        <div>
          <Card>
            <CardHeader>
              <CardTitle>My Tickets ({userTickets.length})</CardTitle>
              <CardDescription>
                View and comment on your submitted tickets
              </CardDescription>
            </CardHeader>
            <CardContent>
              {userTickets.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No tickets found. Create your first ticket using the "Create
                  New Ticket" tab.
                </div>
              ) : (
                <div className="space-y-4">
                  {userTickets.map((ticket) => (
                    <div
                      key={ticket.id}
                      className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
                      onClick={() =>
                        setSelectedTicket(
                          selectedTicket?.id === ticket.id ? null : ticket,
                        )
                      }
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-3">
                          <h3 className="font-semibold text-lg">{ticket.id}</h3>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                              ticket.status,
                            )}`}
                          >
                            {ticket.status.charAt(0).toUpperCase() +
                              ticket.status.slice(1)}
                          </span>
                        </div>
                        <span className="text-sm text-gray-500">
                          {formatDate(ticket.submitted_at)}
                        </span>
                      </div>

                      <p className="text-sm text-gray-700 mb-2">
                        {renderFormattedText(
                          ticket.user_query.substring(0, 150),
                        )}
                        {ticket.user_query.length > 150 ? "..." : ""}
                      </p>

                      <div className="text-xs text-gray-500">
                        Comments: {ticket.comment_count || 0}
                      </div>

                      {/* Expanded Ticket Details */}
                      {selectedTicket?.id === ticket.id && (
                        <div className="mt-4 pt-4 border-t">
                          <div className="space-y-4">
                            <div>
                              <h4 className="font-medium text-gray-700 mb-2">
                                Full Query:
                              </h4>
                              <p className="text-sm bg-blue-50 p-3 rounded">
                                {renderFormattedText(ticket.user_query)}
                              </p>
                            </div>

                            {ticket.user_feedback && (
                              <div>
                                <h4 className="font-medium text-gray-700 mb-2">
                                  Your Feedback:
                                </h4>
                                <p className="text-sm bg-gray-50 p-3 rounded">
                                  {renderFormattedText(ticket.user_feedback)}
                                </p>
                              </div>
                            )}

                            {ticket.admin_solution && (
                              <div>
                                <h4 className="font-medium text-gray-700 mb-2">
                                  Admin Solution:
                                </h4>
                                <p className="text-sm bg-green-50 p-3 rounded">
                                  {renderFormattedText(ticket.admin_solution)}
                                </p>
                              </div>
                            )}

                            {/* Comments Section */}
                            <div>
                              <h4 className="font-medium text-gray-700 mb-2">
                                Comments:{" "}
                                {ticket.comments
                                  ? `(${ticket.comments.length})`
                                  : "(0)"}
                              </h4>
                              {ticket.comments && ticket.comments.length > 0 ? (
                                <div className="space-y-3">
                                  {ticket.comments.map((comment, idx) => (
                                    <div
                                      key={idx}
                                      className={`p-3 rounded-lg ${
                                        comment.author === "admin"
                                          ? "bg-blue-50 border-l-4 border-blue-400"
                                          : "bg-yellow-50 border-l-4 border-yellow-400"
                                      }`}
                                    >
                                      <div className="flex justify-between items-center mb-2">
                                        <span className="font-medium text-sm">
                                          {comment.author === "admin"
                                            ? "🛠️ Admin"
                                            : "👤 You"}
                                        </span>
                                        <span className="text-xs text-gray-500">
                                          {formatDate(comment.timestamp)}
                                        </span>
                                      </div>
                                      <p className="text-sm">
                                        {renderFormattedText(comment.content)}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-sm text-gray-500">
                                  No comments yet
                                </p>
                              )}
                            </div>

                            {/* Add Comment Section */}
                            {(ticket.status === "pending" ||
                              ticket.status === "resolved") && (
                              <div
                                className="mt-4 p-4 bg-gray-50 rounded-lg"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <h4 className="font-medium text-gray-700 mb-2">
                                  Add Comment:
                                </h4>
                                <Textarea
                                  value={newComment}
                                  onChange={(e) =>
                                    setNewComment(e.target.value)
                                  }
                                  placeholder="Type your message or question here..."
                                  rows={3}
                                  className="mb-3"
                                  onClick={(e) => e.stopPropagation()}
                                />
                                <div className="flex gap-2">
                                  <Button
                                    onClick={() =>
                                      handleAddComment(ticket.id, false)
                                    }
                                    disabled={
                                      isCommenting || !newComment.trim()
                                    }
                                    size="sm"
                                  >
                                    {isCommenting
                                      ? "Sending..."
                                      : "Send Comment"}
                                  </Button>
                                  <Button
                                    onClick={() =>
                                      handleAddComment(ticket.id, true)
                                    }
                                    disabled={
                                      isCommenting || !newComment.trim()
                                    }
                                    variant="outline"
                                    size="sm"
                                    className="text-green-600 border-green-300 hover:bg-green-50"
                                  >
                                    {isCommenting
                                      ? "Resolving..."
                                      : "Mark as Resolved"}
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
