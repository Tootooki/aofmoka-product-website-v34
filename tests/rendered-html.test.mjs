import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("renders the AOFMOKA storefront shell", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /<title>AOFMOKA — Wear the Impossible<\/title>/i);
  assert.equal((html.match(/<section\b/g) ?? []).length, 1);
  assert.equal((html.match(/class="product-card"/g) ?? []).length, 20);
  assert.match(html, /class="living-dock"/);
  assert.doesNotMatch(html, /<footer\b|ALL RIGHTS RESERVED|AOFAGENCY/i);
});

test("maps twenty products and three exact Amazon sizes to sixty tracked child ASINs", async () => {
  const [catalog, dock, page] = await Promise.all([
    readFile(new URL("app/products.ts", root), "utf8"),
    readFile(new URL("app/LivingDock.tsx", root), "utf8"),
    readFile(new URL("app/page.tsx", root), "utf8"),
  ]);
  const images = (await readdir(new URL("public/products/", root))).filter((name) => name.endsWith(".jpg"));
  const asins = [...catalog.matchAll(/"(B[A-Z0-9]{9})"/g)].map((match) => match[1]);
  const names = [...catalog.matchAll(/name: "([^"]+)"/g)].map((match) => match[1]);
  assert.equal(asins.length, 60);
  assert.equal(new Set(asins).size, 60);
  assert.equal(images.length, 20);
  assert.equal(names.length, 20);
  assert.ok(names.every((name) => name.trim().split(/\s+/).length === 2));
  assert.match(catalog, /\["MEDIUM", "LARGE", "XLARGE"\]/);
  assert.doesNotMatch(catalog, /X-LARGE/);
  assert.match(dock, /href=\{amazonLink\(displayedProduct\.sizes\[size\]\)\}/);
  assert.match(dock, /\{size\.toLowerCase\(\)\}/);
  assert.doesNotMatch(dock, /target="_blank"|rel="noreferrer"/);
  assert.match(page, /<LivingDock key=\{selection\?\.requestId \?\? "dock"\} product=\{selection\?\.product \?\? null\}/);
});

test("keeps the original visual system, Font 4, and mirrored header fade", async () => {
  const css = await readFile(new URL("app/globals.css", root), "utf8");
  assert.match(css, /--line:/);
  assert.match(css, /--black: #000000/);
  assert.match(css, /--white: #ffffff/);
  assert.doesNotMatch(css, /box-shadow|text-shadow/i);
  assert.match(css, /@font-face[\s\S]*font-family: "AOFMOKA Font 4"/);
  assert.match(css, /url\("\/fonts\/aofmoka-font4-web\.woff2\?v=6"\)/);
  assert.match(css, /\.site-header::before,[\s\S]*\.site-header::after \{[^}]*opacity: 0;[^}]*transition: opacity 220ms ease-out;/);
  assert.match(css, /\.site-header::before \{[^}]*to top/);
  assert.match(css, /\.site-header::after \{[^}]*to bottom/);
  assert.match(css, /\.site-header-scrolled::before,[\s\S]*\.site-header-scrolled::after \{[^}]*opacity: 1/);
  assert.match(css, /\.product-meta h2 \{[\s\S]*white-space: nowrap;/);
  assert.match(css, /body \{[^}]*white-space: nowrap;/);
  const hexColors = [...css.matchAll(/#[0-9a-fA-F]{6}/g)].map((match) => match[0].toLowerCase());
  assert.deepEqual([...new Set(hexColors)].sort(), ["#000000", "#ffffff"]);
});

test("uses the authentic colorful AOFMOKA logo and Amazon lockup assets", async () => {
  const [publicLogo, docsLogo, publicFont, docsFont, dock, html] = await Promise.all([
    readFile(new URL("public/brand/aofmoka-color-symbols-no-text.png", root)),
    readFile(new URL("docs/brand/aofmoka-color-symbols-no-text.png", root)),
    readFile(new URL("public/fonts/aofmoka-font4-web.woff2", root)),
    readFile(new URL("docs/fonts/aofmoka-font4-web.woff2", root)),
    readFile(new URL("app/LivingDock.tsx", root), "utf8"),
    readFile(new URL("docs/index.html", root), "utf8"),
  ]);
  const digest = (data) => createHash("sha256").update(data).digest("hex");
  assert.equal(digest(publicLogo), "c07f4016db4735b668346e6a3bd4aae939e44791974f4d084adda2df0fcca578");
  assert.equal(digest(docsLogo), digest(publicLogo));
  assert.equal(digest(docsFont), digest(publicFont));
  assert.match(dock, /amazon-word-white\.svg/);
  assert.match(dock, /amazon-smile-orange\.svg/);
  assert.match(html, /dock-emblem/);
});

test("keeps the page minimal and product selection persistent", async () => {
  const [page, header, script, styles] = await Promise.all([
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("app/LogoHeader.tsx", root), "utf8"),
    readFile(new URL("docs/app.js", root), "utf8"),
    readFile(new URL("app/globals.css", root), "utf8"),
  ]);
  assert.equal((page.match(/<section\b/g) ?? []).length, 1);
  assert.match(page, /setSelection\(\(current\) => \(\{ product, requestId: \(current\?\.requestId \?\? 0\) \+ 1 \}\)\)/);
  assert.match(page, /aria-expanded=\{selection\?\.product\.slug === product\.slug\}/);
  assert.match(styles, /\.product-card\[aria-expanded="true"\] h2 \{[^}]*background: var\(--black\);[^}]*color: var\(--white\);/);
  assert.match(header, /window\.scrollY !== 0/);
  assert.match(script, /window\.scrollY !== 0/);
  assert.match(header, /window\.scrollTo\(\{ top: 0, left: 0, behavior: "smooth" \}\)/);
  assert.doesNotMatch(`${page}\n${script}`, /filters|>MENU<|>LOGIN<|<footer\b/i);
});

test("ships one centered living controller with four equal product actions", async () => {
  const [dock, html, script, appCss, docsCss] = await Promise.all([
    readFile(new URL("app/LivingDock.tsx", root), "utf8"),
    readFile(new URL("docs/index.html", root), "utf8"),
    readFile(new URL("docs/app.js", root), "utf8"),
    readFile(new URL("app/globals.css", root), "utf8"),
    readFile(new URL("docs/dock.css", root), "utf8"),
  ]);
  assert.match(dock, /contentMode === "product"/);
  assert.match(dock, /productSizes\.map/);
  assert.match(dock, />chat<\/button>/);
  assert.match(dock, /available at/);
  assert.match(html, /class="living-dock"/);
  assert.match(html, /class="dock-launcher"/);
  assert.match(html, /class="dock-emblem"/);
  assert.doesNotMatch(`${html}\n${script}`, /id="size-popover"|chat-widget|chat-launcher/);
  assert.match(script, /function renderProductDock/);
  assert.match(script, /function closeDock/);
  assert.match(script, /dock-panel-closing/);
  assert.match(appCss, /\.living-dock \{[^}]*position: fixed;[^}]*left: 50%;[^}]*transform: translateX\(-50%\);/);
  assert.match(appCss, /\.dock-actions \{[^}]*grid-template-columns: repeat\(4, minmax\(0, 1fr\)\);/);
  assert.match(appCss, /\.dock-emblem \{[^}]*aofmoka-color-symbols-no-text\.png[^}]*background-size: 700% auto;/);
  assert.match(appCss, /@keyframes dock-panel-enter/);
  assert.match(appCss, /@keyframes dock-panel-exit/);
  assert.match(docsCss, /\.dock-panel-product \{[^}]*width: min\(720px/);
  assert.match(docsCss, /@media \(max-width: 640px\) \{[\s\S]*\.dock-panel-product,[\s\S]*width: min\(360px, calc\(100vw - 24px\)\);/);
});

test("ships interactive chat, automatic replies, subscription teaser, and a secret-free handoff", async () => {
  const [dock, script, html, workflowText] = await Promise.all([
    readFile(new URL("app/LivingDock.tsx", root), "utf8"),
    readFile(new URL("docs/app.js", root), "utf8"),
    readFile(new URL("docs/index.html", root), "utf8"),
    readFile(new URL("automation/aofmoka-website-chat-v33.workflow.json", root), "utf8"),
  ]);
  const workflow = JSON.parse(workflowText);
  assert.match(dock, /new drops\?/);
  assert.match(dock, /type a message/);
  assert.match(dock, /AUTO_REPLY_MS = 420/);
  assert.match(dock, /mode: "no-cors"/);
  assert.match(dock, /aofmoka-website-chat-v34/);
  assert.match(dock, /message: messages\.filter/);
  assert.match(script, /function addUserAndReply/);
  assert.match(script, /AUTO_REPLY_MS = 420/);
  assert.match(script, /openChat\("updates"\)/);
  assert.match(html, /new drops\?/);
  assert.doesNotMatch(`${dock}\n${script}\n${html}`, /AOFMAINORGANIZER_BOT_TOKEN|api\.telegram\.org|bot\d{6,}:/i);
  assert.equal(workflow.name, "AOFMOKA WEBSITE CHAT V34");
  assert.equal(workflow.nodes[0].parameters.path, "aofmoka-website-chat-v34");
  assert.equal(workflow.nodes[2].parameters.chatId, "-1004473190383");
  assert.equal(workflow.nodes[2].parameters.additionalFields.message_thread_id, 516);
  assert.doesNotMatch(workflowText, /bot_token|AOFMAINORGANIZER_BOT_TOKEN|api\.telegram\.org/i);
});
