const securityEvents = [];
const MAX_EVENTS = 1000;

export function recordSecurityEvent(event) {
  securityEvents.push({
    timestamp: Date.now(),
    ...event
  });

  if (securityEvents.length > MAX_EVENTS) {
    securityEvents.shift();
  }
}

export function getSecurityEvents() {
  return securityEvents;
}

export function analyzeSecurityEvents() {
  const now = Date.now();
  const lastFiveMinutes = securityEvents.filter(
    (event) => now - event.timestamp <= 5 * 60 * 1000
  );

  const failedAuthEvents = lastFiveMinutes.filter(
    (event) =>
      event.path.includes("/auth/login") &&
      event.statusCode >= 400
  );

  const failedOtpEvents = lastFiveMinutes.filter(
    (event) =>
      event.path.includes("/auth/login/verify-otp") &&
      event.statusCode >= 400
  );

  const forbiddenEvents = lastFiveMinutes.filter(
    (event) => event.statusCode === 403
  );

  const heavyEndpointEvents = lastFiveMinutes.filter(
    (event) => event.path.includes("/performance/actors-naive")
  );

  const rapidRequestIps = {};

  for (const event of lastFiveMinutes) {
    const ip = event.ip || "unknown";
    rapidRequestIps[ip] = (rapidRequestIps[ip] || 0) + 1;
  }

  const maxRequestsFromOneIp = Math.max(
    0,
    ...Object.values(rapidRequestIps)
  );

  let score = 0;
  const reasons = [];

  if (failedAuthEvents.length >= 5) {
    score += 30;
    reasons.push("Multiple failed login attempts detected.");
  }

  if (failedOtpEvents.length >= 3) {
    score += 25;
    reasons.push("Multiple invalid OTP attempts detected.");
  }

  if (forbiddenEvents.length >= 5) {
    score += 20;
    reasons.push("Multiple forbidden authorization attempts detected.");
  }

  if (heavyEndpointEvents.length >= 10) {
    score += 30;
    reasons.push("Heavy endpoint accessed repeatedly.");
  }

  if (maxRequestsFromOneIp >= 30) {
    score += 25;
    reasons.push("High request frequency from the same IP.");
  }

  let riskLevel = "LOW";

  if (score >= 60) {
    riskLevel = "HIGH";
  } else if (score >= 30) {
    riskLevel = "MEDIUM";
  }

  return {
    riskLevel,
    score,
    analyzedEvents: lastFiveMinutes.length,
    failedAuthAttempts: failedAuthEvents.length,
    failedOtpAttempts: failedOtpEvents.length,
    forbiddenAttempts: forbiddenEvents.length,
    heavyEndpointHits: heavyEndpointEvents.length,
    maxRequestsFromOneIp,
    reasons,
    recommendation:
      riskLevel === "HIGH"
        ? "Temporarily block the suspicious client, require OTP, and inspect logs."
        : riskLevel === "MEDIUM"
          ? "Monitor the client and increase authentication checks."
          : "No immediate action required."
  };
}