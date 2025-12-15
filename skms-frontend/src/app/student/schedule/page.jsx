"use client";

import React from "react";
import { Typography, Card, Table, Tag } from "antd";
import { ClockCircleOutlined } from "@ant-design/icons";
import StudentLayout from "@/components/StudentLayout";

const { Title, Text } = Typography;

export default function SchedulePage() {
    // Mock data for schedule
    const scheduleData = {
        monday: [
            { time: "08:00-09:00", subject: "คณิตศาสตร์", room: "ห้อง 301", teacher: "อ.สมชาย" },
            { time: "09:00-10:00", subject: "ภาษาอังกฤษ", room: "ห้อง 205", teacher: "อ.สมหญิง" },
            { time: "10:00-11:00", subject: "วิทยาศาสตร์", room: "ห้อง วทย์ 1", teacher: "อ.สมศักดิ์" },
            { time: "13:00-14:00", subject: "สังคมศึกษา", room: "ห้อง 302", teacher: "อ.สมพร" },
        ],
        tuesday: [
            { time: "08:00-09:00", subject: "ภาษาไทย", room: "ห้อง 301", teacher: "อ.สมใจ" },
            { time: "09:00-10:00", subject: "คอมพิวเตอร์", room: "ห้อง คอม 1", teacher: "อ.สมหมาย" },
            { time: "10:00-11:00", subject: "พลศึกษา", room: "สนามกีฬา", teacher: "อ.สมชัย" },
            { time: "13:00-14:00", subject: "ศิลปะ", room: "ห้องศิลปะ", teacher: "อ.สมบัติ" },
        ],
        wednesday: [
            { time: "08:00-09:00", subject: "คณิตศาสตร์", room: "ห้อง 301", teacher: "อ.สมชาย" },
            { time: "09:00-10:00", subject: "ภาษาอังกฤษ", room: "ห้อง 205", teacher: "อ.สมหญิง" },
            { time: "10:00-11:00", subject: "ดนตรี", room: "ห้องดนตรี", teacher: "อ.สมนึก" },
        ],
        thursday: [
            { time: "08:00-09:00", subject: "วิทยาศาสตร์", room: "ห้อง วทย์ 1", teacher: "อ.สมศักดิ์" },
            { time: "09:00-10:00", subject: "สังคมศึกษา", room: "ห้อง 302", teacher: "อ.สมพร" },
            { time: "10:00-11:00", subject: "ภาษาไทย", room: "ห้อง 301", teacher: "อ.สมใจ" },
            { time: "13:00-14:00", subject: "คอมพิวเตอร์", room: "ห้อง คอม 1", teacher: "อ.สมหมาย" },
        ],
        friday: [
            { time: "08:00-09:00", subject: "ภาษาอังกฤษ", room: "ห้อง 205", teacher: "อ.สมหญิง" },
            { time: "09:00-10:00", subject: "คณิตศาสตร์", room: "ห้อง 301", teacher: "อ.สมชาย" },
            { time: "10:00-11:00", subject: "พลศึกษา", room: "สนามกีฬา", teacher: "อ.สมชัย" },
        ],
    };

    const daysOfWeek = [
        { key: "monday", name: "วันจันทร์", color: "#fef3c7" },
        { key: "tuesday", name: "วันอังคาร", color: "#fce7f3" },
        { key: "wednesday", name: "วันพุธ", color: "#f0fdf4" },
        { key: "thursday", name: "วันพฤหัสบดี", color: "#eff6ff" },
        { key: "friday", name: "วันศุกร์", color: "#fae8ff" },
    ];

    const columns = [
        {
            title: "เวลา",
            dataIndex: "time",
            key: "time",
            width: 120,
            render: (time) => (
                <Tag icon={<ClockCircleOutlined />} color="blue">
                    {time}
                </Tag>
            ),
        },
        {
            title: "วิชา",
            dataIndex: "subject",
            key: "subject",
        },
        {
            title: "ห้องเรียน",
            dataIndex: "room",
            key: "room",
        },
        {
            title: "ครูผู้สอน",
            dataIndex: "teacher",
            key: "teacher",
        },
    ];

    return (
        <StudentLayout>
            <div>
                <Title level={2}>ตารางสอน</Title>
                <Text>ตารางเรียนประจำสัปดาห์</Text>

                <div style={{ marginTop: 24 }}>
                    {daysOfWeek.map((day) => (
                        <Card
                            key={day.key}
                            title={day.name}
                            style={{
                                marginBottom: 16,
                                borderLeft: `4px solid #16a34a`,
                            }}
                            headStyle={{
                                backgroundColor: day.color,
                                fontWeight: "bold",
                            }}
                        >
                            <Table
                                columns={columns}
                                dataSource={scheduleData[day.key]}
                                pagination={false}
                                size="small"
                                rowKey={(record) => `${day.key}-${record.time}`}
                            />
                        </Card>
                    ))}
                </div>
            </div>
        </StudentLayout>
    );
}
