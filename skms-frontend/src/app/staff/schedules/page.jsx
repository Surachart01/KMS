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
    TimePicker,
    InputNumber,
    message,
    Popconfirm,
    Typography,
    Card,
    Tag,
    Tabs,
    Upload
} from "antd";
import {
    PlusOutlined,
    EditOutlined,
    DeleteOutlined,
    CalendarOutlined,
    UploadOutlined,
    FileExcelOutlined
} from "@ant-design/icons";
import { schedulesAPI, subjectsAPI, roomsAPI, sectionsAPI } from "@/service/api";
import dayjs from "dayjs";
// หมายเหตุ: ต้องติดตั้ง xlsx โดยรัน npm install xlsx
import * as XLSX from 'xlsx';

const { Title } = Typography;

export default function SchedulesPage() {
    const [schedules, setSchedules] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [sections, setSections] = useState([]);

    // State สำหรับ Tabs
    const [activeSection, setActiveSection] = useState("all");

    const [loading, setLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [editingSchedule, setEditingSchedule] = useState(null);
    const [form] = Form.useForm();

    useEffect(() => {
        fetchSubjects();
        fetchRooms();
        fetchSections();
    }, []);

    // Fetch schedules เมื่อ activeSection เปลี่ยน
    useEffect(() => {
        fetchSchedules(activeSection);
    }, [activeSection]);

    const fetchSchedules = async (sectionId) => {
        try {
            setLoading(true);
            const params = {};
            if (sectionId && sectionId !== "all") {
                params.section_id = sectionId;
            }
            const response = await schedulesAPI.getAll(params);
            setSchedules(response.data.data || []);
        } catch (error) {
            console.error("Error fetching schedules:", error);
            message.error("ไม่สามารถโหลดข้อมูลได้");
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

    const fetchRooms = async () => {
        try {
            const response = await roomsAPI.getAll();
            setRooms(response.data.data || []);
        } catch (error) {
            console.error("Error fetching rooms:", error);
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
        setEditingSchedule(null);
        form.resetFields();
        // ถ้าอยู่ใน Tab Section เฉพาะเจาะจง ให้ auto-select section นั้น
        if (activeSection !== "all") {
            form.setFieldValue("section_id", parseInt(activeSection));
        }
        setModalVisible(true);
    };

    const handleEdit = (record) => {
        setEditingSchedule(record);
        form.setFieldsValue({
            subject_code: record.subject_code,
            room_id: record.room_id,
            day_of_week: record.day_of_week,
            start_time: dayjs(record.start_time),
            end_time: dayjs(record.end_time),
            semester: record.semester,
            academic_year: record.academic_year,
            section_id: record.section_id
        });
        setModalVisible(true);
    };

    const handleDelete = async (id) => {
        try {
            await schedulesAPI.delete(id);
            message.success("ลบตารางเรียนสำเร็จ");
            fetchSchedules(activeSection);
        } catch (error) {
            console.error("Error deleting schedule:", error);
            message.error(error.response?.data?.message || "ไม่สามารถลบได้");
        }
    };

    const handleSubmit = async (values) => {
        try {
            // สร้าง date object สำหรับเวลา
            const startTime = new Date();
            startTime.setHours(values.start_time.hour());
            startTime.setMinutes(values.start_time.minute());

            const endTime = new Date();
            endTime.setHours(values.end_time.hour());
            endTime.setMinutes(values.end_time.minute());

            const data = {
                ...values,
                start_time: startTime.toISOString(),
                end_time: endTime.toISOString(),
            };

            if (editingSchedule) {
                await schedulesAPI.update(editingSchedule.schedule_id, data);
                message.success("แก้ไขตารางเรียนสำเร็จ");
            } else {
                await schedulesAPI.create(data);
                message.success("เพิ่มตารางเรียนสำเร็จ");
            }
            setModalVisible(false);
            form.resetFields();
            fetchSchedules(activeSection);
        } catch (error) {
            console.error("Error saving schedule:", error);
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

                // Transform data to match API expectation
                // Expecting Excel columns: subject_code, room_id, day_of_week, start_time (HH:mm), end_time (HH:mm), semester, academic_year, section_id
                const formattedData = jsonData.map(row => {
                    // Helper to parse time string "HH:mm" to Date object
                    const parseTime = (timeStr) => {
                        if (!timeStr) return new Date();
                        const [hours, minutes] = timeStr.toString().split(':').map(Number);
                        const d = new Date();
                        d.setHours(hours || 0);
                        d.setMinutes(minutes || 0);
                        d.setSeconds(0);
                        return d;
                    };

                    return {
                        subject_code: row['รหัสวิชา'] || row['subject_code'],
                        room_id: row['รหัสห้อง'] ? String(row['รหัสห้อง']) : row['room_id'],
                        day_of_week: row['วัน'] || row['day_of_week'], // 0-6 or 1-7 (Need standardizing? Let's assume 1=Mon, 7=Sun or 0=Sun?) API expects 0-6 maybe?
                        // Let's assume input is correct integer for now
                        start_time: parseTime(row['เวลาเริ่ม'] || row['start_time']),
                        end_time: parseTime(row['เวลาสิ้นสุด'] || row['end_time']),
                        semester: String(row['เทอม'] || row['semester'] || '1'),
                        academic_year: parseInt(row['ปีการศึกษา'] || row['academic_year']),
                        section_id: row['กลุ่มเรียน'] || row['section_id']
                    };
                });

                // Send to backend
                await schedulesAPI.batchImport({ schedules: formattedData });
                message.success(`นำเข้าข้อมูลสำเร็จ ${formattedData.length} รายการ`);
                fetchSchedules(activeSection);

            } catch (error) {
                console.error("Excel import error:", error);
                message.error("เกิดข้อผิดพลาดในการอ่านไฟล์ Excel");
            }
        };
        reader.readAsArrayBuffer(file);
        return false; // Prevent auto upload by Antd
    };

    const getDayName = (day) => {
        const days = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];
        return days[day] || day;
    };

    const getDayColor = (day) => {
        const colors = ["red", "orange", "gold", "green", "cyan", "blue", "purple"];
        return colors[day] || "default";
    };

    const columns = [
        {
            title: "วัน",
            dataIndex: "day_of_week",
            key: "day_of_week",
            width: 100,
            render: (day) => (
                <Tag color={getDayColor(day)}>
                    {getDayName(day)}
                </Tag>
            ),
        },
        {
            title: "เวลา",
            key: "time",
            width: 150,
            render: (_, record) => {
                const start = dayjs(record.start_time).format("HH:mm");
                const end = dayjs(record.end_time).format("HH:mm");
                return `${start} - ${end}`;
            },
        },
        {
            title: "รายวิชา",
            key: "subject",
            render: (_, record) => (
                <div>
                    <div><Tag color="blue">{record.subject?.subject_code}</Tag></div>
                    <div style={{ fontSize: 12 }}>{record.subject?.subject_name}</div>
                </div>
            ),
        },
        {
            title: "กลุ่มเรียน",
            key: "section",
            width: 120,
            render: (_, record) => record.section?.section_name || "-",
        },
        {
            title: "ห้องเรียน",
            key: "room",
            width: 150,
            render: (_, record) => (
                <div>
                    <div><strong>{record.room?.room_id}</strong></div>
                    <div style={{ fontSize: 12, color: "#888" }}>
                        {record.room?.room_name}
                    </div>
                </div>
            ),
        },
        {
            title: "เทอม/ปี",
            key: "sem_year",
            width: 120,
            render: (_, record) => `${record.semester}/${record.academic_year}`,
        },
        {
            title: "การจัดการ",
            key: "action",
            width: 120,
            render: (_, record) => (
                <Space size="small">
                    <Button
                        type="link"
                        icon={<EditOutlined />}
                        onClick={() => handleEdit(record)}
                    />
                    <Popconfirm
                        title="ยืนยันการลบ"
                        description="คุณแน่ใจหรือไม่ที่จะลบตารางเรียนนี้?"
                        onConfirm={() => handleDelete(record.schedule_id)}
                        okText="ใช่"
                        cancelText="ไม่"
                    >
                        <Button type="link" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    // Generate Tab Items
    const tabItems = [
        { key: "all", label: "ทั้งหมด" },
        ...sections.map(sec => ({
            key: String(sec.section_id),
            label: sec.section_name
        }))
    ];

    return (
        <div>
            <Space direction="vertical" size="large" style={{ width: "100%" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                        <Title level={2}>
                            <CalendarOutlined /> จัดการตารางเรียน
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
                            เพิ่มตารางเรียน
                        </Button>
                    </Space>
                </div>

                <Card>
                    <Tabs
                        activeKey={activeSection}
                        onChange={setActiveSection}
                        items={tabItems}
                        type="card"
                    />

                    <Table
                        columns={columns}
                        dataSource={schedules}
                        rowKey="schedule_id"
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
                title={editingSchedule ? "แก้ไขตารางเรียน" : "เพิ่มตารางเรียน"}
                open={modalVisible}
                onOk={() => form.submit()}
                onCancel={() => {
                    setModalVisible(false);
                    form.resetFields();
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
                        name="subject_code"
                        label="รายวิชา"
                        rules={[{ required: true, message: "กรุณาเลือกรายวิชา" }]}
                    >
                        <Select
                            placeholder="เลือกรายวิชา"
                            showSearch
                            optionFilterProp="children"
                            options={subjects.map((subject) => ({
                                label: `${subject.subject_code} - ${subject.subject_name}`,
                                value: subject.subject_code,
                            }))}
                        />
                    </Form.Item>

                    <Space style={{ width: "100%" }} size="middle">
                        <Form.Item
                            name="room_id"
                            label="ห้องเรียน"
                            rules={[{ required: true, message: "กรุณาเลือกห้องเรียน" }]}
                            style={{ flex: 1 }}
                        >
                            <Select
                                placeholder="เลือกห้องเรียน"
                                showSearch
                                optionFilterProp="children"
                                options={rooms.map((room) => ({
                                    label: `${room.room_id}${room.room_name ? ` - ${room.room_name}` : ""}`,
                                    value: room.room_id,
                                }))}
                            />
                        </Form.Item>

                        <Form.Item
                            name="section_id"
                            label="กลุ่มเรียน"
                            rules={[{ required: true, message: "กรุณาเลือกกลุ่มเรียน" }]}
                            style={{ flex: 1 }}
                        >
                            <Select
                                placeholder="เลือกกลุ่มเรียน"
                                showSearch
                                optionFilterProp="children"
                                options={sections.map((sec) => ({
                                    label: sec.section_name,
                                    value: sec.section_id,
                                }))}
                            />
                        </Form.Item>
                    </Space>

                    <Form.Item
                        name="day_of_week"
                        label="วัน"
                        rules={[{ required: true, message: "กรุณาเลือกวัน" }]}
                    >
                        <Select placeholder="เลือกวัน">
                            <Select.Option value={0}>อาทิตย์</Select.Option>
                            <Select.Option value={1}>จันทร์</Select.Option>
                            <Select.Option value={2}>อังคาร</Select.Option>
                            <Select.Option value={3}>พุธ</Select.Option>
                            <Select.Option value={4}>พฤหัสบดี</Select.Option>
                            <Select.Option value={5}>ศุกร์</Select.Option>
                            <Select.Option value={6}>เสาร์</Select.Option>
                        </Select>
                    </Form.Item>

                    <Space style={{ width: "100%" }} size="middle">
                        <Form.Item
                            name="start_time"
                            label="เวลาเริ่ม"
                            rules={[{ required: true, message: "กรุณาเลือกเวลาเริ่ม" }]}
                            style={{ width: 200 }}
                        >
                            <TimePicker format="HH:mm" style={{ width: "100%" }} />
                        </Form.Item>

                        <Form.Item
                            name="end_time"
                            label="เวลาสิ้นสุด"
                            rules={[{ required: true, message: "กรุณาเลือกเวลาสิ้นสุด" }]}
                            style={{ width: 200 }}
                        >
                            <TimePicker format="HH:mm" style={{ width: "100%" }} />
                        </Form.Item>
                    </Space>

                    <Space style={{ width: "100%" }} size="middle">
                        <Form.Item
                            name="semester"
                            label="ภาคเรียน"
                            rules={[{ required: true, message: "กรุณากรอกภาคเรียน" }]}
                            style={{ width: 200 }}
                        >
                            <Select placeholder="เลือกภาคเรียน">
                                <Select.Option value="1">1</Select.Option>
                                <Select.Option value="2">2</Select.Option>
                                <Select.Option value="3">3 (ภาคฤดูร้อน)</Select.Option>
                            </Select>
                        </Form.Item>

                        <Form.Item
                            name="academic_year"
                            label="ปีการศึกษา"
                            rules={[{ required: true, message: "กรุณากรอกปีการศึกษา" }]}
                            style={{ width: 200 }}
                        >
                            <InputNumber
                                placeholder="2567"
                                min={2500}
                                max={2600}
                                style={{ width: "100%" }}
                            />
                        </Form.Item>
                    </Space>
                </Form>
            </Modal>
        </div>
    );
}
