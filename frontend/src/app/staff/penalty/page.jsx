"use client";

import React, { useState, useEffect } from "react";
import {
    Table,
    Space,
    Typography,
    Card,
    Tag,
    Button,
    Input,
    message,
    Row,
    Col,
    Statistic,
    Modal,
    Form,
    InputNumber,
    Select,
    Divider,
    Descriptions,
    Tooltip,
} from "antd";
import {
    SettingOutlined,
    ExclamationCircleOutlined,
    MinusCircleOutlined,
    HistoryOutlined,
    SaveOutlined,
    UserOutlined,
    ReloadOutlined,
} from "@ant-design/icons";
import { penaltyAPI, usersAPI } from "@/service/api";
import dayjs from "dayjs";

const { Title, Text } = Typography;

export default function PenaltyPage() {
    const [loading, setLoading] = useState(false);
    const [config, setConfig] = useState(null);
    const [penaltyLogs, setPenaltyLogs] = useState([]);
    const [users, setUsers] = useState([]);
    const [configModalVisible, setConfigModalVisible] = useState(false);
    const [manualPenaltyModalVisible, setManualPenaltyModalVisible] = useState(false);
    const [stats, setStats] = useState(null);
    const [configForm] = Form.useForm();
    const [penaltyForm] = Form.useForm();

    useEffect(() => {
        fetchConfig();
        fetchPenaltyLogs();
        fetchStats();
        fetchUsers();
    }, []);

    const fetchConfig = async () => {
        try {
            const response = await penaltyAPI.getConfig();
            setConfig(response.data.data);
        } catch (error) {
            console.error("Error fetching config:", error);
            if (error.response?.status === 404) {
                message.info("ยังไม่มี Penalty Config กรุณาสร้างใหม่");
            }
        }
    };

    const fetchPenaltyLogs = async () => {
        try {
            setLoading(true);
            const response = await penaltyAPI.getLogs({ limit: 50 });
            setPenaltyLogs(response.data.data || []);
        } catch (error) {
            console.error("Error fetching penalty logs:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const response = await penaltyAPI.getStats();
            setStats(response.data.data);
        } catch (error) {
            console.error("Error fetching stats:", error);
        }
    };

    const fetchUsers = async () => {
        try {
            const response = await usersAPI.getAll();
            setUsers(response.data.data || []);
        } catch (error) {
            console.error("Error fetching users:", error);
        }
    };

    const handleSaveConfig = async (values) => {
        try {
            if (config?.id) {
                await penaltyAPI.updateConfig(config.id, values);
                message.success("อัพเดต Config สำเร็จ");
            } else {
                await penaltyAPI.createConfig(values);
                message.success("สร้าง Config สำเร็จ");
            }
            setConfigModalVisible(false);
            fetchConfig();
        } catch (error) {
            console.error("Error saving config:", error);
            message.error("ไม่สามารถบันทึก Config ได้");
        }
    };

    const handleManualPenalty = async (values) => {
        try {
            await penaltyAPI.manualPenalty(values);
            message.success("หักคะแนนสำเร็จ");
            setManualPenaltyModalVisible(false);
            penaltyForm.resetFields();
            fetchPenaltyLogs();
            fetchStats();
        } catch (error) {
            console.error("Error applying penalty:", error);
            message.error(error.response?.data?.message || "ไม่สามารถหักคะแนนได้");
        }
    };

    const openConfigModal = () => {
        if (config) {
            configForm.setFieldsValue({
                graceMinutes: config.graceMinutes,
                intervalMinutes: config.intervalMinutes,
                scorePerInterval: config.scorePerInterval,
                restoreDays: config.restoreDays,
            });
        } else {
            configForm.setFieldsValue({
                graceMinutes: 30,
                intervalMinutes: 15,
                scorePerInterval: 5,
                restoreDays: 7,
            });
        }
        setConfigModalVisible(true);
    };

    const handleRefresh = () => {
        fetchConfig();
        fetchPenaltyLogs();
        fetchStats();
        message.success("รีเฟรชข้อมูลสำเร็จ");
    };

    const columns = [
        {
            title: "ผู้ใช้",
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
            title: "ประเภท",
            dataIndex: "type",
            key: "type",
            width: 130,
            render: (type) => (
                <Tag color={type === "LATE_RETURN" ? "orange" : "red"}>
                    {type === "LATE_RETURN" ? "คืนสาย" : "หักคะแนนเอง"}
                </Tag>
            ),
        },
        {
            title: "คะแนนที่หัก",
            dataIndex: "scoreCut",
            key: "scoreCut",
            width: 100,
            render: (score) => (
                <Text type="danger" strong>-{score}</Text>
            ),
        },
        {
            title: "คะแนนคงเหลือ",
            dataIndex: "scoreAfter",
            key: "scoreAfter",
            width: 120,
            render: (score) => (
                <Tag color={score <= 0 ? "red" : score <= 30 ? "orange" : "green"}>
                    {score}
                </Tag>
            ),
        },
        {
            title: "เหตุผล",
            dataIndex: "reason",
            key: "reason",
            ellipsis: true,
            render: (reason) => (
                <Tooltip title={reason}>
                    <span>{reason || "-"}</span>
                </Tooltip>
            ),
        },
        {
            title: "วันที่",
            dataIndex: "createdAt",
            key: "createdAt",
            width: 150,
            render: (date) => dayjs(date).format("DD/MM/YYYY HH:mm"),
        },
    ];

    return (
        <div>
            <Space direction="vertical" size="large" style={{ width: "100%" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Title level={2}>
                        <ExclamationCircleOutlined /> จัดการ Penalty
                    </Title>
                    <Space>
                        <Button icon={<ReloadOutlined />} onClick={handleRefresh}>
                            รีเฟรช
                        </Button>
                        <Button
                            type="primary"
                            danger
                            icon={<MinusCircleOutlined />}
                            onClick={() => setManualPenaltyModalVisible(true)}
                        >
                            หักคะแนน Manual
                        </Button>
                    </Space>
                </div>

                {/* Config Card */}
                <Card
                    title={<><SettingOutlined /> ตั้งค่า Penalty Config</>}
                    extra={
                        <Button type="primary" onClick={openConfigModal}>
                            {config ? "แก้ไข Config" : "สร้าง Config"}
                        </Button>
                    }
                >
                    {config ? (
                        <Descriptions bordered column={{ xs: 1, sm: 2, md: 3 }}>
                            <Descriptions.Item label="Grace Period">
                                <Text strong>{config.graceMinutes} นาที</Text>
                                <br />
                                <Text type="secondary">ช่วงเวลาผ่อนผันก่อนเริ่มหักคะแนน</Text>
                            </Descriptions.Item>
                            <Descriptions.Item label="ช่วงเวลาหักคะแนน">
                                <Text strong>ทุก {config.intervalMinutes} นาที</Text>
                                <br />
                                <Text type="secondary">หลังเลย Grace Period</Text>
                            </Descriptions.Item>
                            <Descriptions.Item label="คะแนนที่หักต่อช่วง">
                                <Text strong type="danger">{config.scorePerInterval} คะแนน</Text>
                                <br />
                                <Text type="secondary">ต่อ {config.intervalMinutes} นาที</Text>
                            </Descriptions.Item>
                            <Descriptions.Item label="ระยะเวลาคืนคะแนน">
                                <Text strong>{config.restoreDays} วัน</Text>
                                <br />
                                <Text type="secondary">หลังจากถูกหักคะแนน</Text>
                            </Descriptions.Item>
                        </Descriptions>
                    ) : (
                        <div style={{ textAlign: "center", padding: "20px" }}>
                            <Text type="secondary">ยังไม่มี Config กรุณาสร้างใหม่</Text>
                        </div>
                    )}
                </Card>

                {/* Stats */}
                <Row gutter={16}>
                    <Col xs={24} sm={12} md={8}>
                        <Card>
                            <Statistic
                                title="รวม Penalty วันนี้"
                                value={stats?.todayCount || 0}
                                prefix={<ExclamationCircleOutlined />}
                            />
                        </Card>
                    </Col>
                    <Col xs={24} sm={12} md={8}>
                        <Card>
                            <Statistic
                                title="รวมคะแนนที่หักวันนี้"
                                value={stats?.todayScoreCut || 0}
                                valueStyle={{ color: "#ff4d4f" }}
                                prefix={<MinusCircleOutlined />}
                            />
                        </Card>
                    </Col>
                    <Col xs={24} sm={12} md={8}>
                        <Card>
                            <Statistic
                                title="ผู้ใช้ถูกแบนเดือนนี้"
                                value={stats?.bannedThisMonth || 0}
                                valueStyle={{ color: "#ff4d4f" }}
                                prefix={<UserOutlined />}
                            />
                        </Card>
                    </Col>
                </Row>

                {/* Penalty Logs */}
                <Card title={<><HistoryOutlined /> ประวัติการหักคะแนน</>}>
                    <Table
                        columns={columns}
                        dataSource={penaltyLogs}
                        rowKey="id"
                        loading={loading}
                        pagination={{
                            pageSize: 10,
                            showSizeChanger: true,
                            showTotal: (total) => `ทั้งหมด ${total} รายการ`,
                        }}
                    />
                </Card>
            </Space>

            {/* Config Modal */}
            <Modal
                title={config ? "แก้ไข Penalty Config" : "สร้าง Penalty Config"}
                open={configModalVisible}
                onOk={() => configForm.submit()}
                onCancel={() => setConfigModalVisible(false)}
                okText="บันทึก"
                cancelText="ยกเลิก"
            >
                <Form
                    form={configForm}
                    layout="vertical"
                    onFinish={handleSaveConfig}
                >
                    <Form.Item
                        name="graceMinutes"
                        label="Grace Period (นาที)"
                        rules={[{ required: true, message: "กรุณากรอก Grace Period" }]}
                        extra="ช่วงเวลาที่ยังไม่หักคะแนน หลังจากเลยกำหนดคืน"
                    >
                        <InputNumber min={0} max={120} style={{ width: "100%" }} />
                    </Form.Item>

                    <Form.Item
                        name="intervalMinutes"
                        label="ช่วงเวลาหักคะแนน (นาที)"
                        rules={[{ required: true, message: "กรุณากรอกช่วงเวลา" }]}
                        extra="หักคะแนนทุกๆ กี่นาที หลังเลย Grace Period"
                    >
                        <InputNumber min={1} max={60} style={{ width: "100%" }} />
                    </Form.Item>

                    <Form.Item
                        name="scorePerInterval"
                        label="คะแนนที่หักต่อช่วง"
                        rules={[{ required: true, message: "กรุณากรอกคะแนน" }]}
                        extra="หักกี่คะแนนต่อ 1 ช่วงเวลา"
                    >
                        <InputNumber min={1} max={20} style={{ width: "100%" }} />
                    </Form.Item>

                    <Form.Item
                        name="restoreDays"
                        label="ระยะเวลาคืนคะแนน (วัน)"
                        rules={[{ required: true, message: "กรุณากรอกจำนวนวัน" }]}
                        extra="คืนคะแนนให้หลังจากผ่านไปกี่วัน"
                    >
                        <InputNumber min={1} max={365} style={{ width: "100%" }} />
                    </Form.Item>
                </Form>
            </Modal>

            {/* Manual Penalty Modal */}
            <Modal
                title="หักคะแนน Manual"
                open={manualPenaltyModalVisible}
                onOk={() => penaltyForm.submit()}
                onCancel={() => {
                    setManualPenaltyModalVisible(false);
                    penaltyForm.resetFields();
                }}
                okText="หักคะแนน"
                okButtonProps={{ danger: true }}
                cancelText="ยกเลิก"
            >
                <Form
                    form={penaltyForm}
                    layout="vertical"
                    onFinish={handleManualPenalty}
                >
                    <Form.Item
                        name="userId"
                        label="เลือกผู้ใช้"
                        rules={[{ required: true, message: "กรุณาเลือกผู้ใช้" }]}
                    >
                        <Select
                            showSearch
                            placeholder="ค้นหาผู้ใช้..."
                            optionFilterProp="children"
                            filterOption={(input, option) =>
                                option.children.toLowerCase().includes(input.toLowerCase())
                            }
                        >
                            {users.filter(u => u.role === 'STUDENT').map((user) => (
                                <Select.Option key={user.id} value={user.id}>
                                    {user.studentCode} - {user.firstName} {user.lastName}
                                </Select.Option>
                            ))}
                        </Select>
                    </Form.Item>

                    <Form.Item
                        name="scoreCut"
                        label="คะแนนที่ต้องการหัก"
                        rules={[{ required: true, message: "กรุณากรอกคะแนน" }]}
                    >
                        <InputNumber min={1} max={100} style={{ width: "100%" }} />
                    </Form.Item>

                    <Form.Item
                        name="reason"
                        label="เหตุผล"
                        rules={[{ required: true, message: "กรุณากรอกเหตุผล" }]}
                    >
                        <Input.TextArea rows={3} placeholder="ระบุเหตุผลในการหักคะแนน..." />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}
