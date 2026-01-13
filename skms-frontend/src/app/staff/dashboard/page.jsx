"use client";

import React, { useState, useEffect } from "react";
import { Card, Row, Col, Statistic, Table, Tag, Typography, Space } from "antd";
import {
    KeyOutlined,
    HomeOutlined,
    ArrowUpOutlined,
    ArrowDownOutlined,
} from "@ant-design/icons";
import { statisticsAPI } from "@/service/api";
import dayjs from "dayjs";

const { Title, Text } = Typography;

export default function StaffDashboard() {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalKeys: 0,
        borrowedKeys: 0,
        availableKeys: 0,
        totalRooms: 0,
    });
    const [recentTransactions, setRecentTransactions] = useState([]);
    const [topRooms, setTopRooms] = useState([]);
    const [todayStats, setTodayStats] = useState({
        borrowCount: 0,
        returnCount: 0,
        pendingCount: 0
    });

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);

            // Fetch all data in parallel
            const [statsRes, recentRes, roomsRes, todayRes] = await Promise.all([
                statisticsAPI.getDashboard(),
                statisticsAPI.getRecentTransactions(),
                statisticsAPI.getTopRooms(),
                statisticsAPI.getTodayStats()
            ]);

            setStats(statsRes.data);
            setRecentTransactions(recentRes.data);
            setTopRooms(roomsRes.data);
            setTodayStats(todayRes.data);

        } catch (error) {
            console.error("Error fetching dashboard data:", error);
        } finally {
            setLoading(false);
        }
    };

    const transactionColumns = [
        {
            title: "ผู้ใช้งาน",
            dataIndex: "user",
            key: "user",
        },
        {
            title: "ห้อง",
            dataIndex: "room",
            key: "room",
        },
        {
            title: "การกระทำ",
            dataIndex: "action",
            key: "action",
            render: (action) => (
                <Tag color={action === "เบิก" ? "blue" : "green"}>{action}</Tag>
            ),
        },
        {
            title: "เวลา",
            dataIndex: "time",
            key: "time",
            render: (time) => dayjs(time).format("HH:mm")
        },
        {
            title: "สถานะ",
            dataIndex: "status",
            key: "status",
            render: (status) => (
                <Tag color={status === "borrowed" ? "orange" : "green"}>
                    {status === "borrowed" ? "กำลังเบิก" : "คืนแล้ว"}
                </Tag>
            ),
        },
    ];

    return (
        <div>
            <Space direction="vertical" size="large" style={{ width: "100%" }}>
                <div>
                    <Title level={2}>Dashboard</Title>
                    <Text type="secondary">ภาพรวมระบบเบิกคืนกุญแจ</Text>
                </div>

                {/* Statistics Cards */}
                <Row gutter={[16, 16]}>
                    <Col xs={24} sm={12} lg={6}>
                        <Card bordered={false}>
                            <Statistic
                                title="กุญแจทั้งหมด"
                                value={stats.totalKeys}
                                prefix={<KeyOutlined />}
                                valueStyle={{ color: "#1890ff" }}
                                loading={loading}
                            />
                        </Card>
                    </Col>
                    <Col xs={24} sm={12} lg={6}>
                        <Card bordered={false}>
                            <Statistic
                                title="กำลังถูกเบิก"
                                value={stats.borrowedKeys}
                                prefix={<ArrowUpOutlined />}
                                valueStyle={{ color: "#ff4d4f" }}
                                loading={loading}
                            />
                        </Card>
                    </Col>
                    <Col xs={24} sm={12} lg={6}>
                        <Card bordered={false}>
                            <Statistic
                                title="พร้อมใช้งาน"
                                value={stats.availableKeys}
                                prefix={<ArrowDownOutlined />}
                                valueStyle={{ color: "#52c41a" }}
                                loading={loading}
                            />
                        </Card>
                    </Col>
                    <Col xs={24} sm={12} lg={6}>
                        <Card bordered={false}>
                            <Statistic
                                title="ห้องเรียนทั้งหมด"
                                value={stats.totalRooms}
                                prefix={<HomeOutlined />}
                                valueStyle={{ color: "#722ed1" }}
                                loading={loading}
                            />
                        </Card>
                    </Col>
                </Row>

                {/* Recent Transactions */}
                <Card title="การเบิกคืนล่าสุด" extra={<a href="/staff/transactions">ดูทั้งหมด</a>}>
                    <Table
                        columns={transactionColumns}
                        dataSource={recentTransactions}
                        pagination={false}
                        loading={loading}
                        rowKey="key"
                    />
                </Card>

                {/* Quick Stats */}
                <Row gutter={[16, 16]}>
                    <Col xs={24} lg={12}>
                        <Card title="ห้องที่ใช้งานบ่อย" loading={loading}>
                            <Space direction="vertical" style={{ width: "100%" }}>
                                {topRooms.map((room) => (
                                    <div key={room.room_id} style={{ display: "flex", justifyContent: "space-between" }}>
                                        <Text>{room.room_id} - {room.room_name}</Text>
                                        <Text strong>{room.count} ครั้ง</Text>
                                    </div>
                                ))}
                                {topRooms.length === 0 && <Text type="secondary" style={{ textAlign: 'center', display: 'block' }}>ไม่มีข้อมูล</Text>}
                            </Space>
                        </Card>
                    </Col>
                    <Col xs={24} lg={12}>
                        <Card title="สถิติวันนี้" loading={loading}>
                            <Space direction="vertical" style={{ width: "100%" }}>
                                <div style={{ display: "flex", justifyContent: "space-between" }}>
                                    <Text>จำนวนการเบิก</Text>
                                    <Text strong style={{ color: "#1890ff" }}>{todayStats.borrowCount} ครั้ง</Text>
                                </div>
                                <div style={{ display: "flex", justifyContent: "space-between" }}>
                                    <Text>จำนวนการคืน</Text>
                                    <Text strong style={{ color: "#52c41a" }}>{todayStats.returnCount} ครั้ง</Text>
                                </div>
                                <div style={{ display: "flex", justifyContent: "space-between" }}>
                                    <Text>คงค้าง (ทั้งหมด)</Text>
                                    <Text strong style={{ color: "#ff4d4f" }}>{todayStats.pendingCount} รายการ</Text>
                                </div>
                            </Space>
                        </Card>
                    </Col>
                </Row>
            </Space>
        </div>
    );
}
