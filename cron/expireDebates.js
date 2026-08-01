import cron from "node-cron";
import Debate from "../models/debate.model.js";
import { AUTO_DEBATE_CONFIG } from "../config/autoDebate.config.js";

const DAY_MS = 24 * 60 * 60 * 1000;

// Every 10 minutes:
//  1. Mark debates whose duration elapsed as `ended` (they stay visible).
//  2. Permanently delete debates that ended more than `removeAfterEndDays` ago.
cron.schedule("*/10 * * * *", async () => {
  try {
    const now = new Date();

    const justEnded = await Debate.updateMany(
      { expiresAt: { $lte: now }, ended: { $ne: true } },
      { $set: { ended: true, endedAt: now } }
    );

    const cutoff = new Date(now.getTime() - AUTO_DEBATE_CONFIG.removeAfterEndDays * DAY_MS);
    const removed = await Debate.deleteMany({
      ended: true,
      endedAt: { $lte: cutoff },
    });

    if (justEnded.modifiedCount) console.log(`⏹️  Ended ${justEnded.modifiedCount} debates`);
    if (removed.deletedCount) console.log(`🗑️  Deleted ${removed.deletedCount} old debates`);
  } catch (err) {
    console.error("❌ Expire cron error:", err.message);
  }
});
