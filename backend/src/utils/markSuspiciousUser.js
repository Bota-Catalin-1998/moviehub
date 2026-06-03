import prisma from "../lib/prisma.js";

export async function markSuspiciousUser({ userId, reason }) {
  try {
    const existingEntry = await prisma.observationUser.findUnique({
      where: { userId }
    });

    if (existingEntry) {
      await prisma.observationUser.update({
        where: { userId },
        data: {
          incidentCount: {
            increment: 1
          },
          reason,
          lastIncidentAt: new Date()
        }
      });
    } else {
      await prisma.observationUser.create({
        data: {
          userId,
          reason,
          incidentCount: 1,
          lastIncidentAt: new Date()
        }
      });
    }
  } catch (error) {
    console.error("Failed to mark suspicious user:", error.message);
  }
}