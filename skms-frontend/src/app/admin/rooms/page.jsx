"use client";

import React, { useState, useEffect } from "react";
import { Layout, Table, Button, Modal, Form, Select, message, Popconfirm, Space, Tag } from "antd";
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

export default function RoomsPage() {
    const [collapsed, setCollapsed] = useState(false);
    const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [user, setUser] = useState(null);
    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingRoom, setEditingRoom] = useState(null);
    const [form] = Form.useForm();
    const router = useRouter();
    const pathname = usePathname();

    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };

        checkMobile();
        window.addEventListener("resize", checkMobile);

        return () => window.removeEventListener("resize", checkMobile);
    }, []);

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

    const fetchRooms = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API_URL}/api/rooms`);
            const data = await response.json();
            setRooms(data);
        } catch (error) {
            message.error("เกิดข้อผิดพลาดในการโหลดข้อมูล");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user?.position === "Admin") {
            fetchRooms();
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
            title: "รหัสห้อง",
            dataIndex: "id",
            key: "id",
            render: (id) => `ROOM-${id.substring(0, 8)}`,
        },
        {
            title: "สถานะ",
            dataIndex: "status",
            key: "status",
            render: (status) => (
                <Tag color={status === "Empty" ? "green" : "red"}>
                    {status === "Empty" ? "ว่าง" : "ไม่ว่าง"}
                </Tag>
            ),
        },
        {
            title: "จำนวนวิชา",
            key: "subjects_count",
            render: (_, record) => record.Subjects?.length || 0,
        },
        {
            title: "จำนวนตารางเรียน",
            key: "schedules_count",
            render: (_, record) => record.Schedules?.length || 0,
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
                        description="คุณแน่ใจหรือไม่ที่จะลบห้องนี้?"
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
        setEditingRoom(null);
        form.resetFields();
        form.setFieldsValue({ status: "Empty" });
        setModalOpen(true);
    };

    const handleEdit = (room) => {
        setEditingRoom(room);
        form.setFieldsValue(room);
        setModalOpen(true);
    };

    const handleDelete = async (id) => {
        try {
            const response = await fetch(`${API_URL}/api/rooms/${id}`, {
                method: "DELETE",
            });
            const data = await response.json();

            if (response.ok) {
                message.success("ลบห้องสำเร็จ");
                fetchRooms();
            } else {
                message.error(data.message || "เกิดข้อผิดพลาดในการลบห้อง");
            }
        } catch (error) {
            message.error("เกิดข้อผิดพลาดในการลบห้อง");
        }
    };

    const handleSubmit = async (values) => {
        try {
            const url = editingRoom
                ? `${API_URL}/api/rooms/${editingRoom.id}`
                : `${API_URL}/api/rooms`;
            const method = editingRoom ? "PUT" : "POST";

            const response = await fetch(url, {
                method,
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(values),
            });

            const data = await response.json();

            if (response.ok) {
                message.success(editingRoom ? "แก้ไขห้องสำเร็จ" : "เพิ่มห้องสำเร็จ");
                setModalOpen(false);
                form.resetFields();
                fetchRooms();
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
                        <h2>จัดการห้อง</h2>
                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={handleAdd}
                        >
                            เพิ่มห้อง
                        </Button>
                    </div>

                    <Table
                        columns={columns}
                        dataSource={rooms}
                        rowKey="id"
                        loading={loading}
                        scroll={{ x: 800 }}
                    />

                    <Modal
                        title={editingRoom ? "แก้ไขห้อง" : "เพิ่มห้อง"}
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
                                name="status"
                                label="สถานะห้อง"
                                rules={[{ required: true, message: "กรุณาเลือกสถานะห้อง" }]}
                            >
                                <Select placeholder="เลือกสถานะห้อง">
                                    <Select.Option value="Empty">ว่าง</Select.Option>
                                    <Select.Option value="Full">ไม่ว่าง</Select.Option>
                                </Select>
                            </Form.Item>
                        </Form>
                    </Modal>
                </Content>
            </Layout>
        </Layout>
    );
}
