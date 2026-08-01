// Central configuration for the automatic debate system.
// Change values here — the cron jobs and AI service read from this file only.

export const AUTO_DEBATE_CONFIG = {
  // Each duration is auto-generated `count` times, once every `everyDays`.
  durations: [
    { label: "1 Day", days: 1, count: 2, everyDays: 1 },
    { label: "3 Days", days: 3, count: 2, everyDays: 3 },
    { label: "7 Days", days: 7, count: 2, everyDays: 7 },
  ],

  // Ended debates stay visible this many days, then get permanently deleted.
  removeAfterEndDays: 8,

  // Fake-engagement rules: only kicks in once a debate has more real votes than
  // `voteThreshold`, and each debate is boosted only once (tracked by botEngaged).
  engagement: {
    voteThreshold: 1, // strictly greater than this (so > 1)
    votesPerSide: { min: 2, max: 9 }, // random extra votes added to each side
    commentsPerSide: { min: 1, max: 3 }, // random AI comments added to each side
  },

  // Topic variety — the AI picks a fresh angle inside one of these categories.
  categories: [
    "technology", "society", "politics", "science", "sports",
    "entertainment", "health", "education", "environment", "economy",
    "ethics", "lifestyle", "food", "travel", "gaming",
  ],
};

// Small helper: inclusive random integer in [min, max].
export const randInt = (min, max) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

// Small helper: pick a random element from an array.
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
