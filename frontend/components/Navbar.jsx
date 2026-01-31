"use client";

import { ChevronDown, LogOut, User } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <>
      <nav className="fixed top-0 left-0 w-full h-[70px] bg-[#2953CD] opacity-100 text-white flex items-center justify-between px-8 shadow-md z-50">
        {/* Logo Box */}
        <div className="absolute top-0 left-5 w-[208px] h-[56px] bg-white rounded-b-[10px] shadow-[3px_3px_6px_#00000033] flex items-center justify-center">
          <Link href="/">
            <img
              src="/iAI.png"
              alt="Mazda Logo"
              className="h-8 w-auto cursor-pointer"
            />
          </Link>
        </div>

        {/* Title */}
        <div className="flex items-center ml-[240px]">
          <Link href="/">
            <span className="text-2xl font-bold font-mazda cursor-pointer hover:text-gray-300">
              Intelligent Ticket Resolution System
            </span>
          </Link>
        </div>

        {/* User Section with Logout */}
        {user && (
          <div className="flex items-center gap-4">
            {/* User Info */}
            <div className="flex items-center gap-2 bg-white/10 px-3 py-2 rounded-lg">
              <User className="h-4 w-4" />
              <span className="text-sm font-medium capitalize">
                {user.username}
              </span>
              <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full capitalize">
                {user.role}
              </span>
            </div>

            {/* Logout Button */}
            <button
              onClick={logout}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg transition-colors duration-200"
            >
              <LogOut className="h-4 w-4" />
              <span className="text-sm font-medium">Logout</span>
            </button>
          </div>
        )}
      </nav>
    </>
  );
}
