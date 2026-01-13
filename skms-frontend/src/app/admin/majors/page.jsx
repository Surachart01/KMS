"use client";

import React, { useState, useEffect } from "react";
import { Layout, Table, Button, Modal, Form, Input, Select, message, Popconfirm, Space } from "antd";
import {
    HomeOutlined,
    UserOutlined,
    KeyOutlined,
    HistoryOutlined,
    SettingOutlined,
    DashboardOutlined,
    PlusOutlined,
    EditOutlined,
    DeleteOutlined,
    BookOutlined,
} from "@ant-design/icons";
import { useRouter, usePathname } from "next/navigation";
import Cookies from "js-cookie";
import Sidebar from "@/components/Sidebar";
import AppHeader from "@/components/AppHeader";

const { Content } = Layout;

export default function MajorsPage() {
    const [collapsed, setCollapsed] = useState(false);
    const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [user, setUser] = useState(null);
    const [majors, setMajors] = useState([]);
    const [loading, setLoading] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingMajor, setEditingMajor] = useState(null);
    const [form] = Form.useForm();
    const router = useRouter();
    const pathname = usePathname();

    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

    // Check if mobile
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };

        checkMobile();
        window.addEventListener("resize", checkMobile);

        return () => window.removeEventListener("resize", checkMobile);
    }, []);

    // Check authentication
    useEffect(() => {
        const token = Cookies.get("token");
        const userData = Cookies.get("user");

        if (!token) {
            router.push("/login");
        } else if (userData) {
            const parsedUser = JSON.parse(userData);
            setUser(parsedUser);
            if (parsedUser.position !== "Admin") {
                message.error("คุณไม่มีสิทธิ์เข้าถึงหน้านี้");
                router.push("/");
            }
        }
    }, [router]);

    // Fetch majors
    const fetchMajors = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API_URL}/api/major`);
            const data = await response.json();
            setMajors(data);
        } catch (error) {
            message.error("เกิดข้อผิดพลาดในการโหลดข้อมูล");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user?.position === "Admin") {
            fetchMajors();
        }
    }, [user]);

    const handleLogout = () => {
        Cookies.remove("token");
        Cookies.remove("user");
        router.push("/login");
    };

    const menuItems = [
        {
            key: "/admin",
            icon: <HomeOutlined />,
            label: "หน้าหลัก",
        },
        {
            key: "/admin/dashboard",
            icon: <DashboardOutlined />,
            label: "แดชบอร์ด",
        },
        {
            key: "/admin/users",
            icon: <UserOutlined />,
            label: "จัดการผู้ใช้",
        },
        {
            key: "/admin/majors",
            icon: <BookOutlined />,
            label: "จัดการสาขา",
        },
        {
            key: "/admin/sections",
            icon: <BookOutlined />,
            label: "จัดการกลุ่มเรียน",
        },
        {
            key: "/admin/rooms",
            icon: <KeyOutlined />,
            label: "จัดการห้อง",
        },
        {
            key: "/admin/subjects",
            icon: <BookOutlined />,
            label: "จัดการวิชา",
        },
        {
            key: "/admin/schedules",
            icon: <HistoryOutlined />,
            label: "จัดการตารางเรียน",
        },
        {
            key: "/admin/settings",
            icon: <SettingOutlined />,
            label: "ตั้งค่า",
        },
    ];

    const handleMenuClick = ({ key }) => {
        if (key !== pathname) {
            router.push(key);
        }
        if (isMobile) {
            setMobileDrawerOpen(false);
        }
    };

    const columns = [
        {
            title: "ชื่อสาขา",
            dataIndex: "major_name",
            key: "major_name",
        },
        {
            title: "หมวดหมู่",
            dataIndex: "section",
            key: "section",
        },
        {
            title: "ระดับการศึกษา",
            dataIndex: "level",
            key: "level",
        },
        {
            title: "จำนวนกลุ่มเรียน",
            key: "sections_count",
            render: (_, record) => record.Sections?.length || 0,
        },
        {
            title: "การจัดการ",
            key: "action",
            render: (_, record) => (
                <Space size="small">
                    <Button
                        type="primary"
                        icon={<EditOutlined />}
                        onClick={() => handleEdit(record)}
                    >
                        แก้ไข
                    </Button>
                    <Popconfirm
                        title="ยืนยันการลบ"
                        description="คุณแน่ใจหรือไม่ที่จะลบสาขานี้?"
                        onConfirm={() => handleDelete(record.id)}
                        okText="ใช่"
                        cancelText="ไม่"
                    >
                        <Button type="primary" danger icon={<DeleteOutlined />}>
                            ลบ
                        </Button>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    const handleAdd = () => {
        setEditingMajor(null);
        form.resetFields();
        setModalOpen(true);
    };

    const handleEdit = (major) => {
        setEditingMajor(major);
        form.setFieldsValue(major);
        setModalOpen(true);
    };

    const handleDelete = async (id) => {
        try {
            const response = await fetch(`${API_URL}/api/major/${id}`, {
                method: "DELETE",
            });
            const data = await response.json();

            if (response.ok) {
                message.success("ลบสาขาสำเร็จ");
                fetchMajors();
            } else {
                message.error(data.message || "เกิดข้อผิดพลาดในการลบสาขา");
            }
        } catch (error) {
            message.error("เกิดข้อผิดพลาดในการลบสาขา");
        }
    };

    const handleSubmit = async (values) => {
        try {
            const url = editingMajor
                ? `${API_URL}/api/major/${editingMajor.id}`
                : `${API_URL}/api/major`;
            const method = editingMajor ? "PUT" : "POST";

            const response = await fetch(url, {
                method,
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(values),
            });

            const data = await response.json();

            if (response.ok) {
                message.success(editingMajor ? "แก้ไขสาขาสำเร็จ" : "เพิ่มสาขาสำเร็จ");
                setModalOpen(false);
                form.resetFields();
                fetchMajors();
            } else {
                message.error(data.message || "เกิดข้อผิดพลาด");
            }
        } catch (error) {
            message.error("เกิดข้อผิดพลาดในการบันทึกข้อมูล");
        }
    };

    return (
        <Layout style={{ minHeight: "100vh" }}>
            <Sidebar
                collapsed={collapsed}
                isMobile={isMobile}
                mobileDrawerOpen={mobileDrawerOpen}
                setMobileDrawerOpen={setMobileDrawerOpen}
                menuItems={menuItems}
                pathname={pathname}
                handleMenuClick={handleMenuClick}
            />

            <Layout
                style={{
                    marginLeft: isMobile ? 0 : collapsed ? 80 : 200,
                    transition: "margin-left 0.2s",
                }}
            >
                <AppHeader
                    collapsed={collapsed}
                    setCollapsed={setCollapsed}
                    isMobile={isMobile}
                    setMobileDrawerOpen={setMobileDrawerOpen}
                    user={user}
                    handleLogout={handleLogout}
                />

                <Content
                    style={{
                        margin: "24px 16px",
                        padding: 24,
                        minHeight: 280,
                        background: "#fff",
                        borderRadius: 8,
                    }}
                >
                    <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <h2>จัดการสาขา</h2>
                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={handleAdd}
                        >
                            เพิ่มสาขา
                        </Button>
                    </div>

                    <Table
                        columns={columns}
                        dataSource={majors}
                        rowKey="id"
                        loading={loading}
                        scroll={{ x: 800 }}
                    />

                    <Modal
                        title={editingMajor ? "แก้ไขสาขา" : "เพิ่มสาขา"}
                        open={modalOpen}
                        onCancel={() => {
                            setModalOpen(false);
                            form.resetFields();
                        }}
                        onOk={() => form.submit()}
                        okText="บันทึก"
                        cancelText="ยกเลิก"
                    >
                        <Form
                            form={form}
                            layout="vertical"
                            onFinish={handleSubmit}
                        >
                            <Form.Item
                                name="major_name"
                                label="ชื่อสาขา"
                                rules={[{ required: true, message: "กรุณากรอกชื่อสาขา" }]}
                            >
                                <Input placeholder="เช่น วิทยาการคอมพิวเตอร์" />
                            </Form.Item>

                            <Form.Item
                                name="section"
                                label="หมวดหมู่"
                                rules={[{ required: true, message: "กรุณากรอกหมวดหมู่" }]}
                            >
                                <Input placeholder="เช่น วิทยาศาสตร์และเทคโนโลยี" />
                            </Form.Item>

                            <Form.Item
                                name="level"
                                label="ระดับการศึกษา"
                                rules={[{ required: true, message: "กรุณาเลือกระดับการศึกษา" }]}
                            >
                                <Select placeholder="เลือกระดับการศึกษา">
                                    <Select.Option value="ปริญญาตรี">ปริญญาตรี</Select.Option>
                                    <Select.Option value="ปริญญาโท">ปริญญาโท</Select.Option>
                                    <Select.Option value="ปริญญาเอก">ปริญญาเอก</Select.Option>
                                </Select>
                            </Form.Item>
                        </Form>
                    </Modal>
                </Content>
            </Layout>
        </Layout>
    );
}
