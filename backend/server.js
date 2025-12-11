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
// initialize express app and prisma client
const app = express();

const prisma = new PrismaClient();
const port = process.env.PORT || 3000;
app.use(cors());
app.use(express.json());
dotenv.config();

app.use("/api/auth", authRouter);
app.use("/api/users", usersRouter);

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