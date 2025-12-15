"use client";

import React, { useState } from "react";
import { Typography, Card, Form, Input, Button, message, Avatar, Upload } from "antd";
import { UserOutlined, UploadOutlined, LockOutlined } from "@ant-design/icons";
import StudentLayout from "@/components/StudentLayout";

const { Title, Text } = Typography;

export default function SettingsPage() {
    const [form] = Form.useForm();
    const [passwordForm] = Form.useForm();

    const handleProfileUpdate = (values) => {
        message.success("อัพเดตข้อมูลสำเร็จ!");
    };

    const handlePasswordChange = (values) => {
        if (values.newPassword !== values.confirmPassword) {
            message.error("รหัสผ่านใหม่ไม่ตรงกัน!");
            return;
        }
        message.success("เปลี่ยนรหัสผ่านสำเร็จ!");
        passwordForm.resetFields();
    };

    return (
        <StudentLayout>
            <div>
                <Title level={2}>ตั้งค่า</Title>
                <Text>จัดการข้อมูลส่วนตัวและการตั้งค่าบัญชี</Text>

                <div style={{ marginTop: 24, maxWidth: 800 }}>
                    {/* Profile Section */}
                    <Card title="ข้อมูลส่วนตัว" style={{ marginBottom: 16 }}>
                        <div style={{ textAlign: "center", marginBottom: 24 }}>
                            <Avatar size={100} icon={<UserOutlined />} style={{ backgroundColor: "#16a34a" }} />
                            <div style={{ marginTop: 16 }}>
                                <Upload>
                                    <Button icon={<UploadOutlined />}>เปลี่ยนรูปโปรไฟล์</Button>
                                </Upload>
                            </div>
                        </div>

                        <Form
                            form={form}
                            layout="vertical"
                            onFinish={handleProfileUpdate}
                            initialValues={{
                                prefix: "นาย",
                                firstname: "สมชาย",
                                lastname: "ใจดี",
                                studentId: "65010001",
                                email: "student@example.com",
                                phone: "0812345678",
                            }}
                        >
                            <Form.Item label="คำนำหน้า" name="prefix">
                                <Input />
                            </Form.Item>

                            <Form.Item label="ชื่อ" name="firstname">
                                <Input />
                            </Form.Item>

                            <Form.Item label="นามสกุล" name="lastname">
                                <Input />
                            </Form.Item>

                            <Form.Item label="รหัสนักเรียน" name="studentId">
                                <Input disabled />
                            </Form.Item>

                            <Form.Item
                                label="อีเมล"
                                name="email"
                                rules={[{ type: "email", message: "กรุณากรอกอีเมลที่ถูกต้อง" }]}
                            >
                                <Input />
                            </Form.Item>

                            <Form.Item label="เบอร์โทรศัพท์" name="phone">
                                <Input />
                            </Form.Item>

                            <Form.Item>
                                <Button
                                    type="primary"
                                    htmlType="submit"
                                    style={{ backgroundColor: "#16a34a", borderColor: "#16a34a" }}
                                >
                                    บันทึกข้อมูล
                                </Button>
                            </Form.Item>
                        </Form>
                    </Card>

                    {/* Password Section */}
                    <Card title="เปลี่ยนรหัสผ่าน" style={{ marginBottom: 16 }}>
                        <Form form={passwordForm} layout="vertical" onFinish={handlePasswordChange}>
                            <Form.Item
                                label="รหัสผ่านเดิม"
                                name="currentPassword"
                                rules={[{ required: true, message: "กรุณากรอกรหัสผ่านเดิม" }]}
                            >
                                <Input.Password prefix={<LockOutlined />} />
                            </Form.Item>

                            <Form.Item
                                label="รหัสผ่านใหม่"
                                name="newPassword"
                                rules={[
                                    { required: true, message: "กรุณากรอกรหัสผ่านใหม่" },
                                    { min: 6, message: "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร" },
                                ]}
                            >
                                <Input.Password prefix={<LockOutlined />} />
                            </Form.Item>

                            <Form.Item
                                label="ยืนยันรหัสผ่านใหม่"
                                name="confirmPassword"
                                rules={[{ required: true, message: "กรุณายืนยันรหัสผ่านใหม่" }]}
                            >
                                <Input.Password prefix={<LockOutlined />} />
                            </Form.Item>

                            <Form.Item>
                                <Button
                                    type="primary"
                                    htmlType="submit"
                                    style={{ backgroundColor: "#16a34a", borderColor: "#16a34a" }}
                                >
                                    เปลี่ยนรหัสผ่าน
                                </Button>
                            </Form.Item>
                        </Form>
                    </Card>

                    {/* Notification Settings */}
                    <Card title="การแจ้งเตือน">
                        <Text>การตั้งค่าการแจ้งเตือนจะพัฒนาในอนาคต</Text>
                    </Card>
                </div>
            </div>
        </StudentLayout>
    );
}
