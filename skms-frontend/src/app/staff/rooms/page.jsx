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
    HomeOutlined,
} from "@ant-design/icons";
import { roomsAPI } from "@/service/api";

const { Title } = Typography;

export default function RoomsPage() {
    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [editingRoom, setEditingRoom] = useState(null);
    const [form] = Form.useForm();

    useEffect(() => {
        fetchRooms();
    }, []);

    const fetchRooms = async () => {
        try {
            setLoading(true);
            const response = await roomsAPI.getAll();
            setRooms(response.data.data || []);
        } catch (error) {
            console.error("Error fetching rooms:", error);
            message.error("ไม่สามารถโหลดข้อมูลได้");
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = () => {
        setEditingRoom(null);
        form.resetFields();
        setModalVisible(true);
    };

    const handleEdit = (record) => {
        setEditingRoom(record);
        form.setFieldsValue(record);
        setModalVisible(true);
    };

    const handleDelete = async (id) => {
        try {
            await roomsAPI.delete(id);
            message.success("ลบห้องเรียนสำเร็จ");
            fetchRooms();
        } catch (error) {
            console.error("Error deleting room:", error);
            message.error(error.response?.data?.message || "ไม่สามารถลบได้");
        }
    };

    const handleSubmit = async (values) => {
        try {
            if (editingRoom) {
                await roomsAPI.update(editingRoom.room_id, values);
                message.success("แก้ไขห้องเรียนสำเร็จ");
            } else {
                await roomsAPI.create(values);
                message.success("เพิ่มห้องเรียนสำเร็จ");
            }
            setModalVisible(false);
            form.resetFields();
            fetchRooms();
        } catch (error) {
            console.error("Error saving room:", error);
            message.error(error.response?.data?.message || "ไม่สามารถบันทึกได้");
        }
    };

    const columns = [
        {
            title: "รหัสห้อง",
            dataIndex: "room_id",
            key: "room_id",
            width: 120,
        },
        {
            title: "ชื่อห้อง",
            dataIndex: "room_name",
            key: "room_name",
        },
        {
            title: "อาคาร",
            dataIndex: "building",
            key: "building",
            width: 100,
        },
        {
            title: "ชั้น",
            dataIndex: "floor",
            key: "floor",
            width: 80,
        },
        {
            title: "สถานะ",
            dataIndex: "status",
            key: "status",
            width: 120,
            render: (status) => (
                <Tag color={status === "available" ? "green" : "orange"}>
                    {status === "available" ? "พร้อมใช้งาน" : "ซ่อมบำรุง"}
                </Tag>
            ),
        },
        {
            title: "จำนวนกุญแจ",
            key: "keys_count",
            render: (_, record) => record._count?.keys || 0,
            width: 120,
        },
        {
            title: "การจัดการ",
            key: "action",
            width: 150,
            render: (_, record) => (
                <Space size="small">
                    <Button
                        type="link"
                        icon={<EditOutlined />}
                        onClick={() => handleEdit(record)}
                    >
                        แก้ไข
                    </Button>
                    <Popconfirm
                        title="ยืนยันการลบ"
                        description="คุณแน่ใจหรือไม่ที่จะลบห้องเรียนนี้?"
                        onConfirm={() => handleDelete(record.room_id)}
                        okText="ใช่"
                        cancelText="ไม่"
                    >
                        <Button type="link" danger icon={<DeleteOutlined />}>
                            ลบ
                        </Button>
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
                            <HomeOutlined /> จัดการห้องเรียน
                        </Title>
                    </div>
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={handleAdd}
                        size="large"
                    >
                        เพิ่มห้องเรียน
                    </Button>
                </div>

                <Card>
                    <Table
                        columns={columns}
                        dataSource={rooms}
                        rowKey="room_id"
                        loading={loading}
                        pagination={{
                            pageSize: 10,
                            showSizeChanger: true,
                            showTotal: (total) => `ทั้งหมด ${total} รายการ`,
                        }}
                    />
                </Card>
            </Space>

            <Modal
                title={editingRoom ? "แก้ไขห้องเรียน" : "เพิ่มห้องเรียน"}
                open={modalVisible}
                onOk={() => form.submit()}
                onCancel={() => {
                    setModalVisible(false);
                    form.resetFields();
                }}
                okText="บันทึก"
                cancelText="ยกเลิก"
                width={600}
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleSubmit}
                >
                    <Form.Item
                        name="room_id"
                        label="รหัสห้อง"
                        rules={[{ required: true, message: "กรุณากรอกรหัสห้อง" }]}
                    >
                        <Input
                            placeholder="เช่น C-301"
                            disabled={!!editingRoom}
                        />
                    </Form.Item>

                    <Form.Item
                        name="room_name"
                        label="ชื่อห้อง"
                    >
                        <Input placeholder="เช่น ห้องปฏิบัติการคอมพิวเตอร์ 1" />
                    </Form.Item>

                    <Space style={{ width: "100%" }} size="large">
                        <Form.Item
                            name="building"
                            label="อาคาร"
                            style={{ width: 200 }}
                        >
                            <Input placeholder="เช่น C" />
                        </Form.Item>

                        <Form.Item
                            name="floor"
                            label="ชั้น"
                            style={{ width: 150 }}
                        >
                            <InputNumber placeholder="3" min={1} style={{ width: "100%" }} />
                        </Form.Item>
                    </Space>

                    <Form.Item
                        name="status"
                        label="สถานะ"
                        initialValue="available"
                    >
                        <Select>
                            <Select.Option value="available">พร้อมใช้งาน</Select.Option>
                            <Select.Option value="maintenance">ซ่อมบำรุง</Select.Option>
                        </Select>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}
