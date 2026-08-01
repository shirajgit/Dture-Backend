import cron from "node-cron";
import Debate from "../models/debate.model.js";
import { generateComments } from "../services/ai.service.js";
import { AUTO_DEBATE_CONFIG, randInt } from "../config/autoDebate.config.js";

const { voteThreshold, votesPerSide, commentsPerSide } =
  AUTO_DEBATE_CONFIG.engagement;

async function engage(debate) {
  const agreeCount = randInt(commentsPerSide.min, commentsPerSide.max);
  const disagreeCount = randInt(commentsPerSide.min, commentsPerSide.max);

  // AI comments for both sides (best-effort; a failure just skips that side).
  const [agreeComments, disagreeComments] = await Promise.all([
    generateComments({
      name: debate.name,
      description: debate.description,
      stance: "agree",
      count: agreeCount,
    }).catch(() => []),
    generateComments({
      name: debate.name,
      description: debate.description,
      stance: "disagree",
      count: disagreeCount,
    }).catch(() => []),
  ]);

  const extraAgree = randInt(votesPerSide.min, votesPerSide.max);
  const extraDisagree = randInt(votesPerSide.min, votesPerSide.max);

  debate.agree += extraAgree;
  debate.disagree += extraDisagree;
  debate.agreeCom.push(...agreeComments);
  debate.disagreeCom.push(...disagreeComments);
  debate.botEngaged = true;

  await debate.save();

  console.log(
    `🔥 Boosted "${debate.name}": +${extraAgree}/${extraDisagree} votes, ` +
      `${agreeComments.length}/${disagreeComments.length} comments`
  );
}

async function runEngagement() {
  // Active debates that crossed the real-vote threshold and were never boosted.
  const debates = await Debate.find({
    ended: { $ne: true },
    botEngaged: { $ne: true },
    $expr: { $gt: [{ $add: ["$agree", "$disagree"] }, voteThreshold] },
  });

  for (const debate of debates) {
    try {
      await engage(debate);
    } catch (err) {
      console.error(`❌ Engage failed for "${debate.name}":`, err.message);
    }
  }
}

// Check every 10 minutes.
cron.schedule("*/10 * * * *", () =>
  runEngagement().catch((e) => console.error("Engage cron error:", e.message))
);
