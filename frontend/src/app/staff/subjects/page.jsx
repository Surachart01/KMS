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
    BookOutlined,
} from "@ant-design/icons";
import { subjectsAPI, usersAPI } from "@/service/api";

const { Title } = Typography;

export default function SubjectsPage() {
    const [subjects, setSubjects] = useState([]);
    const [teachers, setTeachers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [editingSubject, setEditingSubject] = useState(null);
    const [form] = Form.useForm();

    useEffect(() => {
        fetchSubjects();
        fetchTeachers();
    }, []);

    const fetchTeachers = async () => {
        try {
            const response = await usersAPI.getAll({ role: 'TEACHER' });
            setTeachers(response.data.data || []);
        } catch (error) {
            console.error('Error fetching teachers:', error);
        }
    };

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
        form.setFieldsValue({
            code: record.code,
            name: record.name,
            teacherIds: record.teachers?.map(t => t.teacherId || t.id) || []
        });
        setModalVisible(true);
    };

    const handleDelete = async (id) => {
        try {
            await subjectsAPI.delete(id);
            message.success("ลบรายวิชาสำเร็จ");
            fetchSubjects();
        } catch (error) {
            console.error("Error deleting subject:", error);
            message.error(error.response?.data?.message || "ไม่สามารถลบได้");
        }
    };

    const handleSubmit = async (values) => {
        try {
            const data = {
                code: values.code,
                name: values.name,
                teacherIds: values.teacherIds || []
            };

            if (editingSubject) {
                await subjectsAPI.update(editingSubject.id, { name: values.name, teacherIds: values.teacherIds });
                message.success("แก้ไขรายวิชาสำเร็จ");
            } else {
                await subjectsAPI.create(data);
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
            dataIndex: "code",
            key: "code",
            width: 150,
        },
        {
            title: "ชื่อรายวิชา",
            dataIndex: "name",
            key: "name",
        },
        {
            title: "อาจารย์ผู้สอน",
            key: "teachers",
            render: (_, record) => (
                <Space direction="vertical" size={0}>
                    {record.teachers?.length > 0 ? (
                        record.teachers.map((t, idx) => (
                            <Tag key={idx} color="blue">
                                {t.teacher?.firstName} {t.teacher?.lastName}
                            </Tag>
                        ))
                    ) : (
                        <span style={{ color: '#999' }}>-</span>
                    )}
                </Space>
            ),
        },
        {
            title: "จำนวนตารางเรียน",
            key: "schedules_count",
            render: (_, record) => record._count?.schedules || record.schedules?.length || 0,
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
                        name="code"
                        label="รหัสวิชา"
                        rules={[{ required: true, message: "กรุณากรอกรหัสวิชา" }]}
                    >
                        <Input
                            placeholder="เช่น 020413215"
                            disabled={!!editingSubject}
                        />
                    </Form.Item>

                    <Form.Item
                        name="name"
                        label="ชื่อรายวิชา"
                        rules={[{ required: true, message: "กรุณากรอกชื่อรายวิชา" }]}
                    >
                        <Input placeholder="เช่น ปัญญาประดิษฐ์" />
                    </Form.Item>

                    <Form.Item
                        name="teacherIds"
                        label="อาจารย์ผู้สอน"
                        tooltip="สามารถเลือกได้หลายคน"
                    >
                        <Select
                            mode="multiple"
                            placeholder="เลือกอาจารย์ผู้สอน"
                            allowClear
                            showSearch
                            optionFilterProp="label"
                            options={teachers.map(teacher => ({
                                label: `${teacher.firstName} ${teacher.lastName} (${teacher.studentCode})`,
                                value: teacher.id
                            }))}
                        />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}
