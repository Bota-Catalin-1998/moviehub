import ChatMessage from "../models/chatMessage.model.js";
import prisma from "../lib/prisma.js";
import { getWss } from "../ws.js";
import { logAction } from "../utils/logAction.js";

export const getMessages = async (req, res) => {
  try {
    const messages = await ChatMessage.find().sort({ createdAt: 1 }).limit(100);
    res.json(messages);
  } catch (error) {
    console.error("GET /chat error:", error);
    res.status(500).json({
      error: "Could not load chat messages"
    });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { senderEmail, senderName, text } = req.body;

    if (!senderEmail || !senderName || !text?.trim()) {
      return res.status(400).json({
        error: "senderEmail, senderName and text are required"
      });
    }

    const newMessage = await ChatMessage.create({
      senderEmail,
      senderName,
      text: text.trim()
    });

    const user = await prisma.user.findUnique({
      where: { email: senderEmail },
      include: { role: true }
    });

    if (user) {
      await logAction({
        userId: user.id,
        groupId: user.role.name,
        actionInformation: `SEND_CHAT_MESSAGE:${text.trim()}`
      });
    }

    const wss = getWss();

    if (wss) {
      const payload = JSON.stringify({
        type: "NEW_CHAT_MESSAGE",
        message: newMessage
      });

      wss.clients.forEach((client) => {
        if (client.readyState === 1) {
          client.send(payload);
        }
      });
    }

    res.status(201).json(newMessage);
  } catch (error) {
    console.error("POST /chat error:", error);
    res.status(500).json({
      error: "Could not send message"
    });
  }
};