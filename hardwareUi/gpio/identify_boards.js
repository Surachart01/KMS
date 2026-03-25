import { SerialPort } from 'serialport';
import { ReadlineParser } from '@serialport/parser-readline';

async function identify() {
    console.log('🔍 Scanning for ESP8266 boards...');
    const ports = await SerialPort.list();
    const usbPorts = ports.filter(p => p.path.includes('ttyUSB') || p.path.includes('ttyACM'));

    if (usbPorts.length === 0) {
        console.log('❌ No USB serial devices found.');
        return;
    }

    for (const portInfo of usbPorts) {
        const path = portInfo.path;
        console.log(`\n⏳ Checking ${path}...`);
        
        try {
            const port = new SerialPort({ path, baudRate: 115200 });
            const parser = port.pipe(new ReadlineParser({ delimiter: '\n' }));

            const result = await new Promise((resolve) => {
                const timer = setTimeout(() => {
                    port.close();
                    resolve({ ok: false, error: 'Timeout' });
                }, 3000);

                parser.on('data', (line) => {
                    try {
                        const json = JSON.parse(line.trim());
                        if (json.pong || json.diag) {
                            clearTimeout(timer);
                            resolve({ ok: true, data: json });
                        }
                    } catch (e) {}
                });

                // Send ping
                port.write(JSON.stringify({ id: 999, cmd: 'ping' }) + '\n');
            });

            if (result.ok) {
                const id = result.data.boardId || 'Unknown';
                console.log(`✅ ${path} -> Board ID: ${id}`);
                if (id === 1) console.log('   (Slots 1-4)');
                else if (id === 2) console.log('   (Slots 5-7)');
                else if (id === 3) console.log('   (Slots 8-10)');
            } else {
                console.log(`❌ ${path} -> No response or wrong protocol.`);
            }
            
            if (port.isOpen) port.close();
        } catch (e) {
            console.log(`❌ ${path} -> Error: ${e.message}`);
        }
    }
    console.log('\n✨ Done.');
}

identify();
