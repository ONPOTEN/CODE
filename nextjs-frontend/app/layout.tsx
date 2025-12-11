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

const DEFAULT_OG_IMAGE = `${process.env.NEXT_PUBLIC_API_URL || 'https://centimet2.com:8000/api/v1'}/share-image/0/image`;

export const metadata: Metadata = {
  title: "Centimet2 - Marketplace",
  description: "A modern marketplace for products and community engagement",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://centimet2.com'),
  openGraph: {
    type: 'website',
    locale: 'vi_VN',
    siteName: 'Centimet2',
    title: 'Centimet2 - Marketplace',
    description: 'A modern marketplace for products and community engagement',
    images: [
      {
        url: DEFAULT_OG_IMAGE,
        width: 1200,
        height: 630,
        alt: 'Centimet2 - Marketplace',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@centimet2',
    images: [DEFAULT_OG_IMAGE],
  },
  other: {
    'fb:app_id': process.env.NEXT_PUBLIC_FB_APP_ID || '',
  },
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
