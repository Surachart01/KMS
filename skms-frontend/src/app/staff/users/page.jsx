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
    Upload
} from "antd";
import {
    PlusOutlined,
    EditOutlined,
    DeleteOutlined,
    UserOutlined,
    FileExcelOutlined,
    UploadOutlined
} from "@ant-design/icons";
import { usersAPI, majorsAPI, sectionsAPI } from "@/service/api";
import { useSearchParams } from "next/navigation";
import * as XLSX from 'xlsx';

const { Title } = Typography;

export default function UsersPage() {
    const [users, setUsers] = useState([]);
    const [majors, setMajors] = useState([]);
    const [sections, setSections] = useState([]);
    const [loading, setLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [form] = Form.useForm();
    const [selectedMajor, setSelectedMajor] = useState(null);
    const searchParams = useSearchParams();
    const currentRole = searchParams.get("role");

    useEffect(() => {
        fetchUsers();
        fetchMajors();
        fetchSections();
    }, [currentRole]); // Re-fetch when role changes

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const params = {};
            if (currentRole) {
                params.role = currentRole;
            }
            const response = await usersAPI.getAll(params);
            setUsers(response.data.data || []);
        } catch (error) {
            console.error("Error fetching users:", error);
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

    const fetchSections = async () => {
        try {
            const response = await sectionsAPI.getAll();
            setSections(response.data.data || []);
        } catch (error) {
            console.error("Error fetching sections:", error);
        }
    };

    const handleAdd = () => {
        setEditingUser(null);
        setSelectedMajor(null);
        form.resetFields();
        setModalVisible(true);
    };

    const handleEdit = (record) => {
        setEditingUser(record);
        setSelectedMajor(record.major_id);
        form.setFieldsValue({
            user_no: record.user_no,
            first_name: record.first_name,
            last_name: record.last_name,
            email: record.email,
            role: record.role,
            status: record.status,
            major_id: record.major_id,
            section_id: record.section_id,
        });
        setModalVisible(true);
    };

    const handleDelete = async (id) => {
        try {
            await usersAPI.delete(id);
            message.success("ลบผู้ใช้งานสำเร็จ");
            fetchUsers();
        } catch (error) {
            console.error("Error deleting user:", error);
            message.error(error.response?.data?.message || "ไม่สามารถลบได้");
        }
    };

    const handleSubmit = async (values) => {
        try {
            const data = {
                ...values,
                major_id: values.major_id || null,
                section_id: values.section_id || null,
            };

            if (editingUser) {
                await usersAPI.update(editingUser.user_id, data);
                message.success("แก้ไขผู้ใช้งานสำเร็จ");
            } else {
                await usersAPI.create(data);
                message.success("เพิ่มผู้ใช้งานสำเร็จ");
            }
            setModalVisible(false);
            form.resetFields();
            setSelectedMajor(null);
            fetchUsers();
        } catch (error) {
            console.error("Error saving user:", error);
            message.error(error.response?.data?.message || "ไม่สามารถบันทึกได้");
        }
    };

    // Excel Import Logic
    const handleExcelUpload = (file) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet);

                if (jsonData.length === 0) {
                    message.error("ไม่พบข้อมูลในไฟล์");
                    return;
                }

                // Transform data
                const formattedData = jsonData.map(row => ({
                    user_no: String(row['รหัส'] || row['user_no'] || ''),
                    first_name: row['ชื่อ'] || row['first_name'],
                    last_name: row['นามสกุล'] || row['last_name'],
                    email: row['อีเมล'] || row['email'],
                    major_id: row['รหัสสาขา'] || row['major_id'],
                    section_id: row['รหัสกลุ่มเรียน'] || row['section_id'],
                    role: row['บทบาท'] || row['role'] || currentRole || 'student' // Default to currentRole or student
                })).filter(u => u.user_no && u.first_name); // Filter invalid rows

                if (formattedData.length === 0) {
                    message.error("ไม่พบข้อมูลที่ถูกต้อง (ต้องมีรหัสและชื่อ)");
                    return;
                }

                // Send to backend
                await usersAPI.batchImport({ users: formattedData });
                message.success(`นำเข้าข้อมูลสำเร็จ ${formattedData.length} รายการ`);
                fetchUsers();

            } catch (error) {
                console.error("Excel import error:", error);
                message.error("เกิดข้อผิดพลาดในการอ่านไฟล์ Excel");
            }
        };
        reader.readAsArrayBuffer(file);
        return false; // Prevent auto upload
    };

    const handleMajorChange = (majorId) => {
        setSelectedMajor(majorId);
        form.setFieldValue("section_id", null);
    };

    const getRoleColor = (role) => {
        switch (role) {
            case "staff": return "red";
            case "teacher": return "blue";
            case "student": return "green";
            default: return "default";
        }
    };

    const getRoleText = (role) => {
        switch (role) {
            case "staff": return "เจ้าหน้าที่";
            case "teacher": return "อาจารย์";
            case "student": return "นักศึกษา";
            default: return role;
        }
    };

    const columns = [
        {
            title: "รหัส",
            dataIndex: "user_no",
            key: "user_no",
            width: 150,
        },
        {
            title: "ชื่อ-นามสกุล",
            key: "fullname",
            render: (_, record) => `${record.first_name || ""} ${record.last_name || ""}`,
        },
        {
            title: "อีเมล",
            dataIndex: "email",
            key: "email",
        },
        {
            title: "บทบาท",
            dataIndex: "role",
            key: "role",
            width: 120,
            render: (role) => (
                <Tag color={getRoleColor(role)}>
                    {getRoleText(role)}
                </Tag>
            ),
        },
        {
            title: "สาขาวิชา",
            key: "major",
            width: 150,
            render: (_, record) => record.major?.major_name || "-",
        },
        {
            title: "กลุ่มเรียน",
            key: "section",
            width: 120,
            render: (_, record) => record.section?.section_name || "-",
        },
        {
            title: "สถานะ",
            dataIndex: "status",
            key: "status",
            width: 100,
            render: (status) => (
                <Tag color={status === "active" ? "green" : "red"}>
                    {status === "active" ? "ใช้งาน" : "ระงับ"}
                </Tag>
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
                        description="คุณแน่ใจหรือไม่ที่จะลบผู้ใช้งานนี้?"
                        onConfirm={() => handleDelete(record.user_id)}
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

    const filteredSections = selectedMajor
        ? sections.filter((s) => s.major_id === selectedMajor)
        : sections;

    return (
        <div>
            <Space direction="vertical" size="large" style={{ width: "100%" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                        <Title level={2}>
                            <UserOutlined /> จัดการผู้ใช้งาน {currentRole && `(${getRoleText(currentRole)})`}
                        </Title>
                    </div>
                    <Space>
                        <Upload
                            beforeUpload={handleExcelUpload}
                            showUploadList={false}
                            accept=".xlsx, .xls"
                        >
                            <Button icon={<FileExcelOutlined />}>นำเข้า Excel</Button>
                        </Upload>
                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={handleAdd}
                            size="large"
                        >
                            เพิ่มผู้ใช้งาน
                        </Button>
                    </Space>
                </div>

                <Card>
                    <Table
                        columns={columns}
                        dataSource={users}
                        rowKey="user_id"
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
                title={editingUser ? "แก้ไขผู้ใช้งาน" : "เพิ่มผู้ใช้งาน"}
                open={modalVisible}
                onOk={() => form.submit()}
                onCancel={() => {
                    setModalVisible(false);
                    form.resetFields();
                    setSelectedMajor(null);
                }}
                okText="บันทึก"
                cancelText="ยกเลิก"
                width={700}
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleSubmit}
                >
                    <Form.Item
                        name="user_no"
                        label="รหัสผู้ใช้งาน"
                        rules={[{ required: true, message: "กรุณากรอกรหัสผู้ใช้งาน" }]}
                    >
                        <Input placeholder="เช่น s6702041510164, T001, STAFF001" />
                    </Form.Item>

                    <Space style={{ width: "100%" }} size="middle">
                        <Form.Item
                            name="first_name"
                            label="ชื่อ"
                            style={{ width: 300 }}
                        >
                            <Input placeholder="ชื่อ" />
                        </Form.Item>

                        <Form.Item
                            name="last_name"
                            label="นามสกุล"
                            style={{ width: 300 }}
                        >
                            <Input placeholder="นามสกุล" />
                        </Form.Item>
                    </Space>

                    <Form.Item
                        name="email"
                        label="อีเมล"
                        rules={[
                            { required: true, message: "กรุณากรอกอีเมล" },
                            { type: "email", message: "รูปแบบอีเมลไม่ถูกต้อง" },
                        ]}
                    >
                        <Input placeholder="example@email.com" />
                    </Form.Item>

                    <Form.Item
                        name="role"
                        label="บทบาท"
                        rules={[{ required: true, message: "กรุณาเลือกบทบาท" }]}
                    >
                        <Select placeholder="เลือกบทบาท">
                            <Select.Option value="student">นักศึกษา</Select.Option>
                            <Select.Option value="teacher">อาจารย์</Select.Option>
                            <Select.Option value="staff">เจ้าหน้าที่</Select.Option>
                        </Select>
                    </Form.Item>

                    <Space style={{ width: "100%" }} size="middle">
                        <Form.Item
                            name="major_id"
                            label="สาขาวิชา"
                            style={{ width: 300 }}
                        >
                            <Select
                                placeholder="เลือกสาขาวิชา"
                                allowClear
                                onChange={handleMajorChange}
                                options={majors.map((major) => ({
                                    label: major.major_name,
                                    value: major.major_id,
                                }))}
                            />
                        </Form.Item>

                        <Form.Item
                            name="section_id"
                            label="กลุ่มเรียน"
                            style={{ width: 300 }}
                        >
                            <Select
                                placeholder="เลือกกลุ่มเรียน"
                                allowClear
                                disabled={!selectedMajor}
                                options={filteredSections.map((section) => ({
                                    label: section.section_name,
                                    value: section.section_id,
                                }))}
                            />
                        </Form.Item>
                    </Space>

                    <Form.Item
                        name="status"
                        label="สถานะ"
                        initialValue="active"
                    >
                        <Select>
                            <Select.Option value="active">ใช้งาน</Select.Option>
                            <Select.Option value="inactive">ระงับ</Select.Option>
                        </Select>
                    </Form.Item>

                    {!editingUser && (
                        <Form.Item
                            name="password"
                            label="รหัสผ่าน"
                            rules={[{ required: true, message: "กรุณากรอกรหัสผ่าน" }]}
                            tooltip="รหัสผ่านเริ่มต้น สามารถเปลี่ยนได้ภายหลัง"
                        >
                            <Input.Password placeholder="รหัสผ่าน" />
                        </Form.Item>
                    )}
                </Form>
            </Modal>
        </div>
    );
}
