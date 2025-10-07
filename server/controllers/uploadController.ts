import ImageKit from "imagekit";
import { Request, Response } from "express";
import dotenv from "dotenv";

dotenv.config();

const imagekit = new ImageKit({
    urlEndpoint: process.env.IMAGE_KIT_END_POINT as string,
    publicKey: process.env.IMAGE_KIT_PUBLIC_KEY as string,
    privateKey: process.env.IMAGE_KIT_PRIVATE_KEY as string,
});

export const uploadAuth = (req: Request, res: Response) => {
    const result = imagekit.getAuthenticationParameters();
    res.send(result);
};