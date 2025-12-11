# ใช้ Node.js เวอร์ชันล่าสุด
FROM node:18

# กำหนดโฟลเดอร์ทำงานใน Container
WORKDIR /app

# คัดลอก package.json และติดตั้ง dependencies
COPY package.json package-lock.json ./
RUN npm install

# คัดลอกโค้ดทั้งหมดไปยัง container
COPY . .

# เปิดพอร์ตที่ใช้งาน
EXPOSE 5000

# คอมไพล์ Prisma Client และรันเซิร์ฟเวอร์
CMD ["sh", "-c", "npx prisma generate && node src/server.js"]
