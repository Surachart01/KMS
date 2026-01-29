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
        <div>
            <Title level={2}>Dashboard</Title>

            <Row gutter={[16, 16]}>
                {/* Key Stats */}
                <Col xs={24} sm={12} lg={6}>
                    <Card>
                        <Statistic
                            title="กุญแจทั้งหมด"
                            value={stats.totalKeys}
                            prefix={<KeyOutlined />}
                            suffix="ดอก"
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card>
                        <Statistic
                            title="พร้อมใช้งาน"
                            value={stats.availableKeys}
                            valueStyle={{ color: '#3f8600' }}
                            prefix={<CheckCircleOutlined />}
                            suffix="ดอก"
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card>
                        <Statistic
                            title="กำลังถูกยืม"
                            value={stats.borrowedKeys}
                            valueStyle={{ color: '#cf1322' }}
                            prefix={<ClockCircleOutlined />}
                            suffix="ดอก"
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card>
                        <Statistic
                            title="ตารางเรียน"
                            value={stats.totalSchedules}
                            prefix={<CalendarOutlined />}
                            suffix="รายการ"
                        />
                    </Card>
                </Col>
            </Row>

            <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
                {/* Users Stats */}
                <Col xs={24} sm={12} lg={8}>
                    <Card>
                        <Statistic
                            title="นักศึกษา"
                            value={stats.totalStudents}
                            prefix={<UserOutlined />}
                            suffix="คน"
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={8}>
                    <Card>
                        <Statistic
                            title="อาจารย์"
                            value={stats.totalTeachers}
                            prefix={<UserOutlined />}
                            suffix="คน"
                        />
                    </Card>
                </Col>
                <Col xs={24} lg={8}>
                    <Card title="กุญแจแยกตามตึก">
                        {Object.entries(keysByBuilding).map(([building, data]) => (
                            <div key={building} style={{ marginBottom: 8 }}>
                                <Space>
                                    <HomeOutlined />
                                    <Text strong>ตึก {building}:</Text>
                                    <Tag color="green">{data.available} พร้อม</Tag>
                                    <Tag color="orange">{data.borrowed} ยืม</Tag>
                                </Space>
                            </div>
                        ))}
                    </Card>
                </Col>
            </Row>

            <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
                <Col span={24}>
                    <Card title="การยืม-คืนล่าสุด">
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
