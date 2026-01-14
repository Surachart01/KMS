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
    Upload,
    Alert,
    Divider,
    List,
    Progress,
    Result
} from "antd";
import {
    PlusOutlined,
    EditOutlined,
    DeleteOutlined,
    UserOutlined,
    FileExcelOutlined,
    UploadOutlined,
    DownloadOutlined,
    CheckCircleOutlined,
    CloseCircleOutlined,
    WarningOutlined,
    InboxOutlined
} from "@ant-design/icons";
import { usersAPI, majorsAPI, sectionsAPI } from "@/service/api";
import { useSearchParams } from "next/navigation";
import axios from 'axios';

const { Title, Text } = Typography;
const { Dragger } = Upload;
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4556';

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

    // Excel Import States
    const [importModalVisible, setImportModalVisible] = useState(false);
    const [uploadedFile, setUploadedFile] = useState(null);
    const [previewData, setPreviewData] = useState(null);
    const [validationLoading, setValidationLoading] = useState(false);
    const [importLoading, setImportLoading] = useState(false);
    const [importStep, setImportStep] = useState('upload'); // 'upload', 'preview', 'importing', 'complete'

    useEffect(() => {
        fetchUsers();
        fetchMajors();
        fetchSections();
    }, [currentRole]);

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

    // ========================================================================
    // Excel Import Functions
    // ========================================================================

    // Download Template
    const handleDownloadTemplate = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/students/import/template`, {
                responseType: 'blob'
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'student-import-template.xlsx');
            document.body.appendChild(link);
            link.click();
            link.remove();
            message.success('ดาวน์โหลด Template สำเร็จ');
        } catch (error) {
            console.error('Download error:', error);
            message.error('ไม่สามารถดาวน์โหลด Template ได้');
        }
    };

    // Open Import Modal
    const handleOpenImportModal = () => {
        setImportModalVisible(true);
        setImportStep('upload');
        setUploadedFile(null);
        setPreviewData(null);
    };

    // Handle File Upload and Preview
    const handleFileUpload = async (file) => {
        setUploadedFile(file);
        setValidationLoading(true);

        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await axios.post(
                `${API_BASE_URL}/students/import/preview`,
                formData,
                {
                    headers: { 'Content-Type': 'multipart/form-data' }
                }
            );

            setPreviewData(response.data.data);
            setImportStep('preview');

            if (response.data.data.invalid_count > 0) {
                message.warning(`พบข้อมูลผิดพลาด ${response.data.data.invalid_count} รายการ`);
            } else {
                message.success('ตรวจสอบข้อมูลเรียบร้อย พร้อมนำเข้า');
            }

        } catch (error) {
            console.error('Preview error:', error);
            message.error(error.response?.data?.message || 'เกิดข้อผิดพลาดในการตรวจสอบไฟล์');
            setImportStep('upload');
        } finally {
            setValidationLoading(false);
        }

        return false; // Prevent auto upload
    };

    // Confirm Import
    const handleConfirmImport = async () => {
        if (!uploadedFile) {
            message.error('ไม่พบไฟล์ที่อัปโหลด');
            return;
        }

        setImportLoading(true);
        setImportStep('importing');

        try {
            const formData = new FormData();
            formData.append('file', uploadedFile);

            const response = await axios.post(
                `${API_BASE_URL}/students/import/confirm`,
                formData,
                {
                    headers: { 'Content-Type': 'multipart/form-data' }
                }
            );

            message.success(response.data.message || 'นำเข้าข้อมูลสำเร็จ');
            setImportStep('complete');

            // Refresh user list
            fetchUsers();

            // Close modal after 2 seconds
            setTimeout(() => {
                setImportModalVisible(false);
                setUploadedFile(null);
                setPreviewData(null);
                setImportStep('upload');
            }, 2000);

        } catch (error) {
            console.error('Import error:', error);
            message.error(error.response?.data?.message || 'เกิดข้อผิดพลาดในการนำเข้าข้อมูล');
            setImportStep('preview');
        } finally {
            setImportLoading(false);
        }
    };

    // Close Import Modal
    const handleCloseImportModal = () => {
        setImportModalVisible(false);
        setUploadedFile(null);
        setPreviewData(null);
        setImportStep('upload');
    };

    // ========================================================================
    // Utility Functions
    // ========================================================================

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

    // ========================================================================
    // Table Columns
    // ========================================================================

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

    // ========================================================================
    // Render Import Modal Content
    // ========================================================================

    const renderImportModalContent = () => {
        if (importStep === 'upload') {
            return (
                <div>
                    <Alert
                        message="วิธีการใช้งาน"
                        description={
                            <div>
                                <p>1. ดาวน์โหลด Template Excel ด้านล่าง</p>
                                <p>2. กรอกข้อมูลนักศึกษาใน Template</p>
                                <p>3. อัปโหลดไฟล์เพื่อตรวจสอบข้อมูล</p>
                                <p>4. ยืนยันการนำเข้าข้อมูล</p>
                            </div>
                        }
                        type="info"
                        showIcon
                        style={{ marginBottom: 20 }}
                    />

                    <Button
                        type="primary"
                        icon={<DownloadOutlined />}
                        onClick={handleDownloadTemplate}
                        block
                        size="large"
                        style={{ marginBottom: 20 }}
                    >
                        ดาวน์โหลด Template
                    </Button>

                    <Divider>อัปโหลดไฟล์</Divider>

                    <Dragger
                        beforeUpload={handleFileUpload}
                        accept=".xlsx,.xls"
                        maxCount={1}
                        showUploadList={false}
                        disabled={validationLoading}
                    >
                        <p className="ant-upload-drag-icon">
                            <InboxOutlined />
                        </p>
                        <p className="ant-upload-text">คลิกหรือลากไฟล์มาวางที่นี่</p>
                        <p className="ant-upload-hint">
                            รองรับไฟล์ .xlsx และ .xls เท่านั้น (ขนาดไม่เกิน 5MB)
                        </p>
                    </Dragger>

                    {validationLoading && (
                        <div style={{ textAlign: 'center', marginTop: 20 }}>
                            <Progress percent={100} status="active" showInfo={false} />
                            <Text>กำลังตรวจสอบข้อมูล...</Text>
                        </div>
                    )}
                </div>
            );
        }

        if (importStep === 'preview') {
            return (
                <div>
                    <Alert
                        message="ผลการตรวจสอบ"
                        description={
                            <div>
                                <p>ทั้งหมด: {previewData?.total_rows} รายการ</p>
                                <p style={{ color: '#52c41a' }}>✓ ข้อมูลถูกต้อง: {previewData?.valid_count} รายการ</p>
                                <p style={{ color: '#f5222d' }}>✗ ข้อมูลผิดพลาด: {previewData?.invalid_count} รายการ</p>
                            </div>
                        }
                        type={previewData?.invalid_count > 0 ? "warning" : "success"}
                        showIcon
                        style={{ marginBottom: 20 }}
                    />

                    {previewData?.valid_count > 0 && (
                        <div style={{ marginBottom: 20 }}>
                            <Title level={5}>
                                <CheckCircleOutlined style={{ color: '#52c41a' }} /> ข้อมูลที่พร้อมนำเข้า ({previewData?.valid_count})
                            </Title>
                            <List
                                size="small"
                                bordered
                                dataSource={previewData?.valid_students?.slice(0, 5)}
                                renderItem={(item) => (
                                    <List.Item>
                                        <Text>{item.user_no}</Text> -
                                        <Text strong> {item.first_name} {item.last_name}</Text> -
                                        <Text type="secondary">{item.email}</Text>
                                    </List.Item>
                                )}
                                style={{ maxHeight: 200, overflow: 'auto' }}
                            />
                            {previewData?.valid_count > 5 && (
                                <Text type="secondary">และอีก {previewData?.valid_count - 5} รายการ...</Text>
                            )}
                        </div>
                    )}

                    {previewData?.invalid_count > 0 && (
                        <div>
                            <Title level={5}>
                                <CloseCircleOutlined style={{ color: '#f5222d' }} /> ข้อมูลผิดพลาด ({previewData?.invalid_count})
                            </Title>
                            <List
                                size="small"
                                bordered
                                dataSource={previewData?.invalid_students?.slice(0, 5)}
                                renderItem={(item) => (
                                    <List.Item>
                                        <div style={{ width: '100%' }}>
                                            <Text>แถว {item.row_number}: {item.user_no || '(ไม่มีรหัส)'} - {item.first_name} {item.last_name}</Text>
                                            <div style={{ color: '#f5222d', fontSize: 12 }}>
                                                {item.errors.map((err, idx) => (
                                                    <div key={idx}>• {err}</div>
                                                ))}
                                            </div>
                                        </div>
                                    </List.Item>
                                )}
                                style={{ maxHeight: 200, overflow: 'auto' }}
                            />
                            {previewData?.invalid_count > 5 && (
                                <Text type="secondary">และอีก {previewData?.invalid_count - 5} รายการ...</Text>
                            )}
                        </div>
                    )}
                </div>
            );
        }

        if (importStep === 'importing') {
            return (
                <div style={{ textAlign: 'center', padding: 40 }}>
                    <Progress type="circle" percent={100} status="active" />
                    <Title level={4} style={{ marginTop: 20 }}>กำลังนำเข้าข้อมูล...</Title>
                    <Text type="secondary">กรุณารอสักครู่</Text>
                </div>
            );
        }

        if (importStep === 'complete') {
            return (
                <Result
                    status="success"
                    title="นำเข้าข้อมูลสำเร็จ!"
                    subTitle={`นำเข้าข้อมูลนักศึกษาทั้งหมด ${previewData?.valid_count} คน`}
                    extra={[
                        <Button type="primary" key="close" onClick={handleCloseImportModal}>
                            ปิด
                        </Button>
                    ]}
                />
            );
        }
    };

    // ========================================================================
    // Main Render
    // ========================================================================

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
                        {currentRole === 'student' && (
                            <Button
                                icon={<FileExcelOutlined />}
                                onClick={handleOpenImportModal}
                                size="large"
                            >
                                นำเข้า Excel
                            </Button>
                        )}
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

            {/* Add/Edit User Modal */}
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
                            tooltip="ไม่จำเป็นสำหรับ student/teacher (ระบบจะสร้างอัตโนมัติจากรหัสผู้ใช้งาน)"
                        >
                            <Input.Password placeholder="ไม่จำเป็น (ถ้าเว้นว่างจะใช้รหัสผู้ใช้งาน)" />
                        </Form.Item>
                    )}
                </Form>
            </Modal>

            {/* Excel Import Modal */}
            <Modal
                title={"นำเข้าข้อมูลนักศึกษาจาก Excel"}
                open={importModalVisible}
                onCancel={handleCloseImportModal}
                footer={
                    importStep === 'preview' ? [
                        <Button key="back" onClick={() => setImportStep('upload')}>
                            ย้อนกลับ
                        </Button>,
                        <Button
                            key="confirm"
                            type="primary"
                            onClick={handleConfirmImport}
                            loading={importLoading}
                            disabled={previewData?.valid_count === 0}
                        >
                            ยืนยันนำเข้า {previewData?.valid_count || 0} รายการ
                        </Button>
                    ] : null
                }
                width={700}
                destroyOnClose
            >
                {renderImportModalContent()}
            </Modal>
        </div>
    );
}
