"use strict";

(() => {
  const CONVERSATIONS_KEY = "studio-blue-conversations-v1";
  const MODEL_CONFIG_KEY = "studio-local-model-config-v1";

  const $ = (id) => document.getElementById(id);
  const sidebar = $("sidebar");
  const sidebarScrim = $("sidebarScrim");
  const mobileMenuButton = $("mobileMenuButton");
  const newChatButton = $("newChatButton");
  const historyList = $("historyList");
  const chatScroll = $("chatScroll");
  const welcomeState = $("welcomeState");
  const messageList = $("messageList");
  const sessionTitle = $("sessionTitle");
  const promptForm = $("promptForm");
  const promptInput = $("promptInput");
  const sendButton = $("sendButton");
  const modelDialog = $("modelDialog");
  const endpointInput = $("endpointInput");
  const modelIdInput = $("modelIdInput");
  const apiKeyInput = $("apiKeyInput");
  const connectionMessage = $("connectionMessage");
  const testConnectionButton = $("testConnectionButton");
  const saveConnectionButton = $("saveConnectionButton");
  const clearConnectionButton = $("clearConnectionButton");
  const modelLabel = $("modelLabel");
  const modelDot = $("modelDot");
  const runtimeLabel = $("runtimeLabel");
  const runtimeDot = $("runtimeDot");
  const toast = $("toast");

  let conversations = readConversations();
  let activeConversationId = null;
  let modelConfig = readModelConfig();
  let isSending = false;
  let toastTimer = null;

  const icons = {
    history: '<path d="M3.5 11.5a8.5 8.5 0 1 0 2.4-5.9L3 8"/><path d="M3 3.5V8h4.5"/><path d="M12 7v5l3 2"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    spark: '<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z"/>',
    code: '<path d="m8 8-4 4 4 4M16 8l4 4-4 4M14 5l-4 14"/>',
    plan: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4M16 3v4M4 10h16M8 14h3M8 17h6"/>',
    book: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21Z"/><path d="M4 5.5V21M8 7h8M8 11h7"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="m19.4 15 .1.1 1.1.9-1.2 2.1-1.4-.5a7.9 7.9 0 0 1-1.8 1l-.3 1.5h-2.4l-.3-1.5a7.9 7.9 0 0 1-1.8-1l-1.4.5-1.2-2.1 1.1-.9a7.5 7.5 0 0 1 0-2l-1.1-.9L8 10.1l1.4.5a7.9 7.9 0 0 1 1.8-1l.3-1.5h2.4l.3 1.5a7.9 7.9 0 0 1 1.8 1l1.4-.5 1.2 2.1-1.1.9a7.5 7.5 0 0 1 0 1.9Z"/>',
    close: '<path d="m6 6 12 12M18 6 6 18"/>',
    send: '<path d="M12 19V5M5.5 11.5 12 5l6.5 6.5"/>',
    copy: '<rect x="8" y="8" width="11" height="12" rx="2"/><path d="M16 8V5a1.5 1.5 0 0 0-1.5-1.5h-8A1.5 1.5 0 0 0 5 5v10a1.5 1.5 0 0 0 1.5 1.5H8"/>',
    chevron: '<path d="m8 10 4 4 4-4"/>',
    cpu: '<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4M10 10h4v4h-4z"/>'
  };

  function icon(name, size) {
    const node = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    node.setAttribute("viewBox", "0 0 24 24");
    node.setAttribute("width", String(size || 16));
    node.setAttribute("height", String(size || 16));
    node.setAttribute("fill", "none");
    node.setAttribute("stroke", "currentColor");
    node.setAttribute("stroke-width", "1.7");
    node.setAttribute("stroke-linecap", "round");
    node.setAttribute("stroke-linejoin", "round");
    node.setAttribute("aria-hidden", "true");
    node.innerHTML = icons[name] || icons.spark;
    return node;
  }

  function newId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }
    return "chat-" + Date.now() + "-" + Math.random().toString(36).slice(2);
  }

  function readConversations() {
    try {
      const raw = localStorage.getItem(CONVERSATIONS_KEY);
      const saved = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(saved)) return [];
      return saved
        .filter((item) => item && typeof item.id === "string" && Array.isArray(item.messages))
        .map((item) => ({
          id: item.id,
          title: typeof item.title === "string" ? item.title.slice(0, 100) : "New conversation",
          updatedAt: Number(item.updatedAt) || Date.now(),
          messages: item.messages
            .filter((message) =>
              message &&
              (message.role === "user" || message.role === "assistant") &&
              typeof message.content === "string"
            )
            .map((message) => ({ role: message.role, content: message.content.slice(0, 20000) })
            )
            .slice(-80)
        }))
        .slice(0, 40);
    } catch (error) {
      console.warn("Conversation history could not be loaded.", error);
      return [];
    }
  }

  function readModelConfig() {
    try {
      const value = localStorage.getItem(MODEL_CONFIG_KEY);
      if (!value) return null;
      const config = JSON.parse(value);
      if (!config || typeof config.endpoint !== "string" || typeof config.model !== "string") return null;
      return {
        endpoint: config.endpoint,
        model: config.model,
        apiKey: typeof config.apiKey === "string" ? config.apiKey : ""
      };
    } catch (error) {
      console.warn("Local model settings could not be loaded.", error);
      return null;
    }
  }

  function saveConversationData() {
    try {
      localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(conversations.slice(0, 40)));
    } catch (error) {
      showToast("Browser storage is full. Some recent changes may not be saved.");
      console.warn("Conversation history could not be saved.", error);
    }
  }

  function persistModelConfig() {
    try {
      if (modelConfig) localStorage.setItem(MODEL_CONFIG_KEY, JSON.stringify(modelConfig));
      else localStorage.removeItem(MODEL_CONFIG_KEY);
    } catch (error) {
      showConnectionMessage("Settings could not be saved in this browser.", "error");
      console.warn("Local model settings could not be saved.", error);
    }
    updateConnectionUI();
  }

  function titleFrom(text) {
    const compact = text.replace(/\s+/g, " ").trim();
    return compact.length > 44 ? compact.slice(0, 41).trimEnd() + "..." : (compact || "New conversation");
  }

  function activeConversation() {
    return conversations.find((item) => item.id === activeConversationId) || null;
  }

  function createConversation(firstPrompt) {
    const conversation = {
      id: newId(),
      title: titleFrom(firstPrompt),
      updatedAt: Date.now(),
      messages: []
    };
    conversations.unshift(conversation);
    conversations = conversations.slice(0, 40);
    activeConversationId = conversation.id;
    return conversation;
  }

  function showToast(message) {
    toast.textContent = message;
    toast.hidden = false;
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => { toast.hidden = true; }, 3200);
  }

  function setSidebarOpen(open) {
    const mobile = window.matchMedia("(max-width: 760px)").matches;
    if (!mobile) {
      sidebar.classList.remove("is-open");
      sidebarScrim.classList.remove("is-visible");
      mobileMenuButton.setAttribute("aria-expanded", "false");
      return;
    }
    sidebar.classList.toggle("is-open", open);
    sidebarScrim.classList.toggle("is-visible", open);
    mobileMenuButton.setAttribute("aria-expanded", String(open));
  }

  function renderHistory() {
    historyList.replaceChildren();
    const ordered = conversations.slice().sort((a, b) => b.updatedAt - a.updatedAt);

    if (ordered.length === 0) {
      const empty = document.createElement("p");
      empty.className = "history-empty";
      empty.textContent = "Your conversations will appear here.";
      historyList.append(empty);
      return;
    }

    ordered.forEach((conversation) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "history-item";
      if (conversation.id === activeConversationId) {
        button.classList.add("is-active");
        button.setAttribute("aria-current", "page");
      }
      button.append(icon("history", 15));
      const title = document.createElement("span");
      title.className = "history-item-title";
      title.textContent = conversation.title;
      button.append(title);
      button.addEventListener("click", () => {
        activeConversationId = conversation.id;
        renderConversation();
        setSidebarOpen(false);
        promptInput.focus();
      });
      historyList.append(button);
    });
  }

  function createMessageNode(message) {
    const row = document.createElement("article");
    row.className = "message-row message-row--" + message.role;

    if (message.role === "assistant") {
      const avatar = document.createElement("div");
      avatar.className = "message-avatar";
      const logo = document.createElement("img");
      logo.src = "assets/studio-mark.svg";
      logo.alt = "";
      avatar.append(logo);
      row.append(avatar);
    }

    const body = document.createElement("div");
    body.className = "message-body";

    const name = document.createElement("div");
    name.className = "message-name";
    name.textContent = message.role === "user" ? "You" : (modelConfig ? modelConfig.model : "Studio");
    body.append(name);

    const text = document.createElement("p");
    text.className = "message-text";
    text.textContent = message.content;
    body.append(text);

    if (message.role === "assistant" && message.content) {
      const actions = document.createElement("div");
      actions.className = "message-actions";
      const copyButton = document.createElement("button");
      copyButton.className = "icon-button";
      copyButton.type = "button";
      copyButton.setAttribute("aria-label", "Copy response");
      copyButton.title = "Copy response";
      copyButton.append(icon("copy", 14));
      copyButton.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(message.content);
          showToast("Response copied.");
        } catch (_) {
          showToast("Clipboard access is unavailable in this browser.");
        }
      });
      actions.append(copyButton);
      body.append(actions);
    }

    row.append(body);
    return row;
  }

  function renderConversation() {
    const conversation = activeConversation();
    messageList.replaceChildren();

    if (!conversation || conversation.messages.length === 0) {
      activeConversationId = null;
      welcomeState.hidden = false;
      messageList.hidden = true;
      sessionTitle.textContent = "New conversation";
    } else {
      welcomeState.hidden = true;
      messageList.hidden = false;
      sessionTitle.textContent = conversation.title;
      conversation.messages.forEach((message) => messageList.append(createMessageNode(message)));
      requestAnimationFrame(() => { chatScroll.scrollTop = chatScroll.scrollHeight; });
    }

    renderHistory();
    updateConnectionUI();
  }

  function resizePrompt() {
    promptInput.style.height = "auto";
    promptInput.style.height = Math.min(promptInput.scrollHeight, 180) + "px";
  }

  function updateSendButton() {
    sendButton.disabled = promptInput.value.trim().length === 0 || isSending;
  }

  function updateConnectionUI() {
    const configured = Boolean(modelConfig && modelConfig.endpoint && modelConfig.model);
    const name = configured ? modelConfig.model : "Connect local model";
    modelLabel.textContent = name;
    modelDot.classList.toggle("is-connected", configured);
    runtimeLabel.textContent = configured ? "Connection configured" : "Not connected";
    runtimeDot.classList.toggle("is-connected", configured);
    clearConnectionButton.disabled = !configured;
  }

  function showConnectionMessage(message, type) {
    connectionMessage.textContent = message || "";
    connectionMessage.classList.toggle("is-error", type === "error");
    connectionMessage.classList.toggle("is-success", type === "success");
  }

  function openModelSettings() {
    endpointInput.value = modelConfig ? modelConfig.endpoint : "http://localhost:1234/v1/chat/completions";
    modelIdInput.value = modelConfig ? modelConfig.model : "";
    apiKeyInput.value = modelConfig ? modelConfig.apiKey : "";
    showConnectionMessage("", "");
    modelDialog.hidden = false;
    document.body.style.overflow = "hidden";
    endpointInput.focus();
  }

  function closeModelSettings() {
    modelDialog.hidden = true;
    document.body.style.overflow = "";
    $("openModelSettings").focus();
  }

  function validateLocalEndpoint(rawEndpoint) {
    let parsed;
    try {
      parsed = new URL(rawEndpoint.trim());
    } catch (_) {
      return { valid: false, message: "Enter a valid API URL, such as http://localhost:1234/v1/chat/completions." };
    }

    const localHosts = ["localhost", "127.0.0.1", "[::1]"];
    if (!localHosts.includes(parsed.hostname)) {
      return { valid: false, message: "For this local-only setup, the API URL must use localhost or 127.0.0.1." };
    }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return { valid: false, message: "Use an HTTP or HTTPS local API URL." };
    }
    if (!parsed.pathname.endsWith("/chat/completions")) {
      return { valid: false, message: "Use an OpenAI-compatible chat endpoint ending in /v1/chat/completions." };
    }
    return { valid: true, url: parsed };
  }

  function modelListEndpoint(url) {
    const copy = new URL(url.toString());
    copy.pathname = copy.pathname.replace(/\/chat\/completions\/?$/, "/models");
    copy.search = "";
    copy.hash = "";
    return copy.toString();
  }

  function endpointHeaders(apiKey) {
    const headers = { "Content-Type": "application/json" };
    if (apiKey) headers.Authorization = "Bearer " + apiKey;
    return headers;
  }

  async function testModelConnection() {
    const validated = validateLocalEndpoint(endpointInput.value);
    if (!validated.valid) {
      showConnectionMessage(validated.message, "error");
      return;
    }

    testConnectionButton.disabled = true;
    testConnectionButton.textContent = "Checking...";
    showConnectionMessage("Checking the local API server…", "");

    try {
      const response = await fetch(modelListEndpoint(validated.url), {
        method: "GET",
        headers: apiKeyInput.value.trim()
          ? { Authorization: "Bearer " + apiKeyInput.value.trim() }
          : {}
      });
      if (!response.ok) throw new Error("The server returned HTTP " + response.status + ".");
      const data = await response.json();
      const models = Array.isArray(data.data) ? data.data : [];

      if (models.length && !modelIdInput.value.trim()) {
        modelIdInput.value = String(models[0].id || "");
      }

      if (models.length) {
        showConnectionMessage("Local server reached. Available model IDs: " + models.map((item) => item.id).filter(Boolean).slice(0, 4).join(", "), "success");
      } else {
        showConnectionMessage("The server responded. Enter the exact model ID configured in your runtime.", "success");
      }
    } catch (error) {
      const detail = error && error.message ? error.message : "Unknown connection error.";
      showConnectionMessage("Could not reach the local API. Confirm the server is running and browser CORS is allowed. " + detail, "error");
    } finally {
      testConnectionButton.disabled = false;
      testConnectionButton.textContent = "Test connection";
    }
  }

  function saveModelSettings() {
    const validated = validateLocalEndpoint(endpointInput.value);
    if (!validated.valid) {
      showConnectionMessage(validated.message, "error");
      return;
    }
    const model = modelIdInput.value.trim();
    if (!model) {
      showConnectionMessage("Enter a model ID, or use Test connection to load the available ID.", "error");
      return;
    }

    modelConfig = {
      endpoint: validated.url.toString(),
      model: model,
      apiKey: apiKeyInput.value.trim()
    };
    persistModelConfig();
    showConnectionMessage("Local model settings saved in this browser.", "success");
    renderConversation();
    showToast("Local model settings saved.");
    window.setTimeout(closeModelSettings, 500);
  }

  async function requestModelReply(conversation) {
    if (!modelConfig) {
      conversation.messages.push({
        role: "assistant",
        content: "This interface is ready for a local model, but a connection has not been configured yet. Open “Connect local model” in the top bar, enter your local API endpoint and model ID, then try again."
      });
      conversation.updatedAt = Date.now();
      saveConversationData();
      renderConversation();
      return;
    }

    const validated = validateLocalEndpoint(modelConfig.endpoint);
    if (!validated.valid) {
      conversation.messages.push({ role: "assistant", content: "The saved local model endpoint is invalid. Open model settings and correct the endpoint." });
      renderConversation();
      return;
    }

    isSending = true;
    updateSendButton();

    const waiting = document.createElement("article");
    waiting.className = "message-row message-row--assistant";
    waiting.id = "waitingIndicator";
    const avatar = document.createElement("div");
    avatar.className = "message-avatar";
    const logo = document.createElement("img");
    logo.src = "assets/studio-mark.svg";
    logo.alt = "";
    avatar.append(logo);
    const body = document.createElement("div");
    body.className = "message-body";
    const name = document.createElement("div");
    name.className = "message-name";
    name.textContent = modelConfig.model;
    const text = document.createElement("p");
    text.className = "message-text";
    text.textContent = "Waiting for your local model…";
    body.append(name, text);
    waiting.append(avatar, body);
    messageList.append(waiting);
    requestAnimationFrame(() => { chatScroll.scrollTop = chatScroll.scrollHeight; });

    try {
      const history = conversation.messages.map((message) => ({
        role: message.role,
        content: message.content
      }));
      const response = await fetch(validated.url.toString(), {
        method: "POST",
        headers: endpointHeaders(modelConfig.apiKey),
        body: JSON.stringify({
          model: modelConfig.model,
          messages: history,
          stream: false
        })
      });
      if (!response.ok) {
        const detail = await response.text().catch(() => "");
        throw new Error("Local API returned HTTP " + response.status + (detail ? ": " + detail.slice(0, 180) : "."));
      }

      const data = await response.json();
      const answer = data && data.choices && data.choices[0] &&
        data.choices[0].message && data.choices[0].message.content;

      if (typeof answer !== "string" || !answer.trim()) {
        throw new Error("The API response did not include a text answer. Check the model ID and endpoint.");
      }

      conversation.messages.push({ role: "assistant", content: answer.trim() });
    } catch (error) {
      const detail = error && error.message ? error.message : "Unknown error.";
      conversation.messages.push({
        role: "assistant",
        content: "I couldn't get a response from the local model. Check that the model is loaded, the endpoint and model ID are correct, and the local server allows browser requests (CORS).\n\nDetails: " + detail
      });
    } finally {
      const waitingNode = $("waitingIndicator");
      if (waitingNode) waitingNode.remove();
      isSending = false;
      conversation.updatedAt = Date.now();
      saveConversationData();
      renderConversation();
      updateSendButton();
      promptInput.focus();
    }
  }

  async function submitPrompt(rawText) {
    const content = rawText.trim();
    if (!content || isSending) return;

    let conversation = activeConversation();
    if (!conversation) conversation = createConversation(content);

    conversation.title = conversation.messages.length ? conversation.title : titleFrom(content);
    conversation.messages.push({ role: "user", content: content });
    conversation.updatedAt = Date.now();

    promptInput.value = "";
    resizePrompt();
    updateSendButton();
    saveConversationData();
    renderConversation();
    await requestModelReply(conversation);
  }

  function startNewConversation() {
    if (isSending) {
      showToast("Wait for the current response to finish before starting a new conversation.");
      return;
    }
    activeConversationId = null;
    promptInput.value = "";
    resizePrompt();
    updateSendButton();
    renderConversation();
    setSidebarOpen(false);
    promptInput.focus();
  }

  promptForm.addEventListener("submit", (event) => {
    event.preventDefault();
    submitPrompt(promptInput.value);
  });

  promptInput.addEventListener("input", () => {
    resizePrompt();
    updateSendButton();
  });

  promptInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      if (!sendButton.disabled) promptForm.requestSubmit();
    }
  });

  document.querySelectorAll(".starter").forEach((button) => {
    button.addEventListener("click", () => {
      promptInput.value = button.dataset.prompt || "";
      resizePrompt();
      updateSendButton();
      promptInput.focus();
    });
  });

  newChatButton.addEventListener("click", startNewConversation);
  mobileMenuButton.addEventListener("click", () => setSidebarOpen(!sidebar.classList.contains("is-open")));
  sidebarScrim.addEventListener("click", () => setSidebarOpen(false));

  $("openModelSettings").addEventListener("click", openModelSettings);
  $("openRuntimeSettings").addEventListener("click", openModelSettings);
  $("closeModelSettings").addEventListener("click", closeModelSettings);
  $("cancelModelSettings").addEventListener("click", closeModelSettings);
  testConnectionButton.addEventListener("click", testModelConnection);
  saveConnectionButton.addEventListener("click", saveModelSettings);

  clearConnectionButton.addEventListener("click", () => {
    modelConfig = null;
    persistModelConfig();
    endpointInput.value = "http://localhost:1234/v1/chat/completions";
    modelIdInput.value = "";
    apiKeyInput.value = "";
    showConnectionMessage("Local model connection removed from this browser.", "success");
  });

  modelDialog.addEventListener("click", (event) => {
    if (event.target === modelDialog) closeModelSettings();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !modelDialog.hidden) closeModelSettings();
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      startNewConversation();
    }
  });

  window.addEventListener("resize", () => {
    if (!window.matchMedia("(max-width: 760px)").matches) setSidebarOpen(false);
  });

  renderHistory();
  renderConversation();
  updateConnectionUI();
  resizePrompt();
  updateSendButton();
})();