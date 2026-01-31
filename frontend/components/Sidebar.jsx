"use client";

import { House, LayoutDashboard, Plus, Search, Shield } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";

export default function SideBar() {
  const pathname = usePathname();
  const { user } = useAuth();

  // Define all navigation buttons
  const allButtons = [
    {
      label: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
      roles: ["admin"],
    },
    { label: "User", href: "/ticket", icon: Plus, roles: ["user"] },
    { label: "User Queries", href: "/admin", icon: Shield, roles: ["admin"] },
  ];

  // Filter buttons based on user role
  const buttons = allButtons.filter(
    (button) => user && button.roles.includes(user.role),
  );

  const isActive = (href) => pathname === href;

  return (
    <div className="fixed top-[70px] left-0 w-[250px] h-[calc(100vh-70px)] bg-[#2D3C50] opacity-100 z-40 border-r border-gray-700 overscroll-none">
      {/* Header */}
      <div className="w-full flex items-center justify-center mt-4">
        <button
          href={"/"}
          className="flex items-center gap-2 bg-blue-900 hover:bg-blue-800 text-white font-semibold text-sm px-9 py-3 rounded-md shadow-md transition-all duration-200"
        >
          <House className="h-4 w-4 text-white" />
          <span>Ticket System</span>
        </button>
      </div>

      {/* Navigation Buttons */}
      <div className="relative w-full">
        {buttons.map(({ label, href, icon: Icon }, idx) => {
          const buttonTop = 30 + idx * 49;
          const lineTop = buttonTop + 48;

          return (
            <div key={label}>
              {/* Button */}
              <Link
                href={href}
                className={`absolute left-0 w-[250px] h-[48px] flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-all duration-200 ${
                  isActive(href) ? "bg-[#6C7785]" : "hover:bg-[#3d4d62]"
                }`}
                style={{ top: `${buttonTop}px` }}
              >
                <Icon className="h-4 w-4 flex-shrink-0 text-[#969EA8]" />
                <span className="text-[#969EA8]">{label}</span>
              </Link>

              {/* Divider Line */}
              {idx < buttons.length - 1 && (
                <div
                  className="absolute left-0 w-[250px] h-[1px] bg-[#607D8B] opacity-100"
                  style={{ top: `${lineTop}px` }}
                ></div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
