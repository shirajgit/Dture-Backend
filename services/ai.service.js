import axios from "axios";
import dotenv from "dotenv";
import { AUTO_DEBATE_CONFIG, pick } from "../config/autoDebate.config.js";

dotenv.config();

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "openai/gpt-4o-mini";

// Single low-level call to OpenRouter. Set json:true to force a JSON object reply.
async function chat(messages, { json = false } = {}) {
  const { data } = await axios.post(
    OPENROUTER_URL,
    {
      model: MODEL,
      messages,
      ...(json ? { response_format: { type: "json_object" } } : {}),
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:5173",
        "X-Title": "Debate App",
      },
    }
  );

  return data.choices[0].message.content;
}

// Parse a JSON reply defensively (handles ```json fences and stray text).
function parseJson(raw) {
  const cleaned = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON object in AI reply");
  return JSON.parse(cleaned.slice(start, end + 1));
}

/**
 * Generate a fresh, engaging debate topic.
 * @returns {Promise<{ name: string, description: string, category: string }>}
 */
export async function generateDebateTopic() {
  const category = pick(AUTO_DEBATE_CONFIG.categories);

  const raw = await chat(
    [
      {
        role: "system",
        content:
          "You create short, catchy, controversial debate topics for a social debate app. Topics must be balanced (a reasonable person could argue either side).",
      },
      {
        role: "user",
        content: `Create ONE debate about "${category}".
Return ONLY JSON:
{
  "name": "a punchy debate title, max 12 words, no quotes",
  "description": "1-2 sentences framing both sides neutrally, max 40 words"
}`,
      },
    ],
    { json: true }
  );

  const { name, description } = parseJson(raw);
  return { name: name.trim(), description: description.trim(), category };
}

/**
 * Generate fake community comments for one side of a debate.
 * @returns {Promise<Array<{ user: string, commets: string }>>}  // note: model field is "commets"
 */
export async function generateComments({ name, description, stance, count }) {
  const raw = await chat(
    [
      {
        role: "system",
        content:
          "You write short, casual, realistic social-app comments with human-like usernames.",
      },
      {
        role: "user",
        content: `Debate: "${name}"
Context: ${description}
Write ${count} comments from people who ${stance.toUpperCase()} with this debate.
Each username is one lowercase word/handle (no spaces, no @). Comments are 1 sentence, casual, may use emojis.
Return ONLY JSON:
{ "comments": [ { "user": "handle", "text": "the comment" } ] }`,
      },
    ],
    { json: true }
  );

  const { comments } = parseJson(raw);
  // Map to the model's field shape (the schema uses "commets").
  return (comments || [])
    .filter((c) => c && c.user && c.text)
    .map((c) => ({ user: String(c.user).trim(), commets: String(c.text).trim() }));
}

/**
 * Summarize an ended debate for display (used by the /ai-result route).
 */
export async function summarizeDebate(debate) {
  return chat([
    {
      role: "system",
      content: "You are an AI judge that decides debate winners.",
    },
    {
      role: "user",
      content: `You are an AI analyst summarizing the final result of an ended debate for a mobile app audience.

- Write a clean, friendly AI Generated Summary
- Mention total participants
- Explain what AGREE supporters think
- Explain what DISAGREE critics think
- Give a neutral world perspective
- End with "World's Verdict" based on the vote ratio

Rules: use emojis, keep it readable like a social media post, no markdown headings, no numbers in brackets, sound confident and neutral.

Debate Data:
Title: ${debate.name}
Agree Votes: ${debate.agree}
Disagree Votes: ${debate.disagree}
Created By: ${debate.user}`,
    },
  ]);
}
