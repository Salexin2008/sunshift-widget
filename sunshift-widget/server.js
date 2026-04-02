const http = require("http");

const DEFAULT_MODEL = "gpt-4o-mini";
const DEFAULT_PORT = 3000;
const DEFAULT_MAX_BODY_BYTES = 10_000;
const DEFAULT_MAX_MESSAGE_CHARS = 750;
const DEFAULT_MAX_CONTEXT_MESSAGES = 12;
const DEFAULT_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const DEFAULT_RATE_LIMIT_MAX = 30;
const DEFAULT_CONVERSATION_TTL_MS = 30 * 60 * 1000;
const DEFAULT_UPSTREAM_TIMEOUT_MS = 12_000;

const SITE_CONFIGS = {
  "life-enhancing-dentistry": {
    businessName: "Life Enhancing Dentistry",
    phone: "(407) 205-9544",
    email: "info@lifeenhancingdental.com",
    address: "9717 Eagle Creek Center Blvd Suite 102 Orlando FL 32832",
    systemPrompt: `You are a friendly virtual assistant for Life Enhancing Dentistry, a private dental practice in the Eagle Creek and Lake Nona area of Orlando, Florida.

You should:
- Answer common questions about services including cleanings, fillings, crowns, emergencies, cosmetic dentistry, implants, oral surgery, and family dentistry
- Share office information accurately:
  - Phone: (407) 205-9544
  - Email: info@lifeenhancingdental.com
  - Address: 9717 Eagle Creek Center Blvd Suite 102 Orlando FL 32832
  - Hours: Monday 10am-7pm, Tuesday 7am-3pm, Wednesday 7am-3pm, Thursday closed, Friday 8am-4pm, Saturday 8am-2pm, Sunday closed
- Let visitors know the team speaks English, Spanish, and Russian
- Encourage anxious patients gently and calmly
- Ask for name and best callback number when someone wants follow-up or booking help
- Tell emergency patients to call immediately because same-day emergency appointments may be available

Rules:
- Never diagnose a condition
- Never quote prices or insurance coverage details
- Make every reply clear and concise, always 3 sentences or less
- End with a clear next action: call, book, or share contact information
- If the user asks something unrelated to the dental practice, politely redirect them back to booking or office questions`,
  },
};

function createChatServer(options) {
  const logger = options && options.logger ? options.logger : console;
  const runtime = buildRuntimeConfig((options && options.env) || process.env);
  const openAIChat = (options && options.openAIChat) || callOpenAIChat;
  const state = {
    conversations: new Map(),
    rateLimits: new Map(),
  };

  const server = http.createServer(async (req, res) => {
    setSecurityHeaders(res);

    if (req.method === "OPTIONS") {
      return handleOptions(req, res, runtime);
    }

    if (req.method === "GET" && req.url === "/health") {
      setCorsHeaders(req, res, runtime);
      return sendJson(res, 200, { ok: true });
    }

    if (req.method !== "POST" || req.url !== "/api/chat") {
      return sendJson(res, 404, { error: "Not found" });
    }

    if (!isAllowedOrigin(req.headers.origin, runtime.allowedOrigins, runtime.nodeEnv)) {
      return sendJson(res, 403, { error: "Origin not allowed" });
    }

    setCorsHeaders(req, res, runtime);

    if (!isJsonRequest(req)) {
      return sendJson(res, 415, { error: "Content-Type must be application/json" });
    }

    const ipAddress = getClientIp(req);
    pruneExpiredRateLimits(state.rateLimits, runtime);
    if (isRateLimited(state.rateLimits, ipAddress, runtime)) {
      return sendJson(res, 429, {
        error: "Too many requests",
        reply: "We are receiving too many chat requests right now. Please call (407) 205-9544.",
      });
    }

    try {
      pruneExpiredConversations(state.conversations, runtime);

      const body = await readJson(req, runtime.maxBodyBytes);
      const siteId = typeof body.siteId === "string" ? body.siteId.trim() : "";
      const conversationId =
        typeof body.conversationId === "string" ? body.conversationId.trim() : "";
      const userMessage = typeof body.message === "string" ? body.message.trim() : "";

      const site = SITE_CONFIGS[siteId];
      if (!site) {
        return sendJson(res, 400, { error: "Unknown siteId" });
      }

      if (!isSafeConversationId(conversationId)) {
        return sendJson(res, 400, { error: "Invalid conversationId" });
      }

      if (!userMessage || userMessage.length > runtime.maxMessageChars) {
        return sendJson(res, 400, {
          error: `Message must be between 1 and ${runtime.maxMessageChars} characters`,
        });
      }

      const conversationKey = getConversationKey(siteId, conversationId);
      const priorConversation = state.conversations.get(conversationKey) || [];
      const nextConversation = appendConversationMessage(
        priorConversation,
        { role: "user", content: userMessage },
        runtime.maxContextMessages
      );

      const reply = await openAIChat({
        apiKey: runtime.openAIKey,
        model: runtime.model,
        timeoutMs: runtime.upstreamTimeoutMs,
        systemPrompt: site.systemPrompt,
        messages: nextConversation,
      });

      const finalConversation = appendConversationMessage(
        nextConversation,
        { role: "assistant", content: reply },
        runtime.maxContextMessages
      );

      state.conversations.set(conversationKey, {
        updatedAt: Date.now(),
        messages: finalConversation,
      });

      return sendJson(res, 200, { reply });
    } catch (error) {
      logger.error("Chat request failed:", error);
      return sendJson(res, 500, {
        error: "Chat request failed",
        reply: "Sorry, something went wrong. Please call (407) 205-9544.",
      });
    }
  });

  return server;
}

function buildRuntimeConfig(env) {
  const openAIKey = env.OPENAI_API_KEY;
  const nodeEnv = env.NODE_ENV || "development";
  const allowedOrigins = parseCsv(env.ALLOWED_ORIGINS);

  if (!openAIKey) {
    throw new Error("Missing OPENAI_API_KEY environment variable.");
  }

  if (nodeEnv === "production" && allowedOrigins.length === 0) {
    throw new Error("ALLOWED_ORIGINS must be set in production.");
  }

  return {
    openAIKey,
    nodeEnv,
    model: env.OPENAI_MODEL || DEFAULT_MODEL,
    port: parsePositiveInt(env.PORT, DEFAULT_PORT),
    allowedOrigins,
    maxBodyBytes: parsePositiveInt(env.MAX_BODY_BYTES, DEFAULT_MAX_BODY_BYTES),
    maxMessageChars: parsePositiveInt(env.MAX_MESSAGE_CHARS, DEFAULT_MAX_MESSAGE_CHARS),
    maxContextMessages: parsePositiveInt(
      env.MAX_CONTEXT_MESSAGES,
      DEFAULT_MAX_CONTEXT_MESSAGES
    ),
    rateLimitWindowMs: parsePositiveInt(
      env.RATE_LIMIT_WINDOW_MS,
      DEFAULT_RATE_LIMIT_WINDOW_MS
    ),
    rateLimitMax: parsePositiveInt(env.RATE_LIMIT_MAX, DEFAULT_RATE_LIMIT_MAX),
    conversationTtlMs: parsePositiveInt(
      env.CONVERSATION_TTL_MS,
      DEFAULT_CONVERSATION_TTL_MS
    ),
    upstreamTimeoutMs: parsePositiveInt(
      env.UPSTREAM_TIMEOUT_MS,
      DEFAULT_UPSTREAM_TIMEOUT_MS
    ),
  };
}

async function callOpenAIChat({ apiKey, model, timeoutMs, systemPrompt, messages }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.4,
        max_tokens: 220,
        messages: [{ role: "system", content: systemPrompt }, ...messages],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`OpenAI API returned status ${response.status}`);
    }

    const data = await response.json();
    const reply = data && data.choices && data.choices[0] && data.choices[0].message
      ? data.choices[0].message.content
      : "";

    if (typeof reply !== "string" || !reply.trim()) {
      throw new Error("OpenAI API returned an empty reply");
    }

    return reply.trim();
  } finally {
    clearTimeout(timeout);
  }
}

function handleOptions(req, res, runtime) {
  if (!isAllowedOrigin(req.headers.origin, runtime.allowedOrigins, runtime.nodeEnv)) {
    return sendJson(res, 403, { error: "Origin not allowed" });
  }

  setCorsHeaders(req, res, runtime);
  res.writeHead(204);
  res.end();
}

function parseCsv(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function isAllowedOrigin(origin, allowedOrigins, nodeEnv) {
  if (!origin) {
    return nodeEnv !== "production";
  }

  if (origin === "null") {
    return nodeEnv !== "production";
  }

  if (allowedOrigins.length === 0) {
    return nodeEnv !== "production";
  }

  return allowedOrigins.includes(origin);
}

function setCorsHeaders(req, res, runtime) {
  const origin = req.headers.origin;
  if (origin && isAllowedOrigin(origin, runtime.allowedOrigins, runtime.nodeEnv)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }

  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Max-Age", "600");
}

function setSecurityHeaders(res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
}

function isJsonRequest(req) {
  const contentType = req.headers["content-type"] || "";
  return contentType.toLowerCase().startsWith("application/json");
}

function getClientIp(req) {
  const forwardedFor = req.headers["x-forwarded-for"];
  if (typeof forwardedFor === "string" && forwardedFor.trim()) {
    return forwardedFor.split(",")[0].trim();
  }

  return req.socket.remoteAddress || "unknown";
}

function isRateLimited(rateLimits, ipAddress, runtime) {
  const now = Date.now();
  const existing = rateLimits.get(ipAddress);

  if (!existing || now - existing.startedAt > runtime.rateLimitWindowMs) {
    rateLimits.set(ipAddress, { count: 1, startedAt: now });
    return false;
  }

  existing.count += 1;
  rateLimits.set(ipAddress, existing);

  return existing.count > runtime.rateLimitMax;
}

function readJson(req, maxBodyBytes) {
  return new Promise((resolve, reject) => {
    let body = "";
    let receivedBytes = 0;

    req.on("data", (chunk) => {
      receivedBytes += chunk.length;
      if (receivedBytes > maxBodyBytes) {
        reject(new Error("Request body too large"));
        req.destroy();
        return;
      }

      body += chunk;
    });

    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(new Error("Invalid JSON"));
      }
    });

    req.on("error", reject);
  });
}

function isSafeConversationId(value) {
  return /^[A-Za-z0-9_-]{16,128}$/.test(value);
}

function getConversationKey(siteId, conversationId) {
  return `${siteId}:${conversationId}`;
}

function appendConversationMessage(conversationState, message, maxContextMessages) {
  const messages = Array.isArray(conversationState.messages)
    ? conversationState.messages.slice()
    : Array.isArray(conversationState)
      ? conversationState.slice()
      : [];

  messages.push({
    role: message.role,
    content: stripControlChars(message.content),
  });

  return messages.slice(-maxContextMessages);
}

function pruneExpiredConversations(conversations, runtime) {
  const now = Date.now();

  for (const [key, value] of conversations.entries()) {
    if (!value || now - value.updatedAt > runtime.conversationTtlMs) {
      conversations.delete(key);
    }
  }
}

function pruneExpiredRateLimits(rateLimits, runtime) {
  const now = Date.now();

  for (const [key, value] of rateLimits.entries()) {
    if (!value || now - value.startedAt > runtime.rateLimitWindowMs) {
      rateLimits.delete(key);
    }
  }
}

function stripControlChars(value) {
  return String(value).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

if (require.main === module) {
  const server = createChatServer();
  const runtime = buildRuntimeConfig(process.env);

  server.listen(runtime.port, () => {
    console.log(`SunShift chat server running on http://localhost:${runtime.port}`);
  });
}

module.exports = {
  SITE_CONFIGS,
  appendConversationMessage,
  buildRuntimeConfig,
  createChatServer,
  getClientIp,
  isAllowedOrigin,
  isSafeConversationId,
  parsePositiveInt,
  pruneExpiredConversations,
  pruneExpiredRateLimits,
  stripControlChars,
};
