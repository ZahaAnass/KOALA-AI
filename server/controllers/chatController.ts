import Chat from "../models/Chat.js";
import UserChats from "../models/UserChats.js";
import getAuth from "../utils/getAuth.js";
import { Request, Response } from "express";

export const createChat = async (req: Request, res: Response) => {
    const userId = await getAuth(req);
    if (!userId) return res.status(401).json({ error: "Unauthenticated" });

    const { text } = req.body;
    if (!text) return res.status(400).json({ message: "Text is required" });

    try {
    const newChat = new Chat({
        userId,
        history: [{ role: "user", parts: [{ text }] }],
    });
    const savedChat = await newChat.save();

    const userChats = await UserChats.findOne({ userId });

    if (!userChats) {
        const newUserChats = new UserChats({
            userId,
            chats: [{ _id: savedChat._id, title: text.substring(0, 40) }],
        });
        await newUserChats.save();
    } else {
        await UserChats.updateOne(
            { userId },
            {
                $push: {
                    chats: { _id: savedChat._id, title: text.substring(0, 40) },
                },
            }
        );
    }

    res.status(201).json({ chatId: savedChat._id });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error creating chat" });
    }
};

export const getChatById = async (req: Request, res: Response) => {
    const userId = await getAuth(req);
    const { id } = req.params;

    if (!userId) return res.status(401).json({ error: "Unauthenticated" });
    if (!id) return res.status(400).json({ error: "Chat ID required" });

    try {
        const chat = await Chat.findOne({ _id: id, userId });
        if (!chat) return res.status(404).json({ error: "Chat not found" });
        res.status(200).json(chat);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error fetching chat" });
    }
};

export const updateChat = async (req: Request, res: Response) => {
    const userId = await getAuth(req);
    const { id } = req.params;
    const { question, answer, img } = req.body;

    if (!userId) return res.status(401).json({ error: "Unauthenticated" });

    const newItems = [
        ...(question
            ? [{ role: "user", parts: [{ text: question }], ...(img && { img }) }]
            : []),
        { role: "model", parts: [{ text: answer }] },
    ];

    try {
        const updated = await Chat.updateOne(
            { _id: id, userId },
            { $push: { history: { $each: newItems } } }
        );
        res.status(200).json(updated);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error updating chat" });
    }
};
