import express from "express";
import { createChat, getChatById, updateChat } from "../controllers/chatController.js";

const router = express.Router();

router.post("/", createChat);
router.get("/:id", getChatById);
router.put("/:id", updateChat);

export default router;
