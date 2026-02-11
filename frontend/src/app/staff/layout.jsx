"use client";

import React, { useState, useEffect } from "react";
import { Layout, Menu, Avatar, Dropdown, Typography, Button, Space, theme, Badge } from "antd";
import {
    DashboardOutlined,
    BookOutlined,
    TeamOutlined,
    KeyOutlined,
    CalendarOutlined,
    UserOutlined,
    LogoutOutlined,
    MenuFoldOutlined,
    MenuUnfoldOutlined,
    ApartmentOutlined,
    HistoryOutlined,
    SafetyCertificateOutlined,
    ExclamationCircleOutlined,
    BellOutlined,
    SettingOutlined,
} from "@ant-design/icons";
import { useRouter, usePathname } from "next/navigation";
import Cookies from "js-cookie";
import Link from "next/link";

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

export default function StaffLayout({ children }) {
    const [collapsed, setCollapsed] = useState(false);
    const [user, setUser] = useState(null);
    const router = useRouter();
    const pathname = usePathname();
    const {
        token: { colorBgContainer, borderRadiusLG, colorPrimary },
    } = theme.useToken();

    useEffect(() => {
        const userCookie = Cookies.get("user");
        if (userCookie) {
            try {
                const userData = JSON.parse(userCookie);
                setUser(userData);
            } catch (error) {
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
            type: "divider",
        },
        {
            key: "master-data",
            icon: <ApartmentOutlined />,
            label: "ข้อมูลหลัก",
            children: [
                { key: "/staff/majors", icon: <BookOutlined />, label: "สาขาวิชา" },
                { key: "/staff/sections", icon: <TeamOutlined />, label: "กลุ่มเรียน" },
                { key: "/staff/subjects", icon: <BookOutlined />, label: "รายวิชา" },
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
            key: "/staff/room-swap",
            icon: <SafetyCertificateOutlined />,
            label: "อนุญาตเบิกกุญแจ",
        },
        {
            key: "users-management",
            icon: <UserOutlined />,
            label: "จัดการผู้ใช้งาน",
            children: [
                { key: "/staff/users?role=STUDENT", label: "นักศึกษา" },
                { key: "/staff/users?role=TEACHER", label: "อาจารย์" },
                { key: "/staff/users?role=STAFF", label: "เจ้าหน้าที่" },
            ],
        },
        {
            type: "divider",
        },
        {
            key: "/staff/bookings",
            icon: <HistoryOutlined />,
            label: "ประวัติการเบิก-คืน",
        },
        {
            key: "/staff/penalty",
            icon: <ExclamationCircleOutlined />,
            label: "จัดการ Penalty",
        },
    ];

    const userMenuItems = [
        {
            key: "/staff/profile",
            icon: <UserOutlined />,
            label: "โปรไฟล์",
            onClick: () => router.push("/staff/profile"),
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

    if (!user) return null;

    return (
        <Layout style={{ minHeight: "100vh" }}>
            <Sider
                trigger={null}
                collapsible
                collapsed={collapsed}
                width={260}
                style={{
                    overflow: "auto",
                    height: "100vh",
                    position: "fixed",
                    left: 0,
                    top: 0,
                    bottom: 0,
                    background: "linear-gradient(180deg, #064e2b 0%, #0a3622 40%, #071f15 100%)",
                    boxShadow: "4px 0 20px rgba(0, 0, 0, 0.15)",
                    zIndex: 100,
                    borderRight: "none",
                }}
            >
                {/* Logo Area */}
                <div
                    style={{
                        height: 80,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "20px 16px",
                        borderBottom: "1px solid rgba(255,255,255,0.08)",
                    }}
                >
                    <div
                        style={{
                            background: "linear-gradient(135deg, rgba(22,163,74,0.3) 0%, rgba(16,185,129,0.15) 100%)",
                            borderRadius: 12,
                            padding: collapsed ? "10px" : "10px 20px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 10,
                            width: collapsed ? "48px" : "100%",
                            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                            border: "1px solid rgba(16,185,129,0.2)",
                            boxShadow: "0 0 20px rgba(16,185,129,0.1)",
                        }}
                    >
                        <div style={{
                            width: 32,
                            height: 32,
                            borderRadius: 8,
                            background: "linear-gradient(135deg, #16a34a 0%, #10b981 100%)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            boxShadow: "0 4px 12px rgba(16,163,74,0.4)",
                            flexShrink: 0,
                        }}>
                            <KeyOutlined style={{ fontSize: 16, color: "#fff" }} />
                        </div>
                        {!collapsed && (
                            <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.2 }}>
                                <Text strong style={{ color: "#fff", fontSize: 16, letterSpacing: 1.5, fontWeight: 700 }}>
                                    KMS
                                </Text>
                                <Text style={{ color: "rgba(255,255,255,0.5)", fontSize: 10, letterSpacing: 0.5 }}>
                                    Key Management
                                </Text>
                            </div>
                        )}
                    </div>
                </div>

                {/* Menu Label */}
                {!collapsed && (
                    <div style={{ padding: "16px 24px 8px", opacity: 0.4 }}>
                        <Text style={{ color: "#fff", fontSize: 10, letterSpacing: 2, textTransform: "uppercase", fontWeight: 600 }}>
                            เมนูหลัก
                        </Text>
                    </div>
                )}

                <Menu
                    theme="dark"
                    mode="inline"
                    defaultOpenKeys={["master-data", "users-management"]}
                    selectedKeys={[pathname]}
                    items={menuItems}
                    onClick={handleMenuClick}
                    style={{
                        borderRight: 0,
                        padding: "0 12px",
                        background: "transparent",
                        fontSize: 14,
                    }}
                />

                {/* Bottom User Info */}
                {!collapsed && (
                    <div
                        style={{
                            position: "absolute",
                            bottom: 0,
                            left: 0,
                            right: 0,
                            padding: "16px",
                            borderTop: "1px solid rgba(255,255,255,0.06)",
                            background: "rgba(0,0,0,0.15)",
                        }}
                    >
                        <div style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            padding: "8px 12px",
                            borderRadius: 10,
                            background: "rgba(255,255,255,0.05)",
                        }}>
                            <Avatar
                                size={36}
                                style={{
                                    background: "linear-gradient(135deg, #16a34a 0%, #10b981 100%)",
                                    boxShadow: "0 2px 8px rgba(16,163,74,0.3)",
                                    flexShrink: 0,
                                }}
                            >
                                {user.firstName?.[0] || "U"}
                            </Avatar>
                            <div style={{ flex: 1, overflow: "hidden" }}>
                                <Text style={{ color: "#fff", fontSize: 13, fontWeight: 600, display: "block" }} ellipsis>
                                    {user.firstName} {user.lastName}
                                </Text>
                                <Text style={{ color: "rgba(255,255,255,0.45)", fontSize: 11, display: "block" }}>
                                    {user.role === "STAFF" ? "เจ้าหน้าที่" : user.role}
                                </Text>
                            </div>
                            <Button
                                type="text"
                                icon={<SettingOutlined style={{ color: "rgba(255,255,255,0.4)" }} />}
                                size="small"
                                onClick={() => router.push("/staff/profile")}
                                style={{ border: "none" }}
                            />
                        </div>
                    </div>
                )}
            </Sider>

            <Layout
                style={{
                    marginLeft: collapsed ? 80 : 260,
                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                    minHeight: "100vh",
                    background: "#f5f7f6",
                }}
            >
                {/* Header */}
                <Header
                    style={{
                        position: "sticky",
                        top: 0,
                        zIndex: 99,
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "0 28px",
                        height: 68,
                        background: "rgba(255, 255, 255, 0.92)",
                        backdropFilter: "blur(16px)",
                        WebkitBackdropFilter: "blur(16px)",
                        borderBottom: "1px solid rgba(0, 0, 0, 0.04)",
                        boxShadow: "0 1px 4px rgba(0, 0, 0, 0.03)",
                    }}
                >
                    <Space>
                        <Button
                            type="text"
                            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                            onClick={() => setCollapsed(!collapsed)}
                            style={{
                                fontSize: "16px",
                                width: 40,
                                height: 40,
                                borderRadius: 10,
                            }}
                        />
                        <Text strong style={{ fontSize: 16, color: "#1a1a1a" }}>
                            {menuItems.find((i) => i.key === pathname)?.label ||
                                menuItems
                                    .flatMap((i) => i.children || [])
                                    .find((c) => c.key === pathname)?.label ||
                                "Dashboard"}
                        </Text>
                    </Space>

                    <Space size={12}>
                        <Badge count={0} size="small">
                            <Button
                                type="text"
                                icon={<BellOutlined />}
                                style={{
                                    fontSize: 16,
                                    width: 40,
                                    height: 40,
                                    borderRadius: 10,
                                    color: "#666",
                                }}
                            />
                        </Badge>

                        <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" arrow>
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    cursor: "pointer",
                                    padding: "4px 12px 4px 4px",
                                    borderRadius: 50,
                                    border: "1px solid #e8e8e8",
                                    background: "#fff",
                                    transition: "all 0.3s",
                                    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                                }}
                            >
                                <Avatar
                                    size={34}
                                    style={{
                                        background: "linear-gradient(135deg, #16a34a 0%, #10b981 100%)",
                                        boxShadow: "0 2px 6px rgba(16,163,74,0.25)",
                                    }}
                                    icon={<UserOutlined />}
                                >
                                    {user.firstName?.[0]}
                                </Avatar>
                                <div
                                    style={{
                                        display: "flex",
                                        flexDirection: "column",
                                        marginLeft: 10,
                                        lineHeight: 1.2,
                                    }}
                                >
                                    <Text strong style={{ fontSize: 13 }}>
                                        {user.firstName}
                                    </Text>
                                    <Text type="secondary" style={{ fontSize: 11 }}>
                                        {user.role === "STAFF" ? "เจ้าหน้าที่" : user.role}
                                    </Text>
                                </div>
                            </div>
                        </Dropdown>
                    </Space>
                </Header>

                <Content
                    style={{
                        margin: "24px 28px",
                        padding: 0,
                        minHeight: 280,
                    }}
                >
                    {children}
                </Content>
            </Layout>

            <style jsx global>{`
                /* ===== Sidebar Menu Styling ===== */
                .ant-layout-sider .ant-menu-dark {
                    background: transparent !important;
                }
                
                .ant-layout-sider .ant-menu-dark .ant-menu-item {
                    margin: 2px 0 !important;
                    border-radius: 10px !important;
                    height: 42px !important;
                    line-height: 42px !important;
                    color: rgba(255,255,255,0.65) !important;
                    transition: all 0.25s ease !important;
                }
                
                .ant-layout-sider .ant-menu-dark .ant-menu-item:hover {
                    background: rgba(16,185,129,0.12) !important;
                    color: #fff !important;
                }
                
                .ant-layout-sider .ant-menu-dark .ant-menu-item-selected {
                    background: linear-gradient(135deg, rgba(16,163,74,0.35) 0%, rgba(16,185,129,0.2) 100%) !important;
                    color: #fff !important;
                    font-weight: 600 !important;
                    box-shadow: 0 2px 8px rgba(16,163,74,0.2) !important;
                    border-left: 3px solid #10b981 !important;
                }
                
                .ant-layout-sider .ant-menu-dark .ant-menu-submenu-title {
                    margin: 2px 0 !important;
                    border-radius: 10px !important;
                    height: 42px !important;
                    line-height: 42px !important;
                    color: rgba(255,255,255,0.65) !important;
                }
                
                .ant-layout-sider .ant-menu-dark .ant-menu-submenu-title:hover {
                    background: rgba(16,185,129,0.08) !important;
                    color: #fff !important;
                }
                
                .ant-layout-sider .ant-menu-dark .ant-menu-sub.ant-menu-inline {
                    background: transparent !important;
                }
                
                .ant-layout-sider .ant-menu-dark .ant-menu-sub .ant-menu-item {
                    padding-left: 52px !important;
                    height: 38px !important;
                    line-height: 38px !important;
                    font-size: 13px !important;
                }
                
                .ant-layout-sider .ant-menu-dark .ant-menu-item-divider {
                    background: rgba(255,255,255,0.06) !important;
                    margin: 10px 16px !important;
                }
                
                /* Sidebar scrollbar */
                .ant-layout-sider::-webkit-scrollbar {
                    width: 4px;
                }
                .ant-layout-sider::-webkit-scrollbar-thumb {
                    background: rgba(255,255,255,0.1);
                    border-radius: 4px;
                }
                
                /* ===== Content Area ===== */
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </Layout>
    );
}
