import mongoose from "mongoose";

const UserChatsSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true
    },
    chats: [
        {
            _id: {
                type: String,
                required: true
            },
            title: {
                type: String,
                required: true
            },
            createAt: {
                type: Date,
                default: Date.now()
            }
        }
    ]
}, {timestamps: true})

export default mongoose.models.UserChats || mongoose.model("UserChats", UserChatsSchema);