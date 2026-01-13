"use client";

import React, { useState, useEffect } from "react";
import { Form, Input, Button, Checkbox, Card, Typography, notification, Drawer, Flex } from "antd";
import { UserOutlined, LockOutlined } from "@ant-design/icons";
import { login, sendResetPasswordEmail, verifyOTP } from "@/service/auth";
import { updatePassword } from "@/service/users";
import { CloudCog } from "lucide-react";
const { Title, Text } = Typography;
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [resetPasswordDrawer, setResetPasswordDrawer] = useState(false);
  const [resetPasswordStep, setResetPasswordStep] = useState(1);
  const [emailReset, setEmailReset] = useState("");
  const [countdown, setCountdown] = useState(0);
  const router = useRouter();

  // Countdown timer for OTP resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);



  const onFinish = async (values) => {
    setLoading(true);
    console.log("Received values of form: ", values);
    try {
      let res = await login(values.email, values.password, values.remember);
      console.log(res);
      if (res.status == 200) {
        if (values.remember) {
          Cookies.set("token", res.data.token, { expires: 7 });
          Cookies.set("user", JSON.stringify(res.data.user), { expires: 7 });
        } else {
          Cookies.set("token", res.data.token, { expires: 1 });
          Cookies.set("user", JSON.stringify(res.data.user), { expires: 1 });
        }
        notification.success({
          title: "เข้าสู่ระบบสำเร็จ",
          description: `ยินดีต้อนรับ ${res.data.user.first_name} ${res.data.user.last_name}`,
        });
        router.push("/staff/dashboard");
      } else {
        notification.error({
          title: "เข้าสู่ระบบไม่สำเร็จ",
          description: res.data?.message || "อีเมลหรือรหัสผ่านไม่ถูกต้อง",
        });
      }
      setLoading(false);

    } catch (error) {
      console.log(error);
      notification.error({
        title: "เข้าสู่ระบบไม่สำเร็จ",
        description: error.response?.data?.message || "เกิดข้อผิดพลาดในการเชื่อมต่อ",
      });
      setLoading(false);
    }
  };

  const onFinishResetPassword = async (values) => {

    setLoading(true);
    try {
      let res = await sendResetPasswordEmail(values.email);
      if (res.status == 200) {
        setEmailReset(values.email);
        setResetPasswordStep(2);
        setCountdown(90); // เริ่มนับถอยหลัง 90 วินาที
        notification.success({
          title: "ส่งรหัสยืนยันทางอีเมลสำเร็จ",
          description: "กรุณาตรวจสอบอีเมลของคุณ",
        });
      } else {
        notification.error({
          title: "ไม่สามารถส่งรหัสยืนยันทางอีเมลได้",
          description: "โปรดติต่อทางภาควิชาคอมพิวเตอร์ศึกษาเพื่อขอช่วยเหลือ",
        });
      }
    } catch (error) {
      console.log(error)
      notification.error({
        title: "ไม่สามารถส่งรหัสยืนยันทางอีเมลได้",
        description: "โปรดติต่อทางภาควิชาคอมพิวเตอร์ศึกษาเพื่อขอช่วยเหลือ",
      });
    }

    setLoading(false);

  };

  const onFinishOTP = async (values) => {
    setLoading(true);
    try {
      let res = await verifyOTP(emailReset, values.otp);
      if (res.status == 200) {
        setResetPasswordStep(3);
        notification.success({
          title: "ยืนยันรหัสยืนยันทางอีเมลสำเร็จ",
          description: "กรุณาตรวจสอบอีเมลของคุณ",
        });
      } else {
        notification.error({
          title: "ไม่สามารถยืนยันรหัสยืนยันทางอีเมลได้",
          description: "โปรดติต่อทางภาควิชาคอมพิวเตอร์ศึกษาเพื่อขอช่วยเหลือ",
        });
      }
    } catch (error) {
      console.log(error)
      notification.error({
        title: "ไม่สามารถยืนยันรหัสยืนยันทางอีเมลได้",
        description: "โปรดติต่อทางภาควิชาคอมพิวเตอร์ศึกษาเพื่อขอช่วยเหลือ",
      });
    }

    setLoading(false);
  }

  const closeDrawer = () => {
    setResetPasswordDrawer(false);
    setEmailReset("");
    setCountdown(0);
    setResetPasswordStep(1);
  }

  const onFinishChangePassword = async (values) => {
    setLoading(true);
    try {
      let res = await updatePassword(emailReset, values.password);
      if (res.status == 200) {
        closeDrawer();
        notification.success({
          title: "เปลี่ยนรหัสผ่านสำเร็จ",
          description: "กรุณาตรวจสอบอีเมลของคุณ",
        });
      } else {
        notification.error({
          title: "ไม่สามารถเปลี่ยนรหัสผ่านได้",
          description: "โปรดติต่อทางภาควิชาคอมพิวเตอร์ศึกษาเพื่อขอช่วยเหลือ",
        });
      }
    } catch (error) {
      console.log(error)
      notification.error({
        title: "ไม่สามารถเปลี่ยนรหัสผ่านได้",
        description: "โปรดติต่อทางภาควิชาคอมพิวเตอร์ศึกษาเพื่อขอช่วยเหลือ",
      });
    }

    setLoading(false);
  }




  return (
    <div className="min-h-screen flex w-full bg-white">
      {/* Left Side - Branding (Hidden on mobile) */}
      <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-green-600 to-green-800 relative overflow-hidden items-center justify-center p-12">
        {/* Decorative Grid Pattern */}
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '30px 30px' }}>
        </div>

        {/* Decorative Circles */}
        <div className="absolute top-10 left-10 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl"></div>
        <div className="absolute bottom-10 right-10 w-64 h-64 bg-green-400 opacity-20 rounded-full blur-3xl"></div>

        <div className="relative z-10 flex flex-col items-center text-center text-white space-y-6 max-w-lg">
          <div className="bg-white/10 backdrop-blur-md p-6 rounded-3xl border border-white/20 shadow-2xl">
            <CloudCog size={80} className="text-white" />
          </div>
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight">SKMS</h1>
            <p className="text-green-100 text-lg font-light">
              Student Knowledge Management System
            </p>
          </div>
          <div className="h-1 w-24 bg-green-400 rounded-full my-4 opacity-50"></div>
          <p className="text-green-50/80 leading-relaxed text-sm max-w-md">
            ระบบเบิกคืนกุญแจอัตโนมัติ และการจัดการความรู้นักเรียน
            <br />
            ภาควิชาคอมพิวเตอร์ศึกษา
          </p>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="flex flex-1 flex-col justify-center px-4 sm:px-6 lg:px-20 xl:px-24 bg-white">
        <div className="mx-auto w-full max-w-sm lg:max-w-md">
          {/* Mobile Logo (Visible only on mobile) */}
          <div className="lg:hidden flex justify-center mb-8 text-green-600">
            <CloudCog size={64} />
          </div>

          <div className="text-center lg:text-left mb-10">
            <h2 className="text-3xl font-bold tracking-tighter text-gray-900">
              ยินดีต้อนรับกลับ
            </h2>
            <p className="mt-2 text-sm text-gray-500">
              กรุณาเข้าสู่ระบบเพื่อใช้งานระบบ
            </p>
          </div>

          <Form
            name="normal_login"
            className="login-form space-y-6"
            initialValues={{ remember: true }}
            onFinish={onFinish}
            size="large"
            layout="vertical"
            requiredMark={false}
          >
            <Form.Item
              name="email"
              label={<span className="font-medium text-gray-700">อีเมลนักศึกษา</span>}
              rules={[
                { required: true, message: "โปรดกรอกอีเมล" },
                { type: "email", message: "รูปแบบอีเมลไม่ถูกต้อง" }
              ]}
              className="mb-4"
            >
              <Input
                prefix={<UserOutlined className="text-gray-400 mx-1" />}
                placeholder="อีเมลของคุณ"
                className="rounded-lg py-2.5"
              />
            </Form.Item>

            <Form.Item
              name="password"
              label={<span className="font-medium text-gray-700">รหัสผ่าน</span>}
              rules={[{ required: true, message: "โปรดกรอกรหัสผ่าน" }]}
              className="mb-2"
            >
              <Input.Password
                prefix={<LockOutlined className="text-gray-400 mx-1" />}
                placeholder="••••••••"
                className="rounded-lg py-2.5"
              />
            </Form.Item>

            <div className="flex items-center justify-between mb-6">
              <Form.Item name="remember" valuePropName="checked" noStyle>
                <Checkbox className="text-gray-600">จดจำฉัน</Checkbox>
              </Form.Item>

              <a
                onClick={() => setResetPasswordDrawer(true)}
                className="text-sm font-medium text-green-600 hover:text-green-500 cursor-pointer transition-colors"
              >
                ลืมรหัสผ่าน?
              </a>
            </div>

            <Form.Item style={{ marginBottom: 0 }}>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                className="w-full h-12 text-base font-semibold rounded-lg bg-green-600 hover:bg-green-500 shadow-lg shadow-green-600/20 border-none transition-all duration-200 hover:scale-[1.02]"
              >
                เข้าสู่ระบบ
              </Button>
            </Form.Item>
          </Form>

          <div className="mt-8 pt-8 border-t border-gray-100 text-center text-xs text-gray-400">
            &copy; {new Date().getFullYear()} SKMS. King Mongkut's University of Technology North Bangkok.
          </div>
        </div>
      </div>

      <Drawer
        title={
          <div className="flex items-center space-x-2 text-green-700">
            <CloudCog size={20} />
            <span>ลืมรหัสผ่าน</span>
          </div>
        }
        placement="right"
        width={420}
        onClose={closeDrawer}
        open={resetPasswordDrawer}
        styles={{ header: { borderBottom: '1px solid #f0f0f0' } }}
      >
        <div className="pt-4">
          <div className="mb-8 text-center">
            <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-3 text-green-600">
              <LockOutlined style={{ fontSize: '24px' }} />
            </div>
            <h3 className="text-lg font-semibold text-gray-800">กู้คืนบัญชีผู้ใช้</h3>
            <p className="text-gray-500 text-sm">
              {resetPasswordStep === 1 && "กรอกอีเมลเพื่อรับรหัสยืนยัน"}
              {resetPasswordStep === 2 && "กรอกรหัส 6 หลักที่ได้รับทางอีเมล"}
              {resetPasswordStep === 3 && "ตั้งรหัสผ่านใหม่ของคุณ"}
            </p>
          </div>

          {resetPasswordStep === 1 && (
            <Form
              onFinish={onFinishResetPassword}
              size="large"
              layout="vertical"
              requiredMark={false}
            >
              <Form.Item
                name="email"
                label="อีเมล"
                rules={[
                  { required: true, message: "กรุณากรอกอีเมลที่ลืมรหัสผ่าน" },
                  { type: "email", message: "รูปแบบอีเมลไม่ถูกต้อง" }
                ]}
              >
                <Input
                  prefix={<UserOutlined className="text-gray-400" />}
                  placeholder="กรอกอีเมลที่ลืมรหัสผ่าน"
                  className="rounded-lg"
                />
              </Form.Item>
              <Form.Item className="mt-8">
                <Button type="primary" loading={loading} htmlType="submit" className="w-full h-11 rounded-lg font-medium bg-green-600">
                  ส่งรหัสยืนยัน
                </Button>
              </Form.Item>
            </Form>
          )}

          {resetPasswordStep === 2 && (
            <Form justify="center" layout="vertical" onFinish={onFinishOTP} requiredMark={false}>
              <Form.Item
                name={'otp'}
                label="รหัสยืนยัน (OTP)"
                rules={[{ required: true, message: "กรุณากรอกรหัสยืนยัน" }]}
              >
                <Input.OTP size="large" style={{ width: "100%" }} />
              </Form.Item>

              <Form.Item className="mt-8 mb-3">
                <Button type="primary" loading={loading} htmlType="submit" className="w-full h-11 rounded-lg font-medium bg-green-600">
                  ตรวจสอบรหัส
                </Button>
              </Form.Item>

              <div className="text-center">
                <Button
                  type="link"
                  size="small"
                  disabled={countdown > 0}
                  onClick={() => onFinishResetPassword({ email: emailReset })}
                  className="text-gray-500 hover:text-green-600"
                >
                  {countdown > 0 ? `ขอรหัสใหม่ได้ใน ${countdown} วินาที` : 'ไม่ได้รับรหัส? ส่งรหัสยืนยันอีกครั้ง'}
                </Button>
              </div>
            </Form>
          )}

          {resetPasswordStep === 3 && (
            <Form layout="vertical" onFinish={onFinishChangePassword} requiredMark={false}>
              <Form.Item
                name="password"
                label="รหัสผ่านใหม่"
                rules={[{ required: true, message: "โปรดกรอกรหัสผ่าน" }]}
              >
                <Input.Password placeholder="กรอกรหัสผ่านใหม่" className="rounded-lg" />
              </Form.Item>
              <Form.Item
                name="confirmPassword"
                label="ยืนยันรหัสผ่านใหม่"
                dependencies={['password']}
                rules={[
                  { required: true, message: "โปรดกรอกรหัสผ่านอีกครั้ง" },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('password') === value) {
                        return Promise.resolve();
                      }
                      return Promise.reject(new Error('รหัสผ่านไม่ตรงกัน'));
                    },
                  }),
                ]}
              >
                <Input.Password placeholder="ยืนยันรหัสผ่านใหม่" className="rounded-lg" />
              </Form.Item>
              <Form.Item className="mt-8">
                <Button type="primary" htmlType="submit" className="w-full h-11 rounded-lg font-medium bg-green-600">
                  บันทึกรหัสผ่าน
                </Button>
              </Form.Item>
            </Form>
          )}
        </div>
      </Drawer>
    </div>
  );
}
