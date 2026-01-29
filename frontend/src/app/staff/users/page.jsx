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
    Result,
    Tabs
} from "antd";
import {
    PlusOutlined,
    EditOutlined,
    DeleteOutlined,
    UserOutlined,
    FileExcelOutlined,
    DownloadOutlined,
    CheckCircleOutlined,
    CloseCircleOutlined,
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
    const [importStep, setImportStep] = useState('upload');

    // Batch Delete State
    const [selectedRowKeys, setSelectedRowKeys] = useState([]);

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
        const majorId = record.section?.majorId;
        setSelectedMajor(majorId);
        form.setFieldsValue({
            studentCode: record.studentCode,
            firstName: record.firstName,
            lastName: record.lastName,
            email: record.email,
            role: record.role,
            majorId: majorId,
            sectionId: record.sectionId,
        });
        setModalVisible(true);
    };

    const handleDelete = async (id) => {
        try {
            await usersAPI.delete(id);
            message.success("ลบผู้ใช้งานสำเร็จ");
            fetchUsers();
            setSelectedRowKeys(selectedRowKeys.filter(key => key !== id)); // Remove from selection if selected
        } catch (error) {
            console.error("Error deleting user:", error);
            message.error(error.response?.data?.message || "ไม่สามารถลบได้");
        }
    };

    const handleBatchDelete = async () => {
        if (selectedRowKeys.length === 0) return;

        setLoading(true);
        try {
            let successCount = 0;
            let failCount = 0;

            // Sequential delete to avoid overwhelming server or race conditions if any
            // Parallel Promise.all is faster but let's be safe with current API limits/db locks if any
            // Actually, Promise.all is fine for reasonable numbers (<50). 
            // If user selects ALL (100+), might be better to chunk.
            // Let's use Promise.all for better UX speed.

            const deletePromises = selectedRowKeys.map(id =>
                usersAPI.delete(id)
                    .then(() => { successCount++; })
                    .catch(() => { failCount++; })
            );

            await Promise.all(deletePromises);

            if (failCount > 0) {
                message.warning(`ลบสำเร็จ ${successCount} รายการ, ล้มเหลว ${failCount} รายการ`);
            } else {
                message.success(`ลบสำเร็จ ${successCount} รายการ`);
            }

            setSelectedRowKeys([]);
            fetchUsers();

        } catch (error) {
            console.error("Batch delete error:", error);
            message.error("เกิดข้อผิดพลาดในการลบหมู่");
        } finally {
            setLoading(false);
        }
    };

    const rowSelection = {
        selectedRowKeys,
        onChange: (newSelectedRowKeys) => {
            setSelectedRowKeys(newSelectedRowKeys);
        }
    };

    const handleSubmit = async (values) => {
        try {
            const data = {
                ...values,
                sectionId: values.sectionId || null,
            };
            // Remove majorId from payload as it's not in User model
            delete data.majorId;

            if (editingUser) {
                await usersAPI.update(editingUser.id, data);
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

    // Excel Import Functions
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

    const handleOpenImportModal = () => {
        setImportModalVisible(true);
        setImportStep('upload');
        setUploadedFile(null);
        setPreviewData(null);
    };

    const handleFileUpload = async (file) => {
        setUploadedFile(file);
        setValidationLoading(true);
        setImportModalVisible(true); // Open modal immediately
        setImportStep('upload'); // Show loading state
        try {
            const formData = new FormData();
            formData.append('file', file);
            const response = await axios.post(`${API_BASE_URL}/students/import/preview`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setPreviewData(response.data.data);
            setImportStep('preview');
            if (response.data.data.invalidCount > 0) {
                message.warning(`พบข้อมูลผิดพลาด ${response.data.data.invalidCount} รายการ`);
            } else {
                message.success('ตรวจสอบข้อมูลเรียบร้อย พร้อมนำเข้า');
            }
        } catch (error) {
            console.error('Preview error:', error);
            message.error(error.response?.data?.message || 'เกิดข้อผิดพลาดในการตรวจสอบไฟล์');
            setImportModalVisible(false); // Close modal on error
            setImportStep('upload');
        } finally {
            setValidationLoading(false);
        }
        return false;
    };

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
            const response = await axios.post(`${API_BASE_URL}/students/import/confirm`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            message.success(response.data.message || 'นำเข้าข้อมูลสำเร็จ');
            setImportStep('complete');
            fetchUsers();
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

    const handleCloseImportModal = () => {
        setImportModalVisible(false);
        setUploadedFile(null);
        setPreviewData(null);
        setImportStep('upload');
    };

    const handleMajorChange = (majorId) => {
        setSelectedMajor(majorId);
        form.setFieldValue("sectionId", null);
    };

    const getRoleColor = (role) => {
        switch (role) {
            case "STAFF": return "red";
            case "TEACHER": return "blue";
            case "STUDENT": return "green";
            default: return "default";
        }
    };

    const getRoleText = (role) => {
        switch (role) {
            case "STAFF": return "เจ้าหน้าที่";
            case "TEACHER": return "อาจารย์";
            case "STUDENT": return "นักศึกษา";
            default: return role;
        }
    };

    const columns = [
        {
            title: "รหัส",
            dataIndex: "studentCode",
            key: "studentCode",
            width: 150,
        },
        {
            title: "ชื่อ-นามสกุล",
            key: "fullname",
            render: (_, record) => `${record.firstName || ""} ${record.lastName || ""}`,
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
            width: 180,
            render: (_, record) => record.section?.major?.code || "-",
        },
        {
            title: "กลุ่มเรียน",
            key: "section",
            width: 120,
            render: (_, record) => record.section?.name || "-",
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
                        onConfirm={() => handleDelete(record.id)}
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
        ? sections.filter((s) => s.majorId === selectedMajor)
        : sections;

    const renderImportModalContent = () => {
        if (importStep === 'upload') {
            return (
                <div>
                    <Alert
                        message="วิธีการใช้งาน"
                        description={
                            <div>
                                <p>1. ดาวน์โหลด Template Excel</p>
                                <p>2. กรอกข้อมูลนักศึกษา</p>
                                <p>3. อัปโหลดไฟล์เพื่อตรวจสอบ</p>
                                <p>4. ยืนยันการนำเข้า</p>
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
                        <p className="ant-upload-drag-icon"><InboxOutlined /></p>
                        <p className="ant-upload-text">คลิกหรือลากไฟล์มาวางที่นี่</p>
                        <p className="ant-upload-hint">รองรับไฟล์ .xlsx และ .xls</p>
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
                                <p>ทั้งหมด: {previewData?.totalRows} รายการ</p>
                                <p style={{ color: '#52c41a' }}>✓ ถูกต้อง: {previewData?.validCount} รายการ</p>
                                <p style={{ color: '#f5222d' }}>✗ ผิดพลาด: {previewData?.invalidCount} รายการ</p>
                            </div>
                        }
                        type={previewData?.invalidCount > 0 ? "warning" : "success"}
                        showIcon
                        style={{ marginBottom: 20 }}
                    />
                    {previewData?.validCount > 0 && (
                        <div style={{ marginBottom: 20 }}>
                            <Title level={5}>
                                <CheckCircleOutlined style={{ color: '#52c41a' }} /> พร้อมนำเข้า ({previewData?.validCount})
                            </Title>
                            <List
                                size="small"
                                bordered
                                dataSource={previewData?.validStudents?.slice(0, 5) || []}
                                renderItem={(item) => (
                                    <List.Item>
                                        <Text>{item.user_no}</Text> -
                                        <Text strong> {item.first_name} {item.last_name}</Text>
                                    </List.Item>
                                )}
                                style={{ maxHeight: 200, overflow: 'auto' }}
                            />
                        </div>
                    )}
                    {previewData?.invalidCount > 0 && (
                        <div>
                            <Title level={5}>
                                <CloseCircleOutlined style={{ color: '#f5222d' }} /> ผิดพลาด ({previewData?.invalidCount})
                            </Title>
                            <List
                                size="small"
                                bordered
                                dataSource={previewData?.invalidStudents?.slice(0, 5) || []}
                                renderItem={(item) => (
                                    <List.Item>
                                        <div>
                                            <Text>แถว {item.rowNumber}: {item.user_no || '(ไม่มีรหัส)'}</Text>
                                            <div style={{ color: '#f5222d', fontSize: 12 }}>
                                                {item.errors?.map((err, idx) => <div key={idx}>• {err}</div>)}
                                            </div>
                                        </div>
                                    </List.Item>
                                )}
                                style={{ maxHeight: 200, overflow: 'auto' }}
                            />
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
                </div>
            );
        }

        if (importStep === 'complete') {
            return (
                <Result
                    status="success"
                    title="นำเข้าข้อมูลสำเร็จ!"
                    subTitle={`นำเข้าทั้งหมด ${previewData?.validCount} คน`}
                />
            );
        }
    };

    const handleFormValuesChange = (changedValues, allValues) => {
        if (allValues.role === 'STUDENT') {
            const studentCode = allValues.studentCode;
            if (studentCode && (changedValues.studentCode || changedValues.role)) {
                // Remove non-digits if user types them or just use raw if standard is expected
                // User said "digits only" for the middle part, typically studentCode is digits.
                const digits = studentCode.replace(/\D/g, '');
                if (digits.length > 0) {
                    const autoEmail = `s${digits}@email.kmutnb.ac.th`;
                    form.setFieldsValue({ email: autoEmail });
                }
            }
        }
    };

    // Items for Add User Form (no import tab anymore, import is separate)
    const items = [
        {
            key: '1',
            label: 'กรอกข้อมูล',
            children: (
                <Form form={form} layout="vertical" onFinish={handleSubmit} onValuesChange={handleFormValuesChange}>
                    <Form.Item
                        name="studentCode"
                        label="รหัสผู้ใช้งาน"
                        rules={[{ required: true, message: "กรุณากรอกรหัสผู้ใช้งาน" }]}
                    >
                        <Input placeholder="เช่น s6702041510164, T001, STAFF001" />
                    </Form.Item>

                    <Space style={{ width: "100%" }} size="middle">
                        <Form.Item name="firstName" label="ชื่อ" style={{ width: 300 }}>
                            <Input placeholder="ชื่อ" />
                        </Form.Item>
                        <Form.Item name="lastName" label="นามสกุล" style={{ width: 300 }}>
                            <Input placeholder="นามสกุล" />
                        </Form.Item>
                    </Space>

                    <Form.Item
                        name="email"
                        label="อีเมล"
                        rules={[
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
                            <Select.Option value="STUDENT">นักศึกษา</Select.Option>
                            <Select.Option value="TEACHER">อาจารย์</Select.Option>
                            <Select.Option value="STAFF">เจ้าหน้าที่</Select.Option>
                        </Select>
                    </Form.Item>

                    <Space style={{ width: "100%" }} size="middle">
                        <Form.Item name="majorId" label="สาขาวิชา" style={{ width: 300 }}>
                            <Select
                                placeholder="เลือกสาขาวิชา"
                                allowClear
                                onChange={handleMajorChange}
                                options={majors.map((major) => ({
                                    label: `${major.code} - ${major.name}`,
                                    value: major.id,
                                }))}
                            />
                        </Form.Item>

                        <Form.Item name="sectionId" label="กลุ่มเรียน" style={{ width: 300 }}>
                            <Select
                                placeholder="เลือกกลุ่มเรียน"
                                allowClear
                                disabled={!selectedMajor}
                                options={filteredSections.map((section) => ({
                                    label: section.name,
                                    value: section.id,
                                }))}
                            />
                        </Form.Item>
                    </Space>

                    {!editingUser && (
                        <Form.Item
                            name="password"
                            label="รหัสผ่าน"
                            tooltip="ไม่จำเป็น (ถ้าเว้นว่างจะใช้รหัสผู้ใช้งาน)"
                        >
                            <Input.Password placeholder="ไม่จำเป็น" />
                        </Form.Item>
                    )}
                </Form>
            )
        }
    ];

    // Handle Modal OK button for Form
    const handleModalOk = () => {
        // If Import Tab is active (implied by content check or state, but tabs handle their own content)
        // Actually, for Import Tab, the actions are inside the tab content.
        // For Form Tab, we need to submit form.
        // We can check active tab key if we tracked it, or just let the Form handle it?
        // But Modal has one footer.
        // If we are in Import Tab, we usually hide default footer or verify.
        form.submit();
    };

    // We need to track active tab to adjust footer
    const [activeTab, setActiveTab] = useState('1');



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
                        {currentRole === 'STUDENT' && (
                            <Upload
                                beforeUpload={handleFileUpload}
                                accept=".xlsx,.xls"
                                maxCount={1}
                                showUploadList={false}
                            >
                                <Button
                                    icon={<FileExcelOutlined />}
                                    size="large"
                                >
                                    นำเข้า Excel
                                </Button>
                            </Upload>
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

                {selectedRowKeys.length > 0 && (
                    <div style={{ marginBottom: -16, marginTop: -16, zIndex: 1, position: 'relative' }}>
                        <Alert
                            message={
                                <Space>
                                    <span>เลือกอยู่ {selectedRowKeys.length} รายการ</span>
                                    <Button
                                        type="primary"
                                        danger
                                        size="small"
                                        icon={<DeleteOutlined />}
                                        onClick={() => {
                                            Modal.confirm({
                                                title: 'ยืนยันการลบหมู่',
                                                content: `คุณแน่ใจหรือไม่ที่จะลบผู้ใช้งาน ${selectedRowKeys.length} คนนี้?`,
                                                okText: 'ลบ',
                                                okType: 'danger',
                                                cancelText: 'ยกเลิก',
                                                onOk: handleBatchDelete
                                            });
                                        }}
                                    >
                                        ลบที่เลือก
                                    </Button>
                                    <Button size="small" onClick={() => setSelectedRowKeys([])}>ยกเลิกการเลือก</Button>
                                </Space>
                            }
                            type="info"
                            showIcon
                        />
                    </div>
                )}

                <Card>
                    <Table
                        rowSelection={rowSelection}
                        columns={columns}
                        dataSource={users}
                        rowKey="id"
                        loading={loading}
                        pagination={{
                            pageSize: 10,
                            showSizeChanger: true,
                            showTotal: (total) => `ทั้งหมด ${total} รายการ`,
                        }}
                    />
                </Card>
            </Space>

            {/* Unified User Modal */}
            <Modal
                title={editingUser ? "แก้ไขผู้ใช้งาน" : "จัดการผู้ใช้งาน"}
                open={modalVisible}
                onOk={activeTab === '1' ? handleModalOk : undefined} // Only trigger form submit on Tab 1
                onCancel={() => {
                    setModalVisible(false);
                    form.resetFields();
                    setSelectedMajor(null);
                    setImportStep('upload');
                    setUploadedFile(null);
                    setPreviewData(null);
                    setActiveTab('1');
                }}
                footer={
                    activeTab === '1'
                        ? undefined // Default footer for Add/Edit Form (OK/Cancel)
                        : (importStep === 'preview' ? [ // Footer for Import Preview
                            <Button key="back" onClick={() => setImportStep('upload')}>ย้อนกลับ</Button>,
                            <Button
                                key="confirm"
                                type="primary"
                                onClick={handleConfirmImport}
                                loading={importLoading}
                                disabled={previewData?.validCount === 0}
                            >
                                ยืนยันนำเข้า {previewData?.validCount || 0} รายการ
                            </Button>
                        ] : null)
                }
                width={700}
                destroyOnClose
            >
                {items[0].children}
            </Modal>

            {/* Import Preview Modal */}
            <Modal
                title="นำเข้าข้อมูลจาก Excel"
                open={importModalVisible}
                onCancel={handleCloseImportModal}
                footer={
                    importStep === 'preview' ? [
                        <Button key="back" onClick={() => setImportStep('upload')}>ย้อนกลับ</Button>,
                        <Button
                            key="confirm"
                            type="primary"
                            onClick={handleConfirmImport}
                            loading={importLoading}
                            disabled={previewData?.validCount === 0}
                        >
                            ยืนยันนำเข้า {previewData?.validCount || 0} รายการ
                        </Button>
                    ] : (importStep === 'complete' || importStep === 'importing') ? null : [
                        <Button key="download" icon={<DownloadOutlined />} onClick={handleDownloadTemplate}>
                            ดาวน์โหลด Template
                        </Button>,
                        <Button key="cancel" onClick={handleCloseImportModal}>
                            ยกเลิก
                        </Button>
                    ]
                }
                width={700}
                destroyOnClose
            >
                {renderImportModalContent()}
            </Modal>
        </div>
    );
}
