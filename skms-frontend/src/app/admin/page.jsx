"use client";

import React, { useState, useEffect } from "react";
import { Layout, Typography, theme } from "antd";
import {
  HomeOutlined,
  UserOutlined,
  KeyOutlined,
  HistoryOutlined,
  SettingOutlined,
  DashboardOutlined,
} from "@ant-design/icons";
import { useRouter, usePathname } from "next/navigation";
import Cookies from "js-cookie";
import Sidebar from "@/components/Sidebar";
import AppHeader from "@/components/AppHeader";

const { Content } = Layout;
const { Title, Text } = Typography;

export default function Home() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [user, setUser] = useState(null);
  const router = useRouter();
  const pathname = usePathname();

  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Check authentication
  useEffect(() => {
    const token = Cookies.get("token");
    const userData = Cookies.get("user");

    if (!token) {
      router.push("/login");
    } else if (userData) {
      setUser(JSON.parse(userData));
    }
  }, [router]);

  const handleLogout = () => {
    Cookies.remove("token");
    Cookies.remove("user");
    router.push("/login");
  };

  const menuItems = [
    {
      key: "/admin",
      icon: <HomeOutlined />,
      label: "หน้าหลัก",
    },
    {
      key: "/admin/dashboard",
      icon: <DashboardOutlined />,
      label: "แดชบอร์ด",
    },
    {
      key: "/admin/users",
      icon: <UserOutlined />,
      label: "จัดการผู้ใช้",
    },
    {
      key: "/admin/keys",
      icon: <KeyOutlined />,
      label: "จัดการกุญแจ",
    },
    {
      key: "/admin/history",
      icon: <HistoryOutlined />,
      label: "ประวัติการเบิก-คืน",
    },
    {
      key: "/admin/settings",
      icon: <SettingOutlined />,
      label: "ตั้งค่า",
    },
  ];

  const handleMenuClick = ({ key }) => {
    if (key !== pathname) {
      router.push(key);
    }
    if (isMobile) {
      setMobileDrawerOpen(false);
    }
  };

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sidebar
        collapsed={collapsed}
        isMobile={isMobile}
        mobileDrawerOpen={mobileDrawerOpen}
        setMobileDrawerOpen={setMobileDrawerOpen}
        menuItems={menuItems}
        pathname={pathname}
        handleMenuClick={handleMenuClick}
      />

      <Layout
        style={{
          marginLeft: isMobile ? 0 : collapsed ? 80 : 200,
          transition: "margin-left 0.2s",
        }}
      >
        <AppHeader
          collapsed={collapsed}
          setCollapsed={setCollapsed}
          isMobile={isMobile}
          setMobileDrawerOpen={setMobileDrawerOpen}
          user={user}
          handleLogout={handleLogout}
          colorBgContainer={colorBgContainer}
        />

        <Content
          style={{
            margin: "24px 16px",
            padding: 24,
            minHeight: 280,
            background: colorBgContainer,
            borderRadius: borderRadiusLG,
          }}
        >
          {/* Dashboard Content */}
          <div>
            <Title level={2}>ยินดีต้อนรับสู่ระบบ SKMS</Title>
            <Text>
              ระบบเบิกคืนกุญแจอัตโนมัติ (Smart Key Management System)
            </Text>

            <div
              style={{
                marginTop: 32,
                display: "grid",
                gridTemplateColumns: isMobile
                  ? "1fr"
                  : "repeat(auto-fit, minmax(250px, 1fr))",
                gap: 16,
              }}
            >
              {/* Stats Cards */}
              <div
                style={{
                  padding: 24,
                  background: "#f0fdf4",
                  borderRadius: 8,
                  border: "1px solid #86efac",
                }}
              >
                <Title level={4} style={{ margin: 0, color: "#16a34a" }}>
                  กุญแจทั้งหมด
                </Title>
                <Title level={2} style={{ margin: "8px 0 0 0" }}>
                  24
                </Title>
              </div>

              <div
                style={{
                  padding: 24,
                  background: "#eff6ff",
                  borderRadius: 8,
                  border: "1px solid #93c5fd",
                }}
              >
                <Title level={4} style={{ margin: 0, color: "#2563eb" }}>
                  กุญแจที่ถูกเบิก
                </Title>
                <Title level={2} style={{ margin: "8px 0 0 0" }}>
                  8
                </Title>
              </div>

              <div
                style={{
                  padding: 24,
                  background: "#fef3c7",
                  borderRadius: 8,
                  border: "1px solid #fcd34d",
                }}
              >
                <Title level={4} style={{ margin: 0, color: "#d97706" }}>
                  ผู้ใช้งานทั้งหมด
                </Title>
                <Title level={2} style={{ margin: "8px 0 0 0" }}>
                  156
                </Title>
              </div>

              <div
                style={{
                  padding: 24,
                  background: "#fce7f3",
                  borderRadius: 8,
                  border: "1px solid #f9a8d4",
                }}
              >
                <Title level={4} style={{ margin: 0, color: "#db2777" }}>
                  รายการวันนี้
                </Title>
                <Title level={2} style={{ margin: "8px 0 0 0" }}>
                  12
                </Title>
              </div>
            </div>
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}