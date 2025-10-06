import express from "express"
import ImageKit from "imagekit"
import dotenv from "dotenv"
import cors from "cors"
import mongoose from "mongoose"
import Chat from "./models/Chat.js"
import UserChats from "./models/UserChats.js"
import { clerkClient } from "@clerk/express"

dotenv.config()

const port = process.env.PORT || 3000;
const app = express();
app.use(
    cors(
        {
            origin: process.env.CLIENT_URL,
            credentials: true
        }
    )
)

app.use(express.json())

app.use((req, res, next) => {
    if (req.statusCode === 404) {
        res.status(404).json({ error: "Not Found" })
    } else {
        next()
    }
})

const connect = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to MongoDB");
    } catch (err) {
        console.log(err)
    }
}

const imagekit = new ImageKit({
    urlEndpoint: process.env.IMAGE_KIT_END_POINT,
    publicKey: process.env.IMAGE_KIT_PUBLIC_KEY,
    privateKey: process.env.IMAGE_KIT_PRIVATE_KEY
});

app.get("/", (req, res) => {
    console.log("Backend is running 🚀")
    res.send("Backend is running 🚀");
});

const getAuth = async (req) => {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null
    }

    const token = authHeader.substring(7)

    try {
        const decoded = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString())
        const userId = decoded.sub

        if (!userId) {
            return null
        }

        console.log('✅ Authenticated user:', userId)
        return userId
    } catch (error) {
        console.error('❌ JWT decoding failed:', error.message)
        return null
    }
}

app.get("/api/upload", (req, res) => {
    const result = imagekit.getAuthenticationParameters();
    res.send(result);
});

app.get("/api/test", async (req, res) => {
    try {
        const userId = await getAuth(req)

        if (!userId) {
            res.status(401).json({ error: 'Unauthenticated' })
            return
        }

        const user = await clerkClient.users.getUser(userId)

        res.json({ userId: user.id })
    } catch (error) {
        console.error('❌ Error in /api/test endpoint:', error)
        res.status(500).json({ error: 'Internal server error', details: error.message })
    }
})

app.post("/api/chats", async (req, res) => {
    const userId = await getAuth(req)

    if (!userId) {
        return res.status(401).json({ error: 'Unauthenticated' })
    }

    const { text } = req.body;
    if (!text) {
        return res.status(400).json({ message: "Text is required" });
    }

    try {
        // CREATE A NEW CHAT
        const newChat = new Chat({
            userId: userId,
            history: [{ role: "user", parts: [{ text }] }],
        });
        const savedChat = await newChat.save();

        // CHECK IF THE USERCHATS EXISTS
        const userChats = await UserChats.find({ userId: userId });

        // IF DOESN'T EXIST CREATE A NEW ONE
        if (!userChats.length) {
            const newUserChats = new UserChats({
                userId: userId,
                chats: [
                    {
                        _id: savedChat._id,
                        title: text.substring(0, 40),
                    },
                ],
            });
            await newUserChats.save();
        } else {
            // IF EXISTS, PUSH THE CHAT
            await UserChats.updateOne(
                { userId: userId },
                {
                    $push: {
                        chats: {
                            _id: savedChat._id,
                            title: text.substring(0, 40),
                        },
                    },
                }
            );
        }

        res.status(201).json({ chatId: savedChat._id });

    } catch (err) {
        console.log(err);
        res.status(500).json({ error: "Error Creating Chat" });
    }
});

app.get("/api/userchats", async (req, res) => {
    const userId = await getAuth(req)

    if (!userId) {
        return res.status(401).json({ error: 'Unauthenticated' })
    }

    try {
        const userChats = await UserChats.find({ userId: userId });
        res.status(200).json(userChats[0].chats)
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: "Error Fetching User Chats" });
    }
})

app.listen(port, () => {
    connect();
    console.log("Server is running on port", port)
})