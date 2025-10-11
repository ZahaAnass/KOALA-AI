import express from "express";
import { getUserChats } from "../controllers/userChatsController.js";

const router: express.Router = express.Router();

router.get("/", getUserChats as express.RequestHandler);

export default router;
