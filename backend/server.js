// import required modules
// const express = require('express');
// const cors = require('cors');
// const app = express();
// const dotenv = require('dotenv');
// const PrismaClient = require('@prisma/client');
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import authRouter from './src/routes/auth.js';
import usersRouter from './src/routes/users.js';
import majorRouter from './src/routes/major.js';
import sectionsRouter from './src/routes/sections.js';
import roomsRouter from './src/routes/rooms.js';
import subjectsRouter from './src/routes/subjects.js';
import schedulesRouter from './src/routes/schedules.js';
import statisticsRouter from './src/routes/statistics.js';
import keyRouter from './src/routes/key.js';
import borrowReasonRouter from './src/routes/borrowReason.js';
import transactionsRouter from './src/routes/transactions.js';

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
app.use("/api/rooms", roomsRouter);
app.use("/api/subjects", subjectsRouter);
app.use("/api/schedules", schedulesRouter);
app.use("/api/statistics", statisticsRouter);
app.use("/api/keys", keyRouter);
app.use("/api/borrow-reasons", borrowReasonRouter);
app.use("/api/transactions", transactionsRouter);

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