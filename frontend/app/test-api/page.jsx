"use client";
import { useState, useEffect } from "react";
import { apiService } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function TestApiPage() {
  const [healthStatus, setHealthStatus] = useState(null);
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const checkHealth = async () => {
    setIsLoading(true);
    setError("");
    try {
      const health = await apiService.healthCheck();
      setHealthStatus(health);
    } catch (err) {
      setError(
        "Failed to connect to backend. Make sure it's running on localhost:8000"
      );
      console.error("Health check failed:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const getStats = async () => {
    setIsLoading(true);
    setError("");
    try {
      const statsData = await apiService.getStats();
      setStats(statsData);
    } catch (err) {
      setError("Failed to get stats from backend");
      console.error("Stats failed:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const testSearch = async () => {
    setIsLoading(true);
    setError("");
    try {
      const results = await apiService.searchTickets("brake problem", 3, 1.0);
      console.log("Search results:", results);
      alert(
        `Search completed! Found ${
          results.relevant_tickets?.length || 0
        } relevant tickets. Check console for details.`
      );
    } catch (err) {
      setError("Failed to perform search");
      console.error("Search failed:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">API Connection Test</h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold mb-4">Health Check</h2>
            <Button
              onClick={checkHealth}
              disabled={isLoading}
              className="mb-4 bg-blue-600 hover:bg-blue-700"
            >
              {isLoading ? "Checking..." : "Check Backend Health"}
            </Button>
            {healthStatus && (
              <div className="bg-gray-50 p-3 rounded">
                <pre className="text-sm">
                  {JSON.stringify(healthStatus, null, 2)}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold mb-4">System Stats</h2>
            <Button
              onClick={getStats}
              disabled={isLoading}
              className="mb-4 bg-green-600 hover:bg-green-700"
            >
              {isLoading ? "Loading..." : "Get System Stats"}
            </Button>
            {stats && (
              <div className="bg-gray-50 p-3 rounded">
                <pre className="text-sm">{JSON.stringify(stats, null, 2)}</pre>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold mb-4">Test RAG Search</h2>
            <Button
              onClick={testSearch}
              disabled={isLoading}
              className="mb-4 bg-purple-600 hover:bg-purple-700"
            >
              {isLoading ? "Searching..." : 'Test Search: "brake problem"'}
            </Button>
            <p className="text-sm text-gray-600">
              This will perform a test search for "brake problem" and log
              results to the console.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 p-4 bg-blue-50 rounded">
        <h3 className="font-semibold mb-2">How to test:</h3>
        <ol className="list-decimal list-inside space-y-1 text-sm">
          <li>
            Make sure the backend is running (go to backend folder and run:{" "}
            <code className="bg-gray-200 px-1 rounded">
              python start_api.py
            </code>
            )
          </li>
          <li>Click "Check Backend Health" to verify connection</li>
          <li>Click "Get System Stats" to see RAG system information</li>
          <li>Click "Test Search" to test the RAG functionality</li>
          <li>
            Go to the{" "}
            <a href="/ticket" className="text-blue-600 underline">
              Create Ticket page
            </a>{" "}
            to test the full integration
          </li>
        </ol>
      </div>
    </div>
  );
}
