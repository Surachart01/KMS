// ==================== ADMS Controller ====================
// รับข้อมูลจาก ZKTeco SmartAC1 ผ่าน ICLOCK/ADMS protocol
// เมื่อได้ ATTLOG (face scan) → emit "scan:received" ผ่าน Socket.IO
// ==================== ===========================================

/**
 * Parse ATTLOG data จาก ZKTeco
 * Format: USER_ID\tTIMESTAMP\tSTATUS\tVERIFY_TYPE
 * Verify type 15 = Face scan
 */
function parseAttlog(rawData) {
    const records = [];
    const lines = rawData.trim().split('\n');

    for (const line of lines) {
        if (!line.trim()) continue;
        const parts = line.trim().split('\t');

        if (parts.length >= 4) {
            records.push({
                userId: parts[0].trim(),
                timestamp: parts[1]?.trim() || '',
                status: parts[2]?.trim() || '',
                verifyType: parts[3]?.trim() || '',
            });
        } else if (parts.length >= 1) {
            const userId = parts[0].trim();
            if (userId && /^\d+$/.test(userId)) {
                records.push({ userId, timestamp: '', status: '', verifyType: '' });
            }
        }
    }
    return records;
}

/**
 * POST/GET /iclock/cdata
 * รับ attendance data จาก ZKTeco device
 * เมื่อได้ ATTLOG → parse แล้ว emit "scan:received" ไปยัง kiosk room
 */
export const handleCdata = (io) => (req, res) => {
    const sn = req.query.SN || '';
    const table = req.query.table || '';

    console.log(`📥 ADMS Req: ${req.method} ${req.url}`);
    console.log(`   Headers: ${JSON.stringify(req.headers)}`);
    console.log(`   Query: ${JSON.stringify(req.query)}`);

    if (req.method === 'GET') {
        console.log(`   -> GET OK`);
        return res.status(200).send('OK');
    }

    // POST — receive data
    let rawBody = req.body;

    // Convert to string if it's not
    if (typeof rawBody !== 'string') {
        try {
            rawBody = JSON.stringify(rawBody);
        } catch (e) {
            rawBody = String(rawBody);
        }
    }

    console.log(`📦 Body Length: ${rawBody.length}`);
    console.log(`📦 Body Preview: ${rawBody.substring(0, 500)}`);

    if (table === 'ATTLOG') {
        const records = parseAttlog(rawBody);
        const kioskRoom = io.sockets.adapter.rooms.get('kiosk');
        const kioskCount = kioskRoom ? kioskRoom.size : 0;
        
        console.log(`🔍 Parsed ${records.length} records. Kiosk connections active: ${kioskCount}`);

        for (const record of records) {
            console.log(`   -> Record ID: ${record.userId}`);
            io.to('kiosk').emit('scan:received', { userId: record.userId });
            console.log(`   -> Emitted scan:received to ${kioskCount} clients`);
        }
    }

    return res.status(200).send('OK');
};

/**
 * POST /iclock/registry
 * Device registration
 */
export const handleRegistry = (req, res) => {
    const sn = req.query.SN || '';
    console.log(`📝 ADMS Device registered: ${sn}`);
    return res.status(200).send('OK');
};

/**
 * GET /iclock/getrequest
 * Device polling for commands
 */
export const handleGetRequest = (req, res) => {
    return res.status(200).send('OK');
};
