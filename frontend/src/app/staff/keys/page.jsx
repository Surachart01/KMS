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
    SendOutlined,
} from "@ant-design/icons";
import { keysAPI } from "@/service/api";

const { Title, Text } = Typography;



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
    const [readingNfc, setReadingNfc] = useState(false);

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
        setNfcModalVisible(true);
    };

    const handleReadNfc = async () => {
        if (!nfcTargetKey?.id) return;
        setReadingNfc(true);
        try {
            message.info("ระบบกำลังเปิดรับเหรียญ 15 วินาที กรุณานำเหรียญไปทาบที่ช่องตู้");
            const res = await keysAPI.readNfc(nfcTargetKey.id);
            const { uid } = res.data.data;

            setNfcUidInput(uid);
            await keysAPI.update(nfcTargetKey.id, { nfcUid: uid });

            message.success(res.data?.message || `สแกนสำเร็จ: ${uid}`);
            setNfcModalVisible(false);
            fetchKeys();
        } catch (e) {
            message.error(e.response?.data?.message || "หมดเวลา หรืออ่าน NFC ไม่สำเร็จ");
        } finally {
            setReadingNfc(false);
        }
    };

    const handleSaveNfcUid = async () => {
        if (!nfcUidInput.trim()) { message.warning("กรุณาสแกนหรือกรอกรหัส UID ก่อนกดยืนยัน"); return; }
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
                    <Table columns={columns} dataSource={keys} rowKey="id" loading={loading} pagination={{ defaultPageSize: 10 }} />
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

            {/* Modal ลงทะเบียน NFC UID */}
            <Modal
                title={<Space><WifiOutlined style={{ color: "#1890ff" }} />ลงทะเบียนกุญแจ NFC — ห้อง {nfcTargetKey?.roomCode} (ช่อง {nfcTargetKey?.slotNumber})</Space>}
                open={nfcModalVisible}
                onCancel={() => setNfcModalVisible(false)}
                footer={[
                    nfcTargetKey?.nfcUid && (
                        <Popconfirm key="clear" title="ลบ NFC UID นี้?" onConfirm={handleClearNfcUid} okText="ลบ" cancelText="ยกเลิก">
                            <Button danger>ลบ UID เก่าทิ้ง</Button>
                        </Popconfirm>
                    ),
                    <Button key="cancel" onClick={() => setNfcModalVisible(false)}>ปิด</Button>,
                    <Button key="save" type="primary" onClick={handleSaveNfcUid} disabled={!nfcUidInput.trim() || readingNfc}>เซฟรหัสที่พิมพ์เอง</Button>,
                ]}
                width={480}
            >
                <Space direction="vertical" size="middle" style={{ width: "100%", marginTop: 16 }}>
                    <Alert
                        message="วิธีการลงทะเบียนกุญแจ"
                        description="กดปุ่ม 'เริ่มสแกนเหรียญใหม่' จากนั้นนำเหรียญ NFC ใหม่ไปทาบที่ช่องล็อคเกอร์ของกุญแจดอกนี้ ภายใน 15 วินาที ระบบจะบันทึกรหัสของเหรียญเข้ากับกุญแจดอกนี้ให้อัตโนมัติ"
                        type="info" showIcon />

                    {/* Button Scanner */}
                    <div style={{ textAlign: "center", margin: "16px 0" }}>
                        <Button
                            type="primary"
                            icon={<WifiOutlined />}
                            size="large"
                            onClick={handleReadNfc}
                            loading={readingNfc}
                            style={{ width: "80%", height: 50, fontSize: 16, background: readingNfc ? '#faad14' : '#52c41a', borderColor: 'transparent' }}
                        >
                            {readingNfc ? "กำลังรับสัญญาณสแกน (15 วิ)..." : "แตะเพื่อเริ่มสแกนเหรียญใหม่"}
                        </Button>
                    </div>

                    {/* UID Display */}
                    <div>
                        <Text type="secondary" style={{ display: "block", marginBottom: 4 }}>รหัส UID ปัจจุบันของกุญแจดอกนี้:</Text>
                        <Input
                            value={nfcUidInput}
                            onChange={(e) => setNfcUidInput(e.target.value.toUpperCase())}
                            placeholder="ว่างเปล่า (ยังไม่ผูก NFC)"
                            style={{ fontFamily: "monospace", textAlign: "center", fontSize: 18, height: 44, color: nfcUidInput ? '#1890ff' : '#000' }}
                            maxLength={32}
                            disabled={readingNfc}
                        />
                    </div>
                </Space>
            </Modal>
        </div>
    );
}
