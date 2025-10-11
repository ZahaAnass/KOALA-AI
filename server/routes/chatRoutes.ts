import express from "express";
import { createChat, getChatById, updateChat } from "../controllers/chatController.js";

const router: express.Router = express.Router();

router.post("/", createChat as express.RequestHandler);
router.get("/:id", getChatById as express.RequestHandler);
router.put("/:id", updateChat as express.RequestHandler);

export default router;
