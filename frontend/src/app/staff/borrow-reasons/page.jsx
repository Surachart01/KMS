"use client";

import React, { useState, useEffect } from "react";
import {
    Table, Button, Space, Modal, Form, Input, InputNumber,
    Switch, message, Popconfirm, Typography, Card, Tag, Tooltip,
} from "antd";
import {
    PlusOutlined, EditOutlined, DeleteOutlined,
    FileTextOutlined,
} from "@ant-design/icons";
import { borrowReasonsAPI } from "@/service/api";

const { Title } = Typography;

function formatDuration(minutes) {
    if (minutes == null || minutes === 0) return null; // ไม่จำกัด
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h > 0 && m > 0) return `${h} ชม. ${m} น.`;
    if (h > 0) return `${h} ชม.`;
    return `${m} น.`;
}

export default function BorrowReasonsPage() {
    const [reasons, setReasons] = useState([]);
    const [loading, setLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [editingReason, setEditingReason] = useState(null);
    const [form] = Form.useForm();

    useEffect(() => { fetchReasons(); }, []);

    const fetchReasons = async () => {
        try {
            setLoading(true);
            const res = await borrowReasonsAPI.getAll();
            const data = (res.data.data || []).sort((a, b) => a.order - b.order);
            setReasons(data);
        } catch {
            message.error("ไม่สามารถโหลดข้อมูลได้");
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = () => {
        setEditingReason(null);
        form.resetFields();
        form.setFieldsValue({ isActive: true, order: (reasons.length + 1) * 10, durationMinutes: 120 });
        setModalVisible(true);
    };

    const handleEdit = (record) => {
        setEditingReason(record);
        form.setFieldsValue({
            label: record.label,
            order: record.order,
            isActive: record.isActive,
            durationMinutes: record.durationMinutes ?? 120,
        });
        setModalVisible(true);
    };

    const handleDelete = async (id) => {
        try {
            await borrowReasonsAPI.delete(id);
            message.success("ลบเหตุผลสำเร็จ");
            fetchReasons();
        } catch (err) {
            message.error(err.response?.data?.message || "ไม่สามารถลบได้");
        }
    };

    const handleSubmit = async (values) => {
        try {
            if (editingReason) {
                await borrowReasonsAPI.update(editingReason.id, values);
                message.success("แก้ไขเหตุผลสำเร็จ");
            } else {
                await borrowReasonsAPI.create(values);
                message.success("เพิ่มเหตุผลสำเร็จ");
            }
            setModalVisible(false);
            form.resetFields();
            fetchReasons();
        } catch (err) {
            message.error(err.response?.data?.message || "ไม่สามารถบันทึกได้");
        }
    };

    const handleToggleActive = async (record) => {
        try {
            await borrowReasonsAPI.update(record.id, { isActive: !record.isActive });
            message.success(`${!record.isActive ? "เปิด" : "ปิด"}การใช้งานสำเร็จ`);
            fetchReasons();
        } catch {
            message.error("ไม่สามารถเปลี่ยนสถานะได้");
        }
    };

    const columns = [
        {
            title: "ลำดับ",
            dataIndex: "order",
            key: "order",
            width: 80,
            align: "center",
            render: (val) => <Tag>{val}</Tag>,
        },
        {
            title: "เหตุผล",
            dataIndex: "label",
            key: "label",
            render: (label, record) => (
                <Space>
                    <span style={{ fontWeight: 500 }}>{label}</span>
                    {!record.isActive && <Tag color="red">ปิดใช้งาน</Tag>}
                </Space>
            ),
        },
        {
            title: "เวลาเบิกได้",
            dataIndex: "durationMinutes",
            key: "durationMinutes",
            width: 140,
            align: "center",
            render: (minutes) => {
                const label = formatDuration(minutes);
                if (!label) return <Tag color="green">∞ ไม่จำกัด</Tag>;
                return <Tag color="blue">⏱ {label}</Tag>;
            },
        },
        {
            title: "สถานะ",
            dataIndex: "isActive",
            key: "isActive",
            width: 120,
            align: "center",
            render: (isActive, record) => (
                <Switch
                    checked={isActive}
                    onChange={() => handleToggleActive(record)}
                    checkedChildren="เปิด"
                    unCheckedChildren="ปิด"
                />
            ),
        },
        {
            title: "จัดการ",
            key: "action",
            width: 120,
            align: "center",
            render: (_, record) => (
                <Space>
                    <Tooltip title="แก้ไข">
                        <Button type="text" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
                    </Tooltip>
                    <Popconfirm
                        title="ยืนยันการลบ?"
                        description={`ลบ "${record.label}" หรือไม่?`}
                        onConfirm={() => handleDelete(record.id)}
                        okText="ลบ"
                        okType="danger"
                        cancelText="ยกเลิก"
                    >
                        <Tooltip title="ลบ">
                            <Button type="text" danger icon={<DeleteOutlined />} />
                        </Tooltip>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <div className="fade-in">
            <Space direction="vertical" size="large" style={{ width: "100%" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Title level={2} style={{ margin: 0 }}>
                        <FileTextOutlined /> จัดการเหตุผลการเบิกกุญแจ
                    </Title>
                    <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd} size="large">
                        เพิ่มเหตุผล
                    </Button>
                </div>

                <Card className="feature-card">
                    <Table
                        columns={columns}
                        dataSource={reasons}
                        rowKey="id"
                        loading={loading}
                        pagination={{ pageSize: 20 }}
                        size="middle"
                        locale={{ emptyText: "ยังไม่มีเหตุผล" }}
                    />
                </Card>
            </Space>

            <Modal
                title={editingReason ? "แก้ไขเหตุผล" : "เพิ่มเหตุผลใหม่"}
                open={modalVisible}
                onOk={() => form.submit()}
                onCancel={() => { setModalVisible(false); form.resetFields(); }}
                okText="บันทึก"
                cancelText="ยกเลิก"
                destroyOnClose
            >
                <Form form={form} layout="vertical" onFinish={handleSubmit}>
                    <Form.Item
                        name="label"
                        label="ชื่อเหตุผล"
                        rules={[{ required: true, message: "กรุณากรอกชื่อเหตุผล" }]}
                    >
                        <Input placeholder="เช่น สอนชดเชย, ซ่อมบำรุง, ประชุม" maxLength={100} showCount />
                    </Form.Item>

                    <Form.Item
                        name="durationMinutes"
                        label="เวลาที่เบิกได้ (นาที)"
                        extra="เช่น 60 = 1 ชั่วโมง, 120 = 2 ชั่วโมง — ถ้าไม่กรอก = ไม่จำกัดเวลา"
                    >
                        <InputNumber
                            style={{ width: "100%" }}
                            min={15}
                            max={480}
                            step={15}
                            addonAfter="นาที"
                            placeholder="120"
                        />
                    </Form.Item>

                    <Form.Item name="order" label="ลำดับแสดงผล (น้อย = ขึ้นก่อน)">
                        <InputNumber style={{ width: "100%" }} min={0} max={999} />
                    </Form.Item>

                    <Form.Item name="isActive" label="สถานะ" valuePropName="checked">
                        <Switch checkedChildren="เปิดใช้งาน" unCheckedChildren="ปิดใช้งาน" />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}
