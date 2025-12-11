import  express  from "express";
import { getAllUsers, getUserById, createUser, updateUser, deleteUser, updatePassword } from "../controllers/users.js";
const router = express.Router();

router.get("/", getAllUsers);
router.get("/:id", getUserById);
router.post("/", createUser);
router.post("/reset-password", updatePassword);
router.put("/:id", updateUser);
router.delete("/:id", deleteUser);

export default router;

