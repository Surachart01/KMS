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
