import prisma from "../lib/prisma.js";
import { markSuspiciousUser } from "./markSuspiciousUser.js";

export async function checkDeleteAbuse(userId) {
  try {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

    const recentDeletes = await prisma.actionLog.count({
      where: {
        userId,
        actionInformation: {
          startsWith: "DELETE_MOVIE:"
        },
        createdAt: {
          gte: tenMinutesAgo
        }
      }
    });

    if (recentDeletes >= 3) {
      await markSuspiciousUser({
        userId,
        reason: "Too many delete actions in a short time"
      });
    }
  } catch (error) {
    console.error("Failed to check delete abuse:", error.message);
  }
}