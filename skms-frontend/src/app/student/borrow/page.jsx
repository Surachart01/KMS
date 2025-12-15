"use client";

import React, { useState } from "react";
import { Typography, Card, Row, Col, Button, Modal, Form, Input, Select, message } from "antd";
import { KeyOutlined, CheckCircleOutlined, ClockCircleOutlined } from "@ant-design/icons";
import StudentLayout from "@/components/StudentLayout";

const { Title, Text } = Typography;
const { Option } = Select;

export default function BorrowPage() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [form] = Form.useForm();

    // Mock data for available keys
    const availableKeys = [
        { id: 1, name: "ห้องคอมพิวเตอร์ 1", room: "ชั้น 2", status: "available" },
        { id: 2, name: "ห้องวิทยาศาสตร์ 1", room: "ชั้น 3", status: "available" },
        { id: 3, name: "ห้องดนตรี", room: "ชั้น 1", status: "available" },
        { id: 4, name: "ห้องคอมพิวเตอร์ 2", room: "ชั้น 2", status: "borrowed" },
        { id: 5, name: "ห้องวิทยาศาสตร์ 2", room: "ชั้น 3", status: "available" },
        { id: 6, name: "ห้องศิลปะ", room: "ชั้น 1", status: "available" },
    ];

    const handleBorrow = (key) => {
        setIsModalOpen(true);
    };

    const handleSubmit = async (values) => {
        // Handle borrow submission
        message.success("เบิกกุญแจสำเร็จ!");
        setIsModalOpen(false);
        form.resetFields();
    };

    return (
        <StudentLayout>
            <div>
                <Title level={2}>เบิกกุญแจ</Title>
                <Text>เลือกกุญแจที่ต้องการเบิก</Text>

                <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
                    {availableKeys.map((key) => (
                        <Col xs={24} sm={12} md={8} lg={6} key={key.id}>
                            <Card
                                hoverable={key.status === "available"}
                                style={{
                                    opacity: key.status === "borrowed" ? 0.6 : 1,
                                }}
                            >
                                <div style={{ textAlign: "center" }}>
                                    <KeyOutlined
                                        style={{
                                            fontSize: 48,
                                            color: key.status === "available" ? "#16a34a" : "#9ca3af",
                                        }}
                                    />
                                    <Title level={4} style={{ marginTop: 16, marginBottom: 8 }}>
                                        {key.name}
                                    </Title>
                                    <Text type="secondary">{key.room}</Text>
                                    <div style={{ marginTop: 16 }}>
                                        {key.status === "available" ? (
                                            <>
                                                <CheckCircleOutlined style={{ color: "#16a34a", marginRight: 8 }} />
                                                <Text style={{ color: "#16a34a" }}>พร้อมใช้งาน</Text>
                                            </>
                                        ) : (
                                            <>
                                                <ClockCircleOutlined style={{ color: "#9ca3af", marginRight: 8 }} />
                                                <Text type="secondary">ถูกเบิกแล้ว</Text>
                                            </>
                                        )}
                                    </div>
                                    <Button
                                        type="primary"
                                        style={{
                                            marginTop: 16,
                                            width: "100%",
                                            backgroundColor: key.status === "available" ? "#16a34a" : undefined,
                                            borderColor: key.status === "available" ? "#16a34a" : undefined,
                                        }}
                                        disabled={key.status === "borrowed"}
                                        onClick={() => handleBorrow(key)}
                                    >
                                        {key.status === "available" ? "เบิกกุญแจ" : "ไม่พร้อมใช้งาน"}
                                    </Button>
                                </div>
                            </Card>
                        </Col>
                    ))}
                </Row>

                <Modal
                    title="เบิกกุญแจ"
                    open={isModalOpen}
                    onCancel={() => {
                        setIsModalOpen(false);
                        form.resetFields();
                    }}
                    footer={null}
                >
                    <Form form={form} layout="vertical" onFinish={handleSubmit}>
                        <Form.Item
                            label="เลือกกุญแจ"
                            name="keyId"
                            rules={[{ required: true, message: "กรุณาเลือกกุญแจ" }]}
                        >
                            <Select placeholder="เลือกกุญแจที่ต้องการเบิก">
                                {availableKeys
                                    .filter((k) => k.status === "available")
                                    .map((k) => (
                                        <Option key={k.id} value={k.id}>
                                            {k.name} ({k.room})
                                        </Option>
                                    ))}
                            </Select>
                        </Form.Item>

                        <Form.Item
                            label="วัตถุประสงค์"
                            name="purpose"
                            rules={[{ required: true, message: "กรุณาระบุวัตถุประสงค์" }]}
                        >
                            <Input.TextArea rows={3} placeholder="ระบุวัตถุประสงค์ในการเบิกกุญแจ" />
                        </Form.Item>

                        <Form.Item
                            label="ระยะเวลาที่ใช้ (ชั่วโมง)"
                            name="duration"
                            rules={[{ required: true, message: "กรุณาระบุระยะเวลา" }]}
                        >
                            <Select placeholder="เลือกระยะเวลา">
                                <Option value={1}>1 ชั่วโมง</Option>
                                <Option value={2}>2 ชั่วโมง</Option>
                                <Option value={3}>3 ชั่วโมง</Option>
                                <Option value={4}>4 ชั่วโมง</Option>
                            </Select>
                        </Form.Item>

                        <Form.Item>
                            <Button type="primary" htmlType="submit" block style={{ backgroundColor: "#16a34a", borderColor: "#16a34a" }}>
                                ยืนยันการเบิก
                            </Button>
                        </Form.Item>
                    </Form>
                </Modal>
            </div>
        </StudentLayout>
    );
}
