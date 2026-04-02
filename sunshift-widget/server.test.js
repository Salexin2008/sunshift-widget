const test = require("node:test");
const assert = require("node:assert/strict");

const {
  appendConversationMessage,
  buildRuntimeConfig,
  isAllowedOrigin,
  isSafeConversationId,
  stripControlChars,
} = require("./server");

test("isAllowedOrigin blocks unknown origins in production", () => {
  assert.equal(
    isAllowedOrigin("https://evil.example", ["https://sunshiftdigital.com"], "production"),
    false
  );
});

test("isAllowedOrigin allows null origin only in development", () => {
  assert.equal(isAllowedOrigin("null", ["https://sunshiftdigital.com"], "development"), true);
  assert.equal(isAllowedOrigin("null", ["https://sunshiftdigital.com"], "production"), false);
});

test("buildRuntimeConfig requires an allowlist in production", () => {
  assert.throws(() => {
    buildRuntimeConfig({
      OPENAI_API_KEY: "test-key",
      NODE_ENV: "production",
    });
  }, /ALLOWED_ORIGINS/);
});

test("appendConversationMessage trims history and preserves role order", () => {
  const conversation = appendConversationMessage(
    [
      { role: "user", content: "first" },
      { role: "assistant", content: "second" },
    ],
    { role: "user", content: "third" },
    2
  );

  assert.deepEqual(conversation, [
    { role: "assistant", content: "second" },
    { role: "user", content: "third" },
  ]);
});

test("stripControlChars removes low ASCII control characters", () => {
  assert.equal(stripControlChars("hello\u0000world\u001F"), "helloworld");
});

test("conversation ids must match the backend allowlist pattern", () => {
  assert.equal(isSafeConversationId("1234567890abcdef"), true);
  assert.equal(isSafeConversationId("too-short"), false);
  assert.equal(isSafeConversationId("bad spaces inside"), false);
});
