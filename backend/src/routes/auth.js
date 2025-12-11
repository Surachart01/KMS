import express from "express";
import { login, sendResetPasswordEmail, decodeToken, verifyOTP } from "../controllers/auth.js";
const router = express.Router();

router.get("/decode-token", decodeToken);
router.post("/login", login);
router.post("/reset-password", sendResetPasswordEmail);
router.post("/verify-otp", verifyOTP);

export default router

