import express from "express";
import mongoose from "mongoose";
import Debate from "../models/debate.model.js";
import { summarizeDebate, generateEngagement } from "../services/ai.service.js";

const router = express.Router();

// Below this many total votes a debate looks dead, so we top it up with
// AI votes + AI comments before summarizing (mirrors the auto-engage cron).
const MIN_ENGAGEMENT = 5;

router.post("/ai-result", async (req, res) => {
  try {
    const { debate } = req.body;

    if (!debate) {
      return res.status(400).json({ message: "No debate provided" });
    }

    // Load a fresh DB copy when we can identify it, so any boost persists.
    let doc = null;
    if (debate._id && mongoose.isValidObjectId(debate._id)) {
      doc = await Debate.findById(debate._id);
    }
    if (!doc && debate.id != null) {
      doc = await Debate.findOne({ id: Number(debate.id) });
    }

    // The object we actually summarize and return to the client.
    let view = doc ? doc.toObject() : { ...debate };
    view.agreeCom = view.agreeCom || debate.agreeCom || [];
    view.disagreeCom = view.disagreeCom || debate.disagreeCom || [];

    const total = (view.agree || 0) + (view.disagree || 0);

    // Boost a sparse debate once: add AI votes + AI comments to both sides.
    if (total < MIN_ENGAGEMENT && !(doc && doc.botEngaged)) {
      const { extraAgree, extraDisagree, agreeComments, disagreeComments } =
        await generateEngagement({
          name: view.name,
          description: view.description || view.name,
        });

      if (doc) {
        doc.agree += extraAgree;
        doc.disagree += extraDisagree;
        doc.agreeCom.push(...agreeComments);
        doc.disagreeCom.push(...disagreeComments);
        doc.botEngaged = true;
        await doc.save();
        view = doc.toObject();
      } else {
        // Can't identify the debate in the DB — boost the response only.
        view.agree = (view.agree || 0) + extraAgree;
        view.disagree = (view.disagree || 0) + extraDisagree;
        view.agreeCom = [...view.agreeCom, ...agreeComments];
        view.disagreeCom = [...view.disagreeCom, ...disagreeComments];
      }
    }

    const result = await summarizeDebate(view);
    return res.json({ result, debate: view });
  } catch (error) {
    console.error("OPENROUTER ERROR ❌:", error.response?.data || error.message);
    return res.status(500).json({ message: "AI generation failed" });
  }
});

export default router;
