import prisma from "../lib/prisma.js";

export const getLogs = async (req, res) => {
  try {
    const logs = await prisma.actionLog.findMany({
      include: {
        user: {
          include: {
            role: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    const safeLogs = logs.map((log) => ({
      id: log.id,
      userId: log.userId,
      groupId: log.groupId,
      actionInformation: log.actionInformation,
      createdAt: log.createdAt,
      user: log.user
        ? {
            id: log.user.id,
            name: log.user.name,
            email: log.user.email,
            role: log.user.role
              ? {
                  id: log.user.role.id,
                  name: log.user.role.name
                }
              : null
          }
        : null
    }));

    res.json(safeLogs);
  } catch (error) {
    res.status(500).json({
      error: "Could not load logs"
    });
  }
};

export const getObservationList = async (req, res) => {
  try {
    const observationList = await prisma.observationUser.findMany({
      include: {
        user: {
          include: {
            role: true
          }
        }
      },
      orderBy: {
        lastIncidentAt: "desc"
      }
    });

    const safeObservationList = observationList.map((entry) => ({
      id: entry.id,
      userId: entry.userId,
      reason: entry.reason,
      incidentCount: entry.incidentCount,
      lastIncidentAt: entry.lastIncidentAt,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
      user: entry.user
        ? {
            id: entry.user.id,
            name: entry.user.name,
            email: entry.user.email,
            role: entry.user.role
              ? {
                  id: entry.user.role.id,
                  name: entry.user.role.name
                }
              : null
          }
        : null
    }));

    res.json(safeObservationList);
  } catch (error) {
    res.status(500).json({
      error: "Could not load observation list"
    });
  }
};