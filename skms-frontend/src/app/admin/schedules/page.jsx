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

export default function SchedulesPage() {
    const [collapsed, setCollapsed] = useState(false);
    const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [user, setUser] = useState(null);
    const [schedules, setSchedules] = useState([]);
    const [users, setUsers] = useState([]);
    const [teachers, setTeachers] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [loading, setLoading] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingSchedule, setEditingSchedule] = useState(null);
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

    const fetchSchedules = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API_URL}/api/schedules`);
            const data = await response.json();
            setSchedules(data);
        } catch (error) {
            message.error("เกิดข้อผิดพลาดในการโหลดข้อมูล");
        } finally {
            setLoading(false);
        }
    };

    const fetchUsers = async () => {
        try {
            const response = await fetch(`${API_URL}/api/users`);
            const data = await response.json();
            setUsers(data);
            const teachersList = data.filter((u) => u.position === "Teacher");
            setTeachers(teachersList);
        } catch (error) {
            message.error("เกิดข้อผิดพลาดในการโหลดข้อมูลผู้ใช้");
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

    const fetchSubjects = async () => {
        try {
            const response = await fetch(`${API_URL}/api/subjects`);
            const data = await response.json();
            setSubjects(data);
        } catch (error) {
            message.error("เกิดข้อผิดพลาดในการโหลดข้อมูลวิชา");
        }
    };

    useEffect(() => {
        if (user?.position === "Admin") {
            fetchSchedules();
            fetchUsers();
            fetchRooms();
            fetchSubjects();
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
            title: "นักเรียน",
            key: "user",
            render: (_, record) =>
                record.user
                    ? `${record.user.user_no} - ${record.user.firstname} ${record.user.lastname}`
                    : "-",
        },
        {
            title: "วิชา",
            key: "subject",
            render: (_, record) =>
                record.subject ? `${record.subject.subject_id} - ${record.subject.name}` : "-",
        },
        {
            title: "อาจารย์",
            key: "teacher",
            render: (_, record) =>
                record.teacher
                    ? `${record.teacher.prefix} ${record.teacher.firstname} ${record.teacher.lastname}`
                    : "-",
        },
        {
            title: "ห้อง",
            key: "room",
            render: (_, record) =>
                record.room ? `ROOM-${record.room.id.substring(0, 8)}` : "-",
        },
        {
            title: "ประเภท",
            dataIndex: "type",
            key: "type",
            render: (type) => (
                <Tag color={type === "Study" ? "blue" : "green"}>
                    {type === "Study" ? "เรียน" : "จอง"}
                </Tag>
            ),
        },
        {
            title: "สถานะ",
            dataIndex: "status",
            key: "status",
            render: (status) => (
                <Tag color={status === "Available" ? "green" : "red"}>
                    {status === "Available" ? "ว่าง" : "ไม่ว่าง"}
                </Tag>
            ),
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
                        description="คุณแน่ใจหรือไม่ที่จะลบตารางเรียนนี้?"
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
        setEditingSchedule(null);
        form.resetFields();
        form.setFieldsValue({ type: "Booking", status: "Available" });
        setModalOpen(true);
    };

    const handleEdit = (schedule) => {
        setEditingSchedule(schedule);
        form.setFieldsValue({
            user_id: schedule.user_id,
            room_id: schedule.room_id,
            subject_id: schedule.subject_id,
            teacher_id: schedule.teacher_id,
            type: schedule.type,
            status: schedule.status,
        });
        setModalOpen(true);
    };

    const handleDelete = async (id) => {
        try {
            const response = await fetch(`${API_URL}/api/schedules/${id}`, {
                method: "DELETE",
            });
            const data = await response.json();

            if (response.ok) {
                message.success("ลบตารางเรียนสำเร็จ");
                fetchSchedules();
            } else {
                message.error(data.message || "เกิดข้อผิดพลาดในการลบตารางเรียน");
            }
        } catch (error) {
            message.error("เกิดข้อผิดพลาดในการลบตารางเรียน");
        }
    };

    const handleSubmit = async (values) => {
        try {
            const url = editingSchedule
                ? `${API_URL}/api/schedules/${editingSchedule.id}`
                : `${API_URL}/api/schedules`;
            const method = editingSchedule ? "PUT" : "POST";

            const response = await fetch(url, {
                method,
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(values),
            });

            const data = await response.json();

            if (response.ok) {
                message.success(
                    editingSchedule ? "แก้ไขตารางเรียนสำเร็จ" : "เพิ่มตารางเรียนสำเร็จ"
                );
                setModalOpen(false);
                form.resetFields();
                fetchSchedules();
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
                    <div
                        style={{
                            marginBottom: 16,
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                        }}
                    >
                        <h2>จัดการตารางเรียน</h2>
                        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                            เพิ่มตารางเรียน
                        </Button>
                    </div>

                    <Table
                        columns={columns}
                        dataSource={schedules}
                        rowKey="id"
                        loading={loading}
                        scroll={{ x: 1200 }}
                    />

                    <Modal
                        title={editingSchedule ? "แก้ไขตารางเรียน" : "เพิ่มตารางเรียน"}
                        open={modalOpen}
                        onCancel={() => {
                            setModalOpen(false);
                            form.resetFields();
                        }}
                        onOk={() => form.submit()}
                        okText="บันทึก"
                        cancelText="ยกเลิก"
                        width={600}
                    >
                        <Form form={form} layout="vertical" onFinish={handleSubmit}>
                            <Form.Item
                                name="user_id"
                                label="นักเรียน"
                                rules={[{ required: true, message: "กรุณาเลือกนักเรียน" }]}
                            >
                                <Select
                                    placeholder="เลือกนักเรียน"
                                    loading={users.length === 0}
                                    showSearch
                                    filterOption={(input, option) =>
                                        option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                                    }
                                >
                                    {users.map((u) => (
                                        <Select.Option key={u.id} value={u.id}>
                                            {u.user_no} - {u.firstname} {u.lastname}
                                        </Select.Option>
                                    ))}
                                </Select>
                            </Form.Item>

                            <Form.Item
                                name="subject_id"
                                label="วิชา"
                                rules={[{ required: true, message: "กรุณาเลือกวิชา" }]}
                            >
                                <Select
                                    placeholder="เลือกวิชา"
                                    loading={subjects.length === 0}
                                    showSearch
                                    filterOption={(input, option) =>
                                        option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                                    }
                                >
                                    {subjects.map((subject) => (
                                        <Select.Option key={subject.id} value={subject.id}>
                                            {subject.subject_id} - {subject.name}
                                        </Select.Option>
                                    ))}
                                </Select>
                            </Form.Item>

                            <Form.Item
                                name="teacher_id"
                                label="อาจารย์"
                                rules={[{ required: true, message: "กรุณาเลือกอาจารย์" }]}
                            >
                                <Select
                                    placeholder="เลือกอาจารย์"
                                    loading={teachers.length === 0}
                                    showSearch
                                    filterOption={(input, option) =>
                                        option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                                    }
                                >
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
                                            ROOM-{room.id.substring(0, 8)} (
                                            {room.status === "Empty" ? "ว่าง" : "ไม่ว่าง"})
                                        </Select.Option>
                                    ))}
                                </Select>
                            </Form.Item>

                            <Form.Item
                                name="type"
                                label="ประเภท"
                                rules={[{ required: true, message: "กรุณาเลือกประเภท" }]}
                            >
                                <Select placeholder="เลือกประเภท">
                                    <Select.Option value="Study">เรียน</Select.Option>
                                    <Select.Option value="Booking">จอง</Select.Option>
                                </Select>
                            </Form.Item>

                            <Form.Item
                                name="status"
                                label="สถานะ"
                                rules={[{ required: true, message: "กรุณาเลือกสถานะ" }]}
                            >
                                <Select placeholder="เลือกสถานะ">
                                    <Select.Option value="Available">ว่าง</Select.Option>
                                    <Select.Option value="Unavailable">ไม่ว่าง</Select.Option>
                                </Select>
                            </Form.Item>
                        </Form>
                    </Modal>
                </Content>
            </Layout>
        </Layout>
    );
}
