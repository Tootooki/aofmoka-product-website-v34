/* eslint-disable @next/next/no-img-element */
"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { amazonLink, productSizes, type Product } from "./products";

const CHAT_ENDPOINT = "https://n8n.fasfsdafasfasfasf.space/webhook/aofmoka-website-chat-v34";
const CHAT_HANDOFF_ACTIVE = false;
const DOCK_EXIT_MS = 220;
const AUTO_REPLY_MS = 420;

const topics = [
  { id: "design", label: "find design", reply: "tell us what kind of design you want." },
  { id: "size", label: "size help", reply: "tell us your usual size and we will help." },
  { id: "updates", label: "new drops", reply: "leave your email for new drop alerts.", email: true },
] as const;

type ChatTopic = (typeof topics)[number]["id"] | "chat";
type DockMode = "closed" | "product" | "chat" | "closing";
type Message = { id: number; from: "aofmoka" | "you"; text: string };

export function LivingDock({ product, onDismissProduct }: { product: Product | null; onDismissProduct: () => void }) {
  const [mode, setMode] = useState<DockMode>(product ? "product" : "closed");
  const [contentMode, setContentMode] = useState<"product" | "chat">(product ? "product" : "chat");
  const [displayedProduct, setDisplayedProduct] = useState<Product | null>(product);
  const [teaserVisible, setTeaserVisible] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, from: "aofmoka", text: "hi. what can we help with?" },
  ]);
  const [message, setMessage] = useState("");
  const [topic, setTopic] = useState<ChatTopic>("chat");
  const [showEmail, setShowEmail] = useState(false);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const closeTimer = useRef<ReturnType<typeof window.setTimeout> | null>(null);
  const replyTimer = useRef<ReturnType<typeof window.setTimeout> | null>(null);
  const messageId = useRef(2);
  const startedAt = useRef(0);

  const clearTimers = useCallback(() => {
    if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
    if (replyTimer.current !== null) window.clearTimeout(replyTimer.current);
    closeTimer.current = null;
    replyTimer.current = null;
  }, []);

  const closeDock = useCallback(() => {
    if (mode === "closed" || mode === "closing") return;
    clearTimers();
    setMode("closing");
    closeTimer.current = window.setTimeout(() => {
      setMode("closed");
      setTeaserVisible(false);
      setDisplayedProduct(null);
      onDismissProduct();
      closeTimer.current = null;
    }, DOCK_EXIT_MS);
  }, [clearTimers, mode, onDismissProduct]);

  const openChat = useCallback((initialTopic: ChatTopic = "chat") => {
    clearTimers();
    if (startedAt.current === 0) startedAt.current = Date.now();
    setTopic(initialTopic);
    setStatus("idle");
    setTeaserVisible(false);
    setContentMode("chat");
    setMode("chat");
    if (initialTopic === "updates") {
      setMessages((current) => [
        ...current,
        { id: messageId.current++, from: "aofmoka", text: "leave your email for new drop alerts." },
      ]);
      setShowEmail(true);
    }
  }, [clearTimers]);

  useEffect(() => {
    const teaserTimer = window.setTimeout(() => {
      if (mode === "closed") setTeaserVisible(true);
    }, 700);
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeDock();
    };
    window.addEventListener("keydown", onEscape);
    return () => {
      window.clearTimeout(teaserTimer);
      clearTimers();
      window.removeEventListener("keydown", onEscape);
    };
  }, [clearTimers, closeDock, mode]);

  const addUserAndReply = (userText: string, reply: string) => {
    setMessages((current) => [
      ...current,
      { id: messageId.current++, from: "you", text: userText },
    ]);
    if (replyTimer.current !== null) window.clearTimeout(replyTimer.current);
    replyTimer.current = window.setTimeout(() => {
      setMessages((current) => [
        ...current,
        { id: messageId.current++, from: "aofmoka", text: reply },
      ]);
      replyTimer.current = null;
    }, AUTO_REPLY_MS);
  };

  const chooseTopic = (selected: (typeof topics)[number]) => {
    setTopic(selected.id);
    setStatus("idle");
    setShowEmail(Boolean(selected.email));
    addUserAndReply(selected.label, selected.reply);
  };

  const submitMessage = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = message.trim();
    if (!text) return;
    setTopic("chat");
    setMessage("");
    setShowEmail(true);
    addUserAndReply(text, "got it. leave your email and aofmoka will reply.");
  };

  const submitEmail = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (status === "sending") return;
    if (!CHAT_HANDOFF_ACTIVE) {
      setMessages((current) => [
        ...current,
        { id: messageId.current++, from: "aofmoka", text: "email replies are being connected. please try again soon." },
      ]);
      return;
    }
    setStatus("sending");
    const honeypot = new FormData(event.currentTarget).get("company");
    try {
      await fetch(CHAT_ENDPOINT, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain;charset=UTF-8" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          topic,
          message: messages.filter((item) => item.from === "you").at(-1)?.text ?? "",
          product: displayedProduct?.name ?? "",
          company: honeypot,
          page: window.location.href,
          startedAt: startedAt.current,
        }),
      });
      setStatus("sent");
      setShowEmail(false);
      setMessages((current) => [
        ...current,
        { id: messageId.current++, from: "aofmoka", text: "thank you. we will reply by email." },
      ]);
    } catch {
      setStatus("error");
    }
  };

  const panelVisible = mode !== "closed";

  return (
    <div className="living-dock">
      <button
        type="button"
        className={`dock-teaser${teaserVisible && mode === "closed" ? " dock-teaser-visible" : ""}`}
        onClick={() => openChat("updates")}
        aria-label="Join AOFMOKA new drop updates"
      >
        new drops?
      </button>

      <div
        id="aofmoka-dock-panel"
        className={`dock-panel dock-panel-${contentMode} dock-panel-${mode}`}
        role="dialog"
        aria-label={contentMode === "product" && displayedProduct ? `${displayedProduct.name} options` : "AOFMOKA chat"}
        aria-hidden={!panelVisible}
        hidden={!panelVisible}
      >
        {contentMode === "product" && displayedProduct ? (
          <div className="dock-product" key={displayedProduct.slug}>
            <div className="dock-amazon-badge">
              <span>available at</span>
              <span className="amazon-lockup" role="img" aria-label="Amazon">
                <img className="amazon-word" src="/brand/amazon-word-white.svg" alt="" aria-hidden="true" />
                <img className="amazon-smile" src="/brand/amazon-smile-orange.svg" alt="" aria-hidden="true" />
              </span>
            </div>
            <div className="dock-actions" aria-label={`${displayedProduct.name} actions`}>
              {productSizes.map((size) => (
                <a
                  key={size}
                  href={amazonLink(displayedProduct.sizes[size])}
                  aria-label={`Buy ${displayedProduct.name} in size ${size} on Amazon`}
                >
                  {size.toLowerCase()}
                </a>
              ))}
              <button type="button" onClick={() => openChat("chat")}>chat</button>
            </div>
          </div>
        ) : null}

        {contentMode === "chat" ? (
          <div className="dock-chat">
            <div className="dock-chat-head">
              <span>aofmoka chat</span>
              <button type="button" className="dock-close" onClick={closeDock} aria-label="Close AOFMOKA chat">×</button>
            </div>
            <div className="dock-messages" aria-live="polite">
              {messages.map((item) => (
                <p className={`dock-message dock-message-${item.from}`} key={item.id}>{item.text}</p>
              ))}
            </div>
            <div className="dock-topics" aria-label="Chat topics">
              {topics.map((item) => (
                <button type="button" key={item.id} onClick={() => chooseTopic(item)}>{item.label}</button>
              ))}
            </div>
            {showEmail && status !== "sent" ? (
              <form className="dock-email-form" onSubmit={submitEmail}>
                <label className="screen-reader-only" htmlFor="dock-email">email address</label>
                <input id="dock-email" type="email" inputMode="email" autoComplete="email" placeholder="email address" value={email} onChange={(event) => setEmail(event.target.value)} required />
                <input className="dock-honeypot" type="text" name="company" autoComplete="off" tabIndex={-1} aria-hidden="true" />
                <button type="submit" disabled={status === "sending"}>{status === "sending" ? "..." : "send"}</button>
              </form>
            ) : (
              <form className="dock-message-form" onSubmit={submitMessage}>
                <label className="screen-reader-only" htmlFor="dock-message">message</label>
                <input id="dock-message" type="text" autoComplete="off" placeholder="type a message" value={message} onChange={(event) => setMessage(event.target.value)} />
                <button type="submit">send</button>
              </form>
            )}
            {status === "error" ? <p className="dock-error">please try again.</p> : null}
          </div>
        ) : null}
      </div>

      <button
        type="button"
        className="dock-launcher"
        aria-label={panelVisible ? "Close AOFMOKA control" : "Open AOFMOKA chat"}
        aria-expanded={panelVisible}
        aria-controls="aofmoka-dock-panel"
        onClick={panelVisible ? closeDock : () => openChat("chat")}
      >
        <span className="dock-emblem" aria-hidden="true" />
      </button>
    </div>
  );
}
