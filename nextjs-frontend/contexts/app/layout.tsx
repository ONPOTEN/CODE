import type { Metadata } from "next";
import "../globals.css";
import FBNavbar from "@/components/FBNavbar";
import FBLeftSidebar from "@/components/FBLeftSidebar";
import FBRightSidebar from "@/components/FBRightSidebar";
import { AuthProvider } from "@/contexts/AuthContext";
import { SocketProvider } from "@/contexts/SocketContext";
import { EngagementProviderWrapper } from "@/components/EngagementProviderWrapper";
import NotificationToast from "@/contexts/components/NotificationToast";

export const metadata: Metadata = {
  title: "Centimet2 - Thương mại xã hội",
  description: "Nền tảng mạng xã hội và thương mại điện tử",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body className="font-sans antialiased" style={{ backgroundColor: '#f0f2f5', color: '#050505' }}>
        <AuthProvider>
          <SocketProvider>
            <EngagementProviderWrapper>
              <FBNavbar />
              <div className="pt-14">
                <div className="flex justify-center max-w-[1920px] mx-auto">
                  {/* Thanh bên trái */}
                  <FBLeftSidebar />

                  {/* Nội dung chính */}
                  <main className="flex-1 w-full max-w-[680px] px-4 py-4 lg:px-0 lg:py-4">
                    {children}
                  </main>

                  {/* Thanh bên phải */}
                  <FBRightSidebar />
                </div>
              </div>

              {/* Khoảng cách menu dưới di động */}
              <div className="lg:hidden h-14" />

              {/* Thông báo dạng toast */}
              <NotificationToast />
            </EngagementProviderWrapper>
          </SocketProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
