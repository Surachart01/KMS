"use client";

import React, { useState, useEffect } from "react";
import {
    Table,
    Button,
    Space,
    Modal,
    Form,
    Input,
    Switch,
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
    FileTextOutlined,
    CheckCircleOutlined,
    CloseCircleOutlined,
} from "@ant-design/icons";
import { borrowReasonsAPI } from "@/service/api";

const { Title } = Typography;

export default function BorrowReasonsPage() {
    const [reasons, setReasons] = useState([]);
    const [loading, setLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [editingReason, setEditingReason] = useState(null);
    const [form] = Form.useForm();

    useEffect(() => {
        fetchReasons();
    }, []);

    const fetchReasons = async () => {
        try {
            setLoading(true);
            const response = await borrowReasonsAPI.getAll();
            setReasons(response.data.data || []);
        } catch (error) {
            console.error("Error fetching borrow reasons:", error);
            message.error("ไม่สามารถโหลดข้อมูลได้");
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = () => {
        setEditingReason(null);
        form.resetFields();
        setModalVisible(true);
    };

    const handleEdit = (record) => {
        setEditingReason(record);
        form.setFieldsValue(record);
        setModalVisible(true);
    };

    const handleDelete = async (id) => {
        try {
            await borrowReasonsAPI.delete(id);
            message.success("ลบเหตุผลการเบิกสำเร็จ");
            fetchReasons();
        } catch (error) {
            console.error("Error deleting reason:", error);
            message.error(error.response?.data?.message || "ไม่สามารถลบได้");
        }
    };

    const handleSubmit = async (values) => {
        try {
            if (editingReason) {
                await borrowReasonsAPI.update(editingReason.reason_id, values);
                message.success("แก้ไขเหตุผลการเบิกสำเร็จ");
            } else {
                await borrowReasonsAPI.create(values);
                message.success("เพิ่มเหตุผลการเบิกสำเร็จ");
            }
            setModalVisible(false);
            form.resetFields();
            fetchReasons();
        } catch (error) {
            console.error("Error saving reason:", error);
            message.error(error.response?.data?.message || "ไม่สามารถบันทึกได้");
        }
    };

    const columns = [
        {
            title: "รหัส",
            dataIndex: "reason_id",
            key: "reason_id",
            width: 150,
        },
        {
            title: "ชื่อเหตุผล",
            dataIndex: "reason_name",
            key: "reason_name",
        },
        {
            title: "ต้องระบุรายละเอียด",
            dataIndex: "require_note",
            key: "require_note",
            width: 180,
            align: "center",
            render: (required) =>
                required ? (
                    <Tag icon={<CheckCircleOutlined />} color="success">
                        ต้องระบุ
                    </Tag>
                ) : (
                    <Tag icon={<CloseCircleOutlined />} color="default">
                        ไม่ต้องระบุ
                    </Tag>
                ),
        },
        {
            title: "จำนวนการใช้งาน",
            key: "usage_count",
            width: 150,
            align: "center",
            render: (_, record) => (
                <Tag color="blue">{record._count?.borrow_transactions || 0} ครั้ง</Tag>
            ),
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
                        description="คุณแน่ใจหรือไม่ที่จะลบเหตุผลการเบิกนี้?"
                        onConfirm={() => handleDelete(record.reason_id)}
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
                            <FileTextOutlined /> จัดการเหตุผลการเบิก
                        </Title>
                    </div>
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={handleAdd}
                        size="large"
                    >
                        เพิ่มเหตุผลการเบิก
                    </Button>
                </div>

                <Card>
                    <Table
                        columns={columns}
                        dataSource={reasons}
                        rowKey="reason_id"
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
                title={editingReason ? "แก้ไขเหตุผลการเบิก" : "เพิ่มเหตุผลการเบิก"}
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
                    initialValues={{ require_note: false }}
                >
                    <Form.Item
                        name="reason_id"
                        label="รหัสเหตุผล"
                        rules={[{ required: true, message: "กรุณากรอกรหัสเหตุผล" }]}
                    >
                        <Input
                            placeholder="เช่น STUDY, MEETING, OTHER"
                            disabled={!!editingReason}
                        />
                    </Form.Item>

                    <Form.Item
                        name="reason_name"
                        label="ชื่อเหตุผล"
                        rules={[{ required: true, message: "กรุณากรอกชื่อเหตุผล" }]}
                    >
                        <Input placeholder="เช่น การเรียน, ประชุม, อื่นๆ" />
                    </Form.Item>

                    <Form.Item
                        name="require_note"
                        label="ต้องระบุรายละเอียดเพิ่มเติม"
                        valuePropName="checked"
                        tooltip="เมื่อเปิดใช้งาน ผู้เบิกจะต้องระบุรายละเอียดเพิ่มเติมเมื่อเลือกเหตุผลนี้"
                    >
                        <Switch
                            checkedChildren="ต้องระบุ"
                            unCheckedChildren="ไม่ต้องระบุ"
                        />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}
