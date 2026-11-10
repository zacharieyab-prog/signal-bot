import express from "express";
import multer from "multer";
import OpenAI from "openai";

const app = express();
const port = Number(process.env.PORT || 3000);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/png", "image/jpeg", "image/webp"];
    cb(allowed.includes(file.mimetype) ? null : new Error("Upload a PNG, JPG or WEBP chart screenshot."), allowed.includes(file.mimetype));
  }
});

app.disable("x-powered-by");
app.use(express.static("public", { extensions: ["html"] }));

const schema = {
  type: "object",
  additionalProperties: false,
  properties: {
    action: { type: "string", enum: ["HIGHER", "LOWER", "WAIT"] },
    confidence: { type: "integer", minimum: 0, maximum: 100 },
    market: { type: "string" },
    chart_timeframe: { type: "string" },
    suggested_expiry_minutes: { type: "integer", minimum: 1, maximum: 5 },
    entry_condition: { type: "string" },
    evidence: { type: "array", items: { type: "string" } },
    risks: { type: "array", items: { type: "string" } },
    invalidation: { type: "string" },
    explanation: { type: "string" }
  },
  required: ["action", "confidence", "market", "chart_timeframe", "suggested_expiry_minutes", "entry_condition", "evidence", "risks", "invalidation", "explanation"]
};

app.post("/api/analyze", upload.single("chart"), async (req, res) => {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(503).json({ error: "The server owner must add OPENAI_API_KEY to the hosting environment before analysis can run." });
    }
    if (!req.file) return res.status(400).json({ error: "Choose a BTC/USD chart screenshot first." });

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const mime = req.file.mimetype;
    const image = `data:${mime};base64,${req.file.buffer.toString("base64")}`;
    const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";

    const response = await client.responses.create({
      model,
      input: [{
        role: "user",
        content: [
          { type: "input_text", text:
`You are Alex Trader, a cautious technical chart-reading assistant. Analyze ONLY the supplied chart screenshot for BTC/USD and produce a possible IQ Option-style HIGHER/LOWER/WAIT signal with a 1–5 minute suggested expiry.
Rules:
- This is decision support, not a prediction guarantee. Never claim certainty or invent live prices, candles, indicators, volume, or timestamps not visible.
- If the symbol cannot be confirmed as BTC/USD, chart is unreadable/cropped, timeframe is unclear, screenshot is stale/ambiguous, or evidence conflicts, choose WAIT and explain why.
- Prefer WAIT unless multiple visible clues agree. Do not force a trade.
- Distinguish chart timeframe from suggested contract expiry. Expiry is a cautious suggestion, not an instruction.
- Do not calculate a numeric entry price unless clearly legible. Describe an entry condition instead.
- Mention screenshot-only limitation: no live feed, broker quote, order book, or news access.
- No trade execution, no account access, no stake sizing, and no promises of win rate.
Return only the requested structured fields.` },
          { type: "input_image", image_url: image, detail: "high" }
        ]
      }],
      text: { format: { type: "json_schema", name: "alex_btc_signal", strict: true, schema } },
      max_output_tokens: 900
    });

    const raw = response.output_text;
    if (!raw) return res.status(502).json({ error: "The analysis service returned no structured signal. Please try a clearer screenshot." });
    const signal = JSON.parse(raw);
    // Hard fail-safe: only the three allowed, non-executing labels can reach the UI.
    if (!["HIGHER", "LOWER", "WAIT"].includes(signal.action)) {
      return res.status(502).json({ error: "Signal validation failed. No trade recommendation was issued." });
    }
    res.json({ signal, mode: "SIGNALS_ONLY", execution: "DISABLED", source: "USER_UPLOADED_SCREENSHOT" });
  } catch (err) {
    console.error("Analysis error:", err?.message || err);
    const message = err?.code === "LIMIT_FILE_SIZE"
      ? "Screenshot is too large. Maximum size is 8 MB."
      : (err?.message || "Analysis failed. Please try again.");
    res.status(500).json({ error: message });
  }
});

app.get("/api/status", (_req, res) => {
  res.json({
    app: "Alex Trader",
    market: "BTC/USD",
    mode: "SIGNALS_ONLY",
    real_money_execution: false,
    automatic_execution: false,
    input: "USER_UPLOADED_SCREENSHOT",
    api_key_configured: Boolean(process.env.OPENAI_API_KEY)
  });
});

app.use((err, _req, res, _next) => {
  res.status(400).json({ error: err.message || "Invalid request." });
});

app.listen(port, () => console.log(`Alex Trader is running on port ${port}`));
