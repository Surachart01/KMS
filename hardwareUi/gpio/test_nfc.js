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
        // Use require to try loading mfrc522-rpi from the local node_modules
        const Mfrc522Lib = require('mfrc522-rpi').default || require('mfrc522-rpi');
        return new Mfrc522Lib();
    } catch (e) {
        console.error("❌ ไม่สามารถโหลดไลบรารีอ่านเหรียญ mfrc522-rpi ได้");
        console.error("👉 วิธีแก้: ให้กด Ctrl+C ออกไปก่อน แล้วพิมพ์คำสั่งด้านล่างนี้เลยครับ:\n");
        console.error("    npm install mfrc522-rpi\n");
        console.error("จากนั้นค่อยสลับมารัน 'sudo node test_nfc.js' ใหม่อีกครั้งครับ");
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
