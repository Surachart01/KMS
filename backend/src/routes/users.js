import express from "express";
import { getAllUsers, getUserById, createUser, updateUser, deleteUser, updatePassword, batchImportUsers } from "../controllers/users.js";
const router = express.Router();

router.get("/", getAllUsers);
router.post("/batch-import", batchImportUsers); // Place before dynamic routes or root post if needed specific filtering, though POST /users vs POST /users/batch-import is fine
router.get("/:id", getUserById);
router.post("/", createUser);
router.post("/reset-password", updatePassword);
router.put("/:id", updateUser);
router.delete("/:id", deleteUser);

export default router;
