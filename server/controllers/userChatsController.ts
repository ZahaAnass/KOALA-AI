import UserChats from "../models/UserChats.js";
import getAuth from "../utils/getAuth.js";
import { Request, Response } from "express";

export const getUserChats = async (req: Request, res: Response): Promise<Response | void> => {
    const userId: string | null = await getAuth(req);
    if (!userId) return res.status(401).json({ error: "Unauthenticated" });

    try {
        const userChats = await UserChats.findOne({ userId });
        res.status(200).json(userChats ? userChats.chats : []);
    } catch (err: Error | any) {
        console.error(err);
        res.status(500).json({ error: "Error fetching user chats" });
    }
};
