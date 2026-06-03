import express from "express";
import { authenticateToken } from "../middleware/auth.middleware.js";
import {
  analyzeSecurityEvents,
  getSecurityEvents
} from "../utils/securityMonitor.js";

const router = express.Router();

async function askLocalLlm(rulesAnalysis, recentEvents) {
  const prompt = `
You are a cybersecurity assistant running locally.
Analyze the following suspicious user behaviour data from a web application.

Rules-based analysis:
${JSON.stringify(rulesAnalysis, null, 2)}

Recent security events:
${JSON.stringify(recentEvents.slice(-20), null, 2)}

Return a short security analysis with:
- risk level
- explanation
- recommended defensive action
`;

  const response = await fetch("http://localhost:11434/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "llama3.2",
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      stream: false
    })
  });

  if (!response.ok) {
    throw new Error("Local LLM request failed");
  }

  const result = await response.json();

  return result.message?.content || "No AI analysis returned.";
}

router.get("/analyze", authenticateToken, (req, res) => {
  const analysis = analyzeSecurityEvents();

  res.json({
    message: "Security behaviour analysis completed",
    analysis
  });
});

router.get("/analyze-ai", authenticateToken, async (req, res) => {
  const rulesAnalysis = analyzeSecurityEvents();
  const recentEvents = getSecurityEvents().slice(-50);

  try {
    const aiAnalysis = await askLocalLlm(rulesAnalysis, recentEvents);

    res.json({
      message: "Local LLM security analysis completed",
      source: "ollama-local-llm",
      model: "llama3.2",
      rulesAnalysis,
      aiAnalysis
    });
  } catch (error) {
    res.status(200).json({
      message: "Local LLM unavailable. Returned rules-based fallback analysis.",
      source: "rules-fallback",
      model: null,
      rulesAnalysis,
      aiAnalysis:
        "The local LLM could not be reached. The rules-based detector should be used for the security decision."
    });
  }
});

router.get("/events", authenticateToken, (req, res) => {
  res.json({
    count: getSecurityEvents().length,
    events: getSecurityEvents().slice(-50)
  });
});

export default router;