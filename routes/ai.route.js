import express from "express";
import { summarizeDebate } from "../services/ai.service.js";

const router = express.Router();

router.post("/ai-result", async (req, res) => {
  try {
    const { debate } = req.body;

    if (!debate) {
      return res.status(400).json({ message: "No debate provided" });
    }

    const result = await summarizeDebate(debate);
    return res.json({ result });
  } catch (error) {
    console.error("OPENROUTER ERROR ❌:", error.response?.data || error.message);
    return res.status(500).json({ message: "AI generation failed" });
  }
});

export default router;
