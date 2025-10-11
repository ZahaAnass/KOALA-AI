import express from "express";
import { uploadAuth } from "../controllers/uploadController.js";

const router: express.Router = express.Router();

router.get("/", uploadAuth as express.RequestHandler);

export default router;
