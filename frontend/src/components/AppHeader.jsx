"use client";

import React from "react";
import { Layout, Button, Avatar, Dropdown, Typography } from "antd";
import {
    MenuFoldOutlined,
    MenuUnfoldOutlined,
    UserOutlined,
    SettingOutlined,
    LogoutOutlined,
} from "@ant-design/icons";

const { Header } = Layout;
const { Title, Text } = Typography;

export default function AppHeader({
    collapsed,
    setCollapsed,
    isMobile,
    setMobileDrawerOpen,
    user,
    handleLogout,
    colorBgContainer,
    title = "ระบบเบิกคืนกุญแจอัตโนมัติ",
}) {
    const userMenuItems = [
        {
            key: "profile",
            icon: <UserOutlined />,
            label: "โปรไฟล์",
        },
        {
            key: "settings",
            icon: <SettingOutlined />,
            label: "ตั้งค่า",
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

    return (
        <Header
            style={{
                padding: "0 24px",
                background: colorBgContainer || "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                position: "sticky",
                top: 0,
                zIndex: 1,
            }}
        >
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                {isMobile ? (
                    <Button
                        type="text"
                        icon={<MenuUnfoldOutlined />}
                        onClick={() => setMobileDrawerOpen(true)}
                        style={{ fontSize: 18, color: "#000" }}
                    />
                ) : (
                    <Button
                        type="text"
                        icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                        onClick={() => setCollapsed(!collapsed)}
                        style={{ fontSize: 18, color: "#000" }}
                    />
                )}
                <Title level={4} style={{ margin: 0, color: "#000" }}>
                    {title}
                </Title>
            </div>

            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        cursor: "pointer",
                    }}
                >
                    <Avatar
                        style={{ backgroundColor: "#16a34a" }}
                        icon={<UserOutlined />}
                    />
                    {!isMobile && user && (
                        <div style={{ display: "flex", flexDirection: "column" }}>
                            <Text strong style={{ color: "#000" }}>
                                {user.prefix} {user.firstname} {user.lastname}
                            </Text>
                            <Text type="secondary" style={{ fontSize: 12, color: "#666" }}>
                                {user.position === "Student"
                                    ? "นักเรียน"
                                    : user.position === "Teacher"
                                        ? "อาจารย์"
                                        : "ผู้ดูแลระบบ"}
                            </Text>
                        </div>
                    )}
                </div>
            </Dropdown>
        </Header>
    );
}
