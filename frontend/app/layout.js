import "./globals.css";

import { AuthProvider } from "@/context/AuthContext";
import AuthLayout from "@/components/AuthLayout";

export const metadata = {
  title: "Mazda ITRS - Intelligent Ticket Resolution System",
  description: "AI-powered ticket resolution system with RAG capabilities",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full">
      <head>
        <link
          rel="preload"
          href="/fonts/MazdaType-Regular.otf"
          as="font"
          type="font/otf"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="/fonts/MazdaType-Medium.otf"
          as="font"
          type="font/otf"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="/fonts/MazdaType-Bold.otf"
          as="font"
          type="font/otf"
          crossOrigin="anonymous"
        />
      </head>
      <body className="m-0 p-0 font-mazda bg-gray-100 h-full overscroll-none">
        <AuthProvider>
          <AuthLayout>{children}</AuthLayout>
        </AuthProvider>
      </body>
    </html>
  );
}
