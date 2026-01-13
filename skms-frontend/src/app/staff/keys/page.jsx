"use client";

import React, { useState, useEffect } from "react";
import {
    Table,
    Button,
    Space,
    Modal,
    Form,
    Input,
    Select,
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
import { keysAPI, roomsAPI } from "@/service/api";

const { Title } = Typography;

export default function KeysPage() {
    const [keys, setKeys] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(false);

    // Modal states
    const [modalVisible, setModalVisible] = useState(false);

    // Edit states
    const [editingKey, setEditingKey] = useState(null);

    const [form] = Form.useForm();

    useEffect(() => {
        fetchKeys();
        fetchRooms();
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

    const fetchRooms = async () => {
        try {
            const response = await roomsAPI.getAll();
            setRooms(response.data.data || []);
        } catch (error) {
            console.error("Error fetching rooms:", error);
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
        form.setFieldsValue(record);
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
                await keysAPI.update(editingKey.key_id, values);
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
            case "in_cabinet": return "green";
            case "borrowed": return "orange";
            case "disabled": return "red";
            default: return "default";
        }
    };

    const getStatusText = (status) => {
        switch (status) {
            case "in_cabinet": return "อยู่ในตู้";
            case "borrowed": return "ถูกเบิก";
            case "disabled": return "ปิดใช้งาน";
            default: return status;
        }
    };

    const columns = [
        {
            title: "รหัสกุญแจ",
            dataIndex: "key_id",
            key: "key_id",
            width: 150,
        },
        {
            title: "ห้อง",
            key: "room",
            render: (_, record) => (
                <Space>
                    <Tag color="blue">{record.room?.room_id}</Tag>
                    {record.room?.room_name}
                </Space>
            ),
        },
        {
            title: "ช่องตู้",
            dataIndex: "cabinet_slot",
            key: "cabinet_slot",
            width: 100,
            align: "center",
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
                        onConfirm={() => handleDelete(record.key_id)}
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
        <div>
            <Space direction="vertical" size="large" style={{ width: "100%" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                        <Title level={2}>
                            <KeyOutlined /> จัดการกุญแจ
                        </Title>
                    </div>
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={handleAdd}
                        size="large"
                    >
                        เพิ่มกุญแจ
                    </Button>
                </div>

                <Card>
                    <Table
                        columns={columns}
                        dataSource={keys}
                        rowKey="key_id"
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
                    <Form.Item name="key_id" label="รหัสกุญแจ" rules={[{ required: true }]}>
                        <Input disabled={!!editingKey} />
                    </Form.Item>
                    <Form.Item name="room_id" label="ห้อง" rules={[{ required: true }]}>
                        <Select showSearch optionFilterProp="children">
                            {rooms.map(r => <Select.Option key={r.room_id} value={r.room_id}>{r.room_id} - {r.room_name}</Select.Option>)}
                        </Select>
                    </Form.Item>
                    <Form.Item name="cabinet_slot" label="ช่องตู้">
                        <InputNumber style={{ width: "100%" }} />
                    </Form.Item>
                    <Form.Item name="nfc_uid" label="NFC UID" rules={[{ required: true }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item name="status" label="สถานะ" initialValue="in_cabinet">
                        <Select>
                            <Select.Option value="in_cabinet">อยู่ในตู้</Select.Option>
                            <Select.Option value="borrowed">ถูกเบิก</Select.Option>
                            <Select.Option value="disabled">ปิดใช้งาน</Select.Option>
                        </Select>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}
