import express from "express";
import { uploadAuth } from "../controllers/uploadController.js";

const router = express.Router();

router.get("/", uploadAuth);

export default router;
