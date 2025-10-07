import express from "express";
import { getUserChats } from "../controllers/userChatsController.js";

const router = express.Router();

router.get("/", getUserChats);

export default router;
