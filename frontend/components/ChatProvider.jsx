"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";

// Dynamically import ChatWidget to avoid SSR issues
const ChatWidget = dynamic(() => import("@/components/Chatbot/ChatWidget"), {
  ssr: false,
});

export default function ChatProvider() {
  const pathname = usePathname();

  // Only show chatbot on /ticket page
  if (pathname !== "/ticket") {
    return null;
  }

  return <ChatWidget />;
}
