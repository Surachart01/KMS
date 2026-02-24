"use client";

import React, { useState, useEffect } from "react";
import {
    Table,
    Button,
    Space,
    Modal,
    Form,
    Input,
    InputNumber,
    message,
    Popconfirm,
    Typography,
    Card,
    Tag,
    Tooltip,
    Alert,
} from "antd";
import {
    PlusOutlined,
    EditOutlined,
    DeleteOutlined,
    KeyOutlined,
    WifiOutlined,
    ReloadOutlined,
    CopyOutlined,
    CheckCircleOutlined,
    CloseCircleOutlined,
} from "@ant-design/icons";
import { keysAPI } from "@/service/api";

const { Title, Text } = Typography;

/** สุ่ม NFC UID แบบ HEX 8 หลัก (32-bit) */
function generateNfcUid() {
    return Array.from({ length: 4 }, () =>
        Math.floor(Math.random() * 256).toString(16).padStart(2, "0")
    )
        .join("")
        .toUpperCase();
}

export default function KeysPage() {
    const [keys, setKeys] = useState([]);
    const [loading, setLoading] = useState(false);

    // Edit modal
    const [modalVisible, setModalVisible] = useState(false);
    const [editingKey, setEditingKey] = useState(null);
    const [form] = Form.useForm();

    // NFC modal
    const [nfcModalVisible, setNfcModalVisible] = useState(false);
    const [nfcTargetKey, setNfcTargetKey] = useState(null);
    const [nfcUidInput, setNfcUidInput] = useState("");
    const [copied, setCopied] = useState(false);

    useEffect(() => { fetchKeys(); }, []);

    const fetchKeys = async () => {
        try {
            setLoading(true);
            const response = await keysAPI.getAll();
            setKeys(response.data.data || []);
        } catch {
            message.error("ไม่สามารถโหลดข้อมูลได้");
        } finally {
            setLoading(false);
        }
    };

    // ── CRUD ──
    const handleAdd = () => { setEditingKey(null); form.resetFields(); setModalVisible(true); };
    const handleEdit = (record) => {
        setEditingKey(record);
        form.setFieldsValue({ roomCode: record.roomCode, slotNumber: record.slotNumber });
        setModalVisible(true);
    };
    const handleDelete = async (id) => {
        try { await keysAPI.delete(id); message.success("ลบกุญแจสำเร็จ"); fetchKeys(); }
        catch (e) { message.error(e.response?.data?.message || "ไม่สามารถลบได้"); }
    };
    const handleSubmit = async (values) => {
        try {
            if (editingKey) { await keysAPI.update(editingKey.id, values); message.success("แก้ไขสำเร็จ"); }
            else { await keysAPI.create(values); message.success("เพิ่มสำเร็จ"); }
            setModalVisible(false); form.resetFields(); fetchKeys();
        } catch (e) { message.error(e.response?.data?.message || "ไม่สามารถบันทึกได้"); }
    };

    // ── NFC ──
    const handleOpenNfcModal = (record) => {
        setNfcTargetKey(record);
        setNfcUidInput(record.nfcUid || "");
        setCopied(false);
        setNfcModalVisible(true);
    };

    const handleGenerate = () => {
        const uid = generateNfcUid();
        setNfcUidInput(uid);
        setCopied(false);
    };

    const handleCopy = () => {
        if (!nfcUidInput) return;
        navigator.clipboard.writeText(nfcUidInput);
        setCopied(true);
        message.success("คัดลอก UID แล้ว!");
        setTimeout(() => setCopied(false), 3000);
    };

    const handleSaveNfcUid = async () => {
        if (!nfcUidInput.trim()) { message.warning("กรุณากรอกหรือ Generate NFC UID ก่อน"); return; }
        try {
            await keysAPI.update(nfcTargetKey.id, { nfcUid: nfcUidInput.trim() });
            message.success(`บันทึก NFC UID สำเร็จ`);
            setNfcModalVisible(false); fetchKeys();
        } catch (e) { message.error(e.response?.data?.message || "ไม่สามารถบันทึก UID ได้"); }
    };

    const handleClearNfcUid = async () => {
        try {
            await keysAPI.update(nfcTargetKey.id, { nfcUid: null });
            message.success("ลบ NFC UID สำเร็จ");
            setNfcModalVisible(false); fetchKeys();
        } catch { message.error("ไม่สามารถลบ UID ได้"); }
    };

    // ── Helpers ──
    const getStatusColor = (s) => ({ AVAILABLE: "green", BORROWED: "orange", UNAVAILABLE: "red" }[s] || "default");
    const getStatusText = (s) => ({ AVAILABLE: "ว่าง", BORROWED: "ถูกเบิก", UNAVAILABLE: "ปิดใช้งาน" }[s] || s);
    const getBuilding = (c) => { if (!c) return "-"; const p = c.split("-"); return p[0] ? `ตึก ${p[0]}` : "-"; };

    const columns = [
        {
            title: "ห้อง", dataIndex: "roomCode", key: "roomCode", width: 120,
            render: (c) => <Tag color="blue">{c}</Tag>
        },
        { title: "ตึก", key: "building", width: 100, render: (_, r) => getBuilding(r.roomCode) },
        {
            title: "ช่องตู้", dataIndex: "slotNumber", key: "slotNumber", width: 90, align: "center",
            render: (s) => s ? <Tag>{s}</Tag> : "-"
        },
        {
            title: "NFC UID", dataIndex: "nfcUid", key: "nfcUid", width: 200,
            render: (uid) => uid
                ? <Tooltip title={uid}>
                    <Tag icon={<CheckCircleOutlined />} color="success" style={{ fontFamily: "monospace" }}>
                        {uid}
                    </Tag>
                </Tooltip>
                : <Tag icon={<CloseCircleOutlined />} color="default">ไม่ได้กำหนด</Tag>
        },
        {
            title: "สถานะ", dataIndex: "status", key: "status", width: 110,
            render: (s) => <Tag color={getStatusColor(s)}>{getStatusText(s)}</Tag>
        },
        {
            title: "จัดการ", key: "action", width: 150,
            render: (_, record) => (
                <Space size="small">
                    <Tooltip title="แก้ไข"><Button type="text" icon={<EditOutlined />} onClick={() => handleEdit(record)} /></Tooltip>
                    <Tooltip title="กำหนด NFC Tag">
                        <Button type="text" icon={<WifiOutlined />}
                            style={{ color: record.nfcUid ? "#52c41a" : "#faad14" }}
                            onClick={() => handleOpenNfcModal(record)} />
                    </Tooltip>
                    <Popconfirm title="ยืนยันการลบ" description="ลบกุญแจนี้?" onConfirm={() => handleDelete(record.id)} okText="ใช่" cancelText="ไม่">
                        <Button type="text" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                </Space>
            )
        },
    ];

    return (
        <div className="fade-in">
            <Space direction="vertical" size="large" style={{ width: "100%" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Title level={2} style={{ margin: 0 }}><KeyOutlined /> จัดการกุญแจ</Title>
                    <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd} size="large">เพิ่มกุญแจ</Button>
                </div>
                <Card className="feature-card">
                    <Table columns={columns} dataSource={keys} rowKey="id" loading={loading} pagination={{ pageSize: 10 }} />
                </Card>
            </Space>

            {/* Modal เพิ่ม/แก้ไข */}
            <Modal title={editingKey ? "แก้ไขกุญแจ" : "เพิ่มกุญแจ"} open={modalVisible}
                onOk={() => form.submit()} onCancel={() => { setModalVisible(false); form.resetFields(); }}
                okText="บันทึก" cancelText="ยกเลิก">
                <Form form={form} layout="vertical" onFinish={handleSubmit}>
                    <Form.Item name="roomCode" label="รหัสห้อง (เช่น 44-703)" rules={[{ required: true, message: "กรุณากรอกรหัสห้อง" }]}>
                        <Input placeholder="เช่น 44-703" />
                    </Form.Item>
                    <Form.Item name="slotNumber" label="ช่องตู้">
                        <InputNumber style={{ width: "100%" }} min={1} placeholder="หมายเลขช่องตู้" />
                    </Form.Item>
                </Form>
            </Modal>

            {/* Modal กำหนด NFC UID */}
            <Modal
                title={<Space><WifiOutlined style={{ color: "#1890ff" }} />กำหนด NFC Tag — ห้อง {nfcTargetKey?.roomCode} (ช่อง {nfcTargetKey?.slotNumber})</Space>}
                open={nfcModalVisible}
                onCancel={() => setNfcModalVisible(false)}
                footer={[
                    nfcTargetKey?.nfcUid && (
                        <Popconfirm key="clear" title="ลบ NFC UID นี้?" onConfirm={handleClearNfcUid} okText="ลบ" cancelText="ยกเลิก">
                            <Button danger>ลบ UID</Button>
                        </Popconfirm>
                    ),
                    <Button key="cancel" onClick={() => setNfcModalVisible(false)}>ยกเลิก</Button>,
                    <Button key="save" type="primary" onClick={handleSaveNfcUid} disabled={!nfcUidInput.trim()}>บันทึก</Button>,
                ]}
                width={460}
            >
                <Space direction="vertical" size="middle" style={{ width: "100%" }}>
                    <Alert
                        message="วิธีใช้"
                        description="กดปุ่ม Generate เพื่อสร้าง UID → Copy → เขียนลง NFC tag ด้วยโปรแกรมภายนอก → กด บันทึก"
                        type="info" showIcon />

                    {/* UID Display */}
                    <div style={{ background: "#f5f5f5", borderRadius: 8, padding: "16px 20px", textAlign: "center" }}>
                        <Text style={{ fontFamily: "monospace", fontSize: 28, letterSpacing: 4, fontWeight: "bold" }}>
                            {nfcUidInput || "— — — —"}
                        </Text>
                    </div>

                    {/* Buttons */}
                    <Space style={{ width: "100%", justifyContent: "center" }}>
                        <Button icon={<ReloadOutlined />} onClick={handleGenerate} size="large">
                            Generate UID
                        </Button>
                        <Button
                            icon={<CopyOutlined />}
                            onClick={handleCopy}
                            size="large"
                            type={copied ? "primary" : "default"}
                            disabled={!nfcUidInput}
                        >
                            {copied ? "คัดลอกแล้ว ✓" : "Copy"}
                        </Button>
                    </Space>

                    {/* Manual input */}
                    <div>
                        <Text type="secondary" style={{ display: "block", marginBottom: 4 }}>หรือกรอก UID เอง:</Text>
                        <Input
                            value={nfcUidInput}
                            onChange={(e) => { setNfcUidInput(e.target.value.toUpperCase()); setCopied(false); }}
                            placeholder="เช่น A1B2C3D4"
                            style={{ fontFamily: "monospace", textAlign: "center" }}
                            maxLength={32}
                        />
                    </div>

                    {nfcTargetKey?.nfcUid && (
                        <Alert message={`UID ปัจจุบัน: ${nfcTargetKey.nfcUid}`} type="warning" showIcon />
                    )}
                </Space>
            </Modal>
        </div>
    );
}
