"use client";

import React, { useState, useEffect } from "react";
import { Layout, Card, Row, Col, Statistic, Table, Tag, Spin } from "antd";
import {
    HomeOutlined,
    UserOutlined,
    KeyOutlined,
    HistoryOutlined,
    SettingOutlined,
    DashboardOutlined,
    BookOutlined,
    TeamOutlined,
    ReadOutlined,
    CalendarOutlined,
} from "@ant-design/icons";
import { useRouter, usePathname } from "next/navigation";
import Cookies from "js-cookie";
import Sidebar from "@/components/Sidebar";
import AppHeader from "@/components/AppHeader";
import {
    PieChart,
    Pie,
    Cell,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from "recharts";

const { Content } = Layout;

const COLORS = {
    primary: "#1890ff",
    success: "#52c41a",
    warning: "#faad14",
    danger: "#f5222d",
    purple: "#722ed1",
    cyan: "#13c2c2",
};

export default function DashboardPage() {
    const [collapsed, setCollapsed] = useState(false);
    const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [user, setUser] = useState(null);
    const [statistics, setStatistics] = useState(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const pathname = usePathname();

    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };

        checkMobile();
        window.addEventListener("resize", checkMobile);

        return () => window.removeEventListener("resize", checkMobile);
    }, []);

    useEffect(() => {
        const token = Cookies.get("token");
        const userData = Cookies.get("user");

        if (!token) {
            router.push("/login");
        } else if (userData) {
            const parsedUser = JSON.parse(userData);
            setUser(parsedUser);
        }
    }, [router]);

    const fetchStatistics = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API_URL}/api/statistics/overall`);
            const data = await response.json();
            setStatistics(data);
        } catch (error) {
            console.error("Error fetching statistics:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user) {
            fetchStatistics();
        }
    }, [user]);

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
            key: "/admin/majors",
            icon: <BookOutlined />,
            label: "จัดการสาขา",
        },
        {
            key: "/admin/sections",
            icon: <BookOutlined />,
            label: "จัดการกลุ่มเรียน",
        },
        {
            key: "/admin/rooms",
            icon: <KeyOutlined />,
            label: "จัดการห้อง",
        },
        {
            key: "/admin/subjects",
            icon: <BookOutlined />,
            label: "จัดการวิชา",
        },
        {
            key: "/admin/schedules",
            icon: <HistoryOutlined />,
            label: "จัดการตารางเรียน",
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

    if (loading || !statistics) {
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
                    />

                    <Content
                        style={{
                            margin: "24px 16px",
                            padding: 24,
                            minHeight: 280,
                            background: "#fff",
                            borderRadius: 8,
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                        }}
                    >
                        <Spin size="large" />
                    </Content>
                </Layout>
            </Layout>
        );
    }

    // Prepare chart data
    const userDistributionData = [
        { name: "นักเรียน", value: statistics.usersByPosition.students, color: COLORS.primary },
        { name: "อาจารย์", value: statistics.usersByPosition.teachers, color: COLORS.success },
        { name: "ผู้ดูแลระบบ", value: statistics.usersByPosition.admins, color: COLORS.warning },
    ];

    const roomStatusData = [
        { name: "ห้องว่าง", value: statistics.roomsByStatus.empty, color: COLORS.success },
        { name: "ห้องไม่ว่าง", value: statistics.roomsByStatus.full, color: COLORS.danger },
    ];

    const scheduleTypeData = [
        { name: "เรียน", value: statistics.schedulesByType.study, color: COLORS.primary },
        { name: "จอง", value: statistics.schedulesByType.booking, color: COLORS.purple },
    ];

    const scheduleStatusData = [
        { name: "ว่าง", value: statistics.schedulesByStatus.available, color: COLORS.success },
        { name: "ไม่ว่าง", value: statistics.schedulesByStatus.unavailable, color: COLORS.danger },
    ];

    const recentColumns = [
        {
            title: "นักเรียน",
            dataIndex: "student",
            key: "student",
            width: isMobile ? 150 : undefined,
        },
        {
            title: "วิชา",
            dataIndex: "subject",
            key: "subject",
            width: isMobile ? 200 : undefined,
        },
        {
            title: "ห้อง",
            dataIndex: "room",
            key: "room",
            width: isMobile ? 120 : undefined,
        },
        {
            title: "ประเภท",
            dataIndex: "type",
            key: "type",
            width: isMobile ? 80 : undefined,
            render: (type) => (
                <Tag color={type === "Study" ? "blue" : "green"}>
                    {type === "Study" ? "เรียน" : "จอง"}
                </Tag>
            ),
        },
        {
            title: "สถานะ",
            dataIndex: "status",
            key: "status",
            width: isMobile ? 80 : undefined,
            render: (status) => (
                <Tag color={status === "Available" ? "green" : "red"}>
                    {status === "Available" ? "ว่าง" : "ไม่ว่าง"}
                </Tag>
            ),
        },
    ];

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
                />

                <Content
                    style={{
                        margin: "24px 16px",
                        padding: 24,
                        minHeight: 280,
                        background: "#f0f2f5",
                    }}
                >
                    <h2 style={{ marginBottom: 24 }}>แดชบอร์ด</h2>

                    {/* Statistics Cards */}
                    <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                        <Col xs={24} sm={12} lg={6}>
                            <Card>
                                <Statistic
                                    title="ผู้ใช้ทั้งหมด"
                                    value={statistics.totals.users}
                                    prefix={<TeamOutlined style={{ color: COLORS.primary }} />}
                                    valueStyle={{ color: COLORS.primary }}
                                />
                            </Card>
                        </Col>
                        <Col xs={24} sm={12} lg={6}>
                            <Card>
                                <Statistic
                                    title="สาขาทั้งหมด"
                                    value={statistics.totals.majors}
                                    prefix={<BookOutlined style={{ color: COLORS.success }} />}
                                    valueStyle={{ color: COLORS.success }}
                                />
                            </Card>
                        </Col>
                        <Col xs={24} sm={12} lg={6}>
                            <Card>
                                <Statistic
                                    title="ห้องทั้งหมด"
                                    value={statistics.totals.rooms}
                                    prefix={<KeyOutlined style={{ color: COLORS.warning }} />}
                                    valueStyle={{ color: COLORS.warning }}
                                />
                            </Card>
                        </Col>
                        <Col xs={24} sm={12} lg={6}>
                            <Card>
                                <Statistic
                                    title="วิชาทั้งหมด"
                                    value={statistics.totals.subjects}
                                    prefix={<ReadOutlined style={{ color: COLORS.purple }} />}
                                    valueStyle={{ color: COLORS.purple }}
                                />
                            </Card>
                        </Col>
                    </Row>

                    <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                        <Col xs={24} sm={12} lg={6}>
                            <Card>
                                <Statistic
                                    title="กลุ่มเรียนทั้งหมด"
                                    value={statistics.totals.sections}
                                    prefix={<TeamOutlined style={{ color: COLORS.cyan }} />}
                                    valueStyle={{ color: COLORS.cyan }}
                                />
                            </Card>
                        </Col>
                        <Col xs={24} sm={12} lg={6}>
                            <Card>
                                <Statistic
                                    title="ตารางเรียนทั้งหมด"
                                    value={statistics.totals.schedules}
                                    prefix={<CalendarOutlined style={{ color: COLORS.danger }} />}
                                    valueStyle={{ color: COLORS.danger }}
                                />
                            </Card>
                        </Col>
                        <Col xs={24} sm={12} lg={6}>
                            <Card>
                                <Statistic
                                    title="นักเรียน"
                                    value={statistics.usersByPosition.students}
                                    valueStyle={{ color: COLORS.primary }}
                                />
                            </Card>
                        </Col>
                        <Col xs={24} sm={12} lg={6}>
                            <Card>
                                <Statistic
                                    title="อาจารย์"
                                    value={statistics.usersByPosition.teachers}
                                    valueStyle={{ color: COLORS.success }}
                                />
                            </Card>
                        </Col>
                    </Row>

                    {/* Charts */}
                    <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                        <Col xs={24} lg={12}>
                            <Card title="การกระจายของผู้ใช้" style={{ height: "100%" }}>
                                <ResponsiveContainer width="100%" height={300}>
                                    <PieChart>
                                        <Pie
                                            data={userDistributionData}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            label={({ name, percent }) =>
                                                `${name}: ${(percent * 100).toFixed(0)}%`
                                            }
                                            outerRadius={80}
                                            fill="#8884d8"
                                            dataKey="value"
                                        >
                                            {userDistributionData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                            </Card>
                        </Col>

                        <Col xs={24} lg={12}>
                            <Card title="สถานะห้อง" style={{ height: "100%" }}>
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={roomStatusData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="name" />
                                        <YAxis />
                                        <Tooltip />
                                        <Legend />
                                        <Bar dataKey="value" name="จำนวน">
                                            {roomStatusData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </Card>
                        </Col>
                    </Row>

                    <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                        <Col xs={24} lg={12}>
                            <Card title="ประเภทตารางเรียน" style={{ height: "100%" }}>
                                <ResponsiveContainer width="100%" height={300}>
                                    <PieChart>
                                        <Pie
                                            data={scheduleTypeData}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            label={({ name, percent }) =>
                                                `${name}: ${(percent * 100).toFixed(0)}%`
                                            }
                                            outerRadius={80}
                                            fill="#8884d8"
                                            dataKey="value"
                                        >
                                            {scheduleTypeData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                            </Card>
                        </Col>

                        <Col xs={24} lg={12}>
                            <Card title="สถานะตารางเรียน" style={{ height: "100%" }}>
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={scheduleStatusData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="name" />
                                        <YAxis />
                                        <Tooltip />
                                        <Legend />
                                        <Bar dataKey="value" name="จำนวน">
                                            {scheduleStatusData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </Card>
                        </Col>
                    </Row>

                    {/* Recent Schedules Table */}
                    <Card title="ตารางเรียนล่าสุด" style={{ marginBottom: 24 }}>
                        <Table
                            columns={recentColumns}
                            dataSource={statistics.recentSchedules}
                            rowKey="id"
                            pagination={{ pageSize: 5 }}
                            scroll={{ x: isMobile ? 800 : undefined }}
                        />
                    </Card>

                    {/* Top Teachers */}
                    {statistics.topTeachers.length > 0 && (
                        <Card title="อาจารย์ที่สอนมากที่สุด">
                            <Table
                                columns={[
                                    {
                                        title: "ชื่อ-นามสกุล",
                                        dataIndex: "name",
                                        key: "name",
                                    },
                                    {
                                        title: "จำนวนวิชาที่สอน",
                                        dataIndex: "subjectCount",
                                        key: "subjectCount",
                                        align: "center",
                                    },
                                ]}
                                dataSource={statistics.topTeachers}
                                rowKey="id"
                                pagination={false}
                            />
                        </Card>
                    )}
                </Content>
            </Layout>
        </Layout>
    );
}
