"use client";

import React, { useState, useEffect } from "react";
import {
    Table, Button, Space, Modal, Form, Input, Select, TimePicker,
    message, Typography, Card, Tag, Empty, Spin, Alert, TreeSelect,
    Popconfirm, Upload
} from "antd";
import {
    PlusOutlined,
    CalendarOutlined,
    BookOutlined,
    TeamOutlined,
    ClockCircleOutlined,
    EditOutlined,
    DeleteOutlined,
    FileExcelOutlined,
    UserOutlined
} from "@ant-design/icons";
// Add missing imports
import { teacherAPI, usersAPI, majorsAPI, sectionsAPI } from "@/service/api";
import dayjs from "dayjs";
import * as XLSX from "xlsx";

const { Title, Text } = Typography;

const DAY_NAMES = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];
const DAY_COLORS = ["red", "orange", "gold", "green", "cyan", "blue", "purple"];

export default function TeacherSchedulesPage() {
    const [subjects, setSubjects] = useState([]);
    const [schedules, setSchedules] = useState([]);
    const [allStudents, setAllStudents] = useState([]);
    const [majors, setMajors] = useState([]);
    const [sections, setSections] = useState([]);
    const [loading, setLoading] = useState(true);
    const [teacher, setTeacher] = useState(null);

    // Add/Edit Modal State
    const [modalVisible, setModalVisible] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [editingSchedule, setEditingSchedule] = useState(null);
    const [studentList, setStudentList] = useState([]);
    const [form] = Form.useForm();

    // Import Modal State
    const [importModalVisible, setImportModalVisible] = useState(false);
    const [parsedData, setParsedData] = useState(null);
    const [importing, setImporting] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [meRes, schedulesRes, studentsRes, majorsRes, sectionsRes] = await Promise.all([
                teacherAPI.getMe(),
                teacherAPI.getMySchedules(),
                usersAPI.getAll({ role: 'STUDENT', limit: 2000 }),
                majorsAPI.getAll(),
                sectionsAPI.getAll()
            ]);
            const me = meRes.data.data;
            setTeacher(me);
            setSubjects(me.subjects || []);
            setSchedules(schedulesRes.data.data || []);
            setAllStudents(studentsRes.data.data || []);
            setMajors(majorsRes.data.data || []);
            setSections(sectionsRes.data.data || []);
        } catch (err) {
            message.error("ไม่สามารถโหลดข้อมูลได้: " + (err.response?.data?.message || err.message));
        } finally {
            setLoading(false);
        }
    };

    const parseSectionString = (sectionStr) => {
        if (!sectionStr) return { majorCode: '', sectionName: '' };
        const dashIndex = sectionStr.indexOf('-');
        if (dashIndex !== -1) {
            return {
                majorCode: sectionStr.substring(0, dashIndex),
                sectionName: sectionStr.substring(dashIndex + 1).split(' ')[0]
            };
        }
        return { majorCode: '', sectionName: '' };
    };

    const handleOpenModal = () => {
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
            dayOfWeek: record.dayOfWeek,
            startTime: dayjs(record.startTime),
            endTime: dayjs(record.endTime)
        });
        setStudentList(record.students || []);
        setModalVisible(true);
    };

    const handleDelete = async (id) => {
        try {
            await teacherAPI.deleteSchedule(id);
            message.success("ลบตารางเรียนสำเร็จ");
            fetchData();
        } catch (error) {
            console.error("Error deleting schedule:", error);
            message.error(error.response?.data?.message || "ไม่สามารถลบได้");
        }
    };

    const handleSubmit = async (values) => {
        try {
            setSubmitting(true);

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
                roomCode: values.roomCode.trim().toUpperCase(),
                startTime: startTime.toISOString(),
                endTime: endTime.toISOString(),
                students: studentList
            };

            if (editingSchedule) {
                await teacherAPI.updateSchedule(editingSchedule.id, data);
                message.success("แก้ไขตารางเรียนสำเร็จ!");
            } else {
                await teacherAPI.createSchedule(data);
                message.success("เพิ่มตารางเรียนสำเร็จ!");
            }

            setModalVisible(false);
            form.resetFields();
            fetchData();
        } catch (err) {
            message.error(err.response?.data?.message || "ไม่สามารถบันทึกได้");
        } finally {
            setSubmitting(false);
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

                if (subjectMatch) {
                    subjectCode = subjectMatch[1];
                    subjectName = subjectMatch[2].trim();
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

                    const rawSection = row[3]?.toString() || "";
                    const normalizedSection = rawSection.replace(/[\r\n]+/g, '').trim();

                    if (studentCode && studentCode.length > 5) {
                        students.push({ studentCode, firstName, lastName, section: normalizedSection });
                    }
                }

                const parsed = {
                    subjectCode,
                    subjectName,
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
            const response = await teacherAPI.importRepclasslist({ data: parsedData });

            message.success(response.data.message);
            setImportModalVisible(false);
            setParsedData(null);
            fetchData();
        } catch (error) {
            console.error("Import error:", error);
            message.error(error.response?.data?.message || "เกิดข้อผิดพลาดในการนำเข้าข้อมูล");
        } finally {
            setImporting(false);
        }
    };

    const columns = [
        {
            title: "วัน",
            dataIndex: "dayOfWeek",
            key: "dayOfWeek",
            width: 110,
            render: (day) => <Tag color={DAY_COLORS[day]}>{DAY_NAMES[day]}</Tag>,
            sorter: (a, b) => a.dayOfWeek - b.dayOfWeek,
        },
        {
            title: "เวลา",
            key: "time",
            width: 150,
            render: (_, rec) => (
                <Space>
                    <ClockCircleOutlined style={{ color: "#aaa" }} />
                    {dayjs(rec.startTime).format("HH:mm")} – {dayjs(rec.endTime).format("HH:mm")}
                </Space>
            ),
        },
        {
            title: "วิชา",
            key: "subject",
            render: (_, rec) => (
                <div>
                    <Text strong>{rec.subject?.code}</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 12 }}>{rec.subject?.name}</Text>
                </div>
            ),
        },
        {
            title: "ห้องเรียน",
            dataIndex: "roomCode",
            key: "roomCode",
            width: 120,
            render: (room) => <Tag color="blue">{room}</Tag>,
        },
        {
            title: "นักศึกษา",
            key: "students",
            width: 100,
            align: "center",
            render: (_, rec) => {
                const count = rec.students?.length || 0;
                return (
                    <Tag color={count > 0 ? "geekblue" : "default"} icon={<TeamOutlined />}>
                        {count} คน
                    </Tag>
                );
            },
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
                        description="คุณต้องการลบตารางเรียนของวิชานี้หรือไม่?"
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

    if (loading) {
        return (
            <div style={{ textAlign: "center", padding: 80 }}>
                <Spin size="large" tip="กำลังโหลดข้อมูล..." />
            </div>
        );
    }

    return (
        <div className="fade-in">
            <Space direction="vertical" size="large" style={{ width: "100%" }}>
                {/* Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                        <Title level={2} style={{ margin: 0 }}>
                            <CalendarOutlined style={{ marginRight: 10 }} />
                            ตารางสอนของฉัน
                        </Title>
                        {teacher && (
                            <Text type="secondary">
                                อ.{teacher.firstName} {teacher.lastName} —
                                สอน {subjects.length} วิชา
                            </Text>
                        )}
                    </div>
                    <Space>
                        <Upload
                            accept=".xlsx,.xls"
                            showUploadList={false}
                            beforeUpload={handleExcelUpload}
                        >
                            <Button icon={<FileExcelOutlined />}>
                                นำเข้าจาก Excel
                            </Button>
                        </Upload>
                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={handleOpenModal}
                            disabled={subjects.length === 0}
                            size="large"
                        >
                            เพิ่มตารางเรียน
                        </Button>
                    </Space>
                </div>

                {subjects.length === 0 && (
                    <Alert
                        type="warning"
                        showIcon
                        message="ยังไม่มีวิชาที่คุณสอน"
                        description="กรุณาเพิ่มรายวิชาในเมนู 'รายวิชาของฉัน' ก่อนครับ"
                    />
                )}

                {/* Summary Cards */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16 }}>
                    {subjects.map((subj) => {
                        const subjectSchedules = schedules.filter(s => s.subjectId === subj.id);
                        return (
                            <Card key={subj.id} size="small" hoverable>
                                <BookOutlined style={{ color: "#1890ff", marginRight: 6 }} />
                                <Text strong style={{ fontSize: 12 }}>{subj.code}</Text>
                                <br />
                                <Text type="secondary" style={{ fontSize: 11 }}>{subj.name}</Text>
                                <br />
                                <Tag color="blue" style={{ marginTop: 6 }}>
                                    {subjectSchedules.length} คาบ
                                </Tag>
                            </Card>
                        );
                    })}
                </div>

                {/* Schedule Table */}
                <Card>
                    {schedules.length === 0 ? (
                        <Empty
                            description="ยังไม่มีตารางเรียน กดปุ่ม 'เพิ่มตารางเรียน' เพื่อเริ่มต้น"
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                        />
                    ) : (
                        <Table
                            columns={columns}
                            dataSource={schedules}
                            rowKey="id"
                            pagination={{ pageSize: 20 }}
                            size="middle"
                            defaultSortOrder="ascend"
                        />
                    )}
                </Card>
            </Space>

            {/* Add/Edit Schedule Modal */}
            <Modal
                title={editingSchedule ? "แก้ไขตารางเรียน" : "เพิ่มตารางเรียน"}
                open={modalVisible}
                onCancel={() => { setModalVisible(false); form.resetFields(); }}
                footer={null}
                width={800}
                style={{ top: 20 }}
                destroyOnClose
            >
                <Form form={form} layout="vertical" onFinish={handleSubmit}>
                    <Alert
                        type="info"
                        showIcon
                        message="คุณสามารถจัดการข้อมูลตารางเรียนเฉพาะวิชาที่คุณสอนเท่านั้น"
                        style={{ marginBottom: 16 }}
                    />

                    <Card size="small" title="ข้อมูลตารางเรียน" style={{ marginBottom: 16 }}>
                        <Space size="large" wrap>
                            <Form.Item
                                name="subjectId"
                                label="วิชา"
                                rules={[{ required: true, message: "กรุณาเลือกวิชา" }]}
                                style={{ width: 250, marginBottom: 0 }}
                            >
                                <Select
                                    showSearch
                                    placeholder="เลือกวิชาที่คุณสอน"
                                    optionFilterProp="label"
                                    options={subjects.map((s) => ({
                                        value: s.id,
                                        label: `${s.code} — ${s.name}`,
                                    }))}
                                />
                            </Form.Item>

                            <Form.Item
                                name="roomCode"
                                label="ห้องเรียน"
                                rules={[{ required: true, message: "กรุณากรอกรหัสห้อง" }]}
                                style={{ width: 120, marginBottom: 0 }}
                            >
                                <Input placeholder="เช่น 44-703" style={{ textTransform: "uppercase" }} />
                            </Form.Item>

                            <Form.Item
                                name="dayOfWeek"
                                label="วัน"
                                rules={[{ required: true, message: "กรุณาเลือกวัน" }]}
                                style={{ width: 120, marginBottom: 0 }}
                            >
                                <Select placeholder="เลือกวัน">
                                    {DAY_NAMES.map((name, idx) => (
                                        <Select.Option key={idx} value={idx}>{name}</Select.Option>
                                    ))}
                                </Select>
                            </Form.Item>

                            <Form.Item
                                name="startTime"
                                label="เวลาเริ่ม"
                                rules={[{ required: true, message: "กรุณาเลือกเวลา" }]}
                                style={{ width: 120, marginBottom: 0 }}
                            >
                                <TimePicker format="HH:mm" minuteStep={5} />
                            </Form.Item>

                            <Form.Item
                                name="endTime"
                                label="เวลาสิ้นสุด"
                                rules={[{ required: true, message: "กรุณาเลือกเวลา" }]}
                                style={{ width: 120, marginBottom: 0 }}
                            >
                                <TimePicker format="HH:mm" minuteStep={5} />
                            </Form.Item>
                        </Space>
                    </Card>

                    <Card size="small" title={`รายชื่อนักศึกษา (${studentList.length} คน)`}>
                        <Alert
                            message="เพิ่มนักศึกษา"
                            type="info"
                            size="small"
                            style={{ marginBottom: 12 }}
                            description={
                                <div style={{ marginTop: 8 }}>
                                    <TreeSelect
                                        showSearch
                                        style={{ width: '100%' }}
                                        value={null}
                                        dropdownStyle={{ maxHeight: 400, overflow: 'auto' }}
                                        placeholder="ค้นหาและเลือกนักศึกษา (พิมพ์รหัส หรือ ชื่อ)"
                                        allowClear
                                        treeDefaultExpandAll={false}
                                        onChange={(val) => {
                                            if (!val) return;
                                            const student = allStudents.find(s => s.studentCode === val);
                                            if (!student) return;

                                            if (studentList.some(s => s.studentCode === val)) {
                                                message.warning("นักศึกษานี้อยู่ในรายการแล้ว");
                                                return;
                                            }

                                            setStudentList([...studentList, {
                                                studentCode: student.studentCode,
                                                firstName: student.firstName,
                                                lastName: student.lastName,
                                                section: student.section
                                            }]);
                                        }}
                                        treeData={(() => {
                                            const grouped = allStudents.reduce((groups, student) => {
                                                const sectionName = student.section
                                                    ? `${student.section.major?.code || ''} ${student.section.name}`
                                                    : 'ไม่มีกลุ่มเรียน';

                                                if (!groups[sectionName]) groups[sectionName] = [];
                                                groups[sectionName].push(student);
                                                return groups;
                                            }, {});

                                            return Object.entries(grouped).sort().map(([groupName, students]) => ({
                                                title: groupName,
                                                value: `section_${groupName}`,
                                                selectable: false,
                                                key: `section_${groupName}`,
                                                children: students.map(s => ({
                                                    title: `${s.studentCode} ${s.firstName} ${s.lastName}`,
                                                    value: s.studentCode,
                                                    key: s.id,
                                                    isLeaf: true
                                                }))
                                            }));
                                        })()}
                                        treeNodeFilterProp="title"
                                    />
                                </div>
                            }
                        />

                        <div style={{ maxHeight: 300, overflow: 'auto' }}>
                            <Table
                                size="small"
                                pagination={false}
                                dataSource={studentList}
                                rowKey={(record, index) => `edit-student-${index}`}
                                columns={[
                                    { title: 'ลำดับ', width: 50, render: (_, __, index) => index + 1 },
                                    { title: 'รหัสนักศึกษา', dataIndex: 'studentCode', width: 140 },
                                    { title: 'ชื่อ', dataIndex: 'firstName', width: 140 },
                                    { title: 'นามสกุล', dataIndex: 'lastName', width: 140 },
                                    { title: 'สาขา', key: 'major', width: 80, render: (_, record) => record.section?.major?.code || '-' },
                                    { title: 'กลุ่ม', key: 'section', width: 80, render: (_, record) => record.section?.name || '-' },
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
                            <Button type="primary" htmlType="submit" loading={submitting}>
                                {editingSchedule ? "บันทึก" : "เพิ่ม"}
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>

            {/* Import Preview Modal (Editable, identical to staff) */}
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
                            <Alert
                                message="เพิ่มนักศึกษา"
                                type="info"
                                size="small"
                                style={{ marginBottom: 12 }}
                                description={
                                    <div style={{ marginTop: 8 }}>
                                        <TreeSelect
                                            showSearch
                                            style={{ width: '100%' }}
                                            value={null}
                                            dropdownStyle={{ maxHeight: 400, overflow: 'auto' }}
                                            placeholder="ค้นหาและเลือกนักศึกษา (พิมพ์รหัส หรือ ชื่อ)"
                                            allowClear
                                            treeDefaultExpandAll={false}
                                            onChange={(val) => {
                                                if (!val) return;

                                                const student = allStudents.find(s => s.studentCode === val);
                                                if (!student) return;

                                                const currentStudents = parsedData.students || [];
                                                if (currentStudents.some(s => s.studentCode === val)) {
                                                    message.warning("นักศึกษานี้อยู่ในรายการแล้ว");
                                                    return;
                                                }

                                                setParsedData({
                                                    ...parsedData,
                                                    students: [...currentStudents, {
                                                        studentCode: student.studentCode,
                                                        firstName: student.firstName,
                                                        lastName: student.lastName,
                                                        section: student.section ? `${student.section.major?.code || ''} ${student.section.name}` : ''
                                                    }]
                                                });
                                            }}
                                            treeData={(() => {
                                                const grouped = allStudents.reduce((groups, student) => {
                                                    const sectionName = student.section
                                                        ? `${student.section.major?.code || ''} ${student.section.name}`
                                                        : 'ไม่มีกลุ่มเรียน';

                                                    if (!groups[sectionName]) groups[sectionName] = [];
                                                    groups[sectionName].push(student);
                                                    return groups;
                                                }, {});

                                                return Object.entries(grouped).sort().map(([groupName, students]) => ({
                                                    title: groupName,
                                                    value: `section_${groupName}`,
                                                    selectable: false,
                                                    key: `section_${groupName}`,
                                                    children: students.map(s => ({
                                                        title: `${s.studentCode} ${s.firstName} ${s.lastName}`,
                                                        value: s.studentCode,
                                                        key: s.id,
                                                        isLeaf: true
                                                    }))
                                                }));
                                            })()}
                                            treeNodeFilterProp="title"
                                        />
                                    </div>
                                }
                            />
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
                                            title: 'สาขาวิชา',
                                            dataIndex: 'section',
                                            width: 120,
                                            render: (text, record, index) => {
                                                const { majorCode } = parseSectionString(text || '');
                                                return (
                                                    <Select
                                                        style={{ width: '100%' }}
                                                        placeholder="เลือกสาขา"
                                                        value={majorCode || undefined}
                                                        onChange={(val) => {
                                                            const newStudents = [...parsedData.students];
                                                            const currentSection = newStudents[index].section || '';
                                                            const { sectionName } = parseSectionString(currentSection);
                                                            const newSectionStr = val ? (sectionName ? `${val}-${sectionName}` : `${val}-`) : currentSection;
                                                            newStudents[index] = { ...newStudents[index], section: newSectionStr };
                                                            setParsedData({ ...parsedData, students: newStudents });
                                                        }}
                                                    >
                                                        {majors.map(m => (
                                                            <Select.Option key={m.id} value={m.code}>{m.code}</Select.Option>
                                                        ))}
                                                    </Select>
                                                );
                                            }
                                        },
                                        {
                                            title: 'กลุ่มเรียน',
                                            dataIndex: 'section',
                                            width: 120,
                                            render: (text, record, index) => {
                                                const { majorCode, sectionName } = parseSectionString(text || '');
                                                const selectedMajor = majors.find(m => m.code === majorCode);
                                                const filteredSections = selectedMajor
                                                    ? sections.filter(s => s.majorId === selectedMajor.id)
                                                    : [];

                                                return (
                                                    <Select
                                                        style={{ width: '100%' }}
                                                        placeholder="เลือกกลุ่ม"
                                                        value={sectionName || undefined}
                                                        onChange={(val) => {
                                                            const newStudents = [...parsedData.students];
                                                            const currentSection = newStudents[index].section || '';
                                                            const { majorCode } = parseSectionString(currentSection);
                                                            const newSectionStr = majorCode ? `${majorCode}-${val}` : val;
                                                            newStudents[index] = { ...newStudents[index], section: newSectionStr };
                                                            setParsedData({ ...parsedData, students: newStudents });
                                                        }}
                                                    >
                                                        {filteredSections.map(s => (
                                                            <Select.Option key={s.id} value={s.name}>{s.name}</Select.Option>
                                                        ))}
                                                    </Select>
                                                );
                                            }
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
