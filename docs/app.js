const { amazonLink, products, sizes } = window.AOFMOKA;

const CHAT_ENDPOINT = "https://n8n.fasfsdafasfasfasf.space/webhook/aofmoka-website-chat-v34";
const DOCK_EXIT_MS = 220;
const AUTO_REPLY_MS = 420;

const productGrid = document.querySelector("#product-grid");
const siteHeader = document.querySelector(".site-header");
const headerHomeLink = document.querySelector(".header-bar");
const dockPanel = document.querySelector("#aofmoka-dock-panel");
const dockLauncher = document.querySelector(".dock-launcher");
const dockTeaser = document.querySelector(".dock-teaser");

const chatTopics = [
  { id: "design", label: "find design", reply: "tell us what kind of design you want." },
  { id: "size", label: "size help", reply: "tell us your usual size and we will help." },
  { id: "updates", label: "new drops", reply: "leave your email for new drop alerts.", email: true },
];

let selectedProduct = null;
let dockMode = "closed";
let contentMode = "chat";
let dockCloseTimer;
let autoReplyTimer;
let chatStartedAt = 0;
let activeTopic = "chat";
let showEmail = false;
let messages = [{ from: "aofmoka", text: "hi. what can we help with?" }];

function updateHeaderFade() {
  siteHeader.classList.toggle("site-header-scrolled", window.scrollY !== 0);
}

function scrollPageToAbsoluteTop(event) {
  event.preventDefault();
  window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
  if (window.location.hash) {
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
  }
}

function setExpandedProduct(productIndex) {
  productGrid.querySelectorAll(".product-card").forEach((card) => {
    card.setAttribute("aria-expanded", String(Number(card.dataset.productIndex) === productIndex));
  });
}

function preparePanel(nextContentMode) {
  window.clearTimeout(dockCloseTimer);
  dockPanel.hidden = false;
  dockPanel.className = `dock-panel dock-panel-${nextContentMode}`;
  dockPanel.setAttribute("aria-hidden", "false");
  dockLauncher.setAttribute("aria-expanded", "true");
  dockLauncher.setAttribute("aria-label", "Close AOFMOKA control");
  dockTeaser.classList.remove("dock-teaser-visible");
  contentMode = nextContentMode;
  dockMode = nextContentMode;
}

function closeDock() {
  if (dockMode === "closed" || dockMode === "closing") return;
  window.clearTimeout(dockCloseTimer);
  dockMode = "closing";
  dockPanel.classList.add("dock-panel-closing");
  dockLauncher.setAttribute("aria-expanded", "false");
  dockLauncher.setAttribute("aria-label", "Open AOFMOKA chat");
  dockCloseTimer = window.setTimeout(() => {
    dockMode = "closed";
    dockPanel.hidden = true;
    dockPanel.className = `dock-panel dock-panel-${contentMode}`;
    dockPanel.setAttribute("aria-hidden", "true");
    selectedProduct = null;
    setExpandedProduct(null);
  }, DOCK_EXIT_MS);
}

function renderProductDock(product, productIndex) {
  selectedProduct = product;
  activeTopic = "chat";
  dockPanel.setAttribute("aria-label", `${product.name} options`);
  dockPanel.innerHTML = `
    <div class="dock-product">
      <div class="dock-amazon-badge">
        <span>available at</span>
        <span class="amazon-lockup" role="img" aria-label="Amazon">
          <img class="amazon-word" src="./brand/amazon-word-white.svg" alt="" aria-hidden="true" />
          <img class="amazon-smile" src="./brand/amazon-smile-orange.svg" alt="" aria-hidden="true" />
        </span>
      </div>
      <div class="dock-actions" aria-label="${product.name} actions">
        ${sizes.map((size) => `<a href="${amazonLink(product.sizes[size])}" aria-label="Buy ${product.name} in size ${size} on Amazon">${size.toLowerCase()}</a>`).join("")}
        <button type="button" class="dock-chat-action">chat</button>
      </div>
    </div>`;
  preparePanel("product");
  setExpandedProduct(productIndex);
  dockPanel.querySelector(".dock-chat-action").addEventListener("click", () => openChat("chat"));
}

function renderMessages() {
  const list = dockPanel.querySelector(".dock-messages");
  if (!list) return;
  list.replaceChildren(...messages.map((item) => {
    const bubble = document.createElement("p");
    bubble.className = `dock-message dock-message-${item.from}`;
    bubble.textContent = item.text;
    return bubble;
  }));
  list.scrollTop = list.scrollHeight;
}

function addUserAndReply(userText, reply) {
  messages.push({ from: "you", text: userText });
  renderMessages();
  window.clearTimeout(autoReplyTimer);
  autoReplyTimer = window.setTimeout(() => {
    messages.push({ from: "aofmoka", text: reply });
    renderMessages();
  }, AUTO_REPLY_MS);
}

function renderChatDock() {
  dockPanel.setAttribute("aria-label", "AOFMOKA chat");
  dockPanel.innerHTML = `
    <div class="dock-chat">
      <div class="dock-chat-head">
        <span>aofmoka chat</span>
        <button type="button" class="dock-close" aria-label="Close AOFMOKA chat">×</button>
      </div>
      <div class="dock-messages" aria-live="polite"></div>
      <div class="dock-topics" aria-label="Chat topics">
        ${chatTopics.map((item) => `<button type="button" data-topic="${item.id}">${item.label}</button>`).join("")}
      </div>
      <form class="dock-message-form">
        <label class="screen-reader-only" for="dock-message">message</label>
        <input id="dock-message" type="text" autocomplete="off" placeholder="type a message" />
        <button type="submit">send</button>
      </form>
      <form class="dock-email-form" hidden>
        <label class="screen-reader-only" for="dock-email">email address</label>
        <input id="dock-email" type="email" inputmode="email" autocomplete="email" placeholder="email address" required />
        <input class="dock-honeypot" type="text" name="company" autocomplete="off" tabindex="-1" aria-hidden="true" />
        <button type="submit">send</button>
      </form>
      <p class="dock-error" hidden>please try again.</p>
    </div>`;
  preparePanel("chat");
  renderMessages();

  const messageForm = dockPanel.querySelector(".dock-message-form");
  const messageInput = dockPanel.querySelector("#dock-message");
  const emailForm = dockPanel.querySelector(".dock-email-form");
  const emailInput = dockPanel.querySelector("#dock-email");
  const error = dockPanel.querySelector(".dock-error");

  function updateForms() {
    emailForm.hidden = !showEmail;
    messageForm.hidden = showEmail;
    if (showEmail) emailInput.focus();
  }

  dockPanel.querySelector(".dock-close").addEventListener("click", closeDock);
  dockPanel.querySelectorAll(".dock-topics button").forEach((button) => {
    button.addEventListener("click", () => {
      const selected = chatTopics.find((item) => item.id === button.dataset.topic);
      activeTopic = selected.id;
      showEmail = Boolean(selected.email);
      addUserAndReply(selected.label, selected.reply);
      updateForms();
    });
  });

  messageForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const text = messageInput.value.trim();
    if (!text) return;
    activeTopic = "chat";
    messageInput.value = "";
    showEmail = true;
    addUserAndReply(text, "got it. leave your email and aofmoka will reply.");
    updateForms();
  });

  emailForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submitButton = emailForm.querySelector("button");
    submitButton.disabled = true;
    submitButton.textContent = "...";
    error.hidden = true;
    try {
      await fetch(CHAT_ENDPOINT, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain;charset=UTF-8" },
        body: JSON.stringify({
          email: emailInput.value.trim().toLowerCase(),
          topic: activeTopic,
          message: messages.filter((item) => item.from === "you").at(-1)?.text || "",
          product: selectedProduct?.name || "",
          company: new FormData(emailForm).get("company"),
          page: window.location.href,
          startedAt: chatStartedAt,
        }),
      });
      showEmail = false;
      messages.push({ from: "aofmoka", text: "thank you. we will reply by email." });
      renderMessages();
      emailForm.hidden = true;
      messageForm.hidden = false;
    } catch {
      error.hidden = false;
      submitButton.disabled = false;
      submitButton.textContent = "send";
    }
  });

  updateForms();
}

function openChat(initialTopic = "chat") {
  if (chatStartedAt === 0) chatStartedAt = Date.now();
  activeTopic = initialTopic;
  showEmail = initialTopic === "updates";
  if (showEmail) messages.push({ from: "aofmoka", text: "leave your email for new drop alerts." });
  renderChatDock();
}

function renderProducts() {
  productGrid.innerHTML = products.map((product, index) => (
    `<button class="product-card" type="button" data-product-index="${index}" aria-label="Choose a size for ${product.name}" aria-controls="aofmoka-dock-panel" aria-expanded="false">
      <div class="product-image">
        <img src="./products/${product.image}" alt="${product.name} AOFMOKA graphic shirt" />
      </div>
      <div class="product-meta"><h2>${product.name.toLowerCase()}</h2></div>
    </button>`
  )).join("");

  productGrid.querySelectorAll(".product-card").forEach((card) => {
    card.addEventListener("click", () => {
      const productIndex = Number(card.dataset.productIndex);
      renderProductDock(products[productIndex], productIndex);
    });
  });
}

window.addEventListener("scroll", updateHeaderFade, { passive: true });
headerHomeLink.addEventListener("click", scrollPageToAbsoluteTop);
dockTeaser.addEventListener("click", () => openChat("updates"));
dockLauncher.addEventListener("click", () => {
  if (dockMode === "closed") openChat("chat");
  else closeDock();
});
window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeDock();
});

renderProducts();
updateHeaderFade();
window.setTimeout(() => {
  if (dockMode === "closed") dockTeaser.classList.add("dock-teaser-visible");
}, 700);
