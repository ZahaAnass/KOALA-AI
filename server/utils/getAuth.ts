import { Request } from "express";

const getAuth = async (req: Request) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) return null;

    const token = authHeader.substring(7);
    try {
        const decoded = JSON.parse(
            Buffer.from(token.split(".")[1], "base64").toString()
        );
        const userId = decoded.sub

        if (!userId) {
            return null
        }

        return userId

    } catch (err: any) {
        console.error("JWT decoding failed:", err.message);
        return null;
    }
};

export default getAuth;
