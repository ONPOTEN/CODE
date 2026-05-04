import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import BottomNav from "@/components/BottomNav";
import Footer from "@/components/Footer";
import NotificationToast from "@/contexts/components/NotificationToast";
import { AuthProvider } from "@/contexts/AuthContext";
import { SocketProvider } from "@/contexts/SocketContext";
import { CartProvider } from "@/contexts/CartContext";
import { SidebarProvider } from "@/contexts/SidebarContext";
import { EngagementProviderWrapper } from "@/components/EngagementProviderWrapper";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { VideoUploadProvider } from "@/contexts/VideoUploadContext";
import { NextAuthSessionProvider } from "@/components/NextAuthSessionProvider";

const DEFAULT_OG_IMAGE = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://centimet2.com'}/api/og-image/0`;

export const metadata: Metadata = {
  title: "Centimet2 - Sàn thương mại",
  description: "Sàn thương mại hiện đại cho sản phẩm và tương tác cộng đồng",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://centimet2.com'),
  openGraph: {
    type: 'website',
    locale: 'vi_VN',
    siteName: 'Centimet2',
    title: 'Centimet2 - Sàn thương mại',
    description: 'Sàn thương mại hiện đại cho sản phẩm và tương tác cộng đồng',
    images: [
      {
        url: DEFAULT_OG_IMAGE,
        width: 1200,
        height: 630,
        alt: 'Centimet2 - Sàn thương mại',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@centimet2',
    images: [DEFAULT_OG_IMAGE],
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
        <NextAuthSessionProvider>
          <AuthProvider>
            <SocketProvider>
              <VideoUploadProvider>
                <NotificationProvider>
                  <CartProvider>
                    <SidebarProvider>
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

                        {/* Toast Notifications */}
                        <NotificationToast />
                      </EngagementProviderWrapper>
                    </SidebarProvider>
                  </CartProvider>
                </NotificationProvider>
              </VideoUploadProvider>
            </SocketProvider>
          </AuthProvider>
        </NextAuthSessionProvider>
      </body>
    </html>
  );
}
