"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function HomePage() {
  const router = useRouter();
  const { user, isLoading, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      router.push("/login");
      return;
    }

    // Redirect based on role
    if (user?.role === "admin") {
      router.push("/dashboard");
    } else if (user?.role === "user") {
      router.push("/ticket");
    }
  }, [user, isLoading, isAuthenticated, router]);

  // Show loading while redirecting
  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 border-4 border-[#2953CD] border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-600 font-medium">Redirecting...</p>
      </div>
    </div>
  );
}
