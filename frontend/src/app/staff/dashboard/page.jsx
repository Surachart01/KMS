"use client";

import React, { useState, useEffect } from "react";
import { Card, Row, Col, Statistic, Table, Tag, Typography, Space, Spin } from "antd";
import {
    KeyOutlined,
    HomeOutlined,
    UserOutlined,
    CalendarOutlined,
    CheckCircleOutlined,
    ClockCircleOutlined,
} from "@ant-design/icons";
import { keysAPI, usersAPI, schedulesAPI, bookingsAPI } from "@/service/api";
import dayjs from "dayjs";

const { Title, Text } = Typography;

export default function StaffDashboard() {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalKeys: 0,
        borrowedKeys: 0,
        availableKeys: 0,
        totalStudents: 0,
        totalTeachers: 0,
        totalSchedules: 0,
    });
    const [recentBookings, setRecentBookings] = useState([]);
    const [keysByBuilding, setKeysByBuilding] = useState({});

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);

            // Fetch all data in parallel
            const [keysRes, usersRes, schedulesRes, bookingsRes] = await Promise.all([
                keysAPI.getAll(),
                usersAPI.getAll(),
                schedulesAPI.getAll(),
                bookingsAPI.getAll()
            ]);

            const keys = keysRes.data.data || [];
            const users = usersRes.data.data || [];
            const schedules = schedulesRes.data.data || [];
            const bookings = bookingsRes.data.data || [];

            // Calculate stats
            const borrowedKeys = keys.filter(k => k.status === 'BORROWED').length;
            const availableKeys = keys.filter(k => k.status === 'IN_CABINET').length;
            const students = users.filter(u => u.role === 'STUDENT').length;
            const teachers = users.filter(u => u.role === 'TEACHER').length;

            // Group keys by building
            const buildingStats = {};
            keys.forEach(key => {
                const building = key.roomCode?.split('-')[0] || 'Other';
                if (!buildingStats[building]) {
                    buildingStats[building] = { total: 0, borrowed: 0, available: 0 };
                }
                buildingStats[building].total++;
                if (key.status === 'BORROWED') {
                    buildingStats[building].borrowed++;
                } else if (key.status === 'IN_CABINET') {
                    buildingStats[building].available++;
                }
            });

            setStats({
                totalKeys: keys.length,
                borrowedKeys,
                availableKeys,
                totalStudents: students,
                totalTeachers: teachers,
                totalSchedules: schedules.length,
            });

            setKeysByBuilding(buildingStats);

            // Recent bookings (last 10)
            const recent = bookings.slice(0, 10);
            setRecentBookings(recent);

        } catch (error) {
            console.error("Error fetching dashboard data:", error);
        } finally {
            setLoading(false);
        }
    };

    const bookingColumns = [
        {
            title: "ผู้ใช้",
            key: "user",
            render: (_, record) => (
                <div>
                    <div>{record.user?.firstName} {record.user?.lastName}</div>
                    <div style={{ fontSize: 12, color: "#888" }}>{record.user?.studentCode}</div>
                </div>
            ),
        },
        {
            title: "ห้อง",
            key: "room",
            render: (_, record) => (
                <Tag color="blue">{record.key?.roomCode || '-'}</Tag>
            ),
        },
        {
            title: "สถานะ",
            key: "status",
            render: (_, record) => {
                const statusMap = {
                    BORROWED: { color: 'orange', text: 'กำลังยืม' },
                    RETURNED: { color: 'green', text: 'คืนแล้ว' },
                    OVERDUE: { color: 'red', text: 'เกินกำหนด' },
                };
                const status = statusMap[record.status] || { color: 'default', text: record.status };
                return <Tag color={status.color}>{status.text}</Tag>;
            },
        },
        {
            title: "เวลายืม",
            dataIndex: "borrowedAt",
            key: "borrowedAt",
            render: (text) => text ? dayjs(text).format("DD/MM HH:mm") : '-',
        },
    ];

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
                <Spin size="large" />
            </div>
        );
    }

    return (
        <div className="fade-in">
            {/* Page Header */}
            <div className="page-header" style={{ marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                    <Title level={2} style={{ margin: 0 }}>
                        Dashboard
                    </Title>
                    <Text style={{ fontSize: 13, marginTop: 4, display: "block", color: "#64748b" }}>
                        ภาพรวมระบบจัดการกุญแจ
                    </Text>
                </div>
            </div>

            <Row gutter={[16, 16]}>
                {/* Key Stats */}
                <Col xs={24} sm={12} lg={6}>
                    <Card className="stat-card-green">
                        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                            <div style={{ width: 44, height: 44, borderRadius: 10, background: "rgba(22,163,74,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                <KeyOutlined style={{ fontSize: 20, color: "#16a34a" }} />
                            </div>
                            <Statistic title="กุญแจทั้งหมด" value={stats.totalKeys} suffix="ดอก" />
                        </div>
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card className="stat-card-green">
                        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                            <div style={{ width: 44, height: 44, borderRadius: 10, background: "rgba(22,163,74,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                <CheckCircleOutlined style={{ fontSize: 20, color: "#16a34a" }} />
                            </div>
                            <Statistic title="พร้อมใช้งาน" value={stats.availableKeys} suffix="ดอก" />
                        </div>
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card className="stat-card-orange">
                        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                            <div style={{ width: 44, height: 44, borderRadius: 10, background: "rgba(249,115,22,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                <ClockCircleOutlined style={{ fontSize: 20, color: "#f97316" }} />
                            </div>
                            <Statistic title="กำลังถูกยืม" value={stats.borrowedKeys} suffix="ดอก" />
                        </div>
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card className="stat-card-blue">
                        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                            <div style={{ width: 44, height: 44, borderRadius: 10, background: "rgba(59,130,246,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                <CalendarOutlined style={{ fontSize: 20, color: "#3b82f6" }} />
                            </div>
                            <Statistic title="ตารางเรียน" value={stats.totalSchedules} suffix="รายการ" />
                        </div>
                    </Card>
                </Col>
            </Row>

            <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
                {/* Users Stats */}
                <Col xs={24} sm={12} lg={8}>
                    <Card className="stat-card-purple">
                        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                            <div style={{ width: 44, height: 44, borderRadius: 10, background: "rgba(139,92,246,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                <UserOutlined style={{ fontSize: 20, color: "#8b5cf6" }} />
                            </div>
                            <Statistic title="นักศึกษา" value={stats.totalStudents} suffix="คน" />
                        </div>
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={8}>
                    <Card className="stat-card-blue">
                        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                            <div style={{ width: 44, height: 44, borderRadius: 10, background: "rgba(59,130,246,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                <UserOutlined style={{ fontSize: 20, color: "#3b82f6" }} />
                            </div>
                            <Statistic title="อาจารย์" value={stats.totalTeachers} suffix="คน" />
                        </div>
                    </Card>
                </Col>
                <Col xs={24} lg={8}>
                    <Card
                        title={
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <div style={{ width: 28, height: 28, borderRadius: 6, background: "rgba(22,163,74,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                    <HomeOutlined style={{ fontSize: 14, color: "#16a34a" }} />
                                </div>
                                <span>กุญแจแยกตามตึก</span>
                            </div>
                        }
                        className="feature-card"
                    >
                        {Object.entries(keysByBuilding).map(([building, data]) => (
                            <div key={building} style={{ marginBottom: 10, display: "flex", alignItems: "center", gap: 8, padding: "6px 0" }}>
                                <Text strong style={{ minWidth: 65, color: "#334155" }}>ตึก {building}:</Text>
                                <Tag color="green" style={{ margin: 0, borderRadius: 12 }}>{data.available} พร้อม</Tag>
                                <Tag color="orange" style={{ margin: 0, borderRadius: 12 }}>{data.borrowed} ยืม</Tag>
                            </div>
                        ))}
                    </Card>
                </Col>
            </Row>

            <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
                <Col span={24}>
                    <Card
                        title={
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <div style={{ width: 28, height: 28, borderRadius: 6, background: "rgba(22,163,74,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                    <ClockCircleOutlined style={{ fontSize: 14, color: "#16a34a" }} />
                                </div>
                                <span>การยืม-คืนล่าสุด</span>
                            </div>
                        }
                        className="feature-card"
                    >
                        <Table
                            columns={bookingColumns}
                            dataSource={recentBookings}
                            rowKey="id"
                            pagination={false}
                            size="small"
                            locale={{ emptyText: 'ยังไม่มีข้อมูลการยืม-คืน' }}
                        />
                    </Card>
                </Col>
            </Row>
        </div>
    );
}
