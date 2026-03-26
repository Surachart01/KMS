import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
    plugins: [react()],
    server: {
        host: '0.0.0.0',
        port: 5173,
        hmr: {
            overlay: false,  // ปิด error overlay บน Kiosk (เครื่องหมาย ⚠ ที่มุมล่างซ้าย)
        },
    },
})
