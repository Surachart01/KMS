"use client";

import React, { useState, useEffect } from "react";
import {
    Table,
    Space,
    Typography,
    Card,
    Tag,
    Button,
    DatePicker,
    message,
    Row,
    Col,
    Statistic,
    Alert
} from "antd";
import {
    CalendarOutlined,
    SyncOutlined,
    ClockCircleOutlined
} from "@ant-design/icons";
import { bookingsAPI } from "@/service/api";
import dayjs from "dayjs";
import 'dayjs/locale/th';

dayjs.locale('th');

const { Title, Text } = Typography;

export default function DailyBookingGenerator() {
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [selectedDate, setSelectedDate] = useState(dayjs());
    const [bookings, setBookings] = useState([]);
    const [stats, setStats] = useState({ total: 0, reserved: 0, picked: 0 });

    useEffect(() => {
        if (selectedDate) {
            fetchBookings();
        }
    }, [selectedDate]);

    const fetchBookings = async () => {
        try {
            setLoading(true);
            const dateStr = selectedDate.format("YYYY-MM-DD");
            const startStr = dateStr + "T00:00:00";
            const endStr = dateStr + "T23:59:59";

            const response = await bookingsAPI.getAll({
                startDate: startStr,
                endDate: endStr,
                limit: 1000
            });

            const data = response.data.data || [];
            setBookings(data);

            // Calculate stats
            const reserved = data.filter(b => b.status === "RESERVED").length;
            const picked = data.filter(b => b.status === "BORROWED").length;
            setStats({ total: data.length, reserved, picked });

        } catch (error) {
            console.error("Error fetching bookings:", error);
            message.error("ไม่สามารถโหลดรายการจองได้");
        } finally {
            setLoading(false);
        }
    };

    const handleGenerate = async () => {
        const today = dayjs();
        if (!selectedDate.isSame(today, 'day')) {
            message.error("สามารถสร้างรายการจองสำหรับวันนี้เท่านั้น");
            setSelectedDate(today);
            return;
        }

        try {
            setGenerating(true);
            const dateStr = selectedDate.format("YYYY-MM-DD");
            const response = await bookingsAPI.generate({ date: dateStr });

            if (response.data.success) {
                message.success(response.data.message);
                fetchBookings();
            } else {
                message.error(response.data.message);
            }
        } catch (error) {
            console.error("Error generating bookings:", error);
            message.error(error.response?.data?.message || "ไม่สามารถสร้างรายการจองได้");
        } finally {
            setGenerating(false);
        }
    };

    const columns = [
        {
            title: "เวลา",
            key: "time",
            width: 150,
            render: (_, record) => {
                const start = dayjs(record.borrowAt).format("HH:mm");
                const end = dayjs(record.dueAt).format("HH:mm");
                return (
                    <Space>
                        <ClockCircleOutlined style={{ color: "#1890ff" }} />
                        {start} - {end}
                    </Space>
                );
            },
        },
        {
            title: "ห้องเรียน",
            key: "room",
            width: 120,
            render: (_, record) => (
                <Tag color="geekblue" style={{ fontSize: 14 }}>
                    {record.key?.roomCode || record.roomCode || "-"}
                </Tag>
            ),
        },
        {
            title: "วิชา",
            key: "subject",
            render: (_, record) => (
                <span>
                    {record.subject?.code} {record.subject?.name}
                </span>
            ),
        },
        {
            title: "ผู้จอง (อาจารย์)",
            key: "user",
            render: (_, record) => (
                <span>
                    {record.user?.firstName} {record.user?.lastName}
                </span>
            ),
        },
        {
            title: "สถานะ",
            key: "status",
            width: 120,
            render: (_, record) => {
                let color = "default";
                let text = record.status;
                if (record.status === "RESERVED") {
                    color = "orange";
                    text = "จองแล้ว (ระบบ)";
                } else if (record.status === "BORROWED") {
                    color = "green";
                    text = "เบิกกุญแจแล้ว";
                } else if (record.status === "RETURNED") {
                    color = "blue";
                    text = "คืนแล้ว";
                } else if (record.status === "LATE") {
                    color = "red";
                    text = "คืนช้า";
                }
                return <Tag color={color}>{text}</Tag>;
            },
        },
    ];

    return (
        <div>
            <Space direction="vertical" size="large" style={{ width: "100%" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Title level={2}>
                        <CalendarOutlined /> สร้างรายการจองรายวัน (Daily Booking Generator)
                    </Title>
                </div>

                <Card>
                    <Row gutter={[16, 16]} align="middle">
                        <Col xs={24} md={8}>
                            <Space direction="vertical" style={{ width: "100%" }}>
                                <Text strong>วันที่ (ระบบสร้างสำหรับวันนี้เท่านั้น):</Text>
                                <DatePicker
                                    value={selectedDate}
                                    disabled={true}
                                    style={{ width: "100%", cursor: "not-allowed" }}
                                    format="DD/MM/YYYY"
                                />
                            </Space>
                        </Col>
                        <Col xs={24} md={8}>
                            <Button
                                type="primary"
                                icon={<SyncOutlined spin={generating} />}
                                loading={generating}
                                onClick={handleGenerate}
                                size="large"
                                block
                            >
                                สร้างรายการจองจากตารางสอน
                            </Button>
                        </Col>
                        <Col xs={24} md={8} style={{ textAlign: "right" }}>
                            <Space size="large">
                                <Statistic title="รายการจองทั้งหมด" value={stats.total} />
                                <Statistic title="รอเบิกกุญแจ" value={stats.reserved} valueStyle={{ color: '#faad14' }} />
                                <Statistic title="เบิกแล้ว" value={stats.picked} valueStyle={{ color: '#52c41a' }} />
                            </Space>
                        </Col>
                    </Row>
                </Card>

                <Alert
                    message="คำแนะนำ"
                    description="ระบบจะสร้างรายการจองสถานะ 'RESERVED' ให้กับอาจารย์ตามตารางสอนในวันที่เลือก หากมีรายการจองอยู่แล้วจะข้ามไป"
                    type="info"
                    showIcon
                />

                <Table
                    columns={columns}
                    dataSource={bookings}
                    rowKey="id"
                    loading={loading}
                    pagination={{ pageSize: 20 }}
                />
            </Space>
        </div>
    );
}
