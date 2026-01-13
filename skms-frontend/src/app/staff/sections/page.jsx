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
    TeamOutlined,
} from "@ant-design/icons";
import { sectionsAPI, majorsAPI } from "@/service/api";

const { Title } = Typography;

export default function SectionsPage() {
    const [sections, setSections] = useState([]);
    const [majors, setMajors] = useState([]);
    const [loading, setLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [editingSection, setEditingSection] = useState(null);
    const [form] = Form.useForm();

    useEffect(() => {
        fetchSections();
        fetchMajors();
    }, []);

    const fetchSections = async () => {
        try {
            setLoading(true);
            const response = await sectionsAPI.getAll();
            setSections(response.data.data || []);
        } catch (error) {
            console.error("Error fetching sections:", error);
            message.error("ไม่สามารถโหลดข้อมูลได้");
        } finally {
            setLoading(false);
        }
    };

    const fetchMajors = async () => {
        try {
            const response = await majorsAPI.getAll();
            setMajors(response.data.data || []);
        } catch (error) {
            console.error("Error fetching majors:", error);
        }
    };

    const handleAdd = () => {
        setEditingSection(null);
        form.resetFields();
        setModalVisible(true);
    };

    const handleEdit = (record) => {
        setEditingSection(record);
        form.setFieldsValue({
            section_name: record.section_name,
            major_id: record.major_id,
        });
        setModalVisible(true);
    };

    const handleDelete = async (id) => {
        try {
            await sectionsAPI.delete(id);
            message.success("ลบกลุ่มเรียนสำเร็จ");
            fetchSections();
        } catch (error) {
            console.error("Error deleting section:", error);
            message.error(error.response?.data?.message || "ไม่สามารถลบได้");
        }
    };

    const handleSubmit = async (values) => {
        try {
            if (editingSection) {
                await sectionsAPI.update(editingSection.section_id, values);
                message.success("แก้ไขกลุ่มเรียนสำเร็จ");
            } else {
                await sectionsAPI.create(values);
                message.success("เพิ่มกลุ่มเรียนสำเร็จ");
            }
            setModalVisible(false);
            form.resetFields();
            fetchSections();
        } catch (error) {
            console.error("Error saving section:", error);
            message.error(error.response?.data?.message || "ไม่สามารถบันทึกได้");
        }
    };

    const columns = [
        {
            title: "รหัส",
            dataIndex: "section_id",
            key: "section_id",
            width: 100,
        },
        {
            title: "ชื่อกลุ่มเรียน",
            dataIndex: "section_name",
            key: "section_name",
        },
        {
            title: "สาขาวิชา",
            key: "major",
            render: (_, record) => (
                <Tag color="blue">{record.major?.major_name}</Tag>
            ),
        },
        {
            title: "จำนวนผู้ใช้งาน",
            key: "users_count",
            render: (_, record) => record._count?.users || 0,
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
                        description="คุณแน่ใจหรือไม่ที่จะลบกลุ่มเรียนนี้?"
                        onConfirm={() => handleDelete(record.section_id)}
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
                            <TeamOutlined /> จัดการกลุ่มเรียน
                        </Title>
                    </div>
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={handleAdd}
                        size="large"
                    >
                        เพิ่มกลุ่มเรียน
                    </Button>
                </div>

                <Card>
                    <Table
                        columns={columns}
                        dataSource={sections}
                        rowKey="section_id"
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
                title={editingSection ? "แก้ไขกลุ่มเรียน" : "เพิ่มกลุ่มเรียน"}
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
                        name="section_name"
                        label="ชื่อกลุ่มเรียน"
                        rules={[{ required: true, message: "กรุณากรอกชื่อกลุ่มเรียน" }]}
                    >
                        <Input placeholder="เช่น 1/1, 2/3" />
                    </Form.Item>

                    <Form.Item
                        name="major_id"
                        label="สาขาวิชา"
                        rules={[{ required: true, message: "กรุณาเลือกสาขาวิชา" }]}
                    >
                        <Select
                            placeholder="เลือกสาขาวิชา"
                            options={majors.map(major => ({
                                label: major.major_name,
                                value: major.major_id
                            }))}
                        />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}
