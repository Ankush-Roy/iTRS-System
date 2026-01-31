"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

const AuthContext = createContext(null);

// Hardcoded credentials
const CREDENTIALS = {
  user: { username: "user", password: "user123", role: "user" },
  admin: { username: "admin", password: "admin123", role: "admin" },
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  // Check for existing session on mount (uses sessionStorage - clears on browser close)
  useEffect(() => {
    const storedUser = sessionStorage.getItem("authUser");
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
      } catch (e) {
        sessionStorage.removeItem("authUser");
      }
    }
    setIsLoading(false);
  }, []);

  // Redirect based on auth state and role
  useEffect(() => {
    if (isLoading) return;

    const publicPaths = ["/login"];
    const isPublicPath = publicPaths.includes(pathname);

    if (!user && !isPublicPath) {
      router.push("/login");
      return;
    }

    if (user && isPublicPath) {
      // Redirect to appropriate page based on role
      if (user.role === "admin") {
        router.push("/dashboard");
      } else {
        router.push("/ticket");
      }
      return;
    }

    // Role-based route protection
    if (user) {
      const adminRoutes = ["/dashboard", "/admin", "/"];
      const userRoutes = ["/ticket", "/tickets"];

      if (user.role === "user") {
        // User can only access /ticket and /tickets/*
        const isUserRoute = userRoutes.some(
          (route) => pathname === route || pathname.startsWith("/tickets/"),
        );
        if (!isUserRoute && !isPublicPath) {
          router.push("/ticket");
        }
      }

      if (user.role === "admin") {
        // Admin can access dashboard and admin pages, but not user page
        const isAdminRoute =
          adminRoutes.includes(pathname) ||
          pathname === "/" ||
          pathname.startsWith("/tickets/");
        if (!isAdminRoute && pathname === "/ticket") {
          router.push("/dashboard");
        }
      }
    }
  }, [user, isLoading, pathname, router]);

  const login = (username, password) => {
    // Check against hardcoded credentials
    for (const key in CREDENTIALS) {
      const cred = CREDENTIALS[key];
      if (cred.username === username && cred.password === password) {
        const userData = { username: cred.username, role: cred.role };
        setUser(userData);
        sessionStorage.setItem("authUser", JSON.stringify(userData));
        return { success: true, role: cred.role };
      }
    }
    return { success: false, error: "Invalid username or password" };
  };

  const logout = () => {
    setUser(null);
    sessionStorage.removeItem("authUser");
    router.push("/login");
  };

  const value = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
