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
import { subjectsAPI } from "@/service/api";

const { Title } = Typography;

export default function SubjectsPage() {
    const [subjects, setSubjects] = useState([]);
    const [loading, setLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [editingSubject, setEditingSubject] = useState(null);
    const [form] = Form.useForm();

    useEffect(() => {
        fetchSubjects();
    }, []);

    const fetchSubjects = async () => {
        try {
            setLoading(true);
            const response = await subjectsAPI.getAll();
            setSubjects(response.data.data || []);
        } catch (error) {
            console.error("Error fetching subjects:", error);
            message.error("ไม่สามารถโหลดข้อมูลได้");
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = () => {
        setEditingSubject(null);
        form.resetFields();
        setModalVisible(true);
    };

    const handleEdit = (record) => {
        setEditingSubject(record);
        form.setFieldsValue(record);
        setModalVisible(true);
    };

    const handleDelete = async (code) => {
        try {
            await subjectsAPI.delete(code);
            message.success("ลบรายวิชาสำเร็จ");
            fetchSubjects();
        } catch (error) {
            console.error("Error deleting subject:", error);
            message.error(error.response?.data?.message || "ไม่สามารถลบได้");
        }
    };

    const handleSubmit = async (values) => {
        try {
            if (editingSubject) {
                await subjectsAPI.update(editingSubject.subject_code, {
                    subject_name: values.subject_name
                });
                message.success("แก้ไขรายวิชาสำเร็จ");
            } else {
                await subjectsAPI.create(values);
                message.success("เพิ่มรายวิชาสำเร็จ");
            }
            setModalVisible(false);
            form.resetFields();
            fetchSubjects();
        } catch (error) {
            console.error("Error saving subject:", error);
            message.error(error.response?.data?.message || "ไม่สามารถบันทึกได้");
        }
    };

    const columns = [
        {
            title: "รหัสวิชา",
            dataIndex: "subject_code",
            key: "subject_code",
            width: 150,
        },
        {
            title: "ชื่อรายวิชา",
            dataIndex: "subject_name",
            key: "subject_name",
        },
        {
            title: "จำนวนตารางเรียน",
            key: "schedules_count",
            render: (_, record) => record._count?.class_schedules || 0,
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
                        description="คุณแน่ใจหรือไม่ที่จะลบรายวิชานี้?"
                        onConfirm={() => handleDelete(record.subject_code)}
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
                            <BookOutlined /> จัดการรายวิชา
                        </Title>
                    </div>
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={handleAdd}
                        size="large"
                    >
                        เพิ่มรายวิชา
                    </Button>
                </div>

                <Card>
                    <Table
                        columns={columns}
                        dataSource={subjects}
                        rowKey="subject_code"
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
                title={editingSubject ? "แก้ไขรายวิชา" : "เพิ่มรายวิชา"}
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
                        name="subject_code"
                        label="รหัสวิชา"
                        rules={[{ required: true, message: "กรุณากรอกรหัสวิชา" }]}
                    >
                        <Input
                            placeholder="เช่น CS101"
                            disabled={!!editingSubject}
                        />
                    </Form.Item>

                    <Form.Item
                        name="subject_name"
                        label="ชื่อรายวิชา"
                        rules={[{ required: true, message: "กรุณากรอกชื่อรายวิชา" }]}
                    >
                        <Input placeholder="เช่น การเขียนโปรแกรมเบื้องต้น" />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}
