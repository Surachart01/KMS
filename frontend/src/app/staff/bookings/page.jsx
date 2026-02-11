"use client";

import React, { useState, useEffect } from "react";
import {
    Table,
    Space,
    Typography,
    Card,
    Tag,
    DatePicker,
    Select,
    Button,
    Input,
    message,
    Statistic,
    Row,
    Col,
    Badge,
    Tooltip,
    Modal,
} from "antd";
import {
    HistoryOutlined,
    SearchOutlined,
    WarningOutlined,
    ClockCircleOutlined,
    CheckCircleOutlined,
    ExclamationCircleOutlined,
    ReloadOutlined,
    EyeOutlined,
} from "@ant-design/icons";
import { bookingsAPI, penaltyAPI } from "@/service/api";
import dayjs from "dayjs";

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

export default function BookingsPage() {
    const [loading, setLoading] = useState(false);
    const [searchText, setSearchText] = useState("");
    const [statusFilter, setStatusFilter] = useState(null);
    const [dateRange, setDateRange] = useState(null);
    const [bookings, setBookings] = useState([]);
    const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
    const [stats, setStats] = useState(null);
    const [activeBookings, setActiveBookings] = useState([]);
    const [overdueBookings, setOverdueBookings] = useState([]);
    const [detailModalVisible, setDetailModalVisible] = useState(false);
    const [selectedBooking, setSelectedBooking] = useState(null);

    useEffect(() => {
        fetchBookings();
        fetchStats();
        fetchActiveBookings();
        fetchOverdueBookings();
    }, [statusFilter, dateRange, pagination.current]);

    const fetchBookings = async () => {
        try {
            setLoading(true);
            const params = {
                page: pagination.current,
                limit: pagination.pageSize,
            };

            if (statusFilter) params.status = statusFilter;
            if (searchText) params.search = searchText;
            if (dateRange) {
                params.startDate = dateRange[0].toISOString();
                params.endDate = dateRange[1].toISOString();
            }

            const response = await bookingsAPI.getAll(params);
            setBookings(response.data.data || []);
            setPagination(prev => ({
                ...prev,
                total: response.data.pagination?.total || 0
            }));
        } catch (error) {
            console.error("Error fetching bookings:", error);
            message.error("ไม่สามารถโหลดประวัติการจองได้");
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const response = await bookingsAPI.getDailyStats();
            setStats(response.data.data);
        } catch (error) {
            console.error("Error fetching stats:", error);
        }
    };

    const fetchActiveBookings = async () => {
        try {
            const response = await bookingsAPI.getActive();
            setActiveBookings(response.data.data || []);
        } catch (error) {
            console.error("Error fetching active bookings:", error);
        }
    };

    const fetchOverdueBookings = async () => {
        try {
            const response = await bookingsAPI.getOverdue();
            setOverdueBookings(response.data.data || []);
        } catch (error) {
            console.error("Error fetching overdue bookings:", error);
        }
    };

    const handleSearch = () => {
        setPagination(prev => ({ ...prev, current: 1 }));
        fetchBookings();
    };

    const handleRefresh = () => {
        fetchBookings();
        fetchStats();
        fetchActiveBookings();
        fetchOverdueBookings();
        message.success("รีเฟรชข้อมูลสำเร็จ");
    };

    const showBookingDetail = (booking) => {
        setSelectedBooking(booking);
        setDetailModalVisible(true);
    };

    const getStatusConfig = (status) => {
        switch (status) {
            case "BORROWED":
                return { color: "orange", text: "กำลังเบิก", icon: <ClockCircleOutlined /> };
            case "RETURNED":
                return { color: "green", text: "คืนแล้ว", icon: <CheckCircleOutlined /> };
            case "LATE":
                return { color: "red", text: "คืนเลยกำหนด", icon: <ExclamationCircleOutlined /> };
            default:
                return { color: "default", text: status, icon: null };
        }
    };

    const columns = [
        {
            title: "ผู้เบิก",
            key: "user",
            render: (_, record) => (
                <div>
                    <div style={{ fontWeight: 500 }}>
                        {`${record.user?.firstName || ""} ${record.user?.lastName || ""}`}
                    </div>
                    <div style={{ fontSize: 12, color: "#888" }}>
                        {record.user?.studentCode}
                    </div>
                </div>
            ),
        },
        {
            title: "ห้อง",
            key: "room",
            width: 120,
            render: (_, record) => (
                <Tag color="blue">{record.key?.roomCode || "-"}</Tag>
            ),
        },
        {
            title: "เวลาเบิก",
            dataIndex: "borrowAt",
            key: "borrowAt",
            width: 160,
            render: (text) => dayjs(text).format("DD/MM/YYYY HH:mm"),
        },
        {
            title: "กำหนดคืน",
            dataIndex: "dueAt",
            key: "dueAt",
            width: 160,
            render: (text, record) => {
                const isOverdue = record.status === "BORROWED" && dayjs(text).isBefore(dayjs());
                return (
                    <span style={{ color: isOverdue ? "#ff4d4f" : undefined }}>
                        {dayjs(text).format("DD/MM/YYYY HH:mm")}
                        {isOverdue && <WarningOutlined style={{ marginLeft: 4 }} />}
                    </span>
                );
            },
        },
        {
            title: "เวลาคืน",
            dataIndex: "returnAt",
            key: "returnAt",
            width: 160,
            render: (text) => text ? dayjs(text).format("DD/MM/YYYY HH:mm") : "-",
        },
        {
            title: "สถานะ",
            dataIndex: "status",
            key: "status",
            width: 120,
            render: (status, record) => {
                const config = getStatusConfig(status);
                return (
                    <Badge status={status === "BORROWED" ? "processing" : status === "LATE" ? "error" : "success"}>
                        <Tag color={config.color} icon={config.icon}>
                            {config.text}
                        </Tag>
                    </Badge>
                );
            },
        },
        {
            title: "สาย/หักคะแนน",
            key: "penalty",
            width: 130,
            render: (_, record) => {
                if (record.lateMinutes > 0 || record.penaltyScore > 0) {
                    return (
                        <div>
                            <Text type="danger">{record.lateMinutes} นาที</Text>
                            <br />
                            <Text type="danger">-{record.penaltyScore} คะแนน</Text>
                        </div>
                    );
                }
                return <Text type="secondary">-</Text>;
            },
        },
        {
            title: "การจัดการ",
            key: "action",
            width: 80,
            render: (_, record) => (
                <Tooltip title="ดูรายละเอียด">
                    <Button
                        type="link"
                        icon={<EyeOutlined />}
                        onClick={() => showBookingDetail(record)}
                    />
                </Tooltip>
            ),
        },
    ];

    return (
        <div className="fade-in">
            <Space direction="vertical" size="large" style={{ width: "100%" }}>
                <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Title level={2} style={{ margin: 0 }}>
                        <HistoryOutlined /> ประวัติการเบิก-คืนกุญแจ
                    </Title>
                    <Button icon={<ReloadOutlined />} onClick={handleRefresh}>
                        รีเฟรช
                    </Button>
                </div>

                {/* Stats Cards */}
                <Row gutter={16}>
                    <Col xs={24} sm={12} md={6}>
                        <Card className="stat-card-orange">
                            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                                <div style={{ width: 44, height: 44, borderRadius: 10, background: "rgba(249,115,22,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                    <ClockCircleOutlined style={{ fontSize: 20, color: "#f97316" }} />
                                </div>
                                <Statistic title="กำลังเบิกอยู่" value={activeBookings.length} />
                            </div>
                        </Card>
                    </Col>
                    <Col xs={24} sm={12} md={6}>
                        <Card className="stat-card-red">
                            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                                <div style={{ width: 44, height: 44, borderRadius: 10, background: "rgba(239,68,68,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                    <WarningOutlined style={{ fontSize: 20, color: "#ef4444" }} />
                                </div>
                                <Statistic title="เลยกำหนดคืน" value={overdueBookings.length} />
                            </div>
                        </Card>
                    </Col>
                    <Col xs={24} sm={12} md={6}>
                        <Card className="stat-card-blue">
                            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                                <div style={{ width: 44, height: 44, borderRadius: 10, background: "rgba(59,130,246,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                    <HistoryOutlined style={{ fontSize: 20, color: "#3b82f6" }} />
                                </div>
                                <Statistic title="เบิกวันนี้" value={stats?.totalBorrow || 0} />
                            </div>
                        </Card>
                    </Col>
                    <Col xs={24} sm={12} md={6}>
                        <Card className="stat-card-green">
                            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                                <div style={{ width: 44, height: 44, borderRadius: 10, background: "rgba(22,163,74,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                    <CheckCircleOutlined style={{ fontSize: 20, color: "#16a34a" }} />
                                </div>
                                <Statistic title="คืนวันนี้" value={stats?.totalReturn || 0} />
                            </div>
                        </Card>
                    </Col>
                </Row>

                {/* Main Table */}
                <Card className="feature-card">
                    <Space
                        direction="vertical"
                        size="middle"
                        style={{ width: "100%", marginBottom: 16 }}
                    >
                        <Space wrap>
                            <Input
                                placeholder="ค้นหา รหัสนักศึกษา, ชื่อ, ห้อง..."
                                prefix={<SearchOutlined />}
                                style={{ width: 300 }}
                                value={searchText}
                                onChange={(e) => setSearchText(e.target.value)}
                                onPressEnter={handleSearch}
                            />
                            <Button type="primary" onClick={handleSearch}>ค้นหา</Button>

                            <Select
                                placeholder="สถานะ"
                                style={{ width: 150 }}
                                allowClear
                                onChange={setStatusFilter}
                            >
                                <Select.Option value="BORROWED">กำลังเบิก</Select.Option>
                                <Select.Option value="RETURNED">คืนแล้ว</Select.Option>
                                <Select.Option value="LATE">คืนเลยกำหนด</Select.Option>
                            </Select>

                            <RangePicker
                                placeholder={["วันที่เริ่มต้น", "วันที่สิ้นสุด"]}
                                style={{ width: 300 }}
                                onChange={setDateRange}
                            />
                        </Space>
                    </Space>

                    <Table
                        columns={columns}
                        dataSource={bookings}
                        rowKey="id"
                        loading={loading}
                        pagination={{
                            ...pagination,
                            showSizeChanger: true,
                            showTotal: (total) => `ทั้งหมด ${total} รายการ`,
                            onChange: (page, pageSize) => {
                                setPagination(prev => ({ ...prev, current: page, pageSize }));
                            }
                        }}
                    />
                </Card>
            </Space>

            {/* Booking Detail Modal */}
            <Modal
                title="รายละเอียดการจอง"
                open={detailModalVisible}
                onCancel={() => setDetailModalVisible(false)}
                footer={null}
                width={600}
            >
                {selectedBooking && (
                    <div>
                        <Row gutter={[16, 16]}>
                            <Col span={12}>
                                <Text type="secondary">ผู้เบิก:</Text>
                                <br />
                                <Text strong>
                                    {selectedBooking.user?.firstName} {selectedBooking.user?.lastName}
                                </Text>
                                <br />
                                <Text type="secondary">{selectedBooking.user?.studentCode}</Text>
                            </Col>
                            <Col span={12}>
                                <Text type="secondary">ห้อง:</Text>
                                <br />
                                <Tag color="blue" style={{ fontSize: 16 }}>
                                    {selectedBooking.key?.roomCode}
                                </Tag>
                            </Col>
                            <Col span={12}>
                                <Text type="secondary">เวลาเบิก:</Text>
                                <br />
                                <Text>{dayjs(selectedBooking.borrowAt).format("DD/MM/YYYY HH:mm")}</Text>
                            </Col>
                            <Col span={12}>
                                <Text type="secondary">กำหนดคืน:</Text>
                                <br />
                                <Text>{dayjs(selectedBooking.dueAt).format("DD/MM/YYYY HH:mm")}</Text>
                            </Col>
                            <Col span={12}>
                                <Text type="secondary">เวลาคืน:</Text>
                                <br />
                                <Text>
                                    {selectedBooking.returnAt
                                        ? dayjs(selectedBooking.returnAt).format("DD/MM/YYYY HH:mm")
                                        : "-"
                                    }
                                </Text>
                            </Col>
                            <Col span={12}>
                                <Text type="secondary">สถานะ:</Text>
                                <br />
                                <Tag color={getStatusConfig(selectedBooking.status).color}>
                                    {getStatusConfig(selectedBooking.status).text}
                                </Tag>
                            </Col>
                            {(selectedBooking.lateMinutes > 0 || selectedBooking.penaltyScore > 0) && (
                                <>
                                    <Col span={12}>
                                        <Text type="secondary">สายไป:</Text>
                                        <br />
                                        <Text type="danger">{selectedBooking.lateMinutes} นาที</Text>
                                    </Col>
                                    <Col span={12}>
                                        <Text type="secondary">หักคะแนน:</Text>
                                        <br />
                                        <Text type="danger">{selectedBooking.penaltyScore} คะแนน</Text>
                                    </Col>
                                </>
                            )}
                        </Row>
                    </div>
                )}
            </Modal>
        </div>
    );
}
