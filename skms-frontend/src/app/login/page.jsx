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
          Cookies.set("token", res.data.token , {expires: 1});
          Cookies.set("user", JSON.stringify(res.data.user), {expires: 1});
        }
        notification.success({
          title: "เข้าสู่ระบบสำเร็จ",
          description: "ยินดีต้อนรับคุณ ... (นักเรียน)",
        });
        router.push("/");
      } else {
        notification.error({
          title: "เข้าสู่ระบบไม่สำเร็จ",
          description: "อีเมลหรือรหัสผ่านไม่ถูกต้อง",
        });
      }
      setLoading(false);

    } catch (error) {
      console.log(error);
      notification.error({
        title: "เข้าสู่ระบบไม่สำเร็จ",
        description: "อีเมลหรือรหัสผ่านไม่ถูกต้อง",
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
    <div className="min-h-screen flex items-center justify-center bg-green-50 p-4">
      <Card
        className="w-full max-w-md shadow-xl rounded-2xl overflow-hidden"
      >
        {/* Header Section */}
        <div className="bg-green-600 p-8 text-center">
          <Title level={2} style={{ color: "white", margin: 0, fontWeight: 700 }}>
            ระบบเบิกคืนกุณแจอัตโนมัติ
          </Title>
        </div>

        {/* Form Section */}
        <div className="p-8">
          <div className="mb-6 text-center">
            <Title level={3} style={{ margin: 0, color: "#374151" }}>
              เข้าสู่ระบบ
            </Title>
            <Text type="secondary">(เข้าใช้งานครั้งแรก กรุณาตั้งรหัสผ่าน)</Text>
          </div>

          <Form
            name="normal_login"
            className="login-form"
            initialValues={{ remember: true }}
            onFinish={onFinish}
            size="large"
            layout="vertical"
          >
            <Form.Item
              name="email"
              label="email (@email.kmutnb.ac.th เท่านั้น)"
              rules={[
                { required: true, message: "โปรดกรอกอีเมล @email.kmutnb.ac.th เท่านั้น" },
                { pattern: /^\w{14}@email\.kmutnb\.ac\.th$/, message: "อีเมลไม่ถูกต้อง" }
              ]}
            >
              <Input
                prefix={<UserOutlined className="site-form-item-icon text-gray-400" />}
                placeholder="โปรดกรอกอีเมล @email.kmutnb.ac.th เท่านั้น"
              />
            </Form.Item>
            <Form.Item
              name="password"
              label="Password"
              rules={[{ required: true, message: "โปรดกรอกรหัสผ่าน" }]}
            >
              <Input.Password
                prefix={<LockOutlined className="site-form-item-icon text-gray-400" />}
                placeholder="โปรดกรอกรหัสผ่าน"
              />
            </Form.Item>
            <Form.Item>
              <div className="flex justify-between items-center">
                <Form.Item name="remember" valuePropName="checked" noStyle>
                  <Checkbox>จดจำฉัน</Checkbox>
                </Form.Item>

                <p onClick={() => { setResetPasswordDrawer(true) }} className="login-form-forgot text-green-600 hover:text-green-500 cursor-pointer">
                  ลืมรหัสผ่าน?
                </p>
              </div>
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                className="w-full bg-green-600 hover:bg-green-500 h-12 text-lg font-medium"
                loading={loading}
              >
                เข้าสู่่ระบบ
              </Button>
            </Form.Item>
          </Form>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-8 py-4 border-t border-gray-100 text-center">
          <Text type="secondary" style={{ fontSize: "12px" }}>
            &copy; {new Date().getFullYear()} SKMS. All rights reserved.
          </Text>
        </div>
      </Card>

      <Drawer
        title="ลืมรหัสผ่าน"
        placement="right"
        onClose={() => {

          closeDrawer();
        }}
        open={resetPasswordDrawer}
      >
        <>
          {resetPasswordStep === 1 && (
            <Form
              onFinish={onFinishResetPassword}
              size="large"
              layout="vertical"
            >
              <Form.Item
                name="email"
                rules={[
                  {
                    required: true,
                    message: "กรุณากรอกอีเมลที่ลืมรหัสผ่าน",
                  },
                  {
                    pattern: /^\w{14}@email\.kmutnb\.ac\.th$/,
                    message: "อีเมลไม่ถูกต้อง"
                  }
                ]}
              >
                <Input placeholder="กรอกอีเมลที่ลืมรหัสผ่าน" />
              </Form.Item>
              <Form.Item>
                <Button type="primary" loading={loading} htmlType="submit">ส่งรหัสยืนยันทางอีเมล</Button>
              </Form.Item>
            </Form>
          )}
          {resetPasswordStep === 2 && (
            <Form justify="center" layout="vertical" onFinish={onFinishOTP}>
              <Form.Item
                name={'otp'}
                label="รหัสยืนยัน"
                rules={[
                  {
                    required: true,
                    message: "กรุณากรอกรหัสยืนยัน",
                  }
                ]}
              >
                <Input.OTP size="large" style={{ width: "100%" }} />
              </Form.Item>
              <Form.Item>
                <Button type="primary" style={{ width: "100%", margin: "1rem 0" }} loading={loading} htmlType="submit">ยืนยัน</Button>
              </Form.Item>
              <Button
                type="link"
                disabled={countdown > 0}
                onClick={() => {
                  onFinishResetPassword({ email: emailReset });
                }}
              >
                {countdown > 0 ? `ส่งรหัสยืนยันอีกครั้ง (${countdown} วินาที)` : 'ส่งรหัสยืนยันอีกครั้ง'}
              </Button>
            </Form>
          )}
          {resetPasswordStep === 3 && (
            <Form
              layout="vertical"
              onFinish={onFinishChangePassword}
            >
              <Form.Item
                name="password"
                label="Password"
                rules={[{ required: true, message: "โปรดกรอกรหัสผ่าน" }]}
              >
                <Input.Password placeholder="กรอกรหัสผ่านใหม่" />
              </Form.Item>
              <Form.Item
                name="confirmPassword"
                label="Confirm Password"
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
                <Input.Password placeholder="กรอกรหัสผ่านอีกครั้งเพื่อยืนยัน" />
              </Form.Item>
              <Form.Item>
                <Button type="primary" htmlType="submit" style={{ width: "100%" }}>ยืนยัน</Button>
              </Form.Item>
            </Form>
          )}
        </>
      </Drawer>
    </div >
  );
}
