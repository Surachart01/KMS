"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
    Table,
    Space,
    Typography,
    Card,
    Tag,
    Button,
    Select,
    message,
    Modal,
    DatePicker,
    TimePicker,
    Popconfirm,
    Row,
    Col,
    Form,
    Divider,
    Empty,
    Spin,
    Tabs,
    Statistic,
} from "antd";
import {
    PlusOutlined,
    DeleteOutlined,
    KeyOutlined,
    UserOutlined,
    ReloadOutlined,
    SyncOutlined,
    SafetyCertificateOutlined,
    CalendarOutlined,
    EditOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import "dayjs/locale/th";
import { authorizationsAPI, usersAPI, schedulesAPI } from "@/service/api";

dayjs.locale("th");

const { Title, Text } = Typography;

export default function AuthorizationPage() {
    // Data State
    const [loading, setLoading] = useState(false);
    const [syncLoading, setSyncLoading] = useState(false);
    const [scheduleAuths, setScheduleAuths] = useState([]);
    const [manualAuths, setManualAuths] = useState([]);

    // Students for add modal
    const [allStudents, setAllStudents] = useState([]);

    // Filter State
    const [filterDate, setFilterDate] = useState(dayjs());
    const [filterRoom, setFilterRoom] = useState(null);

    // Unique rooms from data
    const [uniqueRooms, setUniqueRooms] = useState([]);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [form] = Form.useForm();

    // Active Tab
    const [activeTab, setActiveTab] = useState("schedule");

    // ==================== Fetch Functions ====================

    const fetchAuthorizations = useCallback(async () => {
        setLoading(true);
        try {
            const dateStr = filterDate.format("YYYY-MM-DD");

            const [scheduleRes, manualRes] = await Promise.all([
                authorizationsAPI.getAll({ date: dateStr, source: "SCHEDULE", roomCode: filterRoom || undefined }),
                authorizationsAPI.getAll({ date: dateStr, source: "MANUAL", roomCode: filterRoom || undefined }),
            ]);

            const sData = scheduleRes.data?.data || [];
            const mData = manualRes.data?.data || [];

            setScheduleAuths(sData);
            setManualAuths(mData);

            // Extract unique rooms
            const allData = [...sData, ...mData];
            const rooms = [...new Set(allData.map((a) => a.roomCode))].sort();
            setUniqueRooms(rooms);
        } catch (error) {
            console.error("Error fetching authorizations:", error);
            message.error("ไม่สามารถดึงข้อมูลสิทธิ์ได้");
        } finally {
            setLoading(false);
        }
    }, [filterDate, filterRoom]);

    const fetchStudents = async () => {
        try {
            const res = await usersAPI.getAll({ role: "STUDENT" });
            setAllStudents(res.data?.data || []);
        } catch (error) {
            console.error("Error fetching students:", error);
        }
    };

    useEffect(() => {
        fetchAuthorizations();
    }, [fetchAuthorizations]);

    useEffect(() => {
        fetchStudents();
    }, []);

    // ==================== Handlers ====================

    const handleSyncToday = async () => {
        setSyncLoading(true);
        try {
            const res = await authorizationsAPI.syncToday();
            const data = res.data;
            message.success(data.message || "ซิงค์สำเร็จ");
            // Re-fetch to show new data
            await fetchAuthorizations();
        } catch (error) {
            console.error("Error syncing today:", error);
            message.error("เกิดข้อผิดพลาดในการซิงค์");
        } finally {
            setSyncLoading(false);
        }
    };

    const handleAddManual = async (values) => {
        try {
            setLoading(true);
            const dateStr = values.date.format("YYYY-MM-DD");

            await authorizationsAPI.create({
                userId: values.userId,
                roomCode: values.roomCode,
                date: dateStr,
                startTime: values.date
                    .hour(values.startTime.hour())
                    .minute(values.startTime.minute())
                    .second(0)
                    .toISOString(),
                endTime: values.date
                    .hour(values.endTime.hour())
                    .minute(values.endTime.minute())
                    .second(0)
                    .toISOString(),
            });

            message.success("เพิ่มสิทธิ์สำเร็จ");
            setIsModalOpen(false);
            form.resetFields();
            await fetchAuthorizations();
        } catch (error) {
            console.error("Error adding authorization:", error);
            if (error.response?.status === 500 && error.response?.data?.message?.includes("Unique")) {
                message.warning("สิทธิ์นี้มีอยู่แล้ว");
            } else {
                message.error("เกิดข้อผิดพลาดในการเพิ่มสิทธิ์");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        try {
            await authorizationsAPI.delete(id);
            message.success("ลบสิทธิ์สำเร็จ");
            await fetchAuthorizations();
        } catch (error) {
            console.error("Error deleting authorization:", error);
            message.error("เกิดข้อผิดพลาดในการลบสิทธิ์");
        }
    };

    // ==================== Table Columns ====================

    const columns = [
        {
            title: "ห้อง",
            dataIndex: "roomCode",
            key: "roomCode",
            width: 100,
            render: (roomCode) => (
                <Tag color="blue" icon={<KeyOutlined />}>
                    {roomCode}
                </Tag>
            ),
        },
        {
            title: "รหัสนักศึกษา",
            key: "studentCode",
            width: 130,
            render: (_, record) => record.user?.studentCode || "-",
        },
        {
            title: "ชื่อ-นามสกุล",
            key: "name",
            render: (_, record) =>
                record.user
                    ? `${record.user.firstName} ${record.user.lastName}`
                    : "-",
        },
        {
            title: "วิชา",
            key: "subject",
            render: (_, record) =>
                record.subject
                    ? `${record.subject.code} - ${record.subject.name}`
                    : "-",
        },
        {
            title: "เวลา",
            key: "time",
            width: 150,
            render: (_, record) => (
                <span>
                    {dayjs(record.startTime).format("HH:mm")} -{" "}
                    {dayjs(record.endTime).format("HH:mm")}
                </span>
            ),
        },
        {
            title: "จัดการ",
            key: "action",
            width: 80,
            render: (_, record) => (
                <Popconfirm
                    title="ยืนยันการลบ"
                    description="ต้องการลบสิทธิ์นี้หรือไม่?"
                    onConfirm={() => handleDelete(record.id)}
                    okText="ลบ"
                    cancelText="ยกเลิก"
                >
                    <Button
                        type="text"
                        danger
                        size="small"
                        icon={<DeleteOutlined />}
                    />
                </Popconfirm>
            ),
        },
    ];

    // ==================== Render ====================

    return (
        <div className="fade-in">
            <Space direction="vertical" size="large" style={{ width: "100%" }}>
                {/* Header */}
                <Row className="page-header" justify="space-between" align="middle">
                    <Col>
                        <Title level={2} style={{ margin: 0 }}>
                            <SafetyCertificateOutlined /> อนุญาตเบิกกุญแจ
                        </Title>
                        <Text type="secondary">
                            จัดการสิทธิ์การเบิกกุญแจรายวัน — ซิงค์จากตารางสอนหรือเพิ่มด้วยมือ
                        </Text>
                    </Col>
                </Row>

                {/* Filters */}
                <Card size="small">
                    <Row gutter={16} align="middle">
                        <Col>
                            <Space>
                                <CalendarOutlined />
                                <Text strong>วันที่:</Text>
                                <DatePicker
                                    value={filterDate}
                                    onChange={(d) => setFilterDate(d || dayjs())}
                                    format="DD/MM/YYYY"
                                    allowClear={false}
                                    style={{ width: 160 }}
                                />
                            </Space>
                        </Col>
                        <Col>
                            <Space>
                                <KeyOutlined />
                                <Text strong>ห้อง:</Text>
                                <Select
                                    placeholder="ทุกห้อง"
                                    value={filterRoom}
                                    onChange={setFilterRoom}
                                    style={{ width: 160 }}
                                    allowClear
                                    options={uniqueRooms.map((r) => ({
                                        value: r,
                                        label: r,
                                    }))}
                                />
                            </Space>
                        </Col>
                        <Col>
                            <Button
                                icon={<ReloadOutlined />}
                                onClick={() => {
                                    setFilterRoom(null);
                                    setFilterDate(dayjs());
                                }}
                            >
                                รีเซ็ต
                            </Button>
                        </Col>
                    </Row>
                </Card>

                {/* Stats */}
                <Row gutter={16}>
                    <Col span={8}>
                        <Card size="small" className="stat-card-blue">
                            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                                <div style={{ width: 44, height: 44, borderRadius: 10, background: "rgba(59,130,246,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                    <CalendarOutlined style={{ fontSize: 20, color: "#3b82f6" }} />
                                </div>
                                <Statistic title="สิทธิ์จากตารางสอน" value={scheduleAuths.length} suffix="คน" />
                            </div>
                        </Card>
                    </Col>
                    <Col span={8}>
                        <Card size="small" className="stat-card-orange">
                            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                                <div style={{ width: 44, height: 44, borderRadius: 10, background: "rgba(249,115,22,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                    <EditOutlined style={{ fontSize: 20, color: "#f97316" }} />
                                </div>
                                <Statistic title="สิทธิ์เพิ่มเอง" value={manualAuths.length} suffix="คน" />
                            </div>
                        </Card>
                    </Col>
                    <Col span={8}>
                        <Card size="small" className="stat-card-green">
                            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                                <div style={{ width: 44, height: 44, borderRadius: 10, background: "rgba(22,163,74,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                    <SafetyCertificateOutlined style={{ fontSize: 20, color: "#16a34a" }} />
                                </div>
                                <Statistic title="รวมทั้งหมด" value={scheduleAuths.length + manualAuths.length} suffix="คน" />
                            </div>
                        </Card>
                    </Col>
                </Row>

                {/* Tabs */}
                <Card>
                    <Tabs
                        activeKey={activeTab}
                        onChange={setActiveTab}
                        tabBarExtraContent={
                            activeTab === "schedule" ? (
                                <Button
                                    type="primary"
                                    icon={<SyncOutlined />}
                                    onClick={handleSyncToday}
                                    loading={syncLoading}
                                >
                                    ซิงค์วันนี้
                                </Button>
                            ) : (
                                <Button
                                    type="primary"
                                    icon={<PlusOutlined />}
                                    onClick={() => {
                                        form.setFieldsValue({
                                            date: filterDate,
                                            startTime: dayjs().hour(8).minute(0),
                                            endTime: dayjs().hour(17).minute(0),
                                        });
                                        setIsModalOpen(true);
                                    }}
                                >
                                    เพิ่มสิทธิ์
                                </Button>
                            )
                        }
                        items={[
                            {
                                key: "schedule",
                                label: (
                                    <span>
                                        <CalendarOutlined /> จากตารางสอน ({scheduleAuths.length})
                                    </span>
                                ),
                                children: (
                                    <Spin spinning={loading}>
                                        <Table
                                            columns={columns}
                                            dataSource={scheduleAuths}
                                            rowKey="id"
                                            size="small"
                                            pagination={{
                                                pageSize: 20,
                                                showSizeChanger: true,
                                                showTotal: (total) => `ทั้งหมด ${total} รายการ`,
                                            }}
                                            locale={{
                                                emptyText: (
                                                    <Empty
                                                        description='ยังไม่มีสิทธิ์จากตารางสอน กดปุ่ม "ซิงค์วันนี้" เพื่อสร้าง'
                                                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                                                    />
                                                ),
                                            }}
                                        />
                                    </Spin>
                                ),
                            },
                            {
                                key: "manual",
                                label: (
                                    <span>
                                        <EditOutlined /> เพิ่มเอง ({manualAuths.length})
                                    </span>
                                ),
                                children: (
                                    <Spin spinning={loading}>
                                        <Table
                                            columns={columns}
                                            dataSource={manualAuths}
                                            rowKey="id"
                                            size="small"
                                            pagination={{
                                                pageSize: 20,
                                                showSizeChanger: true,
                                                showTotal: (total) => `ทั้งหมด ${total} รายการ`,
                                            }}
                                            locale={{
                                                emptyText: (
                                                    <Empty
                                                        description="ยังไม่มีสิทธิ์ที่เพิ่มเอง"
                                                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                                                    />
                                                ),
                                            }}
                                        />
                                    </Spin>
                                ),
                            },
                        ]}
                    />
                </Card>
            </Space>

            {/* Add Manual Authorization Modal */}
            <Modal
                title={
                    <Space>
                        <PlusOutlined />
                        <span>เพิ่มสิทธิ์เบิกกุญแจ</span>
                    </Space>
                }
                open={isModalOpen}
                onCancel={() => {
                    setIsModalOpen(false);
                    form.resetFields();
                }}
                footer={null}
                width={500}
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleAddManual}
                >
                    <Form.Item
                        name="userId"
                        label="ผู้ได้รับสิทธิ์"
                        rules={[{ required: true, message: "กรุณาเลือกนักศึกษา" }]}
                    >
                        <Select
                            placeholder="ค้นหานักศึกษา (รหัส หรือ ชื่อ)"
                            showSearch
                            options={allStudents.map((u) => ({
                                value: u.id,
                                label: `${u.studentCode} - ${u.firstName} ${u.lastName}`,
                            }))}
                            filterOption={(input, option) =>
                                (option?.label ?? "")
                                    .toLowerCase()
                                    .includes(input.toLowerCase())
                            }
                        />
                    </Form.Item>

                    <Form.Item
                        name="roomCode"
                        label="ห้อง"
                        rules={[{ required: true, message: "กรุณาระบุห้อง" }]}
                    >
                        <Select
                            placeholder="พิมพ์รหัสห้อง"
                            showSearch
                            allowClear
                            options={uniqueRooms.map((r) => ({
                                value: r,
                                label: r,
                            }))}
                            // Allow typing custom room codes
                            filterOption={(input, option) =>
                                (option?.label ?? "")
                                    .toLowerCase()
                                    .includes(input.toLowerCase())
                            }
                        />
                    </Form.Item>

                    <Form.Item
                        name="date"
                        label="วันที่"
                        rules={[{ required: true, message: "กรุณาเลือกวันที่" }]}
                    >
                        <DatePicker
                            style={{ width: "100%" }}
                            format="DD/MM/YYYY"
                        />
                    </Form.Item>

                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item
                                name="startTime"
                                label="เวลาเริ่ม"
                                rules={[{ required: true, message: "กรุณาเลือกเวลาเริ่ม" }]}
                            >
                                <TimePicker
                                    style={{ width: "100%" }}
                                    format="HH:mm"
                                    minuteStep={15}
                                />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item
                                name="endTime"
                                label="เวลาสิ้นสุด"
                                rules={[{ required: true, message: "กรุณาเลือกเวลาสิ้นสุด" }]}
                            >
                                <TimePicker
                                    style={{ width: "100%" }}
                                    format="HH:mm"
                                    minuteStep={15}
                                />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Divider />

                    <Form.Item style={{ marginBottom: 0 }}>
                        <Space style={{ width: "100%", justifyContent: "flex-end" }}>
                            <Button
                                onClick={() => {
                                    setIsModalOpen(false);
                                    form.resetFields();
                                }}
                            >
                                ยกเลิก
                            </Button>
                            <Button type="primary" htmlType="submit" loading={loading}>
                                เพิ่มสิทธิ์
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}
