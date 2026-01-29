"use client";

import React, { useState, useEffect } from "react";
import { Table, Button, Space, Modal, Form, Input, Select, TimePicker, message, Popconfirm, Typography, Card, Tag, Upload, Alert } from "antd";
import {
    PlusOutlined,
    EditOutlined,
    DeleteOutlined,
    CalendarOutlined,
    FileExcelOutlined,
    ClearOutlined
} from "@ant-design/icons";
import { schedulesAPI, subjectsAPI, usersAPI } from "@/service/api";
import dayjs from "dayjs";
import * as XLSX from 'xlsx';
import { UserOutlined } from "@ant-design/icons";

const { Title, Text } = Typography;

export default function SchedulesPage() {
    const [schedules, setSchedules] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [teachers, setTeachers] = useState([]);
    const [loading, setLoading] = useState(false);

    // Add/Edit Modal State
    const [modalVisible, setModalVisible] = useState(false);
    const [editingSchedule, setEditingSchedule] = useState(null);
    const [studentList, setStudentList] = useState([]);
    const [allStudents, setAllStudents] = useState([]);
    const [form] = Form.useForm();

    // Import Modal State
    const [importModalVisible, setImportModalVisible] = useState(false);
    const [parsedData, setParsedData] = useState(null);
    const [importing, setImporting] = useState(false);

    // Filters
    const [filterRoom, setFilterRoom] = useState(null);
    const [filterDay, setFilterDay] = useState(null);

    useEffect(() => {
        fetchSchedules();
        fetchSubjects();
        fetchTeachers();
        fetchAllStudents();
    }, []);

    const fetchAllStudents = async () => {
        try {
            const response = await usersAPI.getAll({ role: 'STUDENT', limit: 2000 });
            setAllStudents(response.data.users || []);
        } catch (error) {
            console.error("Error fetching students:", error);
        }
    };

    const fetchSchedules = async () => {
        try {
            setLoading(true);
            const params = {};
            if (filterRoom) params.roomCode = filterRoom;
            if (filterDay !== null) params.dayOfWeek = filterDay;

            const response = await schedulesAPI.getAll(params);
            setSchedules(response.data.data || []);
        } catch (error) {
            console.error("Error fetching schedules:", error);
            message.error("ไม่สามารถโหลดข้อมูลตารางเรียนได้");
        } finally {
            setLoading(false);
        }
    };

    const fetchSubjects = async () => {
        try {
            const response = await subjectsAPI.getAll();
            setSubjects(response.data.data || []);
        } catch (error) {
            console.error("Error fetching subjects:", error);
        }
    };

    const fetchTeachers = async () => {
        try {
            const response = await usersAPI.getAll({ role: 'TEACHER' });
            setTeachers(response.data.data || []);
        } catch (error) {
            console.error("Error fetching teachers:", error);
        }
    };

    const handleAdd = () => {
        setEditingSchedule(null);
        setStudentList([]);
        form.resetFields();
        setModalVisible(true);
    };

    const handleEdit = (record) => {
        setEditingSchedule(record);
        form.setFieldsValue({
            subjectId: record.subjectId,
            roomCode: record.roomCode,
            roomCode: record.roomCode,
            // section: record.section, // Removed
            teacherId: record.teacherId,
            dayOfWeek: record.dayOfWeek,
            startTime: dayjs(record.startTime),
            endTime: dayjs(record.endTime)
        });
        setStudentList(record.students || []);
        setModalVisible(true);
    };

    const handleDelete = async (id) => {
        try {
            await schedulesAPI.delete(id);
            message.success("ลบตารางเรียนสำเร็จ");
            fetchSchedules();
        } catch (error) {
            console.error("Error deleting schedule:", error);
            message.error(error.response?.data?.message || "ไม่สามารถลบได้");
        }
    };

    const handleDeleteAll = async () => {
        try {
            await schedulesAPI.deleteAll();
            message.success("ลบตารางเรียนทั้งหมดสำเร็จ");
            fetchSchedules();
        } catch (error) {
            console.error("Error deleting all schedules:", error);
            message.error("ไม่สามารถลบได้");
        }
    };

    const handleSubmit = async (values) => {
        try {
            const startTime = new Date();
            startTime.setHours(values.startTime.hour());
            startTime.setMinutes(values.startTime.minute());
            startTime.setSeconds(0);

            const endTime = new Date();
            endTime.setHours(values.endTime.hour());
            endTime.setMinutes(values.endTime.minute());
            endTime.setSeconds(0);

            const data = {
                ...values,
                startTime: startTime.toISOString(),
                endTime: endTime.toISOString(),
                students: studentList
            };

            if (editingSchedule) {
                await schedulesAPI.update(editingSchedule.id, data);
                message.success("แก้ไขตารางเรียนสำเร็จ");
            } else {
                await schedulesAPI.create(data);
                message.success("เพิ่มตารางเรียนสำเร็จ");
            }
            setModalVisible(false);
            form.resetFields();
            fetchSchedules();
            fetchSubjects();
        } catch (error) {
            console.error("Error saving schedule:", error);
            message.error(error.response?.data?.message || "ไม่สามารถบันทึกได้");
        }
    };

    // ========== Excel Import Logic for repclasslist.xlsx ==========
    const handleExcelUpload = (file) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];

                // Convert to array of arrays
                const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

                if (rawData.length < 8) {
                    message.error("รูปแบบไฟล์ไม่ถูกต้อง");
                    return;
                }

                // Parse line 4: subject info
                const subjectLine = rawData[3]?.[0] || "";
                const subjectMatch = subjectLine.match(/วิชา\s+(\d+)\s+(.+?)\s+\d+\(\d+-\d+-\d+\)\s+ตอน\s+(\d+)/);

                let subjectCode = "";
                let subjectName = "";
                let section = "";

                if (subjectMatch) {
                    subjectCode = subjectMatch[1];
                    subjectName = subjectMatch[2].trim();
                    section = `ตอน ${subjectMatch[3]}`;
                }

                // Parse line 5: schedule info
                const scheduleLine = rawData[4]?.[0] || "";
                const dayMap = { 'อา.': 0, 'จ.': 1, 'อ.': 2, 'พ.': 3, 'พฤ.': 4, 'ศ.': 5, 'ส.': 6 };
                const scheduleMatch = scheduleLine.match(/วันเวลาเรียน\s+([อาจพฤศส.]+)\s+(\d{1,2}:\d{2})-(\d{1,2}:\d{2})\s+ห้องเรียน\s+([\w-]+)/);

                let dayOfWeek = 5;
                let startTime = "";
                let endTime = "";
                let roomCode = "";

                if (scheduleMatch) {
                    const dayStr = scheduleMatch[1];
                    dayOfWeek = dayMap[dayStr] ?? 5;
                    startTime = scheduleMatch[2];
                    endTime = scheduleMatch[3];
                    roomCode = scheduleMatch[4];
                }

                // Parse students (starting from line 9, index 8)
                const students = [];
                for (let i = 8; i < rawData.length; i++) {
                    const row = rawData[i];
                    if (!row || !row[1]) continue;

                    const studentCode = row[1]?.toString().replace(/-/g, '');
                    const fullName = row[2]?.toString() || "";
                    const nameParts = fullName.trim().split(/\s+/);
                    let firstName = "";
                    let lastName = "";

                    if (nameParts.length >= 2) {
                        const firstPart = nameParts[0].replace(/^(นาย|นางสาว|นาง)/, '');
                        firstName = firstPart || nameParts[0];
                        lastName = nameParts.slice(1).join(' ');
                    } else {
                        firstName = fullName;
                    }

                    // Normalize section: replace newlines with empty string to join split section codes
                    const rawSection = row[3]?.toString() || "";
                    const normalizedSection = rawSection.replace(/[\r\n]+/g, '').trim();

                    if (studentCode && studentCode.length > 5) {
                        students.push({
                            studentCode,
                            firstName,
                            lastName,
                            section: normalizedSection
                        });
                    }
                }

                const parsed = {
                    subjectCode,
                    subjectName,
                    section,
                    dayOfWeek,
                    startTime: startTime ? `2024-01-01T${startTime}:00` : null,
                    endTime: endTime ? `2024-01-01T${endTime}:00` : null,
                    roomCode,
                    students
                };

                setParsedData(parsed);
                setImportModalVisible(true);

            } catch (error) {
                console.error("Excel import error:", error);
                message.error("เกิดข้อผิดพลาดในการอ่านไฟล์ Excel");
            }
        };
        reader.readAsArrayBuffer(file);
        return false;
    };

    const handleConfirmImport = async () => {
        if (!parsedData) return;

        try {
            setImporting(true);
            const response = await schedulesAPI.importRepclasslist({ data: parsedData });

            message.success(response.data.message);
            setImportModalVisible(false);
            setParsedData(null);
            fetchSchedules();
            fetchSubjects();
        } catch (error) {
            console.error("Import error:", error);
            message.error(error.response?.data?.message || "เกิดข้อผิดพลาดในการนำเข้าข้อมูล");
        } finally {
            setImporting(false);
        }
    };

    const getDayName = (day) => {
        const days = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];
        return days[day] ?? day;
    };

    const getDayColor = (day) => {
        const colors = ["red", "orange", "gold", "green", "cyan", "blue", "purple"];
        return colors[day] ?? "default";
    };

    const uniqueRooms = [...new Set(schedules.map(s => s.roomCode))];

    const columns = [
        {
            title: "วัน",
            dataIndex: "dayOfWeek",
            key: "dayOfWeek",
            width: 100,
            render: (day) => <Tag color={getDayColor(day)}>{getDayName(day)}</Tag>,
            sorter: (a, b) => a.dayOfWeek - b.dayOfWeek
        },
        {
            title: "เวลา",
            key: "time",
            width: 150,
            render: (_, record) => (
                <span>
                    {dayjs(record.startTime).format("HH:mm")} - {dayjs(record.endTime).format("HH:mm")}
                </span>
            )
        },
        {
            title: "วิชา",
            key: "subject",
            render: (_, record) => (
                <div>
                    <Text strong>{record.subject?.code}</Text>
                    <br />
                    <Text type="secondary">{record.subject?.name}</Text>
                </div>
            )
        },
        {
            title: "ห้องเรียน",
            dataIndex: "roomCode",
            key: "roomCode",
            width: 120,
            render: (room) => <Tag color="blue">{room}</Tag>
        },

        {
            title: "อาจารย์",
            key: "teacher",
            width: 150,
            render: (_, record) => (
                record.teacher ? `${record.teacher.firstName} ${record.teacher.lastName}` : '-'
            )
        },
        {
            title: "นักศึกษา",
            key: "students",
            width: 120,
            render: (_, record) => {
                const count = record.students?.length || 0;
                return (
                    <Tag color={count > 0 ? "geekblue" : "default"} icon={<UserOutlined />}>
                        {count} คน
                    </Tag>
                );
            }
        },
        {
            title: "จัดการ",
            key: "actions",
            width: 120,
            render: (_, record) => (
                <Space>
                    <Button
                        type="text"
                        icon={<EditOutlined />}
                        onClick={() => handleEdit(record)}
                    />
                    <Popconfirm
                        title="ยืนยันการลบ"
                        description="คุณต้องการลบตารางเรียนนี้หรือไม่?"
                        onConfirm={() => handleDelete(record.id)}
                        okText="ลบ"
                        cancelText="ยกเลิก"
                    >
                        <Button type="text" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                </Space>
            )
        }
    ];

    return (
        <div>
            <Space orientation="vertical" size="large" style={{ width: "100%" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                        <Title level={2}>
                            <CalendarOutlined style={{ marginRight: 12 }} />
                            จัดการตารางเรียน
                        </Title>
                        <Text type="secondary">จัดการตารางสอนและนำเข้าจากไฟล์ repclasslist</Text>
                    </div>
                    <Space>
                        <Upload
                            accept=".xlsx,.xls"
                            showUploadList={false}
                            beforeUpload={handleExcelUpload}
                        >
                            <Button icon={<FileExcelOutlined />}>
                                นำเข้า repclasslist
                            </Button>
                        </Upload>
                        <Popconfirm
                            title="ยืนยันการลบทั้งหมด"
                            description="คุณต้องการลบตารางเรียนทั้งหมดหรือไม่?"
                            onConfirm={handleDeleteAll}
                            okText="ลบทั้งหมด"
                            cancelText="ยกเลิก"
                            okButtonProps={{ danger: true }}
                        >
                            <Button danger icon={<ClearOutlined />}>
                                ลบทั้งหมด
                            </Button>
                        </Popconfirm>
                        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                            เพิ่มตารางเรียน
                        </Button>
                    </Space>
                </div>

                {/* Filters */}
                <Card size="small">
                    <Space>
                        <Text strong>กรองข้อมูล:</Text>
                        <Select
                            placeholder="เลือกห้องเรียน"
                            allowClear
                            style={{ width: 150 }}
                            value={filterRoom}
                            onChange={(val) => { setFilterRoom(val); }}
                            options={uniqueRooms.map(r => ({ label: r, value: r }))}
                        />
                        <Select
                            placeholder="เลือกวัน"
                            allowClear
                            style={{ width: 120 }}
                            value={filterDay}
                            onChange={(val) => { setFilterDay(val); }}
                            options={[
                                { label: "จันทร์", value: 1 },
                                { label: "อังคาร", value: 2 },
                                { label: "พุธ", value: 3 },
                                { label: "พฤหัสบดี", value: 4 },
                                { label: "ศุกร์", value: 5 },
                                { label: "เสาร์", value: 6 },
                                { label: "อาทิตย์", value: 0 }
                            ]}
                        />
                        <Button onClick={() => { fetchSchedules(); }}>ค้นหา</Button>
                        <Button onClick={() => { setFilterRoom(null); setFilterDay(null); fetchSchedules(); }}>
                            ล้างตัวกรอง
                        </Button>
                    </Space>
                </Card>

                <Card>
                    <Table
                        columns={columns}
                        dataSource={schedules}
                        loading={loading}
                        rowKey="id"
                        pagination={{ pageSize: 20 }}
                    />
                </Card>
            </Space>

            {/* Add/Edit Modal (Redesigned) */}
            <Modal
                title={editingSchedule ? "แก้ไขตารางเรียน" : "เพิ่มตารางเรียน"}
                open={modalVisible}
                onCancel={() => setModalVisible(false)}
                footer={null}
                width={1000}
                style={{ top: 20 }}
            >
                <Form form={form} layout="vertical" onFinish={handleSubmit}>
                    <Alert
                        message="จัดการข้อมูลตารางเรียน"
                        description="กรุณากรอกข้อมูลให้ครบถ้วน รวมถึงรายชื่อนักศึกษา"
                        type="info"
                        showIcon
                        style={{ marginBottom: 16 }}
                    />

                    <Card size="small" title="ข้อมูลรายวิชา" style={{ marginBottom: 16 }}>
                        <Space size="large" wrap>
                            <Form.Item
                                name="subjectId"
                                label="รายวิชา"
                                rules={[{ required: true, message: "กรุณาเลือกรายวิชา" }]}
                                style={{ width: 300, marginBottom: 0 }}
                            >
                                <Select
                                    showSearch
                                    placeholder="เลือกรายวิชา"
                                    optionFilterProp="children"
                                    filterOption={(input, option) =>
                                        option.children.toLowerCase().includes(input.toLowerCase())
                                    }
                                >
                                    {subjects.map((s) => (
                                        <Select.Option key={s.id} value={s.id}>
                                            {s.code} - {s.name}
                                        </Select.Option>
                                    ))}
                                </Select>
                            </Form.Item>



                            <Form.Item
                                name="teacherId"
                                label="อาจารย์ผู้สอน"
                                rules={[{ required: true, message: "กรุณาเลือกอาจารย์" }]}
                                style={{ width: 250, marginBottom: 0 }}
                            >
                                <Select placeholder="เลือกอาจารย์">
                                    {teachers.map((t) => (
                                        <Select.Option key={t.id} value={t.id}>
                                            {t.firstName} {t.lastName}
                                        </Select.Option>
                                    ))}
                                </Select>
                            </Form.Item>
                        </Space>
                    </Card>

                    <Card size="small" title="ข้อมูลตารางเรียน" style={{ marginBottom: 16 }}>
                        <Space size="large" wrap>
                            <Form.Item
                                name="dayOfWeek"
                                label="วัน"
                                rules={[{ required: true, message: "กรุณาเลือกวัน" }]}
                                style={{ width: 120, marginBottom: 0 }}
                            >
                                <Select placeholder="เลือกวัน">
                                    <Select.Option value={1}>จันทร์</Select.Option>
                                    <Select.Option value={2}>อังคาร</Select.Option>
                                    <Select.Option value={3}>พุธ</Select.Option>
                                    <Select.Option value={4}>พฤหัสบดี</Select.Option>
                                    <Select.Option value={5}>ศุกร์</Select.Option>
                                    <Select.Option value={6}>เสาร์</Select.Option>
                                    <Select.Option value={0}>อาทิตย์</Select.Option>
                                </Select>
                            </Form.Item>

                            <Form.Item
                                name="startTime"
                                label="เวลาเริ่ม"
                                rules={[{ required: true, message: "กรุณาเลือกเวลา" }]}
                                style={{ width: 120, marginBottom: 0 }}
                            >
                                <TimePicker format="HH:mm" />
                            </Form.Item>

                            <Form.Item
                                name="endTime"
                                label="เวลาสิ้นสุด"
                                rules={[{ required: true, message: "กรุณาเลือกเวลา" }]}
                                style={{ width: 120, marginBottom: 0 }}
                            >
                                <TimePicker format="HH:mm" />
                            </Form.Item>

                            <Form.Item
                                name="roomCode"
                                label="ห้องเรียน"
                                rules={[{ required: true, message: "กรุณากรอกห้องเรียน" }]}
                                style={{ width: 120, marginBottom: 0 }}
                            >
                                <Input placeholder="เช่น 44-703" />
                            </Form.Item>
                        </Space>
                    </Card>

                    <Card
                        size="small"
                        title={`รายชื่อนักศึกษา (${studentList.length} คน)`}
                    >
                        <Alert
                            message="เพิ่มนักศึกษา"
                            type="info"
                            size="small"
                            style={{ marginBottom: 12 }}
                            description={
                                <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                                    <Input
                                        placeholder="รหัสนักศึกษา"
                                        style={{ width: 150 }}
                                        id="add-student-code"
                                    />
                                    <Input
                                        placeholder="ชื่อ"
                                        style={{ width: 150 }}
                                        id="add-student-first"
                                    />
                                    <Input
                                        placeholder="นามสกุล"
                                        style={{ width: 150 }}
                                        id="add-student-last"
                                    />
                                    <Button
                                        type="primary"
                                        icon={<PlusOutlined />}
                                        onClick={() => {
                                            const code = document.getElementById('add-student-code').value.trim();
                                            const first = document.getElementById('add-student-first').value.trim();
                                            const last = document.getElementById('add-student-last').value.trim();

                                            if (!code) {
                                                message.error("กรุณากรอกรหัสนักศึกษา");
                                                return;
                                            }
                                            if (studentList.some(s => s.studentCode === code)) {
                                                message.error("มีรหัสนักศึกษานี้แล้ว");
                                                return;
                                            }

                                            setStudentList([...studentList, {
                                                studentCode: code,
                                                firstName: first || 'ไม่ระบุ',
                                                lastName: last || ''
                                            }]);

                                            document.getElementById('add-student-code').value = '';
                                            document.getElementById('add-student-first').value = '';
                                            document.getElementById('add-student-last').value = '';
                                        }}
                                    >
                                        เพิ่ม
                                    </Button>
                                </div>
                            }
                        />

                        <div style={{ maxHeight: 400, overflow: 'auto' }}>
                            <Table
                                size="small"
                                pagination={false}
                                dataSource={studentList}
                                rowKey={(_, index) => `edit-student-${index}`}
                                columns={[
                                    {
                                        title: 'ลำดับ',
                                        width: 50,
                                        render: (_, __, index) => index + 1
                                    },
                                    {
                                        title: 'รหัสนักศึกษา',
                                        dataIndex: 'studentCode',
                                        width: 140,
                                    },
                                    {
                                        title: 'ชื่อ',
                                        dataIndex: 'firstName',
                                        width: 140,
                                    },
                                    {
                                        title: 'นามสกุล',
                                        dataIndex: 'lastName',
                                        width: 140,
                                    },

                                    {
                                        title: 'ลบ',
                                        width: 50,
                                        render: (_, record, index) => (
                                            <Button
                                                type="text"
                                                danger
                                                size="small"
                                                icon={<DeleteOutlined />}
                                                onClick={() => {
                                                    const newStudents = studentList.filter((_, i) => i !== index);
                                                    setStudentList(newStudents);
                                                }}
                                            />
                                        )
                                    }
                                ]}
                            />
                        </div>
                    </Card>

                    <Form.Item style={{ marginTop: 24, marginBottom: 0, textAlign: "right" }}>
                        <Space>
                            <Button onClick={() => setModalVisible(false)}>ยกเลิก</Button>
                            <Button type="primary" htmlType="submit">
                                {editingSchedule ? "บันทึก" : "เพิ่ม"}
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>

            {/* Import Preview Modal (Restored) */}
            <Modal
                title="ยืนยันการนำเข้าข้อมูล"
                open={importModalVisible}
                onCancel={() => { setImportModalVisible(false); setParsedData(null); }}
                onOk={handleConfirmImport}
                okText="นำเข้าข้อมูล"
                cancelText="ยกเลิก"
                confirmLoading={importing}
                width={1000}
            >
                {parsedData && (
                    <div>
                        <Alert
                            message="ตรวจสอบและแก้ไขข้อมูลก่อนนำเข้า"
                            description="คุณสามารถแก้ไขข้อมูลทั้งหมดได้ รวมถึงเพิ่ม/ลบ/แก้ไขนักศึกษา"
                            type="info"
                            showIcon
                            style={{ marginBottom: 16 }}
                        />

                        <Card size="small" title="ข้อมูลรายวิชา (แก้ไขได้)" style={{ marginBottom: 16 }}>
                            <Space size="large" wrap>
                                <div>
                                    <Text type="secondary">รหัสวิชา:</Text>
                                    <br />
                                    <Input
                                        value={parsedData.subjectCode}
                                        style={{ width: 150 }}
                                        onChange={(e) => setParsedData({ ...parsedData, subjectCode: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <Text type="secondary">ชื่อวิชา:</Text>
                                    <br />
                                    <Input
                                        value={parsedData.subjectName}
                                        style={{ width: 250 }}
                                        onChange={(e) => setParsedData({ ...parsedData, subjectName: e.target.value })}
                                    />
                                </div>

                            </Space>
                        </Card>

                        <Card size="small" title="ข้อมูลตารางเรียน (แก้ไขได้)" style={{ marginBottom: 16 }}>
                            <Space size="large" wrap>
                                <div>
                                    <Text type="secondary">วัน:</Text>
                                    <br />
                                    <Select
                                        value={parsedData.dayOfWeek}
                                        style={{ width: 120 }}
                                        onChange={(val) => setParsedData({ ...parsedData, dayOfWeek: val })}
                                    >
                                        <Select.Option value={1}>จันทร์</Select.Option>
                                        <Select.Option value={2}>อังคาร</Select.Option>
                                        <Select.Option value={3}>พุธ</Select.Option>
                                        <Select.Option value={4}>พฤหัสบดี</Select.Option>
                                        <Select.Option value={5}>ศุกร์</Select.Option>
                                        <Select.Option value={6}>เสาร์</Select.Option>
                                        <Select.Option value={0}>อาทิตย์</Select.Option>
                                    </Select>
                                </div>
                                <div>
                                    <Text type="secondary">เวลาเริ่ม:</Text>
                                    <br />
                                    <TimePicker
                                        value={parsedData.startTime ? dayjs(parsedData.startTime) : null}
                                        format="HH:mm"
                                        onChange={(time) => {
                                            if (time) {
                                                const newTime = `2024-01-01T${time.format('HH:mm')}:00`;
                                                setParsedData({ ...parsedData, startTime: newTime });
                                            }
                                        }}
                                    />
                                </div>
                                <div>
                                    <Text type="secondary">เวลาสิ้นสุด:</Text>
                                    <br />
                                    <TimePicker
                                        value={parsedData.endTime ? dayjs(parsedData.endTime) : null}
                                        format="HH:mm"
                                        onChange={(time) => {
                                            if (time) {
                                                const newTime = `2024-01-01T${time.format('HH:mm')}:00`;
                                                setParsedData({ ...parsedData, endTime: newTime });
                                            }
                                        }}
                                    />
                                </div>
                                <div>
                                    <Text type="secondary">ห้องเรียน:</Text>
                                    <br />
                                    <Input
                                        value={parsedData.roomCode}
                                        style={{ width: 120 }}
                                        onChange={(e) => setParsedData({ ...parsedData, roomCode: e.target.value })}
                                    />
                                </div>
                            </Space>
                        </Card>

                        <Card
                            size="small"
                            title={`รายชื่อนักศึกษา (${parsedData.students?.length || 0} คน)`}
                        >
                            <div style={{ maxHeight: 400, overflow: 'auto' }}>
                                <Table
                                    size="small"
                                    pagination={false}
                                    dataSource={parsedData.students || []}
                                    rowKey={(_, index) => `student-${index}`}
                                    columns={[
                                        {
                                            title: 'ลำดับ',
                                            width: 50,
                                            render: (_, __, index) => index + 1
                                        },
                                        {
                                            title: 'รหัสนักศึกษา',
                                            dataIndex: 'studentCode',
                                            width: 140,
                                            render: (text, record, index) => (
                                                <Input
                                                    size="small"
                                                    value={text}
                                                    onChange={(e) => {
                                                        const newStudents = [...parsedData.students];
                                                        newStudents[index] = { ...newStudents[index], studentCode: e.target.value };
                                                        setParsedData({ ...parsedData, students: newStudents });
                                                    }}
                                                />
                                            )
                                        },
                                        {
                                            title: 'ชื่อ',
                                            dataIndex: 'firstName',
                                            width: 140,
                                            render: (text, record, index) => (
                                                <Input
                                                    size="small"
                                                    value={text}
                                                    onChange={(e) => {
                                                        const newStudents = [...parsedData.students];
                                                        newStudents[index] = { ...newStudents[index], firstName: e.target.value };
                                                        setParsedData({ ...parsedData, students: newStudents });
                                                    }}
                                                />
                                            )
                                        },
                                        {
                                            title: 'นามสกุล',
                                            dataIndex: 'lastName',
                                            width: 140,
                                            render: (text, record, index) => (
                                                <Input
                                                    size="small"
                                                    value={text}
                                                    onChange={(e) => {
                                                        const newStudents = [...parsedData.students];
                                                        newStudents[index] = { ...newStudents[index], lastName: e.target.value };
                                                        setParsedData({ ...parsedData, students: newStudents });
                                                    }}
                                                />
                                            )
                                        },
                                        {
                                            title: 'กลุ่มเรียน',
                                            dataIndex: 'section',
                                            width: 150,
                                            render: (text, record, index) => (
                                                <Input
                                                    size="small"
                                                    value={text}
                                                    onChange={(e) => {
                                                        const newStudents = [...parsedData.students];
                                                        newStudents[index] = { ...newStudents[index], section: e.target.value };
                                                        setParsedData({ ...parsedData, students: newStudents });
                                                    }}
                                                />
                                            )
                                        },
                                        {
                                            title: 'ลบ',
                                            width: 50,
                                            render: (_, record, index) => (
                                                <Popconfirm
                                                    title="ลบนักศึกษา?"
                                                    onConfirm={() => {
                                                        const newStudents = parsedData.students.filter((_, i) => i !== index);
                                                        setParsedData({ ...parsedData, students: newStudents });
                                                    }}
                                                    okText="ลบ"
                                                    cancelText="ยกเลิก"
                                                >
                                                    <Button
                                                        type="text"
                                                        danger
                                                        size="small"
                                                        icon={<DeleteOutlined />}
                                                    />
                                                </Popconfirm>
                                            )
                                        }
                                    ]}
                                />
                            </div>
                        </Card>
                    </div>
                )}
            </Modal>
        </div>
    );
}
