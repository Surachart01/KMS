"use client";

import React from "react";
import { Typography } from "antd";
import StudentLayout from "@/components/StudentLayout";

const { Title, Text } = Typography;

export default function StudentPage() {
    return (
        <StudentLayout>
            <div>
                <Title level={2}>ยินดีต้อนรับสู่ระบบนักเรียน SKMS</Title>
                <Text>
                    ระบบเบิกคืนกุญแจอัตโนมัติสำหรับนักเรียน (Smart Key Management System)
                </Text>

                <div
                    style={{
                        marginTop: 32,
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
                        gap: 16,
                    }}
                >
                    {/* Stats Cards */}
                    <div
                        style={{
                            padding: 24,
                            background: "#f0fdf4",
                            borderRadius: 8,
                            border: "1px solid #86efac",
                        }}
                    >
                        <Title level={4} style={{ margin: 0, color: "#16a34a" }}>
                            กุญแจที่เบิกอยู่
                        </Title>
                        <Title level={2} style={{ margin: "8px 0 0 0" }}>
                            2
                        </Title>
                    </div>

                    <div
                        style={{
                            padding: 24,
                            background: "#eff6ff",
                            borderRadius: 8,
                            border: "1px solid #93c5fd",
                        }}
                    >
                        <Title level={4} style={{ margin: 0, color: "#2563eb" }}>
                            วิชาที่เรียนวันนี้
                        </Title>
                        <Title level={2} style={{ margin: "8px 0 0 0" }}>
                            4
                        </Title>
                    </div>

                    <div
                        style={{
                            padding: 24,
                            background: "#fef3c7",
                            borderRadius: 8,
                            border: "1px solid #fcd34d",
                        }}
                    >
                        <Title level={4} style={{ margin: 0, color: "#d97706" }}>
                            รายการเบิกทั้งหมด
                        </Title>
                        <Title level={2} style={{ margin: "8px 0 0 0" }}>
                            28
                        </Title>
                    </div>

                    <div
                        style={{
                            padding: 24,
                            background: "#fce7f3",
                            borderRadius: 8,
                            border: "1px solid #f9a8d4",
                        }}
                    >
                        <Title level={4} style={{ margin: 0, color: "#db2777" }}>
                            กุญแจที่ยังไม่คืน
                        </Title>
                        <Title level={2} style={{ margin: "8px 0 0 0" }}>
                            0
                        </Title>
                    </div>
                </div>
            </div>
        </StudentLayout>
    );
}
