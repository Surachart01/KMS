
const XLSX = require('xlsx');
const path = require('path');

try {
    const filePath = path.join(__dirname, 'ตารางสอน ป.ตรี 2.68.xlsx');
    console.log(`Reading file from: ${filePath}`);

    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0]; // อ่าน Sheet แรก
    const worksheet = workbook.Sheets[sheetName];

    // แปลงเป็น JSON แบบ Array of Arrays เพื่อดู Header (Row 1-2)
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, range: 0, defval: null });

    console.log("--- Excel Headers & Sample Data ---");
    // Show first 3 rows
    data.slice(0, 3).forEach((row, index) => {
        console.log(`Row ${index}:`, JSON.stringify(row));
    });

} catch (error) {
    console.error("Error reading excel:", error.message);
}
