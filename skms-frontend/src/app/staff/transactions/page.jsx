"use client";

import React, { useState, useEffect } from "react";
import {
    Table,
    Space,
    Typography,
    Card,
    Tag,
    DatePicker,
    Select,
    Button,
    Input,
    message,
} from "antd";
import {
    HistoryOutlined,
    SearchOutlined,
    DownloadOutlined,
} from "@ant-design/icons";
import { transactionsAPI } from "@/service/api";
import dayjs from "dayjs";

const { Title } = Typography;
const { RangePicker } = DatePicker;

export default function TransactionsPage() {
    const [loading, setLoading] = useState(false);
    const [searchText, setSearchText] = useState("");
    const [statusFilter, setStatusFilter] = useState(null);
    const [dateRange, setDateRange] = useState(null);
    const [transactions, setTransactions] = useState([]);

    useEffect(() => {
        fetchTransactions();
    }, [statusFilter, dateRange]); // Fetch when filters change

    const fetchTransactions = async () => {
        try {
            setLoading(true);
            const params = {};

            if (statusFilter) params.status = statusFilter;
            if (searchText) params.search = searchText;
            if (dateRange) {
                params.startDate = dateRange[0].toISOString();
                params.endDate = dateRange[1].toISOString();
            }

            const response = await transactionsAPI.getAll(params);
            setTransactions(response.data.data || []);
        } catch (error) {
            console.error("Error fetching transactions:", error);
            message.error("ไม่สามารถโหลดประวัติการเบิกคืนได้");
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (value) => {
        setSearchText(value);
    };

    const handleSearchEnter = () => {
        fetchTransactions();
    };

    const getStatusColor = (status) => {
        return status === "borrowed" ? "orange" : "green";
    };

    const getStatusText = (status) => {
        return status === "borrowed" ? "กำลังเบิก" : "คืนแล้ว";
    };

    const columns = [
        {
            title: "ผู้เบิก",
            key: "user",
            render: (_, record) => (
                <div>
                    <div>{`${record.user?.first_name || ""} ${record.user?.last_name || ""}`}</div>
                    <div style={{ fontSize: 12, color: "#888" }}>
                        {record.user?.user_no}
                    </div>
                </div>
            ),
        },
        {
            title: "กุญแจ",
            key: "key",
            width: 120,
            render: (_, record) => (
                <Tag color="blue">{record.key?.key_id}</Tag>
            ),
        },
        {
            title: "ห้อง",
            key: "room",
            render: (_, record) => (
                <div>
                    <div>{record.room?.room_id}</div>
                    <div style={{ fontSize: 12, color: "#888" }}>
                        {record.room?.room_name}
                    </div>
                </div>
            ),
        },
        {
            title: "เหตุผล",
            key: "reason",
            width: 150,
            render: (_, record) => (
                <div>
                    <Tag>{record.reason?.reason_name}</Tag>
                    {record.note && (
                        <div style={{ fontSize: 12, color: "#888", marginTop: 4 }}>
                            {record.note}
                        </div>
                    )}
                </div>
            ),
        },
        {
            title: "เวลาเบิก",
            dataIndex: "borrow_time",
            key: "borrow_time",
            width: 160,
            render: (text) => dayjs(text).format("DD/MM/YYYY HH:mm"),
        },
        {
            title: "เวลาคืน",
            dataIndex: "return_time",
            key: "return_time",
            width: 160,
            render: (text) => text ? dayjs(text).format("DD/MM/YYYY HH:mm") : "-",
        },
        {
            title: "สถานะ",
            dataIndex: "status",
            key: "status",
            width: 100,
            render: (status) => (
                <Tag color={getStatusColor(status)}>
                    {getStatusText(status)}
                </Tag>
            ),
        },
    ];

    return (
        <div>
            <Space direction="vertical" size="large" style={{ width: "100%" }}>
                <div>
                    <Title level={2}>
                        <HistoryOutlined /> ประวัติการเบิกคืนกุญแจ
                    </Title>
                </div>

                <Card>
                    <Space
                        direction="vertical"
                        size="middle"
                        style={{ width: "100%", marginBottom: 16 }}
                    >
                        <Space wrap>
                            <Input
                                placeholder="ค้นหา รหัสนักศึกษา, ชื่อ, ห้อง..."
                                prefix={<SearchOutlined />}
                                style={{ width: 300 }}
                                value={searchText}
                                onChange={(e) => handleSearch(e.target.value)}
                                onPressEnter={handleSearchEnter}
                            />
                            <Button type="primary" onClick={handleSearchEnter}>ค้นหา</Button>

                            <Select
                                placeholder="สถานะ"
                                style={{ width: 150 }}
                                allowClear
                                onChange={setStatusFilter}
                            >
                                <Select.Option value="borrowed">กำลังเบิก</Select.Option>
                                <Select.Option value="returned">คืนแล้ว</Select.Option>
                            </Select>

                            <RangePicker
                                placeholder={["วันที่เริ่มต้น", "วันที่สิ้นสุด"]}
                                style={{ width: 300 }}
                                onChange={setDateRange}
                            />
                        </Space>
                    </Space>

                    <Table
                        columns={columns}
                        dataSource={transactions}
                        rowKey="transaction_id"
                        loading={loading}
                        pagination={{
                            pageSize: 10,
                            showSizeChanger: true,
                            showTotal: (total) => `ทั้งหมด ${total} รายการ`,
                        }}
                    />
                </Card>
            </Space>
        </div>
    );
}
