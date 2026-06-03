import prisma from "../lib/prisma.js";

export async function logAction({ userId, groupId, actionInformation }) {
  try {
    await prisma.actionLog.create({
      data: {
        userId,
        groupId,
        actionInformation
      }
    });
  } catch (error) {
    console.error("Failed to log action:", error.message);
  }
}