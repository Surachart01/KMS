"use client";

import React, { useState, useEffect } from "react";
import { Layout, theme } from "antd";
import {
    HomeOutlined,
    BookOutlined,
    HistoryOutlined,
    SettingOutlined,
    CalendarOutlined,
} from "@ant-design/icons";
import { useRouter, usePathname } from "next/navigation";
import Cookies from "js-cookie";
import Sidebar from "@/components/Sidebar";
import AppHeader from "@/components/AppHeader";

const { Content } = Layout;

export default function StudentLayout({ children }) {
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
            key: "/student",
            icon: <HomeOutlined />,
            label: "หน้าหลัก",
        },
        {
            key: "/student/borrow",
            icon: <BookOutlined />,
            label: "เบิกกุญแจ",
        },
        {
            key: "/student/history",
            icon: <HistoryOutlined />,
            label: "ประวัติการเบิก-คืน",
        },
        {
            key: "/student/schedule",
            icon: <CalendarOutlined />,
            label: "ตารางสอน",
        },
        {
            key: "/student/settings",
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
                logo="🎓 SKMS"
                logoCollapsed="🎓"
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
                    title="ระบบเบิกคืนกุญแจสำหรับนักเรียน"
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
                    {children}
                </Content>
            </Layout>
        </Layout>
    );
}
