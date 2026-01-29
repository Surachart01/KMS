"use client";

import React from "react";
import { Layout, Menu, Drawer } from "antd";

const { Sider } = Layout;

export default function Sidebar({
    collapsed,
    isMobile,
    mobileDrawerOpen,
    setMobileDrawerOpen,
    menuItems,
    pathname,
    handleMenuClick,
}) {
    const Logo = ({ isCollapsed }) => (
        <div
            style={{
                height: 64,
                margin: "16px 0",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontWeight: "bold",
                fontSize: isCollapsed ? 16 : 20,
                padding: "0 16px",
                overflow: "hidden",
                whiteSpace: "nowrap",
            }}
        >
            {isCollapsed ? (
                <span style={{ fontSize: 24 }}>🔑</span>
            ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 24 }}>🔑</span>
                    <span>SKMS</span>
                </div>
            )}
        </div>
    );

    const SidebarContent = ({ showLogo = true, isCollapsed = false }) => (
        <>
            {showLogo && <Logo isCollapsed={isCollapsed} />}
            <Menu
                theme="dark"
                mode="inline"
                selectedKeys={[pathname]}
                onClick={handleMenuClick}
                items={menuItems}
                style={{
                    borderRight: 0,
                }}
            />
        </>
    );

    return (
        <>
            {/* Desktop Sidebar */}
            {!isMobile && (
                <Sider
                    trigger={null}
                    collapsible
                    collapsed={collapsed}
                    style={{
                        overflow: "auto",
                        height: "100vh",
                        position: "fixed",
                        left: 0,
                        top: 0,
                        bottom: 0,
                        zIndex: 1,
                    }}
                    width={200}
                    collapsedWidth={80}
                >
                    <SidebarContent showLogo={true} isCollapsed={collapsed} />
                </Sider>
            )}

            {/* Mobile Drawer */}
            {isMobile && (
                <Drawer
                    placement="left"
                    onClose={() => setMobileDrawerOpen(false)}
                    open={mobileDrawerOpen}
                    closable={false}
                    width={250}
                    styles={{
                        body: {
                            padding: 0,
                            background: "#001529"
                        }
                    }}
                >
                    <SidebarContent showLogo={true} isCollapsed={false} />
                </Drawer>
            )}
        </>
    );
}
