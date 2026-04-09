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
    const [selectedRowKeys, setSelectedRowKeys] = useState([]);
    const [batchActionLoading, setBatchActionLoading] = useState(false);

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

    // ── Bulk Actions ──
    const handleBulkDelete = async () => {
        setBatchActionLoading(true);
        let successCount = 0;
        try {
            for (const id of selectedRowKeys) {
                await keysAPI.delete(id);
                successCount++;
            }
            message.success(`ลบสำเร็จ ${successCount} รายการ`);
            setSelectedRowKeys([]);
            fetchKeys();
        } catch (e) {
            message.error("เกิดข้อผิดพลาดในการลบบางรายการ");
            fetchKeys();
        } finally {
            setBatchActionLoading(false);
        }
    };

    const handleBulkClear = async () => {
        setBatchActionLoading(true);
        let successCount = 0;
        try {
            for (const id of selectedRowKeys) {
                await keysAPI.update(id, { nfcUid: null });
                successCount++;
            }
            message.success(`เคลียร์ UID สำเร็จ ${successCount} รายการ`);
            setSelectedRowKeys([]);
            fetchKeys();
        } catch (e) {
            message.error("เกิดข้อผิดพลาดในการเคลียร์ข้อมูล");
        } finally {
            setBatchActionLoading(false);
        }
    };

    const handleBulkRead = async () => {
        const targets = keys.filter(k => selectedRowKeys.includes(k.id));
        setBatchActionLoading(true);
        
        Modal.info({
            title: 'เริ่มการอ่านรหัส NFC แบบต่อเนื่อง',
            content: `คุณเลือกกุญแจทั้งหมด ${targets.length} ดอก ระบบจะเริ่มให้อ่านทีละดอกตามลำดับ`,
            okText: 'เริ่มดำเนินการ',
            onOk: async () => {
                for (let i = 0; i < targets.length; i++) {
                    const key = targets[i];
                    try {
                        const hide = message.loading({ 
                            content: `[${i + 1}/${targets.length}] กรุณานำเหรียญสำหรับห้อง ${key.roomCode} (ช่อง ${key.slotNumber}) ไปทาบ...`, 
                            duration: 0 
                        });
                        
                        await keysAPI.readNfc(key.id);
                        hide();
                        message.success(`อ่านและบันทึกห้อง ${key.roomCode} สำเร็จ`);
                    } catch (e) {
                        message.error(`ห้อง ${key.roomCode} อ่านไม่สำเร็จ: ${e.response?.data?.message || 'Timeout'}`);
                        // Ask if want to continue to next
                        const cont = await new Promise(resolve => {
                            Modal.confirm({
                                title: 'การอ่านขัดข้อง',
                                content: `ไม่สามารถอ่านรหัสของห้อง ${key.roomCode} ได้ คุณต้องการทำดอกถัดไปต่อหรือไม่?`,
                                okText: 'ทำต่อ',
                                cancelText: 'หยุดแค่นี้',
                                onOk: () => resolve(true),
                                onCancel: () => resolve(false)
                            });
                        });
                        if (!cont) break;
                    }
                }
                setBatchActionLoading(false);
                setSelectedRowKeys([]);
                fetchKeys();
            }
        });
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
            message.info("กรุณานำเหรียญ NFC ไปทาบที่ช่องตู้ ภายใน 15 วินาที...");
            const res = await keysAPI.readNfc(nfcTargetKey.id);
            const { uid } = res.data.data;

            setNfcUidInput(uid);
            message.success(res.data?.message || `สแกนและบันทึก UID สำเร็จ: ${uid}`);
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

    const rowSelection = {
        selectedRowKeys,
        onChange: (keys) => setSelectedRowKeys(keys),
    };

    return (
        <div className="fade-in">
            <Space direction="vertical" size="large" style={{ width: "100%" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Title level={2} style={{ margin: 0 }}><KeyOutlined /> จัดการกุญแจ</Title>
                    <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd} size="large">เพิ่มกุญแจ</Button>
                </div>

                {selectedRowKeys.length > 0 && (
                    <Alert
                        message={
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Text strong>เลือกอยู่ {selectedRowKeys.length} รายการ</Text>
                                <Space>
                                    <Button 
                                        icon={<WifiOutlined />} 
                                        onClick={handleBulkRead} 
                                        loading={batchActionLoading}
                                    >
                                        อ่านรหัส NFC แบบต่อเนื่อง
                                    </Button>
                                    <Popconfirm 
                                        title="คืืนค่ารหัส NFC" 
                                        description="ล้างรหัส UID ของรายการที่เลือกทั้งหมด?" 
                                        onConfirm={handleBulkClear}
                                    >
                                        <Button icon={<ReloadOutlined />}>ล้างรหัส NFC</Button>
                                    </Popconfirm>
                                    <Popconfirm 
                                        title="ลบข้อมูล" 
                                        description="ยืนยันการลบกุญแจที่เลือกทั้งหมด?" 
                                        onConfirm={handleBulkDelete}
                                        okButtonProps={{ danger: true }}
                                    >
                                        <Button danger icon={<DeleteOutlined />}>ลบกุญแจ</Button>
                                    </Popconfirm>
                                    <Button type="link" onClick={() => setSelectedRowKeys([])}>ยกเลิกการเลือก</Button>
                                </Space>
                            </div>
                        }
                        type="info"
                        showIcon={false}
                        className="feature-card"
                        style={{ background: '#e6f7ff', border: '1px solid #91d5ff' }}
                    />
                )}

                <Card className="feature-card">
                    <Table 
                        rowSelection={rowSelection}
                        columns={columns} 
                        dataSource={keys} 
                        rowKey="id" 
                        loading={loading} 
                        pagination={{ defaultPageSize: 10 }} 
                    />
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
