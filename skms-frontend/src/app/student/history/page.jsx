"use client";

import React, { useState } from "react";
import { Typography, Table, Tag, Button, Space, DatePicker, Input } from "antd";
import { SearchOutlined, CheckCircleOutlined, ClockCircleOutlined } from "@ant-design/icons";
import StudentLayout from "@/components/StudentLayout";

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

export default function HistoryPage() {
    const [searchText, setSearchText] = useState("");

    // Mock data for history
    const historyData = [
        {
            key: 1,
            id: "B001",
            keyName: "ห้องคอมพิวเตอร์ 1",
            borrowDate: "2024-12-10 09:00",
            returnDate: "2024-12-10 12:00",
            purpose: "ทำโครงงาน",
            status: "returned",
        },
        {
            key: 2,
            id: "B002",
            keyName: "ห้องวิทยาศาสตร์ 1",
            borrowDate: "2024-12-11 10:00",
            returnDate: "2024-12-11 14:00",
            purpose: "ทดลองวิทย์",
            status: "returned",
        },
        {
            key: 3,
            id: "B003",
            keyName: "ห้องดนตรี",
            borrowDate: "2024-12-12 08:00",
            returnDate: "-",
            purpose: "ซ้อมดนตรี",
            status: "borrowing",
        },
        {
            key: 4,
            id: "B004",
            keyName: "ห้องศิลปะ",
            borrowDate: "2024-12-12 13:00",
            returnDate: "-",
            purpose: "วาดภาพ",
            status: "borrowing",
        },
    ];

    const columns = [
        {
            title: "รหัสรายการ",
            dataIndex: "id",
            key: "id",
            width: 120,
        },
        {
            title: "ห้อง/กุญแจ",
            dataIndex: "keyName",
            key: "keyName",
        },
        {
            title: "วันที่เบิก",
            dataIndex: "borrowDate",
            key: "borrowDate",
        },
        {
            title: "วันที่คืน",
            dataIndex: "returnDate",
            key: "returnDate",
        },
        {
            title: "วัตถุประสงค์",
            dataIndex: "purpose",
            key: "purpose",
        },
        {
            title: "สถานะ",
            dataIndex: "status",
            key: "status",
            width: 130,
            render: (status) => {
                if (status === "returned") {
                    return (
                        <Tag icon={<CheckCircleOutlined />} color="success">
                            คืนแล้ว
                        </Tag>
                    );
                } else {
                    return (
                        <Tag icon={<ClockCircleOutlined />} color="processing">
                            กำลังเบิก
                        </Tag>
                    );
                }
            },
        },
        {
            title: "การจัดการ",
            key: "action",
            width: 120,
            render: (_, record) => (
                <Space size="small">
                    {record.status === "borrowing" && (
                        <Button type="primary" size="small" style={{ backgroundColor: "#16a34a", borderColor: "#16a34a" }}>
                            คืนกุญแจ
                        </Button>
                    )}
                </Space>
            ),
        },
    ];

    return (
        <StudentLayout>
            <div>
                <Title level={2}>ประวัติการเบิก-คืน</Title>
                <Text>รายการเบิก-คืนกุญแจทั้งหมดของคุณ</Text>

                <div style={{ marginTop: 24, marginBottom: 16 }}>
                    <Space wrap>
                        <Input
                            placeholder="ค้นหาด้วยชื่อห้อง"
                            prefix={<SearchOutlined />}
                            style={{ width: 250 }}
                            onChange={(e) => setSearchText(e.target.value)}
                        />
                        <RangePicker placeholder={["วันที่เริ่มต้น", "วันที่สิ้นสุด"]} />
                        <Button type="primary" style={{ backgroundColor: "#16a34a", borderColor: "#16a34a" }}>
                            ค้นหา
                        </Button>
                    </Space>
                </div>

                <Table
                    columns={columns}
                    dataSource={historyData.filter((item) =>
                        item.keyName.toLowerCase().includes(searchText.toLowerCase())
                    )}
                    pagination={{
                        pageSize: 10,
                        showTotal: (total) => `ทั้งหมด ${total} รายการ`,
                    }}
                    scroll={{ x: 800 }}
                />
            </div>
        </StudentLayout>
    );
}
