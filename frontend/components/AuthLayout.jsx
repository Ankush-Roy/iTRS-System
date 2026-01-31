"use client";

import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import Footer from "@/components/Footer";
import ChatProvider from "@/components/ChatProvider";

export default function AuthLayout({ children }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const pathname = usePathname();

  // Check if user role is "user" (no sidebar needed)
  const isUserRole = user?.role === "user";

  // Show loading spinner while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 border-4 border-[#2953CD] border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  // Login page - no navbar/sidebar
  if (pathname === "/login") {
    return <>{children}</>;
  }

  // Not authenticated - show nothing (will redirect to login)
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 border-4 border-[#2953CD] border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-600 font-medium">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  // Authenticated - show full layout
  return (
    <>
      {/* Fixed Navbar */}
      <Navbar />

      {/* Fixed Sidebar - only for admin */}
      {!isUserRole && <Sidebar />}

      {/* Scrollable main content area */}
      <div
        className={`${isUserRole ? "ml-0" : "ml-[250px]"} pt-[70px] min-h-screen flex flex-col`}
      >
        <main className="flex-1 p-6 bg-gray-50">{children}</main>
        <Footer />
      </div>

      <ChatProvider />
    </>
  );
}
