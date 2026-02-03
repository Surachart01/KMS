"use client";

import React, { useState, useEffect } from "react";
import {
    Tabs,
    Table,
    Space,
    Typography,
    Card,
    Tag,
    Button,
    Select,
    message,
    Modal,
    Alert,
    Descriptions
} from "antd";
import {
    SwapOutlined,
    ArrowRightOutlined,
    CheckCircleOutlined,
    WarningOutlined
} from "@ant-design/icons";
import { schedulesAPI } from "@/service/api";
import dayjs from "dayjs";
import 'dayjs/locale/th';

dayjs.locale('th');

const { Title, Text } = Typography;
const { TabPane } = Tabs;

const DAY_NAMES = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];

export default function RoomSwapPage() {
    const [loading, setLoading] = useState(false);
    const [schedules, setSchedules] = useState([]);
    const [rooms, setRooms] = useState([]);

    // Move Room State
    const [selectedSchedule, setSelectedSchedule] = useState(null);
    const [newRoom, setNewRoom] = useState(null);

    // Swap Rooms State
    const [schedule1, setSchedule1] = useState(null);
    const [schedule2, setSchedule2] = useState(null);

    useEffect(() => {
        fetchSchedules();
    }, []);

    const fetchSchedules = async () => {
        try {
            setLoading(true);
            const response = await schedulesAPI.getAll();
            const data = response.data.data || [];
            setSchedules(data);

            // Extract unique rooms
            const uniqueRooms = [...new Set(data.map(s => s.roomCode))];
            setRooms(uniqueRooms.sort());
        } catch (error) {
            console.error("Error fetching schedules:", error);
            message.error("ไม่สามารถโหลดตารางเรียนได้");
        } finally {
            setLoading(false);
        }
    };

    const handleMoveRoom = async () => {
        if (!selectedSchedule || !newRoom) {
            message.warning("กรุณาเลือกตารางเรียนและห้องใหม่");
            return;
        }

        if (selectedSchedule.roomCode === newRoom) {
            message.warning("ห้องใหม่เหมือนกับห้องเดิม");
            return;
        }

        Modal.confirm({
            title: "ยืนยันการย้ายห้อง",
            content: (
                <div>
                    <p><strong>วิชา:</strong> {selectedSchedule.subject?.code} {selectedSchedule.subject?.name}</p>
                    <p><strong>กลุ่ม:</strong> {selectedSchedule.section}</p>
                    <p><strong>วัน:</strong> {DAY_NAMES[selectedSchedule.dayOfWeek]}</p>
                    <p><strong>เวลา:</strong> {dayjs(selectedSchedule.startTime).format("HH:mm")} - {dayjs(selectedSchedule.endTime).format("HH:mm")}</p>
                    <p><strong>ห้องเดิม:</strong> {selectedSchedule.roomCode} → <strong>ห้องใหม่:</strong> {newRoom}</p>
                </div>
            ),
            okText: "ยืนยัน",
            cancelText: "ยกเลิก",
            onOk: async () => {
                try {
                    const response = await schedulesAPI.moveRoom(selectedSchedule.id, { newRoomCode: newRoom });
                    if (response.data.success) {
                        message.success(response.data.message);
                        setSelectedSchedule(null);
                        setNewRoom(null);
                        fetchSchedules();
                    } else {
                        message.error(response.data.error || "ไม่สามารถย้ายห้องได้");
                    }
                } catch (error) {
                    console.error("Error moving room:", error);
                    message.error(error.response?.data?.error || "เกิดข้อผิดพลาดในการย้ายห้อง");
                }
            }
        });
    };

    const handleSwapRooms = async () => {
        if (!schedule1 || !schedule2) {
            message.warning("กรุณาเลือกตารางเรียนทั้ง 2 คาบ");
            return;
        }

        if (schedule1.id === schedule2.id) {
            message.warning("กรุณาเลือกตารางเรียนที่ต่างกัน");
            return;
        }

        Modal.confirm({
            title: "ยืนยันการสลับห้อง",
            content: (
                <div>
                    <Descriptions column={1} size="small" bordered>
                        <Descriptions.Item label="คาบที่ 1">
                            {schedule1.subject?.code} {schedule1.subject?.name} ({schedule1.section}) - ห้อง {schedule1.roomCode}
                        </Descriptions.Item>
                        <Descriptions.Item label="คาบที่ 2">
                            {schedule2.subject?.code} {schedule2.subject?.name} ({schedule2.section}) - ห้อง {schedule2.roomCode}
                        </Descriptions.Item>
                    </Descriptions>
                    <Alert
                        type="info"
                        message="หลังสลับ"
                        description={
                            <div>
                                <div>คาบที่ 1: ห้อง {schedule1.roomCode} → <strong>{schedule2.roomCode}</strong></div>
                                <div>คาบที่ 2: ห้อง {schedule2.roomCode} → <strong>{schedule1.roomCode}</strong></div>
                            </div>
                        }
                        style={{ marginTop: 16 }}
                    />
                </div>
            ),
            okText: "ยืนยัน",
            cancelText: "ยกเลิก",
            onOk: async () => {
                try {
                    const response = await schedulesAPI.swapRooms(schedule1.id, schedule2.id);
                    if (response.data.success) {
                        message.success(response.data.message);
                        setSchedule1(null);
                        setSchedule2(null);
                        fetchSchedules();
                    } else {
                        message.error(response.data.error || "ไม่สามารถสลับห้องได้");
                    }
                } catch (error) {
                    console.error("Error swapping rooms:", error);
                    message.error(error.response?.data?.error || "เกิดข้อผิดพลาดในการสลับห้อง");
                }
            }
        });
    };

    const scheduleOptions = schedules.map(s => ({
        value: s.id,
        label: `${s.subject?.code} - ${s.section} | ${DAY_NAMES[s.dayOfWeek]} ${dayjs(s.startTime).format("HH:mm")}-${dayjs(s.endTime).format("HH:mm")} | ห้อง ${s.roomCode}`,
        schedule: s
    }));

    return (
        <div>
            <Space direction="vertical" size="large" style={{ width: "100%" }}>
                <Title level={2}>
                    <SwapOutlined /> ย้าย/สลับห้องเรียน (Room Swap/Move)
                </Title>

                <Tabs defaultActiveKey="move">
                    <TabPane tab="ย้ายห้อง (Move)" key="move">
                        <Card>
                            <Space direction="vertical" size="large" style={{ width: "100%" }}>
                                <Alert
                                    message="คำแนะนำ"
                                    description="เลือกตารางเรียนที่ต้องการย้าย และเลือกห้องใหม่ที่ต้องการย้ายไป ระบบจะตรวจสอบว่าห้องว่างหรือไม่"
                                    type="info"
                                    showIcon
                                />

                                <div>
                                    <Text strong>เลือกตารางเรียน:</Text>
                                    <Select
                                        showSearch
                                        placeholder="ค้นหาตารางเรียน (วิชา, กลุ่ม, วัน, เวลา)"
                                        style={{ width: "100%", marginTop: 8 }}
                                        options={scheduleOptions}
                                        onChange={(value) => {
                                            const selected = schedules.find(s => s.id === value);
                                            setSelectedSchedule(selected);
                                            setNewRoom(null);
                                        }}
                                        value={selectedSchedule?.id}
                                        filterOption={(input, option) =>
                                            (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                                        }
                                    />
                                </div>

                                {selectedSchedule && (
                                    <Card title="ตารางเรียนที่เลือก" size="small">
                                        <Descriptions column={2} size="small">
                                            <Descriptions.Item label="วิชา">{selectedSchedule.subject?.code} {selectedSchedule.subject?.name}</Descriptions.Item>
                                            <Descriptions.Item label="กลุ่ม">{selectedSchedule.section}</Descriptions.Item>
                                            <Descriptions.Item label="วัน">{DAY_NAMES[selectedSchedule.dayOfWeek]}</Descriptions.Item>
                                            <Descriptions.Item label="เวลา">
                                                {dayjs(selectedSchedule.startTime).format("HH:mm")} - {dayjs(selectedSchedule.endTime).format("HH:mm")}
                                            </Descriptions.Item>
                                            <Descriptions.Item label="ห้องเดิม">
                                                <Tag color="blue">{selectedSchedule.roomCode}</Tag>
                                            </Descriptions.Item>
                                            <Descriptions.Item label="อาจารย์">
                                                {selectedSchedule.teacher?.firstName} {selectedSchedule.teacher?.lastName}
                                            </Descriptions.Item>
                                        </Descriptions>
                                    </Card>
                                )}

                                {selectedSchedule && (
                                    <div>
                                        <Text strong>เลือกห้องใหม่:</Text>
                                        <Select
                                            showSearch
                                            placeholder="เลือกห้องใหม่"
                                            style={{ width: "100%", marginTop: 8 }}
                                            options={rooms.map(r => ({ value: r, label: r }))}
                                            onChange={setNewRoom}
                                            value={newRoom}
                                        />
                                    </div>
                                )}

                                {selectedSchedule && newRoom && (
                                    <div style={{ textAlign: "center" }}>
                                        <Button
                                            type="primary"
                                            size="large"
                                            icon={<ArrowRightOutlined />}
                                            onClick={handleMoveRoom}
                                        >
                                            ยืนยันย้ายห้อง {selectedSchedule.roomCode} → {newRoom}
                                        </Button>
                                    </div>
                                )}
                            </Space>
                        </Card>
                    </TabPane>

                    <TabPane tab="สลับห้อง (Swap)" key="swap">
                        <Card>
                            <Space direction="vertical" size="large" style={{ width: "100%" }}>
                                <Alert
                                    message="คำแนะนำ"
                                    description="เลือก 2 ตารางเรียนที่ต้องการสลับห้องกัน ระบบจะสลับห้องระหว่าง 2 คาบนี้"
                                    type="info"
                                    showIcon
                                />

                                <div>
                                    <Text strong>ตารางที่ 1:</Text>
                                    <Select
                                        showSearch
                                        placeholder="ค้นหาตารางเรียนคาบแรก"
                                        style={{ width: "100%", marginTop: 8 }}
                                        options={scheduleOptions}
                                        onChange={(value) => {
                                            const selected = schedules.find(s => s.id === value);
                                            setSchedule1(selected);
                                        }}
                                        value={schedule1?.id}
                                        filterOption={(input, option) =>
                                            (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                                        }
                                    />
                                </div>

                                <div>
                                    <Text strong>ตารางที่ 2:</Text>
                                    <Select
                                        showSearch
                                        placeholder="ค้นหาตารางเรียนคาบที่สอง"
                                        style={{ width: "100%", marginTop: 8 }}
                                        options={scheduleOptions}
                                        onChange={(value) => {
                                            const selected = schedules.find(s => s.id === value);
                                            setSchedule2(selected);
                                        }}
                                        value={schedule2?.id}
                                        filterOption={(input, option) =>
                                            (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                                        }
                                    />
                                </div>

                                {schedule1 && schedule2 && (
                                    <Card title="ตารางที่เลือก" size="small">
                                        <Descriptions column={1} size="small" bordered>
                                            <Descriptions.Item label="คาบที่ 1">
                                                {schedule1.subject?.code} {schedule1.subject?.name} ({schedule1.section}) |
                                                {DAY_NAMES[schedule1.dayOfWeek]} {dayjs(schedule1.startTime).format("HH:mm")}-{dayjs(schedule1.endTime).format("HH:mm")} |
                                                ห้อง <Tag color="blue">{schedule1.roomCode}</Tag>
                                            </Descriptions.Item>
                                            <Descriptions.Item label="คาบที่ 2">
                                                {schedule2.subject?.code} {schedule2.subject?.name} ({schedule2.section}) |
                                                {DAY_NAMES[schedule2.dayOfWeek]} {dayjs(schedule2.startTime).format("HH:mm")}-{dayjs(schedule2.endTime).format("HH:mm")} |
                                                ห้อง <Tag color="green">{schedule2.roomCode}</Tag>
                                            </Descriptions.Item>
                                        </Descriptions>
                                    </Card>
                                )}

                                {schedule1 && schedule2 && (
                                    <div style={{ textAlign: "center" }}>
                                        <Button
                                            type="primary"
                                            size="large"
                                            icon={<SwapOutlined />}
                                            onClick={handleSwapRooms}
                                        >
                                            ยืนยันสลับห้อง {schedule1.roomCode} ↔ {schedule2.roomCode}
                                        </Button>
                                    </div>
                                )}
                            </Space>
                        </Card>
                    </TabPane>
                </Tabs>
            </Space>
        </div>
    );
}
