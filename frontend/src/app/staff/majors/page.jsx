"use client";

import React, { useState, useEffect } from "react";
import {
    Table,
    Button,
    Space,
    Modal,
    Form,
    Input,
    message,
    Popconfirm,
    Typography,
    Card,
} from "antd";
import {
    PlusOutlined,
    EditOutlined,
    DeleteOutlined,
    BookOutlined,
} from "@ant-design/icons";
import { majorsAPI } from "@/service/api";

const { Title } = Typography;

export default function MajorsPage() {
    const [majors, setMajors] = useState([]);
    const [loading, setLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [editingMajor, setEditingMajor] = useState(null);
    const [form] = Form.useForm();

    useEffect(() => {
        fetchMajors();
    }, []);

    const fetchMajors = async () => {
        try {
            setLoading(true);
            const response = await majorsAPI.getAll();
            setMajors(response.data.data || []);
        } catch (error) {
            console.error("Error fetching majors:", error);
            message.error("ไม่สามารถโหลดข้อมูลได้");
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = () => {
        setEditingMajor(null);
        form.resetFields();
        setModalVisible(true);
    };

    const handleEdit = (record) => {
        setEditingMajor(record);
        form.setFieldsValue({
            code: record.code,
            name: record.name,
        });
        setModalVisible(true);
    };

    const handleDelete = async (id) => {
        try {
            await majorsAPI.delete(id);
            message.success("ลบสาขาวิชาสำเร็จ");
            fetchMajors();
        } catch (error) {
            console.error("Error deleting major:", error);
            message.error(error.response?.data?.message || "ไม่สามารถลบได้");
        }
    };

    const handleSubmit = async (values) => {
        try {
            if (editingMajor) {
                await majorsAPI.update(editingMajor.id, values);
                message.success("แก้ไขสาขาวิชาสำเร็จ");
            } else {
                await majorsAPI.create(values);
                message.success("เพิ่มสาขาวิชาสำเร็จ");
            }
            setModalVisible(false);
            form.resetFields();
            fetchMajors();
        } catch (error) {
            console.error("Error saving major:", error);
            message.error(error.response?.data?.message || "ไม่สามารถบันทึกได้");
        }
    };

    const columns = [
        {
            title: "รหัสสาขา",
            dataIndex: "code",
            key: "code",
            width: 120,
        },
        {
            title: "ชื่อสาขาวิชา",
            dataIndex: "name",
            key: "name",
        },
        {
            title: "จำนวนกลุ่มเรียน",
            key: "sections_count",
            render: (_, record) => record._count?.sections || record.sections?.length || 0,
            width: 150,
        },
        {
            title: "จำนวนผู้ใช้งาน",
            key: "users_count",
            render: (_, record) => record._count?.users || record.users?.length || 0,
            width: 150,
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
                        description="คุณแน่ใจหรือไม่ที่จะลบสาขาวิชานี้?"
                        onConfirm={() => handleDelete(record.id)}
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
        <div className="fade-in">
            <Space direction="vertical" size="large" style={{ width: "100%" }}>
                <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Title level={2} style={{ margin: 0 }}>
                        <BookOutlined /> จัดการสาขาวิชา
                    </Title>
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={handleAdd}
                        size="large"
                    >
                        เพิ่มสาขาวิชา
                    </Button>
                </div>

                <Card className="feature-card">
                    <Table
                        columns={columns}
                        dataSource={majors}
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

            <Modal
                title={editingMajor ? "แก้ไขสาขาวิชา" : "เพิ่มสาขาวิชา"}
                open={modalVisible}
                onOk={() => form.submit()}
                onCancel={() => {
                    setModalVisible(false);
                    form.resetFields();
                }}
                okText="บันทึก"
                cancelText="ยกเลิก"
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleSubmit}
                >
                    <Form.Item
                        name="code"
                        label="รหัสสาขา"
                        rules={[{ required: true, message: "กรุณากรอกรหัสสาขา" }]}
                    >
                        <Input placeholder="เช่น TCT, CED" disabled={!!editingMajor} />
                    </Form.Item>
                    <Form.Item
                        name="name"
                        label="ชื่อสาขาวิชา"
                        rules={[{ required: true, message: "กรุณากรอกชื่อสาขาวิชา" }]}
                    >
                        <Input placeholder="เช่น เทคโนโลยีคอมพิวเตอร์" />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}
