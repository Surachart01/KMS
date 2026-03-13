const { execSync } = require('child_process');
const readline = require('readline');

console.log("=========================================");
console.log("   โปรแกรมทดสอบเครื่องอ่าน NFC (NodeJS)  ");
console.log("=========================================");

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const checkAndImport = () => {
    try {
        console.log("กำลังเชื่อมต่อบอร์ด MFRC522...");

        // ลองโหลดจากหลายๆ ที่ (แก้ปัญหาเรื่องรันจาก subfolder)
        let Mfrc522Lib;
        try {
            Mfrc522Lib = require('mfrc522-rpi');
        } catch (err) {
            try {
                // ลองย้อนกลับไปดูโฟลเดอร์นอก
                Mfrc522Lib = require('../../../node_modules/mfrc522-rpi');
            } catch (err2) {
                // ลองอีกชั้น (ถ้าอยู่ลึก)
                Mfrc522Lib = require('../../node_modules/mfrc522-rpi');
            }
        }

        const Lib = Mfrc522Lib.default || Mfrc522Lib;
        return new Lib();
    } catch (e) {
        console.error("❌ ไม่สามารถโหลดไลบรารีอ่านเหรียญ mfrc522-rpi ได้");
        console.error("เหตุผล: " + e.message);
        console.error("\n👉 วิธีแก้: ไม่ต้อง install ใหม่ครับ ให้รันคำสั่งนี้แทน:");
        console.error("    sudo NODE_PATH=../../node_modules node test_nfc.js");
        process.exit(1);
    }
};

const readTag = (mfrc522) => {
    console.log("\n[โหมดอ่าน UID (Read)]");
    console.log("กรุณานำเหรียญ/บัตร NFC ไปทาบที่ตัวอ่าน (RC522) ภายใน 10 วินาที...");

    let elapsed = 0;
    const interval = setInterval(() => {
        try {
            mfrc522.reset();
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
        } catch (err) {
            // Ignore minor SPI errors during continuous polling
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

const start = () => {
    const mfrc522 = checkAndImport();

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
