import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import chatRoutes from "./routes/chatRoutes.js";
import userChatsRoutes from "./routes/userChatsRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import notFound from "./middleware/not-found.js";

dotenv.config();

const app: express.Application = express();

app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json());

app.get("/", (_: express.Request, res: express.Response) => res.send("Backend is running 🚀"));

app.use("/api/chats", chatRoutes);
app.use("/api/userchats", userChatsRoutes);
app.use("/api/upload", uploadRoutes);

app.use(notFound);

export default app;
