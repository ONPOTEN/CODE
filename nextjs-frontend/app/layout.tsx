import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import BottomNav from "@/components/BottomNav";
import Footer from "@/components/Footer";
import { AuthProvider } from "@/contexts/AuthContext";
import { SocketProvider } from "@/contexts/SocketContext";
import { CartProvider } from "@/contexts/CartContext";
import { EngagementProviderWrapper } from "@/components/EngagementProviderWrapper";

export const metadata: Metadata = {
  title: "Threads - Marketplace",
  description: "A modern marketplace for products and community engagement",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body className="font-sans antialiased bg-white text-gray-900">
        <AuthProvider>
          <SocketProvider>
            <CartProvider>
              <EngagementProviderWrapper>
                {/* Desktop Sidebar Navigation */}
                <Sidebar />

                {/* Mobile Header */}
                <Header />

                {/* Main Content - Add padding bottom for mobile bottom nav */}
                <main className="min-h-screen lg:pb-0 pb-20">
                  {children}
                </main>

                {/* Mobile Bottom Navigation */}
                <BottomNav />

                {/* Footer - Hidden on mobile */}
                <Footer />
              </EngagementProviderWrapper>
            </CartProvider>
          </SocketProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
