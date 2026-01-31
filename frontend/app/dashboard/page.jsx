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
import { ChatWidget } from "@/components/Chatbot";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

import API_BASE_URL from "@/src/config/apiConfig";

const removeStars = (text) => {
  if (!text) return "";
  return text.replace(/\*\*/g, "");
};

export default function Dashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  // Redirect non-admin users
  useEffect(() => {
    if (!authLoading && user?.role !== "admin") {
      router.push("/ticket");
    }
  }, [user, authLoading, router]);

  const [analytics, setAnalytics] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredTickets, setFilteredTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [backendStatus, setBackendStatus] = useState("unknown");
  const [selectedTicket, setSelectedTicket] = useState(null);

  // Fetch analytics data
  const fetchAnalytics = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/stats`);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Failed to fetch analytics: ${response.status} - ${errorText}`,
        );
      }
      const data = await response.json();
      setAnalytics(data);
      setBackendStatus("connected");
    } catch (err) {
      setError(`Failed to load analytics data: ${err.message}`);
      setBackendStatus("disconnected");
      console.error("Analytics error:", err);
    }
  };

  // Fetch all tickets
  const fetchTickets = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/tickets`);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Failed to fetch tickets: ${response.status} - ${errorText}`,
        );
      }
      const data = await response.json();
      setTickets(data);
      setFilteredTickets(data);
    } catch (err) {
      setError(`Failed to load tickets: ${err.message}`);
      console.error("Tickets error:", err);
    }
  };

  // Refresh all data
  const refreshData = async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([fetchAnalytics(), fetchTickets()]);
      setLastRefresh(new Date());
    } catch (err) {
      console.error("Error refreshing data:", err);
    } finally {
      setLoading(false);
    }
  };

  // Search tickets
  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      setFilteredTickets(tickets);
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/search?query=${encodeURIComponent(searchTerm)}`,
      );
      if (!response.ok) throw new Error("Search failed");
      const data = await response.json();

      // Filter the search results to show only tickets that match
      const searchResults = tickets.filter((ticket) =>
        data.results.some(
          (result) =>
            result.content.includes(ticket.user_query) ||
            result.content.includes(ticket.ai_answer),
        ),
      );
      setFilteredTickets(searchResults);
    } catch (err) {
      console.error("Search error:", err);
      // Fallback to client-side search
      const clientSearch = tickets.filter(
        (ticket) =>
          ticket.user_query.toLowerCase().includes(searchTerm.toLowerCase()) ||
          ticket.ai_answer.toLowerCase().includes(searchTerm.toLowerCase()) ||
          ticket.user_feedback.toLowerCase().includes(searchTerm.toLowerCase()),
      );
      setFilteredTickets(clientSearch);
    }
  };

  // Filter tickets by status
  const filterByStatus = (status) => {
    setSelectedStatus(status);
    if (status === "all") {
      setFilteredTickets(tickets);
    } else {
      const filtered = tickets.filter((ticket) => ticket.status === status);
      setFilteredTickets(filtered);
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Export data to CSV
  const exportToCSV = () => {
    const headers = [
      "Ticket ID",
      "Status",
      "User Query",
      "AI Answer",
      "User Feedback",
      "Submitted",
      "Resolved",
      "Resolved By",
      "Comments Count",
    ];
    const csvData = filteredTickets.map((ticket) => [
      ticket.id,
      ticket.status,
      `"${ticket.user_query.replace(/"/g, '""')}"`,
      `"${ticket.ai_answer.replace(/"/g, '""')}"`,
      `"${ticket.user_feedback.replace(/"/g, '""')}"`,
      ticket.submitted_at,
      ticket.resolved_at || "",
      ticket.resolved_by || "",
      ticket.comments ? ticket.comments.length : 0,
    ]);

    const csvContent = [headers, ...csvData]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tickets-export-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case "pending":
        return "text-yellow-600 bg-yellow-100";
      case "resolved":
        return "text-green-600 bg-green-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  // Auto-refresh effect
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      refreshData();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [autoRefresh]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchAnalytics(), fetchTickets()]);
      setLoading(false);
    };
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-3xl mx-auto">
            <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-200 p-8">
              <div className="animate-pulse space-y-4">
                <div className="h-6 bg-gray-200 rounded w-1/3" />
                <div className="h-4 bg-gray-200 rounded w-1/2" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
                  <div className="h-24 bg-gray-100 rounded" />
                  <div className="h-24 bg-gray-100 rounded" />
                  <div className="h-24 bg-gray-100 rounded" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-4">
              Error Loading Dashboard
            </h1>
            <p className="text-gray-600">{error}</p>
            <Button onClick={() => window.location.reload()} className="mt-4">
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="bg-[#2953CD] text-white rounded-xl p-6 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold mb-2">Support Dashboard</h1>
                <p className="text-blue-100">
                  Historical data and analytics for all support tickets
                </p>
                <p className="text-sm text-blue-100/80 mt-1">
                  Last updated: {lastRefresh.toLocaleTimeString()}{" "}
                  {autoRefresh && (
                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full bg-white/15 text-white text-xs">
                      Auto-refresh enabled
                    </span>
                  )}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setAutoRefresh(!autoRefresh)}
                  className={`bg-white/10 border-white/30 text-white hover:bg-white/20 ${
                    autoRefresh ? "ring-1 ring-white/40" : ""
                  }`}
                >
                  {autoRefresh ? "Auto-refresh ON" : "Auto-refresh OFF"}
                </Button>
                <Button
                  variant="outline"
                  onClick={refreshData}
                  disabled={loading}
                  className="bg-white/10 border-white/30 text-white hover:bg-white/20"
                >
                  {loading ? "Refreshing..." : "Refresh"}
                </Button>
                <Button
                  onClick={exportToCSV}
                  className="bg-white text-blue-700 hover:bg-blue-50"
                >
                  Export CSV
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Summary Card */}
        {analytics && (
          <Card className="mb-8 shadow-sm ring-1 ring-gray-200">
            <CardHeader>
              <CardTitle>Ticket Summary</CardTitle>
              <CardDescription>
                Overview of all escalated tickets
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center bg-blue-50/60 rounded-lg p-4">
                  <div className="text-3xl font-bold text-blue-700">
                    {analytics.total_escalated_tickets}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Total Tickets
                  </p>
                </div>
                <div className="text-center bg-yellow-50/60 rounded-lg p-4">
                  <div className="text-3xl font-bold text-yellow-700">
                    {analytics.pending_tickets}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">Pending</p>
                </div>
                <div className="text-center bg-green-50/60 rounded-lg p-4">
                  <div className="text-3xl font-bold text-green-700">
                    {analytics.resolved_tickets}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">Resolved</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters and Search */}
        <Card className="mb-8 shadow-sm ring-1 ring-gray-200">
          <CardHeader>
            <CardTitle>Search & Filter Tickets</CardTitle>
            <CardDescription>
              Find specific tickets or filter by status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Search tickets by query, answer, or feedback..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                  className="shadow-sm"
                />
              </div>
              <Button
                onClick={handleSearch}
                className="bg-blue-600 hover:bg-blue-700 shadow-sm"
              >
                Search
              </Button>
              <div className="flex gap-2">
                <Button
                  variant={selectedStatus === "all" ? "default" : "outline"}
                  onClick={() => filterByStatus("all")}
                >
                  All ({tickets.length})
                </Button>
                <Button
                  variant={selectedStatus === "pending" ? "default" : "outline"}
                  onClick={() => filterByStatus("pending")}
                  className="text-yellow-600 hover:text-yellow-700"
                >
                  Pending (
                  {tickets.filter((t) => t.status === "pending").length})
                </Button>
                <Button
                  variant={
                    selectedStatus === "resolved" ? "default" : "outline"
                  }
                  onClick={() => filterByStatus("resolved")}
                  className="text-green-600 hover:text-green-700"
                >
                  Resolved (
                  {tickets.filter((t) => t.status === "resolved").length})
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tickets Table */}
        <Card className="shadow-sm ring-1 ring-gray-200">
          <CardHeader>
            <CardTitle>Historical Tickets ({filteredTickets.length})</CardTitle>
            <CardDescription>
              Click on any ticket to view full conversation and comments
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredTickets.length === 0 ? (
              <div className="text-center py-12 text-gray-600 bg-gray-50 border border-dashed border-gray-200 rounded-lg">
                <p className="font-medium mb-1">No tickets to display</p>
                <p className="text-sm">
                  {searchTerm
                    ? "Try adjusting your search terms."
                    : "Once tickets are available, they will show here."}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg ring-1 ring-gray-200 shadow-sm">
                <table className="w-full table-auto bg-white">
                  <thead>
                    <tr className="border-b bg-gray-50/80">
                      <th className="text-left py-3 px-4 font-medium text-sm text-gray-700">
                        Ticket ID
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-sm text-gray-700">
                        Status
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-sm text-gray-700">
                        Query Preview
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-sm text-gray-700">
                        Comments
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-sm text-gray-700">
                        Submitted
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-sm text-gray-700">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTickets.map((ticket, idx) => (
                      <tr
                        key={ticket.id}
                        className={`border-b hover:bg-gray-50 cursor-pointer ${
                          idx % 2 === 0 ? "bg-white" : "bg-gray-50/40"
                        }`}
                        onClick={() => setSelectedTicket(ticket)}
                      >
                        <td className="py-3 px-4 font-medium text-blue-600">
                          {ticket.id}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                              ticket.status,
                            )}`}
                          >
                            {ticket.status.charAt(0).toUpperCase() +
                              ticket.status.slice(1)}
                          </span>
                        </td>
                        <td className="py-3 px-4 max-w-md">
                          <p className="text-sm text-gray-700 truncate">
                            {removeStars(ticket.user_query)}
                          </p>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="text-sm text-gray-600">
                            {ticket.comments ? ticket.comments.length : 0}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {formatDate(ticket.submitted_at)}
                        </td>
                        <td className="py-3 px-4">
                          <Button
                            variant="outline"
                            size="sm"
                            className="shadow-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(`/tickets/${ticket.id}`, "_blank");
                            }}
                          >
                            View
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Ticket Detail Modal */}
        {selectedTicket && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl ring-1 ring-gray-200">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">
                      Ticket {selectedTicket.id}
                    </h2>
                    <div className="flex items-center gap-3 mt-2">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                          selectedTicket.status,
                        )}`}
                      >
                        {selectedTicket.status.charAt(0).toUpperCase() +
                          selectedTicket.status.slice(1)}
                      </span>
                      <span className="text-sm text-gray-500">
                        Submitted: {formatDate(selectedTicket.submitted_at)}
                      </span>
                      {selectedTicket.resolved_at && (
                        <span className="text-sm text-gray-500">
                          Resolved: {formatDate(selectedTicket.resolved_at)} by{" "}
                          {selectedTicket.resolved_by}
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setSelectedTicket(null)}
                    className="shadow-sm"
                  >
                    Close
                  </Button>
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium text-gray-700 mb-2">
                      User Query:
                    </h3>
                    <div className="bg-blue-50 p-4 rounded-lg ring-1 ring-blue-100">
                      <p className="text-sm">
                        {removeStars(selectedTicket.user_query)}
                      </p>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-medium text-gray-700 mb-2">
                      AI Answer:
                    </h3>
                    <div className="bg-gray-50 p-4 rounded-lg ring-1 ring-gray-200">
                      {removeStars(selectedTicket.ai_answer)
                        .split("\n")
                        .map((line, idx) => (
                          <p key={idx} className="text-sm mb-1">
                            {line}
                          </p>
                        ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-medium text-gray-700 mb-2">
                      User Feedback:
                    </h3>
                    <div className="bg-red-50 p-4 rounded-lg ring-1 ring-red-100">
                      <p className="text-sm">
                        {removeStars(selectedTicket.user_feedback)}
                      </p>
                    </div>
                  </div>

                  {selectedTicket.comments &&
                    selectedTicket.comments.length > 0 && (
                      <div>
                        <h3 className="font-medium text-gray-700 mb-2">
                          Comments ({selectedTicket.comments.length}):
                        </h3>
                        <div className="space-y-3">
                          {selectedTicket.comments.map((comment, idx) => (
                            <div
                              key={idx}
                              className="bg-white border p-4 rounded-lg shadow-sm"
                            >
                              <div className="flex justify-between items-center mb-2">
                                <span className="font-medium text-gray-700">
                                  {comment.author_name}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {formatDate(comment.timestamp)}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600">
                                {removeStars(comment.content)}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  {selectedTicket.admin_solution && (
                    <div>
                      <h3 className="font-medium text-gray-700 mb-2">
                        Admin Solution:
                      </h3>
                      <div className="bg-green-50 p-4 rounded-lg ring-1 ring-green-100">
                        <p className="text-sm">
                          {removeStars(selectedTicket.admin_solution)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      <ChatWidget />
    </div>
  );
}
