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
      </body>
    </html>
  );
}
