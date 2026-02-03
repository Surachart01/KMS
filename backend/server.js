// import required modules
// const express = require('express');
// const cors = require('cors');
// const app = express();
// const dotenv = require('dotenv');
// const PrismaClient = require('@prisma/client');
import express from 'express'; // Restart trigger 28
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import authRouter from './src/routes/auth.js';
import usersRouter from './src/routes/users.js';
import majorRouter from './src/routes/major.js';
import sectionsRouter from './src/routes/sections.js';
import subjectsRouter from './src/routes/subjects.js';
import schedulesRouter from './src/routes/schedules.js';
import statisticsRouter from './src/routes/statistics.js';
import keyRouter from './src/routes/key.js';
import transactionsRouter from './src/routes/transactions.js';
import studentImportRouter from './src/routes/studentImport.js';

// New routes for Key Borrow-Return System
import kioskRouter from './src/routes/kiosk.js';
import penaltyRouter from './src/routes/penalty.js';
import bookingsRouter from './src/routes/bookings.js';
import scheduleRoutesRouter from './src/routes/scheduleRoutes.js';
import authorizationsRouter from './src/routes/authorizations.js';

// initialize express app and prisma client
const app = express();

const prisma = new PrismaClient();
const port = process.env.PORT || 3000;
app.use(cors());
app.use(express.json());
dotenv.config();

app.use("/api/auth", authRouter);
app.use("/api/users", usersRouter);
app.use("/api/majors", majorRouter);
app.use("/api/sections", sectionsRouter);
app.use("/api/subjects", subjectsRouter);
app.use("/api/schedules", schedulesRouter);
app.use("/api/statistics", statisticsRouter);
app.use("/api/keys", keyRouter);
app.use("/api/transactions", transactionsRouter);
app.use("/api/students/import", studentImportRouter);

// New routes for Key Borrow-Return System
app.use("/api/kiosk", kioskRouter);           // Kiosk API for Raspberry Pi
app.use("/api/penalty", penaltyRouter);       // Penalty management
app.use("/api/bookings", bookingsRouter);     // Booking history & stats
app.use("/api/authorizations", authorizationsRouter); // Daily authorization management
app.use("/api/v2/schedules", scheduleRoutesRouter); // New schedule API with room swap/move

app.get("/", async (req, res) => {
  try {
    // ทดสอบการเชื่อมต่อกับ DB
    await prisma.$connect();
    res.json({ message: "API is running!" });
  } catch (error) {
    res.status(500).json({ error: "Database connection failed" });
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});