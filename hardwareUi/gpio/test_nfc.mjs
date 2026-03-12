import { execSync } from 'child_process';
import readline from 'readline';

console.log("=========================================");
console.log("   โปรแกรมทดสอบเครื่องอ่าน NFC (NodeJS)  ");
console.log("=========================================");

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const checkAndImport = async () => {
    try {
        console.log("กำลังเชื่อมต่อบอร์ด MFRC522...");
        const { default: Mfrc522Lib } = await import('mfrc522-rpi');
        return new Mfrc522Lib();
    } catch (e) {
        console.error("❌ ไม่สามารถโหลด mfrc522-rpi ได้ กรุณาเช็คว่ารันบน RPi และลง package ครบแล้ว", e.message);
        process.exit(1);
    }
};

const readTag = (mfrc522) => {
    console.log("\n[โหมดอ่าน UID (Read)]");
    console.log("กรุณานำเหรียญ/บัตร NFC ไปทาบที่ตัวอ่าน (RC522) ภายใน 10 วินาที...");

    // ตั้งเวลา 10 วิ หมดเวลาจะตัดจบ
    let elapsed = 0;
    const interval = setInterval(() => {
        const found = mfrc522.findCard();
        if (found?.status) {
            const uidResult = mfrc522.getUid();
            if (uidResult?.status) {
                const uid = uidResult.data
                    .slice(0, 4)
                    .map((b) => b.toString(16).padStart(2, '0'))
                    .join('')
                    .toUpperCase();
                console.log(`\n✅ เจอแท็ก! UID: ${uid}`);
                clearInterval(interval);
                process.exit(0);
            }
        }
        elapsed += 0.5;
        if (elapsed >= 10) {
            console.log("⏳ หมดเวลาแสกน ไม่พบเหรียญ");
            clearInterval(interval);
            process.exit(0);
        }
    }, 500);
};

const writeTag = (mfrc522) => {
    console.log("\n❌ [โหมดเขียนข้อมูล]");
    console.log("ตัวไลบรารี mfrc522-rpi ไม่รองรับการเขียนข้อมูล หรือเหรียญ NTAG215 จำนวนมากปฏิเสธการแก้ UID");
    console.log("แนะนำให้ใช้ โหมดอ่าน (กด 1) เพื่อดึงรหัสโรงงานไปเซฟจะเสถียรที่สุดครับ!");
    process.exit(0);
};

const start = async () => {
    const mfrc522 = await checkAndImport();

    console.log("1: อ่านรหัส UID จากเหรียญ (Read)");
    console.log("2: ทดสอบเขียนข้อมูล (Write)");
    console.log("=========================================");

    rl.question("กรุณาเลือกโหมด (1/2): ", (choice) => {
        if (choice === '1') {
            readTag(mfrc522);
        } else if (choice === '2') {
            writeTag(mfrc522);
        } else {
            console.log("ไม่พบตัวเลือก ยกเลิก");
            process.exit(1);
        }
    });
};

start();
