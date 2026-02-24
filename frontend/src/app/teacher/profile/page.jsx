"use client";

import React, { useState, useEffect } from "react";
import {
    Card,
    Typography,
    Form,
    Input,
    Button,
    Row,
    Col,
    Avatar,
    Descriptions,
    Tag,
    message,
    Divider
} from "antd";
import { UserOutlined, LockOutlined, SaveOutlined } from "@ant-design/icons";
import Cookies from "js-cookie";
import { usersAPI } from "@/service/api";

const { Title, Text } = Typography;

export default function ProfilePage() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(false);
    const [form] = Form.useForm();

    useEffect(() => {
        const userCookie = Cookies.get("user");
        if (userCookie) {
            try {
                const userData = JSON.parse(userCookie);
                setUser(userData);
                form.setFieldsValue({
                    first_name: userData.first_name,
                    last_name: userData.last_name,
                    email: userData.email,
                    user_no: userData.user_no
                });
                fetchLatestUserData(userData.user_id);
            } catch (error) {
                console.error("Error parsing user data:", error);
            }
        }
    }, []);

    const fetchLatestUserData = async (id) => {
        try {
            const response = await usersAPI.getById(id);
            const freshUser = response.data.data;
            setUser(freshUser);
            // Update cookie
            Cookies.set("user", JSON.stringify(freshUser), { expires: 1 });
        } catch (error) {
            console.error("Error fetching latest user data:", error);
        }
    };

    const handleUpdateProfile = async (values) => {
        try {
            setLoading(true);
            const { first_name, last_name, password } = values;

            const updateData = {
                first_name,
                last_name,
            };

            if (password) {
                updateData.password = password;
            }

            await usersAPI.update(user.user_id, updateData);

            message.success("อัปเดตข้อมูลสำเร็จ");
            form.setFieldValue("password", ""); // Clear password field
            form.setFieldValue("confirmPassword", "");

            fetchLatestUserData(user.user_id);

        } catch (error) {
            console.error("Error updating profile:", error);
            message.error(error.response?.data?.message || "ไม่สามารถอัปเดตข้อมูลได้");
        } finally {
            setLoading(false);
        }
    };

    if (!user) {
        return null;
    }

    const getRoleText = (role) => {
        if (!role) return "";
        switch (role.toUpperCase()) {
            case "ADMIN": return "ผู้ดูแลระบบ";
            case "STAFF": return "เจ้าหน้าที่";
            case "TEACHER": return "อาจารย์";
            case "STUDENT": return "นักศึกษา";
            default: return role;
        }
    };

    return (
        <div className="fade-in" style={{ maxWidth: 1000, margin: "0 auto" }}>
            <div className="page-header" style={{ marginBottom: 24 }}>
                <Title level={2} style={{ margin: 0 }}>
                    <UserOutlined /> ข้อมูลส่วนตัว
                </Title>
            </div>

            <Row gutter={[24, 24]}>
                {/* Left Column: User Card */}
                <Col xs={24} md={8}>
                    <Card className="feature-card" style={{ textAlign: "center" }}>
                        <div style={{ marginBottom: 24 }}>
                            <Avatar
                                size={100}
                                icon={<UserOutlined />}
                                style={{ backgroundColor: '#dcfce7', color: '#16a34a' }}
                            />
                        </div>
                        <Title level={3} style={{ marginBottom: 4 }}>
                            {user.first_name} {user.last_name}
                        </Title>
                        <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
                            {user.email}
                        </Text>
                        <Tag color="blue" style={{ fontSize: 14, padding: "4px 12px" }}>
                            {getRoleText(user.role)}
                        </Tag>

                        <Divider />

                        <Descriptions column={1} size="small" style={{ textAlign: "left" }}>
                            <Descriptions.Item label="รหัสผู้ใช้งาน">{user.user_no || "-"}</Descriptions.Item>
                            <Descriptions.Item label="สาขาวิชา">{user.major?.major_name || "-"}</Descriptions.Item>
                            <Descriptions.Item label="กลุ่มเรียน">{user.section?.section_name || "-"}</Descriptions.Item>
                            <Descriptions.Item label="สถานะ">
                                <Tag color={user.status === 'active' ? 'green' : 'red'}>
                                    {user.status === 'active' ? 'ใช้งานปกติ' : 'ถูกระงับ'}
                                </Tag>
                            </Descriptions.Item>
                        </Descriptions>
                    </Card>
                </Col>

                {/* Right Column: Edit Form */}
                <Col xs={24} md={16}>
                    <Card title="แก้ไขข้อมูล" extra={<EditUserTip />}>
                        <Form
                            form={form}
                            layout="vertical"
                            onFinish={handleUpdateProfile}
                        >
                            <Row gutter={16}>
                                <Col span={12}>
                                    <Form.Item
                                        name="first_name"
                                        label="ชื่อ"
                                        rules={[{ required: true, message: "กรุณาระบุชื่อ" }]}
                                    >
                                        <Input />
                                    </Form.Item>
                                </Col>
                                <Col span={12}>
                                    <Form.Item
                                        name="last_name"
                                        label="นามสกุล"
                                        rules={[{ required: true, message: "กรุณาระบุนามสกุล" }]}
                                    >
                                        <Input />
                                    </Form.Item>
                                </Col>
                            </Row>

                            <Form.Item
                                name="email"
                                label="อีเมล"
                            >
                                <Input disabled />
                            </Form.Item>

                            <Form.Item
                                name="user_no"
                                label="รหัสผู้ใช้งาน"
                            >
                                <Input disabled />
                            </Form.Item>

                            <Divider orientation="left">เปลี่ยนรหัสผ่าน (ถ้าต้องการ)</Divider>

                            <Form.Item
                                name="password"
                                label="รหัสผ่านใหม่"
                                rules={[{ min: 6, message: "รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร" }]}
                            >
                                <Input.Password
                                    prefix={<LockOutlined />}
                                    placeholder="เว้นว่างไว้หากไม่ต้องการเปลี่ยน"
                                />
                            </Form.Item>

                            <Form.Item
                                name="confirmPassword"
                                label="ยืนยันรหัสผ่านใหม่"
                                dependencies={['password']}
                                rules={[
                                    ({ getFieldValue }) => ({
                                        validator(_, value) {
                                            if (!value || getFieldValue('password') === value) {
                                                return Promise.resolve();
                                            }
                                            if (!getFieldValue('password') && !value) {
                                                return Promise.resolve();
                                            }
                                            return Promise.reject(new Error('รหัสผ่านไม่ตรงกัน'));
                                        },
                                    }),
                                ]}
                            >
                                <Input.Password
                                    prefix={<LockOutlined />}
                                    placeholder="กรอกรหัสผ่านใหม่อีกครั้ง"
                                />
                            </Form.Item>

                            <Form.Item style={{ marginTop: 24, marginBottom: 0 }}>
                                <Button
                                    type="primary"
                                    htmlType="submit"
                                    icon={<SaveOutlined />}
                                    loading={loading}
                                    block
                                >
                                    บันทึกการเปลี่ยนแปลง
                                </Button>
                            </Form.Item>
                        </Form>
                    </Card>
                </Col>
            </Row>
        </div>
    );
}

const EditUserTip = () => (
    <Text type="secondary" style={{ fontSize: 12 }}>
        * แก้ไขได้เฉพาะชื่อ-นามสกุล และรหัสผ่าน
    </Text>
);
