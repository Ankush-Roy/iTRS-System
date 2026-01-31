"use client";

import React, { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import ChatMessage from "./ChatMessage";
import { chatApi } from "@/lib/chatApi";
import "./chatbot.css";

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [messages, setMessages] = useState([
    {
      id: "welcome",
      text: "Hello! 👋 I'm your AI support assistant. I can help you with troubleshooting, maintenance tips, and technical questions. What can I help you with today?",
      isUser: false,
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [lastBotMessage, setLastBotMessage] = useState(null);
  const [connectionError, setConnectionError] = useState(false);
  const [escalationFlow, setEscalationFlow] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Check API health on mount
  useEffect(() => {
    chatApi
      .health()
      .then(() => {
        setConnectionError(false);
      })
      .catch(() => {
        setConnectionError(true);
      });
  }, []);

  // Initialize with a new conversation
  useEffect(() => {
    const newConvId = Date.now().toString();
    setCurrentConversationId(newConvId);
    setConversations([
      {
        id: newConvId,
        title: "New Conversation",
        timestamp: new Date(),
        messages: messages,
      },
    ]);
  }, []);

  const updateCurrentConversation = (updatedMessages) => {
    setConversations((prevConversations) =>
      prevConversations.map((conv) =>
        conv.id === currentConversationId
          ? {
              ...conv,
              messages: updatedMessages,
              title:
                updatedMessages.length > 1
                  ? updatedMessages[1].text.substring(0, 30) + "..."
                  : "New Conversation",
            }
          : conv,
      ),
    );
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();

    if (!inputValue.trim()) return;

    // If escalation is waiting for details
    if (escalationFlow?.stage === "waiting_details") {
      const feedbackText = inputValue;
      setInputValue("");

      const userMessage = {
        id: `user-${Date.now()}`,
        text: feedbackText,
        isUser: true,
        timestamp: new Date(),
      };
      const updatedMessages = [...messages, userMessage];
      setMessages(updatedMessages);
      updateCurrentConversation(updatedMessages);
      setIsLoading(true);

      try {
        const result = await chatApi.escalateTicket(
          escalationFlow.userQuery,
          escalationFlow.aiAnswer,
          feedbackText,
          escalationFlow.conversationHistory,
        );

        const successMessage = {
          id: `success-${Date.now()}`,
          text: `✅ Your ticket has been successfully submitted!\n\n**Ticket ID: ${result.ticket_id}**\n\nThank you for providing the details. An admin will review your issue shortly and get back to you with a solution.`,
          isUser: false,
          timestamp: new Date(),
        };

        const finalMessages = [...updatedMessages, successMessage];
        setMessages(finalMessages);
        updateCurrentConversation(finalMessages);
        setEscalationFlow(null);
        setLastBotMessage(null);
      } catch (error) {
        const errorMessage = {
          id: `error-${Date.now()}`,
          text: `Failed to submit your ticket: ${error.message}. Please try again.`,
          isUser: false,
          timestamp: new Date(),
        };
        const errorMessages = [...updatedMessages, errorMessage];
        setMessages(errorMessages);
        updateCurrentConversation(errorMessages);
        setEscalationFlow(null);
      } finally {
        setIsLoading(false);
      }

      return;
    }

    // Normal chat flow with conversation context (supports follow-up questions)
    const userMessage = {
      id: `user-${Date.now()}`,
      text: inputValue,
      isUser: true,
      timestamp: new Date(),
    };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    updateCurrentConversation(updatedMessages);
    setInputValue("");
    setIsLoading(true);

    try {
      // Build conversation history for context (enables follow-up questions)
      const conversationHistory = updatedMessages.map((msg) => ({
        role: msg.isUser ? "user" : "assistant",
        content: msg.text,
      }));

      const response = await chatApi.search(
        inputValue,
        conversationHistory,
        currentConversationId,
      );

      const botMessage = {
        id: `bot-${Date.now()}`,
        text: response.answer,
        isUser: false,
        timestamp: new Date(),
        messageId: `bot-${Date.now()}`,
      };

      const finalMessages = [...updatedMessages, botMessage];
      setMessages(finalMessages);
      updateCurrentConversation(finalMessages);
      setLastBotMessage(botMessage);
    } catch (error) {
      const errorMessage = {
        id: `error-${Date.now()}`,
        text: `Sorry, I encountered an error: ${error.message}. Please try again or escalate your issue.`,
        isUser: false,
        timestamp: new Date(),
      };
      const errorMessages = [...updatedMessages, errorMessage];
      setMessages(errorMessages);
      updateCurrentConversation(errorMessages);
      setConnectionError(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEscalate = async () => {
    if (!lastBotMessage) return;

    // Get the immediate previous user query (the one that triggered this bot response)
    const immediateUserQuery =
      messages.find(
        (m) =>
          m.isUser &&
          messages.indexOf(m) === messages.indexOf(lastBotMessage) - 1,
      )?.text || "Unknown query";

    // Get the first user question in the conversation (excluding welcome message)
    const firstUserQuestion = messages.find(
      (m) => m.isUser && m.id !== "welcome",
    )?.text;

    // Use only the first/original user question for user_query field
    const fullUserQuery = firstUserQuestion || "Unknown query";

    // Build complete conversation history (all Q&A pairs) for admin to see
    const conversationHistory = messages
      .filter(
        (m) =>
          m.id !== "welcome" &&
          !m.id.startsWith("ask-details-") &&
          !m.id.startsWith("success-") &&
          !m.id.startsWith("error-"),
      )
      .map((msg) => ({
        role: msg.isUser ? "user" : "assistant",
        content: msg.text,
      }));

    setEscalationFlow({
      stage: "waiting_details",
      userQuery: fullUserQuery,
      aiAnswer: lastBotMessage.text,
      conversationHistory: conversationHistory,
    });

    const askDetailsMessage = {
      id: `ask-details-${Date.now()}`,
      text: "I understand you'd like to escalate this to our admin team. To help us better understand your issue and resolve it quickly, could you please explain your problem in detail? Include any additional information that would be helpful.",
      isUser: false,
      timestamp: new Date(),
    };

    const updatedMessages = [...messages, askDetailsMessage];
    setMessages(updatedMessages);
    updateCurrentConversation(updatedMessages);
  };

  const startNewConversation = () => {
    const newConvId = Date.now().toString();
    const initialMessages = [
      {
        id: "welcome",
        text: "Hello! 👋 I'm your AI support assistant. I can help you with troubleshooting, maintenance tips, and technical questions. What can I help you with today?",
        isUser: false,
        timestamp: new Date(),
      },
    ];

    setConversations((prevConversations) => [
      ...prevConversations,
      {
        id: newConvId,
        title: "New Conversation",
        timestamp: new Date(),
        messages: initialMessages,
      },
    ]);

    setCurrentConversationId(newConvId);
    setMessages(initialMessages);
    setEscalationFlow(null);
    setLastBotMessage(null);
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <>
      {/* Floating Chat Button */}
      <button
        className="chat-widget-button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? "Close chat" : "Open chat"}
      >
        {isOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <MessageCircle className="h-6 w-6" />
        )}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="chat-widget-container">
          {/* Chat Header */}
          <div className="chat-widget-header">
            <div className="chat-widget-header-info">
              <div className="chat-widget-avatar">
                <MessageCircle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="chat-widget-title">AI Support Assistant</h3>
                <p className="chat-widget-status">
                  {connectionError ? (
                    <span className="text-red-300">Disconnected</span>
                  ) : (
                    <span className="text-green-300">Online</span>
                  )}
                </p>
              </div>
            </div>
            <div className="chat-widget-header-actions">
              <button
                onClick={startNewConversation}
                className="chat-widget-new-btn"
                title="New conversation"
              >
                New Chat
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="chat-widget-close-btn"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="chat-widget-messages">
            {messages.map((message, idx) => {
              const isBot = !message.isUser;
              const isLastBot =
                isBot && idx === messages.findLastIndex((m) => !m.isUser);

              return (
                <div key={message.id} className="chat-widget-message-wrapper">
                  <ChatMessage message={message.text} isUser={!isBot} />
                  {isBot &&
                    message.id !== "welcome" &&
                    !message.id.startsWith("ask-details-") &&
                    !message.id.startsWith("success-") &&
                    !message.id.startsWith("error-") && (
                      <div className="chat-widget-message-actions">
                        <button
                          className="chat-widget-escalate-btn"
                          onClick={() => {
                            setLastBotMessage(message);
                            handleEscalate();
                          }}
                        >
                          Not satisfied? Raise to admin →
                        </button>
                      </div>
                    )}
                  {!isBot && (
                    <div className="chat-widget-message-time">
                      {formatTime(message.timestamp)}
                    </div>
                  )}
                </div>
              );
            })}
            {isLoading && (
              <div className="chat-widget-loading">
                <div className="chat-widget-loading-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                <span className="chat-widget-loading-text">
                  Assistant is typing...
                </span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="chat-widget-footer">
            {escalationFlow?.stage === "waiting_details" && (
              <div className="chat-widget-escalation-notice">
                <AlertTriangle className="h-4 w-4" />
                <span>Please provide details about your issue</span>
              </div>
            )}
            <form onSubmit={handleSendMessage} className="chat-widget-form">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={
                  escalationFlow?.stage === "waiting_details"
                    ? "Describe your problem in detail..."
                    : "Ask me anything..."
                }
                disabled={isLoading || connectionError}
                className="chat-widget-input"
                autoFocus
              />
              <button
                type="submit"
                disabled={isLoading || !inputValue.trim() || connectionError}
                className="chat-widget-send-btn"
                title="Send message"
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
