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
    Switch,
    Divider,
    Descriptions,
    Tooltip,
    Tabs,
} from "antd";
import {
    SettingOutlined,
    ExclamationCircleOutlined,
    MinusCircleOutlined,
    HistoryOutlined,
    UserOutlined,
    ReloadOutlined,
    EditOutlined,
    TrophyOutlined,
    StopOutlined,
    CheckCircleOutlined,
    SearchOutlined,
} from "@ant-design/icons";
import { penaltyAPI, usersAPI } from "@/service/api";
import dayjs from "dayjs";

const { Title, Text } = Typography;

export default function PenaltyPage() {
    const [loading, setLoading] = useState(false);
    const [config, setConfig] = useState(null);
    const [penaltyLogs, setPenaltyLogs] = useState([]);
    const [users, setUsers] = useState([]);
    const [scores, setScores] = useState([]);
    const [scoresLoading, setScoresLoading] = useState(false);
    const [configModalVisible, setConfigModalVisible] = useState(false);
    const [manualPenaltyModalVisible, setManualPenaltyModalVisible] = useState(false);
    const [editScoreModalVisible, setEditScoreModalVisible] = useState(false);
    const [editingStudent, setEditingStudent] = useState(null);
    const [stats, setStats] = useState(null);
    const [searchText, setSearchText] = useState("");
    const [configForm] = Form.useForm();
    const [penaltyForm] = Form.useForm();
    const [scoreForm] = Form.useForm();

    useEffect(() => {
        fetchConfig();
        fetchPenaltyLogs();
        fetchStats();
        fetchUsers();
        fetchScores();
    }, []);

    // ==================== Fetch Functions ====================

    const fetchConfig = async () => {
        try {
            const response = await penaltyAPI.getConfig();
            setConfig(response.data.data);
        } catch (error) {
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

    const fetchScores = async () => {
        try {
            setScoresLoading(true);
            const response = await penaltyAPI.getScores();
            setScores(response.data.data || []);
        } catch (error) {
            console.error("Error fetching scores:", error);
        } finally {
            setScoresLoading(false);
        }
    };

    // ==================== Handlers ====================

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
            fetchScores();
        } catch (error) {
            message.error(error.response?.data?.message || "ไม่สามารถหักคะแนนได้");
        }
    };

    const handleEditScore = (student) => {
        setEditingStudent(student);
        scoreForm.setFieldsValue({
            score: student.score,
            isBanned: student.isBanned,
            reason: "",
        });
        setEditScoreModalVisible(true);
    };

    const handleSaveScore = async (values) => {
        try {
            await penaltyAPI.updateScore(editingStudent.id, values);
            message.success("แก้ไขคะแนนสำเร็จ");
            setEditScoreModalVisible(false);
            scoreForm.resetFields();
            setEditingStudent(null);
            fetchScores();
            fetchPenaltyLogs();
            fetchStats();
        } catch (error) {
            message.error(error.response?.data?.message || "ไม่สามารถแก้ไขคะแนนได้");
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
        fetchScores();
        message.success("รีเฟรชข้อมูลสำเร็จ");
    };

    // ==================== Filtered Scores ====================

    const filteredScores = scores.filter((s) => {
        if (!searchText) return true;
        const text = searchText.toLowerCase();
        return (
            s.studentCode?.toLowerCase().includes(text) ||
            s.firstName?.toLowerCase().includes(text) ||
            s.lastName?.toLowerCase().includes(text) ||
            s.section?.major?.code?.toLowerCase().includes(text) ||
            s.section?.name?.toLowerCase().includes(text)
        );
    });

    // ==================== Score Table Columns ====================

    const scoreColumns = [
        {
            title: "รหัสนักศึกษา",
            dataIndex: "studentCode",
            key: "studentCode",
            width: 130,
            sorter: (a, b) => a.studentCode.localeCompare(b.studentCode),
        },
        {
            title: "ชื่อ-นามสกุล",
            key: "name",
            render: (_, record) => `${record.firstName} ${record.lastName}`,
            sorter: (a, b) => a.firstName.localeCompare(b.firstName),
        },
        {
            title: "สาขา",
            key: "major",
            width: 80,
            render: (_, record) => record.section?.major?.code || "-",
        },
        {
            title: "กลุ่ม",
            key: "section",
            width: 80,
            render: (_, record) => record.section?.name || "-",
        },
        {
            title: "คะแนน",
            dataIndex: "score",
            key: "score",
            width: 100,
            sorter: (a, b) => a.score - b.score,
            render: (score) => (
                <Tag
                    color={score >= 70 ? "green" : score >= 30 ? "orange" : "red"}
                    style={{ fontWeight: "bold", fontSize: 14 }}
                >
                    {score}
                </Tag>
            ),
        },
        {
            title: "สถานะ",
            dataIndex: "isBanned",
            key: "isBanned",
            width: 100,
            filters: [
                { text: "ปกติ", value: false },
                { text: "ถูกแบน", value: true },
            ],
            onFilter: (value, record) => record.isBanned === value,
            render: (isBanned) =>
                isBanned ? (
                    <Tag color="red" icon={<StopOutlined />}>
                        ถูกแบน
                    </Tag>
                ) : (
                    <Tag color="green" icon={<CheckCircleOutlined />}>
                        ปกติ
                    </Tag>
                ),
        },
        {
            title: "จัดการ",
            key: "action",
            width: 100,
            render: (_, record) => (
                <Button
                    type="primary"
                    size="small"
                    icon={<EditOutlined />}
                    onClick={() => handleEditScore(record)}
                >
                    แก้ไข
                </Button>
            ),
        },
    ];

    // ==================== Log Table Columns ====================

    const logColumns = [
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
                <Text type={score > 0 ? "danger" : "success"} strong>
                    {score > 0 ? `-${score}` : `+${Math.abs(score)}`}
                </Text>
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

    // ==================== Render ====================

    return (
        <div className="fade-in">
            <Space direction="vertical" size="large" style={{ width: "100%" }}>
                {/* Header */}
                <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Title level={2} style={{ margin: 0 }}>
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

                {/* Stats */}
                <Row gutter={16}>
                    <Col xs={24} sm={8}>
                        <Card size="small" className="stat-card-blue">
                            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                                <div style={{ width: 44, height: 44, borderRadius: 10, background: "rgba(59,130,246,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                    <ExclamationCircleOutlined style={{ fontSize: 20, color: "#3b82f6" }} />
                                </div>
                                <Statistic title="รวม Penalty ทั้งหมด" value={stats?.totalLogs || 0} />
                            </div>
                        </Card>
                    </Col>
                    <Col xs={24} sm={8}>
                        <Card size="small" className="stat-card-red">
                            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                                <div style={{ width: 44, height: 44, borderRadius: 10, background: "rgba(239,68,68,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                    <MinusCircleOutlined style={{ fontSize: 20, color: "#ef4444" }} />
                                </div>
                                <Statistic title="รวมคะแนนที่หัก" value={stats?.totalScoreCut || 0} />
                            </div>
                        </Card>
                    </Col>
                    <Col xs={24} sm={8}>
                        <Card size="small" className={scores.filter((s) => s.isBanned).length > 0 ? "stat-card-orange" : "stat-card-green"}>
                            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                                <div style={{ width: 44, height: 44, borderRadius: 10, background: scores.filter((s) => s.isBanned).length > 0 ? "rgba(249,115,22,0.1)" : "rgba(22,163,74,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                    <StopOutlined style={{ fontSize: 20, color: scores.filter((s) => s.isBanned).length > 0 ? "#f97316" : "#16a34a" }} />
                                </div>
                                <Statistic title="นักศึกษาถูกแบน" value={scores.filter((s) => s.isBanned).length} />
                            </div>
                        </Card>
                    </Col>
                </Row>

                {/* Tabs: Scores + Config + Logs */}
                <Card>
                    <Tabs
                        defaultActiveKey="scores"
                        items={[
                            {
                                key: "scores",
                                label: (
                                    <span>
                                        <TrophyOutlined /> คะแนนนักศึกษา ({scores.length})
                                    </span>
                                ),
                                children: (
                                    <>
                                        <div style={{ marginBottom: 16 }}>
                                            <Input
                                                placeholder="ค้นหา รหัส, ชื่อ, สาขา..."
                                                prefix={<SearchOutlined />}
                                                value={searchText}
                                                onChange={(e) => setSearchText(e.target.value)}
                                                allowClear
                                                style={{ width: 300 }}
                                            />
                                        </div>
                                        <Table
                                            columns={scoreColumns}
                                            dataSource={filteredScores}
                                            rowKey="id"
                                            loading={scoresLoading}
                                            size="small"
                                            pagination={{
                                                pageSize: 20,
                                                showSizeChanger: true,
                                                showTotal: (total) => `ทั้งหมด ${total} คน`,
                                            }}
                                        />
                                    </>
                                ),
                            },
                            {
                                key: "config",
                                label: (
                                    <span>
                                        <SettingOutlined /> ตั้งค่า Config
                                    </span>
                                ),
                                children: (
                                    <>
                                        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
                                            <Button type="primary" onClick={openConfigModal}>
                                                {config ? "แก้ไข Config" : "สร้าง Config"}
                                            </Button>
                                        </div>
                                        {config ? (
                                            <Descriptions bordered column={{ xs: 1, sm: 2, md: 2 }}>
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
                                            <div style={{ textAlign: "center", padding: 20 }}>
                                                <Text type="secondary">ยังไม่มี Config กรุณาสร้างใหม่</Text>
                                            </div>
                                        )}
                                    </>
                                ),
                            },
                            {
                                key: "logs",
                                label: (
                                    <span>
                                        <HistoryOutlined /> ประวัติการหักคะแนน ({penaltyLogs.length})
                                    </span>
                                ),
                                children: (
                                    <Table
                                        columns={logColumns}
                                        dataSource={penaltyLogs}
                                        rowKey="id"
                                        loading={loading}
                                        size="small"
                                        pagination={{
                                            pageSize: 10,
                                            showSizeChanger: true,
                                            showTotal: (total) => `ทั้งหมด ${total} รายการ`,
                                        }}
                                    />
                                ),
                            },
                        ]}
                    />
                </Card>
            </Space>

            {/* Edit Score Modal */}
            <Modal
                title={
                    <Space>
                        <EditOutlined />
                        <span>แก้ไขคะแนน</span>
                    </Space>
                }
                open={editScoreModalVisible}
                onCancel={() => {
                    setEditScoreModalVisible(false);
                    scoreForm.resetFields();
                    setEditingStudent(null);
                }}
                footer={null}
                width={480}
            >
                {editingStudent && (
                    <>
                        <Card size="small" style={{ marginBottom: 16, background: "#fafafa" }}>
                            <Row gutter={16}>
                                <Col span={12}>
                                    <Text type="secondary">รหัสนักศึกษา</Text>
                                    <br />
                                    <Text strong>{editingStudent.studentCode}</Text>
                                </Col>
                                <Col span={12}>
                                    <Text type="secondary">ชื่อ-นามสกุล</Text>
                                    <br />
                                    <Text strong>{editingStudent.firstName} {editingStudent.lastName}</Text>
                                </Col>
                            </Row>
                            <Row gutter={16} style={{ marginTop: 8 }}>
                                <Col span={12}>
                                    <Text type="secondary">คะแนนปัจจุบัน</Text>
                                    <br />
                                    <Tag
                                        color={editingStudent.score >= 70 ? "green" : editingStudent.score >= 30 ? "orange" : "red"}
                                        style={{ fontWeight: "bold", fontSize: 16 }}
                                    >
                                        {editingStudent.score}
                                    </Tag>
                                </Col>
                                <Col span={12}>
                                    <Text type="secondary">สถานะ</Text>
                                    <br />
                                    {editingStudent.isBanned ? (
                                        <Tag color="red" icon={<StopOutlined />}>ถูกแบน</Tag>
                                    ) : (
                                        <Tag color="green" icon={<CheckCircleOutlined />}>ปกติ</Tag>
                                    )}
                                </Col>
                            </Row>
                        </Card>

                        <Form form={scoreForm} layout="vertical" onFinish={handleSaveScore}>
                            <Form.Item
                                name="score"
                                label="คะแนนใหม่"
                                rules={[{ required: true, message: "กรุณาระบุคะแนน" }]}
                            >
                                <InputNumber min={0} max={100} style={{ width: "100%" }} size="large" />
                            </Form.Item>

                            <Form.Item
                                name="isBanned"
                                label="สถานะแบน"
                                valuePropName="checked"
                            >
                                <Switch
                                    checkedChildren="แบน"
                                    unCheckedChildren="ปกติ"
                                />
                            </Form.Item>

                            <Form.Item
                                name="reason"
                                label="เหตุผล (ไม่บังคับ)"
                            >
                                <Input.TextArea rows={2} placeholder="ระบุเหตุผลในการแก้ไข..." />
                            </Form.Item>

                            <Divider />

                            <Form.Item style={{ marginBottom: 0 }}>
                                <Space style={{ width: "100%", justifyContent: "flex-end" }}>
                                    <Button onClick={() => {
                                        setEditScoreModalVisible(false);
                                        scoreForm.resetFields();
                                        setEditingStudent(null);
                                    }}>
                                        ยกเลิก
                                    </Button>
                                    <Button type="primary" htmlType="submit">
                                        บันทึก
                                    </Button>
                                </Space>
                            </Form.Item>
                        </Form>
                    </>
                )}
            </Modal>

            {/* Config Modal */}
            <Modal
                title={config ? "แก้ไข Penalty Config" : "สร้าง Penalty Config"}
                open={configModalVisible}
                onOk={() => configForm.submit()}
                onCancel={() => setConfigModalVisible(false)}
                okText="บันทึก"
                cancelText="ยกเลิก"
            >
                <Form form={configForm} layout="vertical" onFinish={handleSaveConfig}>
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
                <Form form={penaltyForm} layout="vertical" onFinish={handleManualPenalty}>
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
                            {users.filter((u) => u.role === "STUDENT").map((user) => (
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
