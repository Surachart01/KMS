import express from "express";
import { getAllUsers, getUserById, createUser, updateUser, deleteUser, updatePassword, batchImportUsers, getTeachers } from "../controllers/users.js";
import { requireStaff, authenticate } from "../middleware/middleware.js";

const router = express.Router();

// Public or Semi-protected (depending on policy, but usually users list is needed for search)
// Let's protect them with authenticate at least?
// For now, let's keep GET public or as is if frontend relies on it without token?
// Frontend sends token? Yes, `api.js` usually sends token.
// Let's protect everything first, or at least modification routes.

router.get("/", authenticate, getAllUsers);
router.get("/teachers", authenticate, getTeachers);
router.post("/batch-import", requireStaff, batchImportUsers);
router.get("/:id", authenticate, getUserById);

// Staff Only
router.post("/", requireStaff, createUser);
router.put("/:id", requireStaff, updateUser);
router.delete("/:id", requireStaff, deleteUser);

// Public (Password Reset)
router.post("/reset-password", updatePassword);

export default router;
