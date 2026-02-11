import { IBM_Plex_Sans_Thai } from "next/font/google";
import "./globals.css";
import { ConfigProvider } from "antd";
import StyledComponentsRegistry from "../lib/AntdRegistry";

const ibmPlexSansThai = IBM_Plex_Sans_Thai({
  variable: "--font-ibm-plex-sans-thai",
  subsets: ["latin", "thai"],
  weight: ["100", "200", "300", "400", "500", "600", "700"],
});


export const metadata = {
  title: "SKMS - Student Knowledge Management System",
  description: "Student Knowledge Management System",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        {/* PWA Meta Tags */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#4f46e5" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="SKMS" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/icon-512.png" />
      </head>
      <body
        className={`${ibmPlexSansThai.variable}  antialiased`}
      >
        <StyledComponentsRegistry>
          <ConfigProvider
            theme={{
              token: {
                fontFamily: ibmPlexSansThai.style.fontFamily,
                colorPrimary: "#16a34a",
                colorSuccess: "#10B981",
                colorWarning: "#F59E0B",
                colorError: "#EF4444",
                colorInfo: "#3B82F6",
                borderRadius: 10,
                wireframe: false,
                fontSize: 14,
              },
              components: {
                Button: {
                  fontWeight: 500,
                  controlHeight: 40,
                  defaultShadow: "0 2px 0 rgba(0, 0, 0, 0.02)",
                  primaryShadow: "0 4px 14px 0 rgba(22, 163, 74, 0.35)",
                  paddingContentHorizontal: 20,
                },
                Card: {
                  headerFontSize: 16,
                  headerFontWeight: 600,
                  paddingLG: 24,
                  boxShadowTertiary: "0 1px 3px rgba(0,0,0,.08), 0 1px 2px rgba(0,0,0,.04)",
                },
                Table: {
                  headerBg: "#F0FDF4",
                  headerColor: "#166534",
                  headerSplitColor: "transparent",
                  rowHoverBg: "#F0FDF4",
                  borderColor: "#E5E7EB",
                },
                Input: {
                  controlHeight: 40,
                  activeShadow: "0 0 0 2px rgba(22, 163, 74, 0.15)",
                  hoverBorderColor: "#22c55e",
                },
                Select: {
                  controlHeight: 40,
                },
                Typography: {
                  colorTextHeading: "#111827",
                  fontWeightStrong: 600,
                },
                Layout: {
                  bodyBg: "#F1F5F9",
                  headerBg: "#FFFFFF",
                  siderBg: "#0f3524",
                },
                Menu: {
                  darkItemBg: "#0f3524",
                  darkSubMenuItemBg: "#0a2618",
                  darkItemSelectedBg: "#16a34a",
                  itemHeight: 44,
                  itemMarginInline: 8,
                  itemBorderRadius: 8,
                },
              },
            }}
          >
            {children}
          </ConfigProvider>
        </StyledComponentsRegistry>

        {/* Service Worker Registration */}
        <script dangerouslySetInnerHTML={{
          __html: `
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', function() {
                navigator.serviceWorker.register('/sw.js').then(
                  function(registration) {
                    console.log('ServiceWorker registration successful');
                  },
                  function(err) {
                    console.log('ServiceWorker registration failed: ', err);
                  }
                );
              });
            }
          `
        }} />
      </body>
    </html>
  );
}
