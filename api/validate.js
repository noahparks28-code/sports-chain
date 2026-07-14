const Anthropic = require("@anthropic-ai/sdk");

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { prevEntry, currentEntry } = req.body;

  let prompt = "";

  if (!prevEntry) {
    prompt = `Is "${currentEntry.value}" a real NBA or NFL team (current or historical, back to 1960)? Accept nicknames without city names (e.g. "Knicks", "Lakers", "Chiefs"). Respond ONLY with JSON: {"valid": true/false, "reason": "one short sentence"}`;
  } else if (prevEntry.type === "team" && currentEntry.type === "player") {
    prompt = `Did the NBA or NFL player "${currentEntry.value}" ever play for the "${prevEntry.value}" at any point in their career (1960–present)? Accept team nicknames. Respond ONLY with JSON: {"valid": true/false, "reason": "one short sentence"}`;
  } else if (prevEntry.type === "player" && currentEntry.type === "team") {
    prompt = `Did the NBA or NFL player "${prevEntry.value}" ever play for the "${currentEntry.value}" at any point in their career (1960–present)? Accept team nicknames. Respond ONLY with JSON: {"valid": true/false, "reason": "one short sentence"}`;
  } else if (prevEntry.type === "player" && currentEntry.type === "number") {
    prompt = `Did the NBA or NFL player "${prevEntry.value}" ever wear jersey number ${currentEntry.value} at any point in their career (1960–present)? Respond ONLY with JSON: {"valid": true/false, "reason": "one short sentence"}`;
  } else if (prevEntry.type === "player" && currentEntry.type === "college") {
    prompt = `Did the NBA or NFL player "${prevEntry.value}" attend "${currentEntry.value}" for college? Accept common name variations. Respond ONLY with JSON: {"valid": true/false, "reason": "one short sentence"}`;
  } else if (prevEntry.type === "number" && currentEntry.type === "player") {
    prompt = `Did the NBA or NFL player "${currentEntry.value}" ever wear jersey number ${prevEntry.value} at any point in their career (1960–present)? Respond ONLY with JSON: {"valid": true/false, "reason": "one short sentence"}`;
  } else if (prevEntry.type === "college" && currentEntry.type === "player") {
    prompt = `Did the NBA or NFL player "${currentEntry.value}" attend "${prevEntry.value}" for college? Accept common name variations. Respond ONLY with JSON: {"valid": true/false, "reason": "one short sentence"}`;
  } else {
    return res.status(400).json({ valid: false, reason: "Invalid connection type." });
  }

  try {
    const message = await client.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 100,
      messages: [{ role: "user", content: prompt }],
    });

    const text = (message.content[0]?.text || "").replace(/```json|```/g, "").trim();
    const result = JSON.parse(text);
    return res.status(200).json(result);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ valid: false, reason: "Validation error. Try again." });
  }
};
