import mongoose from "mongoose";

const chatMessageSchema = new mongoose.Schema(
  {
    senderEmail: {
      type: String,
      required: true
    },
    senderName: {
      type: String,
      required: true
    },
    text: {
      type: String,
      required: true,
      trim: true
    }
  },
  {
    timestamps: true
  }
);

const ChatMessage = mongoose.model("ChatMessage", chatMessageSchema);

export default ChatMessage;