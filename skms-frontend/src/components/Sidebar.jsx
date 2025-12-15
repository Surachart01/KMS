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
    logo = "🔑 SKMS",
    logoCollapsed = "SKMS",
}) {
    const SidebarContent = () => (
        <Menu
            theme="dark"
            mode="inline"
            selectedKeys={[pathname]}
            onClick={handleMenuClick}
            items={menuItems}
        />
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
                    }}
                >
                    <div
                        style={{
                            height: 64,
                            margin: 16,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "white",
                            fontSize: collapsed ? 18 : 20,
                            fontWeight: "bold",
                        }}
                    >
                        {collapsed ? logoCollapsed : logo}
                    </div>
                    <SidebarContent />
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
                    styles={{ body: { padding: 0, background: "#001529" } }}
                >
                    <div
                        style={{
                            height: 64,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "white",
                            fontSize: 20,
                            fontWeight: "bold",
                            background: "#001529",
                        }}
                    >
                        {logo}
                    </div>
                    <SidebarContent />
                </Drawer>
            )}
        </>
    );
}
