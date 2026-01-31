"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function EscalationModal({
  isOpen,
  onClose,
  onSubmit,
  aiAnswer,
  isLoading,
}) {
  const [feedback, setFeedback] = useState("");
  const [reason, setReason] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!feedback.trim()) {
      alert("Please provide feedback about why this answer wasn't helpful");
      return;
    }

    const escalationMessage = reason
      ? `${feedback}\n\nReason: ${reason}`
      : feedback;

    onSubmit(escalationMessage);
    setFeedback("");
    setReason("");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-t-lg">
          <CardTitle className="text-lg">Escalate to Support Team</CardTitle>
        </CardHeader>

        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* AI Answer Display */}
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
              <p className="text-xs font-semibold text-gray-600 mb-2">
                AI's Answer:
              </p>
              <p className="text-sm text-gray-700 line-clamp-3">{aiAnswer}</p>
            </div>

            {/* Reason Selection */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                What's the issue? (Select one)
              </label>
              <div className="space-y-2">
                {[
                  "Answer is not relevant",
                  "Answer is incomplete",
                  "Answer is confusing",
                  "Technical issue with backend",
                  "Other reason",
                ].map((option) => (
                  <label
                    key={option}
                    className="flex items-center space-x-3 cursor-pointer hover:bg-blue-50 p-2 rounded"
                  >
                    <input
                      type="radio"
                      name="reason"
                      value={option}
                      checked={reason === option}
                      onChange={(e) => setReason(e.target.value)}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm text-gray-700">{option}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Feedback Textarea */}
            <div>
              <label
                htmlFor="feedback"
                className="block text-sm font-semibold text-gray-700 mb-2"
              >
                Please describe the issue in detail:
              </label>
              <textarea
                id="feedback"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Explain what went wrong with the AI's response..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none text-sm"
                rows="4"
                disabled={isLoading}
              />
              <p className="text-xs text-gray-500 mt-1">
                {feedback.length}/200 characters
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3 justify-end pt-4 border-t">
              <Button
                type="button"
                onClick={onClose}
                variant="outline"
                disabled={isLoading}
                className="px-4"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading || !feedback.trim()}
                className="bg-orange-600 hover:bg-orange-700 text-white px-6"
              >
                {isLoading ? "Escalating..." : "Escalate Ticket"}
              </Button>
            </div>

            {/* Info */}
            <p className="text-xs text-gray-600 bg-blue-50 p-2 rounded">
              ℹ️ An admin will review your feedback and respond to your ticket
              shortly.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
