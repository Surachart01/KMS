'use client';

import { useState, useEffect } from 'react';
import { notification } from 'antd';

export default function NotificationTestPage() {
    const [swRegistration, setSwRegistration] = useState(null);
    const [notificationPermission, setNotificationPermission] = useState('default');
    const [isSupported, setIsSupported] = useState(false);

    useEffect(() => {
        // Check if notifications and service workers are supported
        if ('Notification' in window && 'serviceWorker' in navigator) {
            setIsSupported(true);
            setNotificationPermission(Notification.permission);

            // Register Service Worker
            registerServiceWorker();
        }
    }, []);

    const registerServiceWorker = async () => {
        try {
            const registration = await navigator.serviceWorker.register('/sw.js');
            console.log('Service Worker registered:', registration);
            setSwRegistration(registration);

            notification.success({
                message: 'Service Worker ลงทะเบียนสำเร็จ',
                description: 'พร้อมใช้งาน PWA และ Notifications',
                placement: 'topRight'
            });
        } catch (error) {
            console.error('Service Worker registration failed:', error);
            notification.error({
                message: 'Service Worker ลงทะเบียนล้มเหลว',
                description: error.message,
                placement: 'topRight'
            });
        }
    };

    const requestNotificationPermission = async () => {
        if (!isSupported) {
            notification.warning({
                message: 'ไม่รองรับ Notifications',
                description: 'เบราว์เซอร์ของคุณไม่รองรับ Web Notifications',
                placement: 'topRight'
            });
            return;
        }

        try {
            const permission = await Notification.requestPermission();
            setNotificationPermission(permission);

            if (permission === 'granted') {
                notification.success({
                    message: 'อนุญาต Notifications สำเร็จ',
                    description: 'ตอนนี้คุณสามารถรับการแจ้งเตือนได้แล้ว',
                    placement: 'topRight'
                });
            } else if (permission === 'denied') {
                notification.error({
                    message: 'ปฏิเสธ Notifications',
                    description: 'คุณได้ปฏิเสธการแจ้งเตือน กรุณาเปิดใช้งานในการตั้งค่าเบราว์เซอร์',
                    placement: 'topRight'
                });
            }
        } catch (error) {
            console.error('Error requesting notification permission:', error);
            notification.error({
                message: 'เกิดข้อผิดพลาด',
                description: error.message,
                placement: 'topRight'
            });
        }
    };

    const sendTestNotification = () => {
        if (notificationPermission !== 'granted') {
            notification.warning({
                message: 'ยังไม่ได้รับอนุญาต',
                description: 'กรุณาอนุญาต Notifications ก่อนส่งการแจ้งเตือน',
                placement: 'topRight'
            });
            return;
        }

        if (swRegistration) {
            // Send notification via Service Worker
            swRegistration.showNotification('🎉 SKMS Test Notification', {
                body: 'นี่คือการแจ้งเตือนทดสอบจาก PWA ของคุณ',
                icon: '/icon-192.png',
                badge: '/icon-192.png',
                vibrate: [200, 100, 200],
                tag: 'test-notification',
                requireInteraction: false,
                actions: [
                    { action: 'open', title: 'เปิด', icon: '/icon-192.png' },
                    { action: 'close', title: 'ปิด', icon: '/icon-192.png' }
                ],
                data: {
                    url: '/test',
                    time: new Date().toLocaleString('th-TH')
                }
            });

            notification.success({
                message: 'ส่ง Notification สำเร็จ',
                description: 'ตรวจสอบการแจ้งเตือนบนอุปกรณ์ของคุณ',
                placement: 'topRight'
            });
        } else {
            // Fallback to basic notification
            new Notification('🎉 SKMS Test Notification', {
                body: 'นี่คือการแจ้งเตือนทดสอบ',
                icon: '/icon-192.png'
            });
        }
    };

    const getStatusColor = (permission) => {
        switch (permission) {
            case 'granted':
                return 'text-green-500';
            case 'denied':
                return 'text-red-500';
            default:
                return 'text-yellow-500';
        }
    };

    const getStatusText = (permission) => {
        switch (permission) {
            case 'granted':
                return 'อนุญาตแล้ว ✓';
            case 'denied':
                return 'ปฏิเสธ ✗';
            default:
                return 'รอการอนุญาต';
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 p-4 md:p-8">
            <div className="max-w-2xl mx-auto">
                {/* Header */}
                <div className="text-center mb-8 animate-fade-in">
                    <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-4">
                        🔔 Notification Test
                    </h1>
                    <p className="text-gray-600 text-lg">
                        ทดสอบ Web Push Notifications สำหรับ PWA
                    </p>
                </div>

                {/* Status Card */}
                <div className="bg-white rounded-3xl shadow-xl p-6 md:p-8 mb-6 backdrop-blur-lg bg-opacity-90 border border-purple-100">
                    <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                        <span className="text-2xl">📊</span>
                        สถานะระบบ
                    </h2>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl">
                            <div className="flex items-center gap-3">
                                <span className="text-2xl">🌐</span>
                                <span className="font-medium text-gray-700">Browser Support:</span>
                            </div>
                            <span className={`font-bold ${isSupported ? 'text-green-500' : 'text-red-500'}`}>
                                {isSupported ? 'รองรับ ✓' : 'ไม่รองรับ ✗'}
                            </span>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl">
                            <div className="flex items-center gap-3">
                                <span className="text-2xl">⚙️</span>
                                <span className="font-medium text-gray-700">Service Worker:</span>
                            </div>
                            <span className={`font-bold ${swRegistration ? 'text-green-500' : 'text-yellow-500'}`}>
                                {swRegistration ? 'Active ✓' : 'กำลังโหลด...'}
                            </span>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-pink-50 to-purple-50 rounded-xl">
                            <div className="flex items-center gap-3">
                                <span className="text-2xl">🔔</span>
                                <span className="font-medium text-gray-700">Notification Permission:</span>
                            </div>
                            <span className={`font-bold ${getStatusColor(notificationPermission)}`}>
                                {getStatusText(notificationPermission)}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-4">
                    <button
                        onClick={requestNotificationPermission}
                        disabled={notificationPermission === 'granted' || !isSupported}
                        className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold py-6 px-8 rounded-2xl shadow-lg transform transition-all duration-300 hover:scale-105 hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-3 text-lg"
                    >
                        <span className="text-2xl">🔓</span>
                        {notificationPermission === 'granted' ? 'อนุญาตแล้ว' : 'ขออนุญาต Notifications'}
                    </button>

                    <button
                        onClick={sendTestNotification}
                        disabled={notificationPermission !== 'granted'}
                        className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-bold py-6 px-8 rounded-2xl shadow-lg transform transition-all duration-300 hover:scale-105 hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-3 text-lg"
                    >
                        <span className="text-2xl">🚀</span>
                        ส่ง Test Notification
                    </button>
                </div>

                {/* Info Card */}
                <div className="mt-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl shadow-xl p-6 md:p-8 text-white">
                    <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <span className="text-2xl">💡</span>
                        วิธีใช้งาน
                    </h3>
                    <ol className="space-y-3 text-sm md:text-base">
                        <li className="flex items-start gap-3">
                            <span className="font-bold bg-white text-purple-600 rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0">1</span>
                            <span>กดปุ่ม "ขออนุญาต Notifications" เพื่ออนุญาตการแจ้งเตือน</span>
                        </li>
                        <li className="flex items-start gap-3">
                            <span className="font-bold bg-white text-purple-600 rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0">2</span>
                            <span>กดปุ่ม "ส่ง Test Notification" เพื่อทดสอบส่งการแจ้งเตือน</span>
                        </li>
                        <li className="flex items-start gap-3">
                            <span className="font-bold bg-white text-purple-600 rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0">3</span>
                            <span>บนมือถือ: เพิ่มหน้าเว็บไปยังหน้าจอหลัก (Add to Home Screen) เพื่อรับ Notifications แม้เมื่อปิดแอป</span>
                        </li>
                    </ol>
                </div>

                {/* PWA Install Info */}
                <div className="mt-6 bg-white rounded-2xl shadow-lg p-6 border border-purple-100">
                    <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                        <span className="text-xl">📱</span>
                        การติดตั้ง PWA
                    </h3>
                    <div className="text-sm text-gray-600 space-y-2">
                        <p><strong>iOS Safari:</strong> กด Share → Add to Home Screen</p>
                        <p><strong>Android Chrome:</strong> กด Menu (⋮) → Add to Home Screen</p>
                    </div>
                </div>
            </div>

            <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.6s ease-out;
        }
      `}</style>
        </div>
    );
}
