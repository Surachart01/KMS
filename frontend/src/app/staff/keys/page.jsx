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
} from "antd";
import {
    PlusOutlined,
    EditOutlined,
    DeleteOutlined,
    KeyOutlined,
} from "@ant-design/icons";
import { keysAPI } from "@/service/api";

const { Title } = Typography;

export default function KeysPage() {
    const [keys, setKeys] = useState([]);
    const [loading, setLoading] = useState(false);

    // Modal states
    const [modalVisible, setModalVisible] = useState(false);

    // Edit states
    const [editingKey, setEditingKey] = useState(null);

    const [form] = Form.useForm();

    useEffect(() => {
        fetchKeys();
    }, []);

    const fetchKeys = async () => {
        try {
            setLoading(true);
            const response = await keysAPI.getAll();
            setKeys(response.data.data || []);
        } catch (error) {
            console.error("Error fetching keys:", error);
            message.error("ไม่สามารถโหลดข้อมูลได้");
        } finally {
            setLoading(false);
        }
    };

    // CRUD Handlers
    const handleAdd = () => {
        setEditingKey(null);
        form.resetFields();
        setModalVisible(true);
    };

    const handleEdit = (record) => {
        setEditingKey(record);
        form.setFieldsValue({
            roomCode: record.roomCode,
            slotNumber: record.slotNumber,
            status: record.status,
        });
        setModalVisible(true);
    };

    const handleDelete = async (id) => {
        try {
            await keysAPI.delete(id);
            message.success("ลบกุญแจสำเร็จ");
            fetchKeys();
        } catch (error) {
            console.error("Error deleting key:", error);
            message.error(error.response?.data?.message || "ไม่สามารถลบได้");
        }
    };

    const handleSubmit = async (values) => {
        try {
            if (editingKey) {
                await keysAPI.update(editingKey.id, values);
                message.success("แก้ไขกุญแจสำเร็จ");
            } else {
                await keysAPI.create(values);
                message.success("เพิ่มกุญแจสำเร็จ");
            }
            setModalVisible(false);
            form.resetFields();
            fetchKeys();
        } catch (error) {
            console.error("Error saving key:", error);
            message.error(error.response?.data?.message || "ไม่สามารถบันทึกได้");
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case "IN_CABINET": return "green";
            case "BORROWED": return "orange";
            case "DISABLED": return "red";
            default: return "default";
        }
    };

    const getStatusText = (status) => {
        switch (status) {
            case "IN_CABINET": return "อยู่ในตู้";
            case "BORROWED": return "ถูกเบิก";
            case "DISABLED": return "ปิดใช้งาน";
            default: return status;
        }
    };

    // Get building from room code (e.g., "44-703" -> "ตึก 44")
    const getBuilding = (roomCode) => {
        if (!roomCode) return '-';
        const parts = roomCode.split('-');
        return parts[0] ? `ตึก ${parts[0]}` : '-';
    };

    const columns = [
        {
            title: "ห้อง",
            dataIndex: "roomCode",
            key: "roomCode",
            width: 120,
            render: (roomCode) => (
                <Tag color="blue">{roomCode}</Tag>
            ),
        },
        {
            title: "ตึก",
            key: "building",
            width: 100,
            render: (_, record) => getBuilding(record.roomCode),
        },
        {
            title: "ช่องตู้",
            dataIndex: "slotNumber",
            key: "slotNumber",
            width: 100,
            align: "center",
            render: (slot) => slot ? <Tag>{slot}</Tag> : '-',
        },
        {
            title: "สถานะ",
            dataIndex: "status",
            key: "status",
            width: 120,
            render: (status) => (
                <Tag color={getStatusColor(status)}>
                    {getStatusText(status)}
                </Tag>
            ),
        },
        {
            title: "ผู้ยืมล่าสุด",
            key: "borrower",
            render: (_, record) => {
                if (record.currentBorrower) {
                    return `${record.currentBorrower.firstName} ${record.currentBorrower.lastName}`;
                }
                return '-';
            },
        },
        {
            title: "จัดการ",
            key: "action",
            width: 120,
            render: (_, record) => (
                <Space size="small">
                    <Button
                        type="text"
                        icon={<EditOutlined />}
                        onClick={() => handleEdit(record)}
                    />
                    <Popconfirm
                        title="ยืนยันการลบ"
                        description="คุณแน่ใจหรือไม่ที่จะลบกุญแจนี้?"
                        onConfirm={() => handleDelete(record.id)}
                        okText="ใช่"
                        cancelText="ไม่"
                    >
                        <Button type="text" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <div className="fade-in">
            <Space direction="vertical" size="large" style={{ width: "100%" }}>
                <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Title level={2} style={{ margin: 0 }}>
                        <KeyOutlined /> จัดการกุญแจ
                    </Title>
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={handleAdd}
                        size="large"
                    >
                        เพิ่มกุญแจ
                    </Button>
                </div>

                <Card className="feature-card">
                    <Table
                        columns={columns}
                        dataSource={keys}
                        rowKey="id"
                        loading={loading}
                        pagination={{ pageSize: 10 }}
                    />
                </Card>
            </Space>

            {/* Modal เพิ่ม/แก้ไข กุญแจ */}
            <Modal
                title={editingKey ? "แก้ไขกุญแจ" : "เพิ่มกุญแจ"}
                open={modalVisible}
                onOk={() => form.submit()}
                onCancel={() => {
                    setModalVisible(false);
                    form.resetFields();
                }}
                okText="บันทึก"
                cancelText="ยกเลิก"
            >
                <Form form={form} layout="vertical" onFinish={handleSubmit}>
                    <Form.Item
                        name="roomCode"
                        label="รหัสห้อง (เช่น 44-703, 52-211)"
                        rules={[{ required: true, message: "กรุณากรอกรหัสห้อง" }]}
                    >
                        <Input placeholder="เช่น 44-703" />
                    </Form.Item>
                    <Form.Item name="slotNumber" label="ช่องตู้">
                        <InputNumber style={{ width: "100%" }} min={1} placeholder="หมายเลขช่องตู้เก็บกุญแจ" />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}
