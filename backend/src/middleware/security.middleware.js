import { recordSecurityEvent } from "../utils/securityMonitor.js";

export function securityMonitorMiddleware(req, res, next) {
  const startTime = Date.now();

  res.on("finish", () => {
    const durationMs = Date.now() - startTime;

    const pathToCheck = req.originalUrl || req.url || "";

    const shouldTrack =
      pathToCheck.startsWith("/auth") ||
      pathToCheck.startsWith("/movies") ||
      pathToCheck.startsWith("/performance") ||
      pathToCheck.startsWith("/security");

    if (!shouldTrack) {
      return;
    }

    const event = {
      method: req.method,
      path: pathToCheck,
      statusCode: res.statusCode,
      durationMs,
      ip: req.ip || req.socket?.remoteAddress || "unknown",
      userId: req.user?.userId || null,
      role: req.user?.role || null,
      email: req.body?.email || null
    };

    console.log("SECURITY EVENT:", event);

    recordSecurityEvent(event);
  });

  next();
}