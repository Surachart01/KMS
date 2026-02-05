import express from "express";
import * as hardwareController from "../controllers/hardwareController.js";
import { hardwareMiddleware } from "../middleware/middleware.js";

const router = express.Router();

router.get("/keys", hardwareMiddleware, hardwareController.getAllKey);
router.post("/verify", hardwareMiddleware, hardwareController.verifyUsers);

export default router;