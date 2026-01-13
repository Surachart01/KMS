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

export default function SubjectsPage() {
    const [collapsed, setCollapsed] = useState(false);
    const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [user, setUser] = useState(null);
    const [subjects, setSubjects] = useState([]);
    const [teachers, setTeachers] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingSubject, setEditingSubject] = useState(null);
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

    const fetchSubjects = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API_URL}/api/subjects`);
            const data = await response.json();
            setSubjects(data);
        } catch (error) {
            message.error("เกิดข้อผิดพลาดในการโหลดข้อมูล");
        } finally {
            setLoading(false);
        }
    };

    const fetchTeachers = async () => {
        try {
            const response = await fetch(`${API_URL}/api/users`);
            const data = await response.json();
            const teachersList = data.filter((u) => u.position === "Teacher");
            setTeachers(teachersList);
        } catch (error) {
            message.error("เกิดข้อผิดพลาดในการโหลดข้อมูลอาจารย์");
        }
    };

    const fetchRooms = async () => {
        try {
            const response = await fetch(`${API_URL}/api/rooms`);
            const data = await response.json();
            setRooms(data);
        } catch (error) {
            message.error("เกิดข้อผิดพลาดในการโหลดข้อมูลห้อง");
        }
    };

    useEffect(() => {
        if (user?.position === "Admin") {
            fetchSubjects();
            fetchTeachers();
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
            title: "รหัสวิชา",
            dataIndex: "subject_id",
            key: "subject_id",
        },
        {
            title: "ชื่อวิชา",
            dataIndex: "name",
            key: "name",
        },
        {
            title: "อาจารย์ผู้สอน",
            key: "teacher",
            render: (_, record) =>
                record.user
                    ? `${record.user.prefix} ${record.user.firstname} ${record.user.lastname}`
                    : "-",
        },
        {
            title: "ห้องเรียน",
            key: "room",
            render: (_, record) =>
                record.room ? `ROOM-${record.room.id.substring(0, 8)}` : "-",
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
                        description="คุณแน่ใจหรือไม่ที่จะลบวิชานี้?"
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
        setEditingSubject(null);
        form.resetFields();
        setModalOpen(true);
    };

    const handleEdit = (subject) => {
        setEditingSubject(subject);
        form.setFieldsValue({
            subject_id: subject.subject_id,
            name: subject.name,
            user_id: subject.user_id,
            room_id: subject.room_id,
        });
        setModalOpen(true);
    };

    const handleDelete = async (id) => {
        try {
            const response = await fetch(`${API_URL}/api/subjects/${id}`, {
                method: "DELETE",
            });
            const data = await response.json();

            if (response.ok) {
                message.success("ลบวิชาสำเร็จ");
                fetchSubjects();
            } else {
                message.error(data.message || "เกิดข้อผิดพลาดในการลบวิชา");
            }
        } catch (error) {
            message.error("เกิดข้อผิดพลาดในการลบวิชา");
        }
    };

    const handleSubmit = async (values) => {
        try {
            const url = editingSubject
                ? `${API_URL}/api/subjects/${editingSubject.id}`
                : `${API_URL}/api/subjects`;
            const method = editingSubject ? "PUT" : "POST";

            const response = await fetch(url, {
                method,
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(values),
            });

            const data = await response.json();

            if (response.ok) {
                message.success(editingSubject ? "แก้ไขวิชาสำเร็จ" : "เพิ่มวิชาสำเร็จ");
                setModalOpen(false);
                form.resetFields();
                fetchSubjects();
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
                        <h2>จัดการวิชา</h2>
                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={handleAdd}
                        >
                            เพิ่มวิชา
                        </Button>
                    </div>

                    <Table
                        columns={columns}
                        dataSource={subjects}
                        rowKey="id"
                        loading={loading}
                        scroll={{ x: 1000 }}
                    />

                    <Modal
                        title={editingSubject ? "แก้ไขวิชา" : "เพิ่มวิชา"}
                        open={modalOpen}
                        onCancel={() => {
                            setModalOpen(false);
                            form.resetFields();
                        }}
                        onOk={() => form.submit()}
                        okText="บันทึก"
                        cancelText="ยกเลิก"
                    >
                        <Form form={form} layout="vertical" onFinish={handleSubmit}>
                            <Form.Item
                                name="subject_id"
                                label="รหัสวิชา"
                                rules={[{ required: true, message: "กรุณากรอกรหัสวิชา" }]}
                            >
                                <Input placeholder="เช่น CS101" disabled={!!editingSubject} />
                            </Form.Item>

                            <Form.Item
                                name="name"
                                label="ชื่อวิชา"
                                rules={[{ required: true, message: "กรุณากรอกชื่อวิชา" }]}
                            >
                                <Input placeholder="เช่น Introduction to Computer Science" />
                            </Form.Item>

                            <Form.Item
                                name="user_id"
                                label="อาจารย์ผู้สอน"
                                rules={[{ required: true, message: "กรุณาเลือกอาจารย์ผู้สอน" }]}
                            >
                                <Select placeholder="เลือกอาจารย์" loading={teachers.length === 0}>
                                    {teachers.map((teacher) => (
                                        <Select.Option key={teacher.id} value={teacher.id}>
                                            {teacher.prefix} {teacher.firstname} {teacher.lastname}
                                        </Select.Option>
                                    ))}
                                </Select>
                            </Form.Item>

                            <Form.Item
                                name="room_id"
                                label="ห้องเรียน"
                                rules={[{ required: true, message: "กรุณาเลือกห้องเรียน" }]}
                            >
                                <Select placeholder="เลือกห้องเรียน" loading={rooms.length === 0}>
                                    {rooms.map((room) => (
                                        <Select.Option key={room.id} value={room.id}>
                                            ROOM-{room.id.substring(0, 8)} ({room.status === "Empty" ? "ว่าง" : "ไม่ว่าง"})
                                        </Select.Option>
                                    ))}
                                </Select>
                            </Form.Item>
                        </Form>
                    </Modal>
                </Content>
            </Layout>
        </Layout>
    );
}
