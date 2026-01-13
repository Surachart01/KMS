"use client";

import React, { useState, useEffect } from "react";
import { Layout, Menu, Avatar, Dropdown, Typography, Button } from "antd";
import {
    DashboardOutlined,
    BookOutlined,
    TeamOutlined,
    HomeOutlined,
    KeyOutlined,
    CalendarOutlined,
    UserOutlined,
    LogoutOutlined,
    MenuFoldOutlined,
    MenuUnfoldOutlined,
    ApartmentOutlined,
    HistoryOutlined,
} from "@ant-design/icons";
import { useRouter, usePathname } from "next/navigation";
import Cookies from "js-cookie";

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

export default function StaffLayout({ children }) {
    const [collapsed, setCollapsed] = useState(false);
    const [user, setUser] = useState(null);
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        // ดึงข้อมูล user จาก cookie
        const userCookie = Cookies.get("user");
        if (userCookie) {
            try {
                const userData = JSON.parse(userCookie);
                setUser(userData);

                // ตรวจสอบว่าเป็น staff หรือไม่
                if (userData.role !== "staff") {
                    router.push("/");
                }
            } catch (error) {
                console.error("Error parsing user data:", error);
                router.push("/login");
            }
        } else {
            router.push("/login");
        }
    }, [router]);

    const handleLogout = () => {
        Cookies.remove("token");
        Cookies.remove("user");
        router.push("/login");
    };

    const menuItems = [
        {
            key: "/staff/dashboard",
            icon: <DashboardOutlined />,
            label: "Dashboard",
        },
        {
            key: "master-data",
            icon: <ApartmentOutlined />,
            label: "ข้อมูลหลัก",
            children: [
                {
                    key: "/staff/majors",
                    icon: <BookOutlined />,
                    label: "สาขาวิชา",
                },
                {
                    key: "/staff/sections",
                    icon: <TeamOutlined />,
                    label: "กลุ่มเรียน",
                },
                {
                    key: "/staff/rooms",
                    icon: <HomeOutlined />,
                    label: "ห้องเรียน",
                },
                {
                    key: "/staff/subjects",
                    icon: <BookOutlined />,
                    label: "รายวิชา",
                },
            ],
        },
        {
            key: "/staff/schedules",
            icon: <CalendarOutlined />,
            label: "ตารางเรียน",
        },
        {
            key: "/staff/keys",
            icon: <KeyOutlined />,
            label: "จัดการกุญแจ",
        },
        {
            key: "users-management",
            icon: <UserOutlined />,
            label: "จัดการผู้ใช้งาน",
            children: [
                {
                    key: "/staff/users?role=student",
                    label: "นักศึกษา",
                },
                {
                    key: "/staff/users?role=teacher",
                    label: "อาจารย์",
                },
                {
                    key: "/staff/users?role=staff",
                    label: "เจ้าหน้าที่",
                },
            ]
        },
        {
            key: "/staff/transactions",
            icon: <HistoryOutlined />,
            label: "ประวัติการเบิกคืน",
        },
    ];

    const userMenuItems = [
        {
            key: "profile",
            icon: <UserOutlined />,
            label: "โปรไฟล์",
        },
        {
            type: "divider",
        },
        {
            key: "logout",
            icon: <LogoutOutlined />,
            label: "ออกจากระบบ",
            danger: true,
            onClick: handleLogout,
        },
    ];

    const handleMenuClick = ({ key }) => {
        if (key && key.startsWith("/")) {
            router.push(key);
        }
    };

    if (!user) {
        return null; // หรือแสดง loading
    }

    return (
        <Layout style={{ minHeight: "100vh" }}>
            <Sider
                trigger={null}
                collapsible
                collapsed={collapsed}
                style={{
                    overflow: 'auto',
                    height: '100vh',
                    position: 'fixed',
                    left: 0,
                    top: 0,
                    bottom: 0,
                }}
            >
                <div
                    style={{
                        height: 64,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "white",
                        fontSize: collapsed ? 18 : 20,
                        fontWeight: "bold",
                        borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
                    }}
                >
                    {collapsed ? "SKMS" : "SKMS - Staff"}
                </div>
                <Menu
                    theme="dark"
                    mode="inline"
                    selectedKeys={[pathname]}
                    items={menuItems}
                    onClick={handleMenuClick}
                />
            </Sider>
            <Layout style={{ marginLeft: collapsed ? 80 : 200, transition: 'all 0.2s' }}>
                <Header
                    style={{
                        padding: "0 24px",
                        background: "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        borderBottom: "1px solid #f0f0f0",
                    }}
                >
                    <Button
                        type="text"
                        icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                        onClick={() => setCollapsed(!collapsed)}
                        style={{
                            fontSize: "16px",
                            width: 64,
                            height: 64,
                        }}
                    />

                    <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
                        <div style={{ display: "flex", alignItems: "center", cursor: "pointer", height: 64, padding: "0 12px", borderRadius: 6 }} className="hover:bg-gray-50 transition-colors">
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", marginRight: 12, lineHeight: 1.3 }}>
                                <Text strong style={{ fontSize: 14 }}>{user.first_name} {user.last_name}</Text>
                                <Text type="secondary" style={{ fontSize: 11 }}>
                                    {user.role === "staff" ? "เจ้าหน้าที่" : user.role}
                                </Text>
                            </div>
                            <Avatar size={40} icon={<UserOutlined />} style={{ backgroundColor: '#fde3cf', color: '#f56a00' }} />
                        </div>
                    </Dropdown>
                </Header>
                <Content
                    style={{
                        margin: "24px",
                        padding: 24,
                        minHeight: 280,
                        background: "#fff",
                        borderRadius: 8,
                    }}
                >
                    {children}
                </Content>
            </Layout>
        </Layout>
    );
}
