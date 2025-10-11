import app from "./app.js";
import connectDB from "./db/connect.js";
import dotenv from "dotenv";

dotenv.config();

const port: number | string = process.env.PORT || 3000;

app.listen(port, async () => {
    await connectDB(process.env.MONGO_URI as string);
    console.log("Connected to MongoDB");
    console.log(`Server is running on port ${port}`);
});
