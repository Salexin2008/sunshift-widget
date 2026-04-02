(function () {
  if (window.SunShiftChatWidgetLoaded) return;
  window.SunShiftChatWidgetLoaded = true;

  const config = {
    siteId: "life-enhancing-dentistry",
    apiEndpoint: "http://localhost:3000/api/chat",
    practiceName: "Life Enhancing Dentistry",
    assistantLabel: "Virtual Assistant",
    statusText: "Online now",
    greeting:
      "Hi there! I'm the virtual assistant for Life Enhancing Dentistry. How can I help today?",
    placeholder: "Ask about appointments, hours, or emergencies...",
    bubbleIcon: "\uD83E\uDDB7",
    headerIcon: "\uD83E\uDDB7",
    accentColor: "#1a73e8",
    accentColorDark: "#1558b0",
    backgroundColor: "#f4f8ff",
    phone: "(407) 205-9544",
    bookingUrl: "tel:4072059544",
    brandingText: "Powered by SunShift Digital",
    brandingUrl: "https://sunshiftdigital.com",
    maxMessages: 30,
    maxInputChars: 500,
    persistSession: false,
    privacyNote: "Do not share private medical, insurance, or payment details in chat.",
    botReplyDelayMs: 950,
    typingSpeedMs: 22,
    typingVarianceMs: 14,
    botAvatarImage: createDefaultAvatarDataUrl(),
    ...window.SunShiftChatConfig,
  };

  const state = {
    isOpen: false,
    isWaiting: false,
    conversationId: loadConversationId(),
    messages: loadMessages(),
  };

  injectStyles();
  renderWidget();
  renderMessages();

  function loadMessages() {
    if (!config.persistSession) {
      return [{ role: "assistant", content: config.greeting }];
    }

    const storageKey = getStorageKey();
    try {
      const saved = window.sessionStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length) return parsed;
      }
    } catch (error) {
      console.warn("SunShift widget could not load session history.", error);
    }
    return [{ role: "assistant", content: config.greeting }];
  }

  function saveMessages() {
    if (!config.persistSession) return;

    try {
      window.sessionStorage.setItem(getStorageKey(), JSON.stringify(state.messages));
    } catch (error) {
      console.warn("SunShift widget could not save session history.", error);
    }
  }

  function getStorageKey() {
    return "sunshift-chat:" + config.siteId;
  }

  function loadConversationId() {
    if (config.persistSession) {
      try {
        const saved = window.sessionStorage.getItem(getStorageKey() + ":conversation");
        if (saved) return saved;
      } catch (error) {
        console.warn("SunShift widget could not load conversation id.", error);
      }
    }

    const id = createConversationId();

    if (config.persistSession) {
      try {
        window.sessionStorage.setItem(getStorageKey() + ":conversation", id);
      } catch (error) {
        console.warn("SunShift widget could not save conversation id.", error);
      }
    }

    return id;
  }

  function createConversationId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID().replace(/-/g, "");
    }

    return (
      "ss" +
      Math.random().toString(36).slice(2) +
      Date.now().toString(36)
    ).slice(0, 32);
  }

  function injectStyles() {
    const style = document.createElement("style");
    style.textContent = `
      :root {
        --ss-accent: ${escapeCss(config.accentColor)};
        --ss-accent-dark: ${escapeCss(config.accentColorDark)};
        --ss-bg: ${escapeCss(config.backgroundColor)};
        --ss-text: #1f3057;
        --ss-muted: #6f80a8;
        --ss-border: #dbe6fb;
      }

      #ss-chat-root * {
        box-sizing: border-box;
      }

      #ss-chat-root {
        font-family: Arial, sans-serif;
      }

      .ss-chat-bubble {
        position: fixed;
        right: 24px;
        bottom: 24px;
        width: 64px;
        height: 64px;
        border: 0;
        border-radius: 999px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: linear-gradient(135deg, var(--ss-accent), var(--ss-accent-dark));
        color: #fff;
        font-size: 28px;
        cursor: pointer;
        z-index: 99999;
        box-shadow: 0 16px 36px rgba(26, 115, 232, 0.32);
        transition: transform 0.18s ease;
      }

      .ss-chat-bubble:hover {
        transform: scale(1.06);
      }

      .ss-chat-window {
        position: fixed;
        right: 24px;
        bottom: 100px;
        width: min(360px, calc(100vw - 24px));
        height: min(560px, calc(100vh - 124px));
        display: flex;
        flex-direction: column;
        background: var(--ss-bg);
        border-radius: 24px;
        overflow: hidden;
        box-shadow: 0 24px 56px rgba(15, 30, 70, 0.2);
        z-index: 99999;
        opacity: 0;
        pointer-events: none;
        transform: translateY(16px) scale(0.98);
        transition: opacity 0.25s ease, transform 0.25s ease;
      }

      .ss-chat-window.open {
        opacity: 1;
        pointer-events: auto;
        transform: translateY(0) scale(1);
      }

      .ss-chat-header {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        padding: 18px;
        background: linear-gradient(135deg, var(--ss-accent), var(--ss-accent-dark));
        color: #fff;
      }

      .ss-chat-header-main {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .ss-chat-avatar {
        width: 44px;
        height: 44px;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.2);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 22px;
        flex-shrink: 0;
      }

      .ss-chat-title {
        font-size: 17px;
        font-weight: 700;
        line-height: 1.2;
      }

      .ss-chat-subtitle {
        font-size: 12px;
        opacity: 0.9;
        margin-top: 3px;
      }

      .ss-chat-close {
        width: 32px;
        height: 32px;
        border: 0;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.18);
        color: #fff;
        font-size: 18px;
        cursor: pointer;
      }

      .ss-chat-messages {
        flex: 1;
        padding: 16px;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 10px;
      }

      .ss-chat-message {
        max-width: 84%;
        padding: 12px 14px;
        border-radius: 18px;
        line-height: 1.5;
        font-size: 14px;
        white-space: pre-wrap;
      }

      .ss-chat-row {
        display: flex;
        align-items: flex-end;
        gap: 10px;
      }

      .ss-chat-row.user {
        justify-content: flex-end;
      }

      .ss-chat-row.bot {
        justify-content: flex-start;
      }

      .ss-chat-message-avatar {
        width: 34px;
        height: 34px;
        border-radius: 999px;
        object-fit: cover;
        flex-shrink: 0;
        box-shadow: 0 8px 18px rgba(31, 48, 87, 0.16);
        background: #dfe9ff;
        border: 2px solid rgba(255, 255, 255, 0.9);
      }

      .ss-chat-message.bot {
        align-self: flex-start;
        background: #fff;
        color: var(--ss-text);
        border: 1px solid var(--ss-border);
        border-bottom-left-radius: 6px;
      }

      .ss-chat-message.user {
        align-self: flex-end;
        background: linear-gradient(135deg, var(--ss-accent), var(--ss-accent-dark));
        color: #fff;
        border-bottom-right-radius: 6px;
      }

      .ss-chat-typing {
        display: inline-flex;
        gap: 5px;
        padding: 12px 14px;
        background: #fff;
        border: 1px solid var(--ss-border);
        border-radius: 18px;
      }

      .ss-chat-typing span {
        width: 7px;
        height: 7px;
        border-radius: 999px;
        background: #9aaed8;
        animation: ss-wave 1s infinite ease-in-out;
      }

      .ss-chat-typing span:nth-child(2) {
        animation-delay: 0.12s;
      }

      .ss-chat-typing span:nth-child(3) {
        animation-delay: 0.24s;
      }

      @keyframes ss-wave {
        0%, 100% { transform: translateY(0) scale(0.95); opacity: 0.45; }
        50% { transform: translateY(-4px) scale(1); opacity: 1; }
      }

      .ss-chat-footer {
        padding: 12px;
        background: #fff;
        border-top: 1px solid var(--ss-border);
      }

      .ss-chat-input-row {
        display: flex;
        gap: 8px;
      }

      .ss-chat-input {
        flex: 1;
        min-width: 0;
        border: 1px solid var(--ss-border);
        border-radius: 999px;
        padding: 12px 14px;
        font-size: 14px;
        outline: none;
      }

      .ss-chat-input:focus {
        border-color: var(--ss-accent);
      }

      .ss-chat-send {
        width: 42px;
        height: 42px;
        border: 0;
        border-radius: 999px;
        background: linear-gradient(135deg, var(--ss-accent), var(--ss-accent-dark));
        color: #fff;
        font-size: 18px;
        cursor: pointer;
      }

      .ss-chat-meta {
        margin-top: 8px;
        text-align: center;
        font-size: 11px;
        color: var(--ss-muted);
      }

      .ss-chat-privacy {
        margin-top: 6px;
        text-align: center;
        font-size: 10px;
        line-height: 1.4;
        color: var(--ss-muted);
      }

      .ss-chat-message.streaming {
        position: relative;
      }

      .ss-chat-message.bot.streaming {
        background-image: linear-gradient(
          90deg,
          rgba(255, 255, 255, 1) 0%,
          rgba(246, 250, 255, 1) 45%,
          rgba(255, 255, 255, 1) 100%
        );
      }

      .ss-chat-message.streaming::after {
        content: "";
        display: inline-block;
        width: 2px;
        height: 1em;
        margin-left: 2px;
        background: currentColor;
        vertical-align: -2px;
        animation: ss-caret 0.9s infinite;
      }

      @keyframes ss-caret {
        0%, 49% { opacity: 1; }
        50%, 100% { opacity: 0; }
      }

      .ss-chat-meta a {
        color: inherit;
        text-decoration: none;
      }

      @media (max-width: 640px) {
        .ss-chat-bubble {
          right: 16px;
          bottom: 16px;
        }

        .ss-chat-window {
          right: 12px;
          left: 12px;
          bottom: 92px;
          width: auto;
          height: min(68vh, 560px);
        }
      }
    `;
    document.head.appendChild(style);
  }

  function renderWidget() {
    const root = document.createElement("div");
    root.id = "ss-chat-root";
    root.innerHTML = `
      <button class="ss-chat-bubble" type="button" aria-label="Open chat">
        <span>${escapeHtml(config.bubbleIcon)}</span>
      </button>
      <section class="ss-chat-window" aria-live="polite" aria-label="Chat window">
        <header class="ss-chat-header">
          <div class="ss-chat-header-main">
            <div class="ss-chat-avatar">${escapeHtml(config.headerIcon)}</div>
            <div>
              <div class="ss-chat-title">${escapeHtml(config.practiceName)}</div>
              <div class="ss-chat-subtitle">${escapeHtml(config.assistantLabel)} • ${escapeHtml(config.statusText)}</div>
            </div>
          </div>
          <button class="ss-chat-close" type="button" aria-label="Close chat">&times;</button>
        </header>
        <div class="ss-chat-messages"></div>
        <div class="ss-chat-footer">
          <div class="ss-chat-input-row">
            <input class="ss-chat-input" type="text" />
            <button class="ss-chat-send" type="button" aria-label="Send message">↑</button>
          </div>
          <div class="ss-chat-meta">
            <a href="${escapeAttribute(config.brandingUrl)}" target="_blank" rel="noreferrer">${escapeHtml(config.brandingText)}</a>
          </div>
          <div class="ss-chat-privacy">${escapeHtml(config.privacyNote)}</div>
        </div>
      </section>
    `;

    document.body.appendChild(root);

    const bubble = root.querySelector(".ss-chat-bubble");
    const win = root.querySelector(".ss-chat-window");
    const close = root.querySelector(".ss-chat-close");
    const input = root.querySelector(".ss-chat-input");
    const send = root.querySelector(".ss-chat-send");

    input.placeholder = config.placeholder;
    input.maxLength = config.maxInputChars;

    bubble.addEventListener("click", toggleOpen);
    close.addEventListener("click", toggleOpen);
    send.addEventListener("click", sendMessage);
    input.addEventListener("keydown", function (event) {
      if (event.key === "Enter") sendMessage();
    });

    function toggleOpen() {
      state.isOpen = !state.isOpen;
      win.classList.toggle("open", state.isOpen);
      if (state.isOpen) {
        setTimeout(function () {
          input.focus();
        }, 80);
      }
    }
  }

  function renderMessages() {
    const container = document.querySelector(".ss-chat-messages");
    const input = document.querySelector(".ss-chat-input");
    const send = document.querySelector(".ss-chat-send");

    container.innerHTML = "";

    state.messages.forEach(function (message) {
      const row = document.createElement("div");
      row.className = "ss-chat-row " + (message.role === "user" ? "user" : "bot");

      if (message.role !== "user") {
        row.appendChild(createBotAvatar());
      }

      const item = document.createElement("div");
      item.className = "ss-chat-message " + (message.role === "user" ? "user" : "bot");
      item.textContent = message.content;
      row.appendChild(item);
      container.appendChild(row);
    });

    if (state.isWaiting) {
      const typingRow = document.createElement("div");
      typingRow.className = "ss-chat-row bot";
      typingRow.appendChild(createBotAvatar());

      const typing = document.createElement("div");
      typing.className = "ss-chat-typing";
      typing.innerHTML = "<span></span><span></span><span></span>";
      typingRow.appendChild(typing);
      container.appendChild(typingRow);
    }

    const maxedOut = getUserMessageCount() >= config.maxMessages;
    input.disabled = state.isWaiting || maxedOut;
    send.disabled = state.isWaiting || maxedOut;
    input.placeholder = maxedOut
      ? "Message limit reached"
      : state.isWaiting
        ? "Waiting for reply..."
        : config.placeholder;

    container.scrollTop = container.scrollHeight;
    saveMessages();
  }

  function getUserMessageCount() {
    return state.messages.filter(function (message) {
      return message.role === "user";
    }).length;
  }

  async function sendMessage() {
    if (state.isWaiting || getUserMessageCount() >= config.maxMessages) return;

    const input = document.querySelector(".ss-chat-input");
    const text = input.value.trim();
    if (!text) return;

    input.value = "";
    state.messages.push({ role: "user", content: text });
    state.isWaiting = true;
    renderMessages();

    try {
      const response = await fetch(config.apiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "omit",
        mode: "cors",
        referrerPolicy: "strict-origin-when-cross-origin",
        body: JSON.stringify({
          siteId: config.siteId,
          conversationId: state.conversationId,
          message: text,
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error("Too many requests");
        }
        throw new Error("Chat request failed with status " + response.status);
      }

      const data = await response.json();
      if (!data.reply) {
        throw new Error("No reply returned from API");
      }

      await animateAssistantReply(data.reply);
    } catch (error) {
      console.error("SunShift widget error:", error);
      await animateAssistantReply(
        "Sorry, something went wrong. Please call " +
          config.phone +
          " and we can help directly."
      );
    } finally {
      state.isWaiting = false;
      renderMessages();
    }
  }

  async function animateAssistantReply(fullText) {
    const reply = String(fullText || "").trim();
    const finalText = reply || "Sorry, I didn't catch that. Please try again.";

    await wait(config.botReplyDelayMs);

    state.messages.push({ role: "assistant", content: "" });
    state.isWaiting = false;
    renderMessages();

    const container = document.querySelector(".ss-chat-messages");
    const rows = container.querySelectorAll(".ss-chat-row.bot");
    const lastRow = rows[rows.length - 1];
    const bubble = lastRow ? lastRow.querySelector(".ss-chat-message.bot") : null;

    if (!bubble) {
      state.messages[state.messages.length - 1].content = finalText;
      renderMessages();
      return;
    }

    bubble.classList.add("streaming");

    await revealText(bubble, finalText, function (partialText) {
      state.messages[state.messages.length - 1].content = partialText;
      container.scrollTop = container.scrollHeight;
    });

    bubble.classList.remove("streaming");
    state.messages[state.messages.length - 1].content = finalText;
    saveMessages();
  }

  function revealText(element, text, onProgress) {
    return new Promise(function (resolve) {
      let index = 0;

      async function step() {
        while (index < text.length) {
          const chunkSize = getChunkSize(text, index);
          index += chunkSize;

          const partialText = text.slice(0, index);
          element.textContent = partialText;

          if (typeof onProgress === "function") {
            onProgress(partialText);
          }

          if (index < text.length) {
            await wait(getCharacterDelay(text[index - 1], text[index] || ""));
          }
        }

        resolve();
      }

      step();
    });
  }

  function getChunkSize(text, index) {
    const currentChar = text[index];
    const nextChar = text[index + 1] || "";

    if (currentChar === " " || currentChar === "\n") return 1;
    if (/[.,!?]/.test(currentChar)) return 1;
    if (nextChar === " ") return 1;
    if (/[A-Z]/.test(currentChar) && index > 0) return 1;

    return 1;
  }

  function getCharacterDelay(currentChar, nextChar) {
    let delay = config.typingSpeedMs;

    if (currentChar === " " || currentChar === "\n") {
      delay -= 10;
    }

    if (/[,:]/.test(currentChar)) {
      delay += 70;
    }

    if (/[.!?]/.test(currentChar)) {
      delay += 140;
    }

    if (nextChar === " ") {
      delay -= 4;
    }

    const variance = (Math.random() - 0.5) * config.typingVarianceMs;
    return Math.max(10, Math.round(delay + variance));
  }

  function createBotAvatar() {
    const avatar = document.createElement("img");
    avatar.className = "ss-chat-message-avatar";
    avatar.src = config.botAvatarImage;
    avatar.alt = config.practiceName + " assistant";
    return avatar;
  }

  function createDefaultAvatarDataUrl() {
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
        <defs>
          <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#8bc2ff" />
            <stop offset="100%" stop-color="#1a73e8" />
          </linearGradient>
        </defs>
        <rect width="64" height="64" rx="32" fill="url(#bg)" />
        <circle cx="32" cy="24" r="12" fill="#ffffff" fill-opacity="0.92" />
        <path d="M14 55c3-10 11-15 18-15s15 5 18 15" fill="#ffffff" fill-opacity="0.92" />
      </svg>
    `;

    return "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg);
  }

  function wait(ms) {
    return new Promise(function (resolve) {
      window.setTimeout(resolve, ms);
    });
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function escapeAttribute(value) {
    return escapeHtml(value).replace(/"/g, "&quot;");
  }

  function escapeCss(value) {
    return String(value).replace(/[;"{}]/g, "");
  }
})();
