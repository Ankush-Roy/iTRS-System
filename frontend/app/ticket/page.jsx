"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import UserDashboard from "@/components/UserDashboard";

const page = () => {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  // Redirect admin users to dashboard
  useEffect(() => {
    if (!authLoading && user?.role === "admin") {
      router.push("/dashboard");
    }
  }, [user, authLoading, router]);

  // Don't render until we confirm user has access
  if (authLoading || user?.role === "admin") {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 border-4 border-[#2953CD] border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <UserDashboard />
    </div>
  );
};

export default page;
