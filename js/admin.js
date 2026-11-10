import { STORE_CHANNEL, getClient, isConfigured } from "./supabase.js";
import { LANGUAGES, esc, friendlyError, kindLabel, languageFlag, money, safeUrl } from "./format.js";
import { cardDetails, collectionCode, loadSets, searchCards } from "./pokemon.js";
import { iconImg, tabIcon } from "./icons.js";

const AUTO_CONDITION = { sealed: "Lacrado", single: "NM", accessory: "Novo" };
const KINDS = [["sealed", "Lacrado"], ["single", "Avulso"], ["accessory", "Acessório"]];
const KIND_PLURAL = { sealed: "Lacrados", single: "Avulsos", accessory: "Acessórios" };
const GAMES = [
  "Pokémon",
  "One Piece Card Game",
  "Magic: The Gathering",
  "Disney Lorcana",
  "Yu-Gi-Oh!",
  "Digimon",
  "Dragon Ball Super Card Game",
  "Flesh and Blood",
  "Sorcery: Contested Realm",
  "Acessórios",
];
const CONDITIONS = ["Lacrado", "Novo", "NM", "SP", "MP", "HP", "Danificada"];
const FINISHES = ["Normal", "Foil", "Reverse", "Etched"];
const LOW_STOCK = 2;
const ADMIN_SQL = "insert into public.admins (user_id) values ('cole-o-uuid-aqui');";
const PAGE_NAMES = {
  contato: "Contato",
  privacidade: "Privacidade",
  cookies: "Cookies",
  trocas: "Trocas e devoluções",
  reembolso: "Reembolso",
  envio: "Envio",
  termos: "Termos de uso",
};

const ICONS = {
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  box: '<path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/>',
  layers: '<path d="M12 3l9 5-9 5-9-5 9-5z"/><path d="M3 13l9 5 9-5"/><path d="M3 17.5l9 5 9-5"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="2.5"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h10"/>',
  chart: '<path d="M3 20h18"/><path d="M7 16v-5"/><path d="M12 16V6"/><path d="M17 16v-8"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="M13.5 6.5l4 4"/>',
  trash: '<path d="M4 7h16"/><path d="M9 7V4h6v3"/><path d="M6 7l1 13h10l1-13"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
  logout: '<path d="M15 4h4v16h-4"/><path d="M10 8l-4 4 4 4"/><path d="M6 12h10"/>',
  store: '<path d="M4 10v10h16V10"/><path d="M3 10l2-6h14l2 6"/><path d="M3 10c0 1.7 1.3 3 3 3s3-1.3 3-3c0 1.7 1.3 3 3 3s3-1.3 3-3c0 1.7 1.3 3 3 3s3-1.3 3-3"/>',
  alert: '<path d="M12 3l10 18H2L12 3z"/><path d="M12 10v4"/><path d="M12 17.5v.01"/>',
  users: '<circle cx="9" cy="8" r="4"/><path d="M2 21c0-4 3-6 7-6s7 2 7 6"/><path d="M16 4a4 4 0 010 8"/><path d="M19 15c2 .7 3 2.6 3 6"/>',
  money: '<rect x="2" y="6" width="20" height="12" rx="2.5"/><circle cx="12" cy="12" r="3"/><path d="M6 12h.01M18 12h.01"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  sparkle: '<path d="M12 3l2.2 5.8L20 11l-5.8 2.2L12 19l-2.2-5.8L4 11l5.8-2.2L12 3z"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  link: '<path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1"/>',
};

const SECTIONS = [
  ["visao", "Visão geral", "overview"],
  ["produtos", "Produtos", "products"],
  ["estoque", "Estoque", "stock"],
  ["banners", "Banners", "banners"],
  ["abas", "Abas", "tabs"],
  ["visitas", "Visitas", "visits"],
];
const PRODUCT_FILTERS = [
  ["all", "Todos"],
  ["sealed", "Lacrados"],
  ["single", "Avulsos"],
  ["accessory", "Acessórios"],
  ["hidden", "Ocultos"],
  ["out", "Esgotados"],
];
const STOCK_FILTERS = [
  ["all", "Todos"],
  ["low", "Acabando"],
  ["out", "Esgotados"],
];

const app = document.querySelector("#app");
const state = {
  mode: "boot",
  session: null,
  email: "",
  products: [],
  banners: [],
  tabs: [],
  visits: [],
  sets: [],
  error: "",
  notice: "",
  extraError: "",
  q: "",
  filter: "all",
  stockFilter: "all",
  editor: null,
  busy: false,
};

let noticeTimer = 0;
let searchTimer = 0;
let searchToken = 0;
let cardResults = [];
let activeResult = -1;
let searchField = "f-name";
const RESULT_BOXES = { "f-name": "card-results", "f-number": "number-results" };

function icon(name) {
  return `<svg class="i" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ""}</svg>`;
}

function stockOf(product) {
  return Number(product.stock) || 0;
}

function blankForm() {
  return {
    id: "",
    name: "",
    kind: "single",
    game: "Pokémon",
    collection: "",
    collection_code: "",
    card_number: "",
    language: "PT-BR",
    condition: "NM",
    finish: "Normal",
    rarity: "",
    price: "",
    compare_at: "",
    stock: "1",
    tag: "",
    badge: "",
    image_url: "",
    description: "",
    featured: false,
    active: true,
  };
}

function formFromProduct(product) {
  return {
    id: product.id,
    name: product.name || "",
    kind: product.kind || "sealed",
    game: product.game || "",
    collection: product.collection || "",
    collection_code: product.collection_code || "",
    card_number: product.card_number || "",
    language: product.language || "PT-BR",
    condition: product.condition || "NM",
    finish: product.finish || "Normal",
    rarity: product.rarity || "",
    price: product.price ?? "",
    compare_at: product.compare_at ?? "",
    stock: product.stock ?? 0,
    tag: product.tag || "",
    badge: product.badge || "",
    image_url: product.image_url || "",
    description: product.description || "",
    featured: Boolean(product.featured),
    active: product.active !== false,
  };
}

function render() {
  const focus = document.activeElement;
  const focusId = focus?.id || "";
  const start = focus?.selectionStart;
  const end = focus?.selectionEnd;
  app.innerHTML = layout();
  document.body.classList.toggle("lock", Boolean(state.editor));
  if (state.notice) {
    clearTimeout(noticeTimer);
    noticeTimer = setTimeout(() => {
      state.notice = "";
      document.querySelector(".toast")?.remove();
    }, 3200);
  }
  if (!focusId) return;
  const field = document.getElementById(focusId);
  if (!field) return;
  field.focus();
  if (start != null && field.setSelectionRange) field.setSelectionRange(start, end);
}

function layout() {
  if (state.mode === "boot") return frame(`<div class="auth-card stack"><div class="spinner"></div><p class="lede">Conectando…</p></div>`);
  if (state.mode === "setup") return frame(setup());
  if (state.mode === "login") return frame(login());
  if (state.mode === "denied") return frame(denied());
  return appShell();
}

function frame(content) {
  return `<main class="auth">${content}</main>`;
}

function logo() {
  return `<img src="/assets/logo.webp" alt="Goldpack">`;
}

function setup() {
  return `
    <section class="setup stack">
      ${logo()}
      <h1>Conectar o Supabase</h1>
      <p class="lede">O catálogo começa vazio. O painel publica os produtos de verdade depois desta conexão.</p>
      <ol>
        <li>Crie um projeto em supabase.com.</li>
        <li>No SQL Editor, execute o arquivo <strong>supabase/schema.sql</strong> desta pasta.</li>
        <li>Em Authentication → Users, crie seu usuário com e-mail e senha.</li>
        <li>Copie o UUID desse usuário e rode o comando abaixo.</li>
        <li>Em Project Settings → API, copie a Project URL e a chave <strong>anon</strong>.</li>
        <li>Cole as duas em <strong>js/config.js</strong>. Não use a service_role no site.</li>
        <li>Abra o site por um servidor (não dê dois cliques no arquivo) e volte nesta página.</li>
      </ol>
      <code>${esc(ADMIN_SQL)}</code>
      <div class="row-actions">
        <button class="btn btn-orange" type="button" data-act="copy-sql">Copiar comando</button>
        <a class="btn btn-line" href="/">Ver a loja</a>
      </div>
      <p class="note">Se o login disser que o e-mail não foi confirmado, confirme o usuário no Supabase ou desative “Confirm email” em Authentication → Providers → Email.</p>
    </section>
  `;
}

function login() {
  return `
    <form class="auth-card stack" data-act="login">
      ${logo()}
      <h1>Entrar</h1>
      <p class="lede">Acesso do painel da loja.</p>
      ${state.error ? `<p class="alert" role="alert">${icon("alert")}<span>${esc(state.error)}</span></p>` : ""}
      <label class="field">E-mail
        <input name="email" type="email" autocomplete="username" required value="${esc(state.email || "")}">
      </label>
      <label class="field">Senha
        <input name="password" type="password" autocomplete="current-password" required>
      </label>
      <button class="btn btn-orange" type="submit" ${state.busy ? "disabled" : ""}>${state.busy ? "Entrando…" : "Entrar"}</button>
      <a class="btn btn-line" href="/">Voltar à loja</a>
    </form>
  `;
}

function denied() {
  return `
    <section class="auth-card stack">
      ${logo()}
      <h1>Conta sem acesso</h1>
      <p class="lede">O login funcionou, mas este usuário não está na tabela admins.</p>
      <code>${esc(ADMIN_SQL)}</code>
      <p class="note">Troque o texto pelo UUID que aparece em Authentication → Users. Você está como ${esc(state.session?.user?.email || "")}.</p>
      <button class="btn btn-purple" type="button" data-act="logout">Sair</button>
    </section>
  `;
}

function currentSection() {
  const name = (location.hash || "#visao").replace(/^#/, "").split("?")[0];
  return SECTIONS.some(([id]) => id === name) ? name : "visao";
}

function navBadge(id) {
  if (id === "produtos" && state.products.length) return `<em class="nav-count">${state.products.length}</em>`;
  if (id === "estoque") {
    const out = state.products.filter((product) => stockOf(product) <= 0).length;
    if (out) return `<em class="nav-count warn" title="${out} esgotado(s)">${out}</em>`;
  }
  return "";
}

function navLinks(section) {
  return SECTIONS.map(([id, label, ico]) => `
    <a class="${id === section ? "on" : ""}" href="#${id}" ${id === section ? `aria-current="page"` : ""}>
      ${iconImg(ico, "nav-ico")}<span>${label}</span>${navBadge(id)}
    </a>
  `).join("");
}

function appShell() {
  const section = currentSection();
  const email = state.session?.user?.email || "";
  return `
    <div class="shell">
      <aside class="side">
        <a class="side-brand" href="/" target="_blank" rel="noopener" aria-label="Abrir a loja">${logo()}</a>
        <p class="side-label">Painel</p>
        <nav class="side-nav" aria-label="Seções do painel">${navLinks(section)}</nav>
        <div class="side-foot">
          <a class="side-link" href="/" target="_blank" rel="noopener">${iconImg("store", "nav-ico")}<span>Ver a loja</span></a>
          <button class="side-link" type="button" data-act="logout">${icon("logout")}<span>Sair</span></button>
          <p class="side-user" title="${esc(email)}"><span class="avatar">${esc((email[0] || "G").toUpperCase())}</span><span>${esc(email)}</span></p>
        </div>
      </aside>
      <header class="mtop">
        <a class="mtop-brand" href="/" target="_blank" rel="noopener" aria-label="Abrir a loja">${logo()}</a>
        <div class="mtop-actions">
          <a class="icon-btn" href="/" target="_blank" rel="noopener" aria-label="Ver a loja">${icon("store")}</a>
          <button class="icon-btn" type="button" data-act="logout" aria-label="Sair">${icon("logout")}</button>
        </div>
      </header>
      <main class="workspace">
        ${state.error && !state.editor ? `<p class="alert" role="alert">${icon("alert")}<span>${esc(state.error)}</span><button class="alert-x" type="button" data-act="dismiss" aria-label="Fechar aviso">${icon("close")}</button></p>` : ""}
        ${state.extraError ? `<p class="alert soft">${icon("alert")}<span>${esc(state.extraError)}</span></p>` : ""}
        ${panelFor(section)}
      </main>
      <nav class="tabbar" aria-label="Seções do painel">${navLinks(section)}</nav>
    </div>
    ${state.notice ? `<p class="toast" role="status">${icon("check")}<span>${esc(state.notice)}</span></p>` : ""}
    ${state.editor ? editor(state.editor) : ""}
  `;
}

function panelFor(section) {
  if (section === "produtos") return productsPanel();
  if (section === "estoque") return stockPanel();
  if (section === "banners") return bannersPanel();
  if (section === "abas") return tabsPanel();
  if (section === "visitas") return visitsPanel();
  return overview();
}

function pageHead(title, subtitle, actions = "") {
  return `
    <div class="page-head">
      <div>
        <h1>${title}</h1>
        ${subtitle ? `<p>${subtitle}</p>` : ""}
      </div>
      ${actions ? `<div class="page-actions">${actions}</div>` : ""}
    </div>
  `;
}

function newProductButton() {
  return `<button class="btn btn-orange" type="button" data-act="new">${icon("plus")}<span>Novo produto</span></button>`;
}

function thumb(product, size = "") {
  const image = safeUrl(product.image_url);
  return image
    ? `<img class="thumb ${size}" src="${esc(image)}" alt="" loading="lazy">`
    : `<span class="thumb ph ${size}">${esc(initials(product.name))}</span>`;
}

function initials(name) {
  return String(name || "GP").trim().split(/\s+/).slice(0, 2).map((part) => part[0] || "").join("").toUpperCase();
}

function stockPill(product) {
  const stock = stockOf(product);
  if (stock <= 0) return `<span class="pill out">Esgotado</span>`;
  if (stock <= LOW_STOCK) return `<span class="pill low">${stock} un</span>`;
  return `<span class="pill ok">${stock} un</span>`;
}

function emptyState(title, text, action = "") {
  return `<div class="empty">${icon("sparkle")}<h2>${title}</h2><p>${text}</p>${action}</div>`;
}

function dayKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function visitDays(count) {
  const totals = new Map();
  state.visits.forEach((visit) => {
    const date = new Date(visit.created_at);
    if (Number.isNaN(date.getTime())) return;
    const key = dayKey(date);
    totals.set(key, (totals.get(key) || 0) + 1);
  });
  const days = [];
  const cursor = new Date();
  cursor.setHours(12, 0, 0, 0);
  cursor.setDate(cursor.getDate() - (count - 1));
  for (let i = 0; i < count; i += 1) {
    const key = dayKey(cursor);
    days.push({
      key,
      label: String(cursor.getDate()).padStart(2, "0"),
      title: cursor.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" }),
      count: totals.get(key) || 0,
    });
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

function pathLabel(path) {
  const hash = String(path || "/").split("#")[1] || "/";
  const [route, query] = hash.split("?");
  const parts = route.split("/").filter(Boolean);
  if (!parts.length) return "Início";
  if (parts[0] === "p") {
    const product = state.products.find((item) => item.id === decodeURIComponent(parts[1] || ""));
    return product ? product.name : "Produto removido";
  }
  if (parts[0] === "catalog") {
    const params = new URLSearchParams(query || "");
    const kind = params.get("kind");
    if (params.get("q")) return `Busca: ${params.get("q")}`;
    return kind ? `Catálogo · ${KIND_PLURAL[kind] || kind}` : "Catálogo";
  }
  return PAGE_NAMES[parts[0]] || parts[0];
}

function referrerLabel(referrer) {
  if (!referrer) return "Direto";
  try {
    const host = new URL(referrer).hostname.replace(/^www\./, "");
    if (host === location.hostname.replace(/^www\./, "")) return "Navegação interna";
    return host;
  } catch {
    return referrer;
  }
}

function deviceLabel(agent) {
  const ua = String(agent || "");
  if (!ua) return "—";
  const device = /iPad|Tablet/i.test(ua) ? "Tablet" : /Mobi|Android|iPhone/i.test(ua) ? "Celular" : "Computador";
  let browser = "Navegador";
  if (/Edg\//.test(ua)) browser = "Edge";
  else if (/OPR\//.test(ua)) browser = "Opera";
  else if (/YaBrowser/.test(ua)) browser = "Yandex";
  else if (/SamsungBrowser/.test(ua)) browser = "Samsung";
  else if (/Firefox\//.test(ua)) browser = "Firefox";
  else if (/Chrome\//.test(ua)) browser = "Chrome";
  else if (/Safari\//.test(ua)) browser = "Safari";
  return `${device} · ${browser}`;
}

function when(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function kpi({ label, value, hint, ico, tone }) {
  return `
    <article class="kpi">
      <span class="kpi-icon ${tone}">${icon(ico)}</span>
      <div>
        <span class="kpi-label">${label}</span>
        <b class="kpi-value">${value}</b>
        ${hint ? `<small>${hint}</small>` : ""}
      </div>
    </article>
  `;
}

function chartCard(title, days) {
  const total = days.reduce((sum, day) => sum + day.count, 0);
  const max = Math.max(1, ...days.map((day) => day.count));
  return `
    <section class="card">
      <div class="card-head">
        <h2>${title}</h2>
        <span class="muted">${total} ${total === 1 ? "visita" : "visitas"}</span>
      </div>
      <div class="bars${days.length > 20 ? " dense" : ""}" style="--cols:${days.length}">
        ${days.map((day) => `
          <div class="bar" title="${esc(day.title)}: ${day.count} ${day.count === 1 ? "visita" : "visitas"}">
            <div class="bar-track">
              ${day.count ? `<b>${day.count}</b>` : ""}
              <i style="height:${day.count ? Math.max(6, Math.round((day.count / max) * 100)) : 2}%"></i>
            </div>
            <small>${day.label}</small>
          </div>
        `).join("")}
      </div>
    </section>
  `;
}

function overview() {
  const products = state.products;
  const live = products.filter((product) => product.active);
  const units = products.reduce((sum, product) => sum + stockOf(product), 0);
  const value = live.reduce((sum, product) => sum + stockOf(product) * (Number(product.price) || 0), 0);
  const out = products.filter((product) => stockOf(product) <= 0);
  const low = products.filter((product) => stockOf(product) > 0 && stockOf(product) <= LOW_STOCK);
  const days = visitDays(14);
  const today = days[days.length - 1].count;
  const week = days.slice(-7).reduce((sum, day) => sum + day.count, 0);
  const greeting = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
  const alerts = [...out, ...low].slice(0, 6);
  const mix = KINDS.map(([kind, label]) => [label, products.filter((product) => product.kind === kind).length]);
  const mixMax = Math.max(1, ...mix.map(([, count]) => count));
  const pages = topCounts(state.visits.map((visit) => pathLabel(visit.path)), 5);
  const pagesMax = Math.max(1, ...pages.map(([, count]) => count));
  return `
    ${pageHead("Visão geral", `Resumo da Goldpack · ${esc(greeting)}`, `${newProductButton()}<a class="btn btn-line" href="/" target="_blank" rel="noopener">${icon("store")}<span>Ver a loja</span></a>`)}
    <div class="kpis">
      ${kpi({ label: "Na loja", value: live.length, hint: `${products.length} cadastrados`, ico: "box", tone: "purple" })}
      ${kpi({ label: "Unidades em estoque", value: units, hint: out.length ? `${out.length} esgotado(s)` : "Nenhum esgotado", ico: "layers", tone: "orange" })}
      ${kpi({ label: "Valor em estoque", value: money(value), hint: "Preço × unidades na loja", ico: "money", tone: "green" })}
      ${kpi({ label: "Visitas hoje", value: today, hint: `${week} nos últimos 7 dias`, ico: "users", tone: "blue" })}
    </div>
    <div class="dash-grid">
      ${chartCard("Visitas nos últimos 14 dias", days)}
      <section class="card">
        <div class="card-head">
          <h2>Atenção no estoque</h2>
          <a class="card-link" href="#estoque">Ver estoque</a>
        </div>
        ${alerts.length ? `<ul class="mini-list">${alerts.map((product) => `
          <li>
            ${thumb(product, "sm")}
            <span class="mini-name">${esc(product.name)}</span>
            ${stockPill(product)}
          </li>
        `).join("")}</ul>` : `<p class="muted pad">${products.length ? "Tudo certo: nenhum produto acabando." : "Cadastre produtos para acompanhar o estoque."}</p>`}
      </section>
    </div>
    <div class="dash-grid three">
      <section class="card">
        <div class="card-head"><h2>Catálogo por tipo</h2><a class="card-link" href="#produtos">Ver produtos</a></div>
        <ul class="meter-list">
          ${mix.map(([label, count]) => `<li><span>${label}</span><div class="meter"><i style="width:${Math.round((count / mixMax) * 100)}%"></i></div><b>${count}</b></li>`).join("")}
        </ul>
      </section>
      <section class="card">
        <div class="card-head"><h2>Páginas mais vistas</h2><a class="card-link" href="#visitas">Ver visitas</a></div>
        ${pages.length ? `<ul class="meter-list">${pages.map(([label, count]) => `<li><span title="${esc(label)}">${esc(label)}</span><div class="meter alt"><i style="width:${Math.round((count / pagesMax) * 100)}%"></i></div><b>${count}</b></li>`).join("")}</ul>` : `<p class="muted pad">Nenhuma visita ainda.</p>`}
      </section>
      <section class="card">
        <div class="card-head"><h2>Últimos produtos</h2><button class="card-link" type="button" data-act="new">${icon("plus")} Novo</button></div>
        ${products.length ? `<ul class="mini-list">${products.slice(0, 5).map((product) => `
          <li>
            ${thumb(product, "sm")}
            <button class="mini-name as-link" type="button" data-act="edit" data-id="${esc(product.id)}">${esc(product.name)}</button>
            <span class="mini-price">${money(product.price)}</span>
          </li>
        `).join("")}</ul>` : `<p class="muted pad">Nenhum produto cadastrado ainda.</p>`}
      </section>
    </div>
  `;
}

function topCounts(values, limit) {
  const counts = new Map();
  values.forEach((value) => counts.set(value, (counts.get(value) || 0) + 1));
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit);
}

function searchBox(placeholder) {
  return `
    <label class="searchbox">
      ${icon("search")}
      <span class="sr">${placeholder}</span>
      <input id="admin-q" type="search" placeholder="${placeholder}" value="${esc(state.q)}">
    </label>
  `;
}

function matchesQuery(product) {
  const q = state.q.trim().toLowerCase();
  if (!q) return true;
  return [product.name, product.game, product.collection, product.collection_code, product.card_number]
    .join(" ").toLowerCase().includes(q);
}

function productFilter(id) {
  if (id === "hidden") return (product) => !product.active;
  if (id === "out") return (product) => stockOf(product) <= 0;
  if (id === "sealed" || id === "single" || id === "accessory") return (product) => product.kind === id;
  return () => true;
}

function chips(filters, current, act, list, predicateFor) {
  return `<div class="chips" role="group" aria-label="Filtrar">${filters.map(([id, label]) => `
    <button class="chip${current === id ? " on" : ""}" type="button" data-act="${act}" data-filter="${id}" aria-pressed="${current === id}">
      ${label}<span>${list.filter(predicateFor(id)).length}</span>
    </button>
  `).join("")}</div>`;
}

function productsPanel() {
  const searched = state.products.filter(matchesQuery);
  const products = searched.filter(productFilter(state.filter));
  const live = state.products.filter((product) => product.active).length;
  return `
    ${pageHead("Produtos", `${state.products.length} cadastrados · ${live} na loja`, newProductButton())}
    <div class="toolbar">
      ${searchBox("Buscar por nome, coleção ou número")}
      ${chips(PRODUCT_FILTERS, state.filter, "filter", searched, productFilter)}
    </div>
    ${products.length ? `
      <div class="table">
        <div class="thead" aria-hidden="true">
          <span>Produto</span><span>Tipo</span><span>Preço</span><span>Estoque</span><span>Na loja</span><span></span>
        </div>
        ${products.map(productRow).join("")}
      </div>
    ` : emptyState(
      state.products.length ? "Nenhum produto com esse filtro" : "Nenhum produto ainda",
      state.products.length ? "Tente outro termo ou limpe os filtros." : "Cadastre o primeiro anúncio. Para cartas Pokémon, digite o nome e o painel preenche o resto.",
      state.products.length ? "" : newProductButton(),
    )}
  `;
}

function productRow(product) {
  const meta = [
    ...[product.collection, product.card_number].filter(Boolean).map(esc),
    languageFlag(product.language),
  ].filter(Boolean).join(" · ");
  const compare = Number(product.compare_at) > Number(product.price) ? `<s>${money(product.compare_at)}</s>` : "";
  return `
    <article class="prow${product.active ? "" : " is-hidden"}">
      <button class="prow-main" type="button" data-act="edit" data-id="${esc(product.id)}">
        ${thumb(product)}
        <span class="prow-text">
          <span class="prow-name">${esc(product.name)}</span>
          <span class="prow-meta">${meta || esc(product.game || kindLabel(product.kind))}</span>
        </span>
      </button>
      <span class="prow-kind"><span class="pill kind">${esc(kindLabel(product.kind))}</span></span>
      <span class="prow-price">${money(product.price)}${compare}</span>
      <span class="prow-stock">${stockPill(product)}</span>
      <button class="switch${product.active ? " on" : ""}" type="button" role="switch" aria-checked="${product.active}" data-act="toggle" data-id="${esc(product.id)}" aria-label="${product.active ? "Ocultar da loja" : "Publicar na loja"}: ${esc(product.name)}">
        <span></span><em>${product.active ? "Na loja" : "Oculto"}</em>
      </button>
      <div class="row-btns">
        <button class="icon-btn" type="button" data-act="edit" data-id="${esc(product.id)}" aria-label="Editar ${esc(product.name)}" title="Editar">${icon("edit")}</button>
        <button class="icon-btn danger" type="button" data-act="delete" data-id="${esc(product.id)}" aria-label="Excluir ${esc(product.name)}" title="Excluir">${icon("trash")}</button>
      </div>
    </article>
  `;
}

function stockFilter(id) {
  if (id === "low") return (product) => stockOf(product) > 0 && stockOf(product) <= LOW_STOCK;
  if (id === "out") return (product) => stockOf(product) <= 0;
  return () => true;
}

function stockPanel() {
  const searched = state.products.filter(matchesQuery);
  const products = searched.filter(stockFilter(state.stockFilter));
  const units = state.products.reduce((sum, product) => sum + stockOf(product), 0);
  return `
    ${pageHead("Estoque", `${units} unidades no total · ajuste e salve cada produto`)}
    <div class="toolbar">
      ${searchBox("Buscar no estoque")}
      ${chips(STOCK_FILTERS, state.stockFilter, "stock-filter", searched, stockFilter)}
    </div>
    ${products.length ? `
      <div class="table">
        ${products.map((product) => `
          <article class="srow">
            <div class="srow-main">
              ${thumb(product)}
              <span class="prow-text">
                <span class="prow-name">${esc(product.name)}</span>
                <span class="prow-meta">${esc(kindLabel(product.kind))} · ${money(product.price)}</span>
              </span>
            </div>
            ${stockPill(product)}
            <div class="qty" data-qty="${esc(product.id)}">
              <button type="button" data-act="stock-step" data-dir="-1" data-id="${esc(product.id)}" aria-label="Diminuir estoque de ${esc(product.name)}">${icon("minus")}</button>
              <input class="stock-input" data-stock="${esc(product.id)}" data-saved="${stockOf(product)}" type="number" min="0" step="1" inputmode="numeric" value="${stockOf(product)}" aria-label="Estoque de ${esc(product.name)}">
              <button type="button" data-act="stock-step" data-dir="1" data-id="${esc(product.id)}" aria-label="Aumentar estoque de ${esc(product.name)}">${icon("plus")}</button>
            </div>
            <button class="btn btn-purple btn-sm" type="button" data-act="stock-save" data-id="${esc(product.id)}" disabled>Salvar</button>
          </article>
        `).join("")}
      </div>
    ` : emptyState(state.products.length ? "Nada nesse filtro" : "Nenhum produto no estoque", state.products.length ? "Tente outro filtro ou termo." : "Os produtos cadastrados aparecem aqui para ajustar a quantidade.")}
  `;
}

function bannersPanel() {
  return `
    ${pageHead("Banners", "Carrossel do topo da página inicial · imagens de 2400 × 800 px", `<button class="btn btn-orange" type="button" data-act="new-banner">${icon("plus")}<span>Novo banner</span></button>`)}
    ${state.banners.length ? `
      <div class="banner-grid">
        ${state.banners.map((banner) => {
          const image = safeUrl(banner.image_url);
          return `
            <article class="banner-card${banner.active ? "" : " is-hidden"}">
              <div class="banner-img">${image ? `<img src="${esc(image)}" alt="" loading="lazy">` : icon("image")}</div>
              <div class="banner-body">
                <div>
                  <h2>${esc(banner.title || "Sem título")}</h2>
                  <p class="muted">${banner.link ? `${icon("link")} ${esc(banner.link)}` : "Sem link"} · posição ${Number(banner.sort_order) || 0}</p>
                </div>
                <span class="pill ${banner.active ? "ok" : "muted"}">${banner.active ? "Na loja" : "Oculto"}</span>
              </div>
              <div class="banner-actions">
                <button class="btn btn-line btn-sm" type="button" data-act="edit-banner" data-id="${esc(banner.id)}">${icon("edit")}<span>Editar</span></button>
                <button class="icon-btn danger" type="button" data-act="delete-banner" data-id="${esc(banner.id)}" aria-label="Excluir banner" title="Excluir">${icon("trash")}</button>
              </div>
            </article>
          `;
        }).join("")}
      </div>
    ` : emptyState("Nenhum banner publicado", "A página inicial está sem carrossel. Publique um banner de 2400 × 800 px e ele aparece no topo da loja.", `<button class="btn btn-orange" type="button" data-act="new-banner">${icon("plus")}<span>Novo banner</span></button>`)}
  `;
}

function tabsPanel() {
  return `
    ${pageHead("Abas", "Atalhos do menu da loja, na ordem em que aparecem", `<button class="btn btn-orange" type="button" data-act="new-tab">${icon("plus")}<span>Nova aba</span></button>`)}
    ${state.tabs.length ? `
      <div class="table">
        ${state.tabs.map((tab) => `
          <article class="trow${tab.active ? "" : " is-hidden"}">
            <span class="trow-order">${Number(tab.sort_order) || 0}</span>
            <span class="prow-text trow-text">
              ${tabIcon(tab.href, tab.label)}
              <span class="prow-name">${esc(tab.label)}</span>
              <span class="prow-meta">${esc(tab.href)}</span>
            </span>
            <span class="pill ${tab.active ? "ok" : "muted"}">${tab.active ? "Visível" : "Oculta"}</span>
            <div class="row-btns">
              <button class="icon-btn" type="button" data-act="edit-tab" data-id="${esc(tab.id)}" aria-label="Editar ${esc(tab.label)}" title="Editar">${icon("edit")}</button>
              <button class="icon-btn danger" type="button" data-act="delete-tab" data-id="${esc(tab.id)}" aria-label="Excluir ${esc(tab.label)}" title="Excluir">${icon("trash")}</button>
            </div>
          </article>
        `).join("")}
      </div>
    ` : emptyState("Nenhuma aba", "Crie atalhos como Catálogo, Lacrados ou Contato.")}
  `;
}

function visitsPanel() {
  const days = visitDays(30);
  const today = days[days.length - 1].count;
  const week = days.slice(-7).reduce((sum, day) => sum + day.count, 0);
  const since = Date.now() - 7 * 864e5;
  const uniques = new Set(state.visits.filter((visit) => new Date(visit.created_at).getTime() >= since).map((visit) => visit.ip).filter(Boolean)).size;
  const origins = topCounts(state.visits.map((visit) => referrerLabel(visit.referrer)), 5);
  const originsMax = Math.max(1, ...origins.map(([, count]) => count));
  return `
    ${pageHead("Visitas", `${state.visits.length} registros carregados · uma visita por sessão`)}
    <div class="kpis">
      ${kpi({ label: "Hoje", value: today, ico: "users", tone: "blue" })}
      ${kpi({ label: "Últimos 7 dias", value: week, ico: "chart", tone: "purple" })}
      ${kpi({ label: "Pessoas (IPs) em 7 dias", value: uniques, ico: "users", tone: "orange" })}
      ${kpi({ label: "Registros", value: state.visits.length, ico: "layers", tone: "green" })}
    </div>
    <div class="dash-grid">
      ${chartCard("Visitas nos últimos 30 dias", days)}
      <section class="card">
        <div class="card-head"><h2>De onde vieram</h2></div>
        ${origins.length ? `<ul class="meter-list">${origins.map(([label, count]) => `<li><span title="${esc(label)}">${esc(label)}</span><div class="meter alt"><i style="width:${Math.round((count / originsMax) * 100)}%"></i></div><b>${count}</b></li>`).join("")}</ul>` : `<p class="muted pad">Nenhuma visita ainda.</p>`}
      </section>
    </div>
    ${state.visits.length ? `
      <div class="table visits">
        <div class="thead" aria-hidden="true"><span>Quando</span><span>IP</span><span>Página</span><span>Origem</span><span>Aparelho</span></div>
        ${state.visits.slice(0, 150).map((visit) => `
          <article class="vrow">
            <span class="v-when">${esc(when(visit.created_at))}</span>
            <span class="v-ip">${esc(visit.ip || "Sem IP")}</span>
            <span class="v-page">${esc(pathLabel(visit.path))}</span>
            <span class="v-origin">${esc(referrerLabel(visit.referrer))}</span>
            <span class="v-device">${esc(deviceLabel(visit.user_agent))}</span>
          </article>
        `).join("")}
      </div>
    ` : emptyState("Nenhuma visita ainda", "Cada pessoa que abrir a loja entra aqui com IP, página e horário.")}
  `;
}

function choice(pairs, current) {
  return pairs.map(([value, label]) => (
    `<option value="${esc(value)}" ${String(value) === String(current) ? "selected" : ""}>${esc(label)}</option>`
  )).join("");
}

function editorShell(title, body, submitLabel) {
  return `
    <div class="editor-back" data-act="close-editor"></div>
    <form class="editor" data-act="save" novalidate>
      <header class="editor-head">
        <h2>${title}</h2>
        <button class="icon-btn" type="button" data-act="close-editor" aria-label="Fechar">${icon("close")}</button>
      </header>
      <div class="editor-body">
        ${state.error ? `<p class="alert" role="alert">${icon("alert")}<span>${esc(state.error)}</span></p>` : ""}
        ${body}
      </div>
      <footer class="editor-foot">
        <button class="btn btn-line" type="button" data-act="close-editor">Cancelar</button>
        <button class="btn btn-orange" type="submit" ${state.busy ? "disabled" : ""}>${state.busy ? "Salvando…" : submitLabel}</button>
      </footer>
    </form>
  `;
}

function toggleField(name, label, hint, checked) {
  return `
    <label class="toggle">
      <input type="checkbox" name="${name}" ${checked ? "checked" : ""}>
      <span class="toggle-ui" aria-hidden="true"></span>
      <span><b>${label}</b><small>${hint}</small></span>
    </label>
  `;
}

function bannerEditor(form) {
  const preview = safeUrl(form.image_url);
  const mobilePreview = safeUrl(form.image_mobile_url);
  return editorShell(form.id ? "Editar banner" : "Novo banner", `
    <fieldset class="fs">
      <legend>Imagem</legend>
      <div class="drop banner-drop">
        <img id="image-preview" alt="" ${preview ? `src="${esc(preview)}"` : "hidden"}>
        <label class="file-btn">${icon("image")}<span>Escolher imagem</span><input id="image-file" name="image" type="file" accept="image/png,image/jpeg,image/webp"></label>
        <p class="hint">Computador: 2400 × 800 px (formato 3:1), PNG, JPG ou WebP até 5 MB.</p>
      </div>
      <div class="drop banner-drop mobile">
        <img id="mobile-preview" alt="" ${mobilePreview ? `src="${esc(mobilePreview)}"` : "hidden"}>
        <label class="file-btn">${icon("image")}<span>Imagem do celular (opcional)</span><input id="mobile-file" name="image_mobile" type="file" accept="image/png,image/jpeg,image/webp"></label>
        <p class="hint">Celular: 1080 × 1080 px (quadrado). Sem ela, o celular mostra a imagem do computador.</p>
        ${mobilePreview ? `<label class="check"><input type="checkbox" name="remove_mobile"> Remover imagem do celular</label>` : ""}
      </div>
    </fieldset>
    <fieldset class="fs">
      <legend>Detalhes</legend>
      <label class="field">Título
        <input name="title" value="${esc(form.title)}" placeholder="Também vira o texto alternativo da imagem">
      </label>
      <label class="field">Link ao clicar
        <input name="link" value="${esc(form.link)}" placeholder="#/catalog ou https://…">
      </label>
      <label class="field small">Posição no carrossel
        <input name="sort_order" type="number" step="1" value="${Number(form.sort_order) || 0}">
      </label>
      ${toggleField("active", "Mostrar na loja", "Desligue para guardar sem publicar.", form.active)}
    </fieldset>
  `, "Salvar banner");
}

function tabEditor(form) {
  return editorShell(form.id ? "Editar aba" : "Nova aba", `
    <fieldset class="fs">
      <legend>Aba</legend>
      <label class="field">Nome
        <input name="label" required value="${esc(form.label)}" placeholder="Lacrados">
      </label>
      <label class="field">Destino
        <input name="href" required value="${esc(form.href)}" placeholder="#/catalog?kind=sealed">
      </label>
      <label class="field small">Posição
        <input name="sort_order" type="number" step="1" value="${Number(form.sort_order) || 0}">
      </label>
      ${toggleField("active", "Mostrar na loja", "Aparece no menu do topo.", form.active)}
    </fieldset>
  `, "Salvar aba");
}

function setOptions() {
  return state.sets.map((set) => `<option value="${esc(set.name)}"></option>`).join("");
}

function editor(form) {
  if (form.type === "banner") return bannerEditor(form);
  if (form.type === "tab") return tabEditor(form);
  const preview = safeUrl(form.image_url);
  const hint = searchHint(form.kind);
  return editorShell(form.id ? "Editar produto" : "Novo produto", `
    <fieldset class="fs">
      <legend>Produto</legend>
      <div class="field">
        <label for="f-name">Nome</label>
        <div class="card-search">
          <input id="f-name" name="name" required autocomplete="off" value="${esc(form.name)}" placeholder="${esc(hint.placeholder)}" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="card-results">
          <div id="card-results" class="card-results" role="listbox" aria-label="Cartas encontradas" hidden></div>
        </div>
        <p class="hint" id="card-fill">${hint.html}</p>
      </div>
      <div class="field">
        <span>Tipo</span>
        <div class="seg" role="radiogroup" aria-label="Tipo">
          ${KINDS.map(([value, label]) => `<label><input type="radio" name="kind" value="${value}" ${form.kind === value ? "checked" : ""}><span>${label}</span></label>`).join("")}
        </div>
      </div>
      <label class="field">Jogo
        <input name="game" list="games" value="${esc(form.game)}" placeholder="Pokémon, Magic, One Piece…">
      </label>
      <datalist id="games">${GAMES.map((game) => `<option value="${esc(game)}"></option>`).join("")}</datalist>
    </fieldset>

    <fieldset class="fs">
      <legend>Coleção e carta</legend>
      <label class="field">Coleção
        <input id="f-collection" name="collection" list="sets" autocomplete="off" value="${esc(form.collection)}" placeholder="Comece a digitar: Obsidiana em Chamas, 151…">
      </label>
      <datalist id="sets">${setOptions()}</datalist>
      <div class="grid3">
        <label class="field">Sigla
          <input name="collection_code" value="${esc(form.collection_code)}" placeholder="OBF">
        </label>
        <div class="field">
          <label for="f-number">Número</label>
          <div class="card-search">
            <input id="f-number" name="card_number" autocomplete="off" value="${esc(form.card_number)}" placeholder="125/197" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="number-results">
            <div id="number-results" class="card-results wide" role="listbox" aria-label="Cartas com esse número" hidden></div>
          </div>
        </div>
        <label class="field">Raridade
          <input name="rarity" value="${esc(form.rarity)}" placeholder="Rara Holo">
        </label>
      </div>
      <div class="field">
        <span>Idioma</span>
        <div class="flags" role="radiogroup" aria-label="Idioma">
          ${LANGUAGES.map(([value, flag, name]) => `<label title="${esc(name)}"><input type="radio" name="language" value="${value}" aria-label="${esc(name)}" ${form.language === value ? "checked" : ""}><span>${flag}</span></label>`).join("")}
        </div>
      </div>
      <div class="grid2">
        <label class="field">Condição
          <select name="condition">${choice(CONDITIONS.map((item) => [item, item]), form.condition)}</select>
        </label>
        <label class="field">Acabamento
          <select name="finish">${choice(FINISHES.map((item) => [item, item]), form.finish)}</select>
        </label>
      </div>
    </fieldset>

    <fieldset class="fs">
      <legend>Preço e estoque</legend>
      <div class="grid3">
        <label class="field">Preço (R$)
          <input id="f-price" name="price" type="number" min="0" step="0.01" inputmode="decimal" required value="${esc(form.price)}" placeholder="0,00">
        </label>
        <label class="field">Preço antigo
          <input name="compare_at" type="number" min="0" step="0.01" inputmode="decimal" value="${esc(form.compare_at)}" placeholder="Opcional">
        </label>
        <label class="field">Estoque
          <input name="stock" type="number" min="0" step="1" inputmode="numeric" required value="${esc(form.stock)}">
        </label>
      </div>
    </fieldset>

    <fieldset class="fs">
      <legend>Foto</legend>
      <div class="photo">
        <div class="photo-preview">
          <img id="image-preview" alt="" ${preview ? `src="${esc(preview)}"` : "hidden"}>
          <span class="photo-empty" ${preview ? "hidden" : ""}>${icon("image")}Sem foto</span>
        </div>
        <div class="photo-inputs">
          <label class="file-btn">${icon("image")}<span>Enviar foto</span><input id="image-file" name="image" type="file" accept="image/png,image/jpeg,image/webp"></label>
          <label class="field">Ou cole o link da imagem
            <input name="image_url" value="${esc(form.image_url)}" placeholder="https://">
          </label>
        </div>
      </div>
    </fieldset>

    <fieldset class="fs">
      <legend>Vitrine</legend>
      <div class="grid2">
        <label class="field">Etiqueta do card
          <input name="tag" value="${esc(form.tag)}" placeholder="Box selada, Blister…">
        </label>
        <label class="field">Selo
          <input name="badge" value="${esc(form.badge)}" placeholder="Lançamento, Promoção…">
        </label>
      </div>
      <label class="field">Descrição
        <textarea name="description" rows="4">${esc(form.description)}</textarea>
      </label>
      ${toggleField("active", "Publicado na loja", "Clientes veem e podem pedir pelo WhatsApp.", form.active)}
      ${toggleField("featured", "Destaque na página inicial", "Entra na seção Destaques.", form.featured)}
    </fieldset>
  `, form.id ? "Salvar alterações" : "Cadastrar produto");
}

async function client() {
  return getClient();
}

async function boot() {
  if (!isConfigured()) {
    state.mode = "setup";
    render();
    return;
  }
  try {
    const supabase = await client();
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    state.session = data.session;
    if (!state.session) {
      state.mode = "login";
      render();
      return;
    }
    const allowed = await isAdmin(supabase);
    if (!allowed) {
      state.mode = "denied";
      render();
      return;
    }
    await loadAll(supabase);
    state.mode = "app";
  } catch (error) {
    state.mode = "login";
    state.error = friendlyError(error);
  }
  render();
}

async function isAdmin(supabase) {
  const { data, error } = await supabase
    .from("admins")
    .select("user_id")
    .eq("user_id", state.session.user.id)
    .maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

async function loadAll(supabase) {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  state.products = data || [];
  const [banners, tabs, visits] = await Promise.all([
    supabase.from("banners").select("*").order("sort_order", { ascending: true }),
    supabase.from("store_tabs").select("*").order("sort_order", { ascending: true }),
    supabase.from("visits").select("*").order("created_at", { ascending: false }).limit(1000),
  ]);
  state.banners = banners.error ? [] : banners.data || [];
  state.tabs = tabs.error ? [] : tabs.data || [];
  state.visits = visits.error ? [] : visits.data || [];
  const missing = banners.error || tabs.error || visits.error;
  state.extraError = missing ? friendlyError(missing) : "";
}

function readForm(form) {
  const data = new FormData(form);
  const text = (key) => String(data.get(key) || "").trim();
  return {
    id: state.editor?.id || "",
    name: text("name"),
    kind: text("kind"),
    game: text("game"),
    collection: text("collection"),
    collection_code: text("collection_code"),
    card_number: text("card_number"),
    language: text("language") || "PT-BR",
    condition: text("condition"),
    finish: text("finish") || "Normal",
    rarity: text("rarity"),
    price: text("price"),
    compare_at: text("compare_at"),
    stock: text("stock"),
    tag: text("tag"),
    badge: text("badge"),
    image_url: text("image_url"),
    description: text("description"),
    featured: data.get("featured") === "on",
    active: data.get("active") === "on",
    file: form.querySelector("#image-file")?.files?.[0] || null,
  };
}

function validate(form) {
  if (!form.name) return "Dê um nome ao produto.";
  if (!["sealed", "single", "accessory"].includes(form.kind)) return "Escolha o tipo do produto.";
  const price = Number(form.price);
  const stock = Number(form.stock);
  if (form.price === "" || !Number.isFinite(price) || price < 0) return "Informe um preço válido.";
  if (!Number.isInteger(stock) || stock < 0) return "O estoque precisa ser um número inteiro.";
  if (form.compare_at !== "") {
    const compare = Number(form.compare_at);
    if (!Number.isFinite(compare) || compare < 0) return "O preço antigo não é válido.";
  }
  if (form.file && !["image/png", "image/jpeg", "image/webp"].includes(form.file.type)) {
    return "A foto precisa ser PNG, JPG ou WebP.";
  }
  if (form.file && form.file.size > 5 * 1024 * 1024) return "A foto passa de 5 MB.";
  return "";
}

async function uploadImage(supabase, file) {
  const extension = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const path = `${state.session.user.id}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from("products").upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from("products").getPublicUrl(path);
  return data.publicUrl;
}

async function afterChange(supabase) {
  await loadAll(supabase);
  notifyStore(supabase);
}

let storeChannel = null;

function notifyStore(supabase) {
  storeChannel ||= supabase.channel(STORE_CHANNEL);
  storeChannel
    .send({ type: "broadcast", event: "changed", payload: { at: Date.now() } })
    .catch(() => {});
}

async function saveBanner(formElement) {
  const data = new FormData(formElement);
  const file = data.get("image");
  const mobileFile = data.get("image_mobile");
  const hadMobile = Boolean(state.editor?.image_mobile_url);
  const banner = {
    id: state.editor?.id || "",
    type: "banner",
    title: String(data.get("title") || "").trim(),
    link: String(data.get("link") || "").trim(),
    sort_order: Number(data.get("sort_order")) || 0,
    image_url: state.editor?.image_url || "",
    image_mobile_url: data.get("remove_mobile") === "on" ? "" : state.editor?.image_mobile_url || "",
    active: data.get("active") === "on",
  };
  state.editor = banner;
  for (const item of [file, mobileFile]) {
    if (!(item instanceof File && item.size)) continue;
    if (!["image/png", "image/jpeg", "image/webp"].includes(item.type)) {
      state.error = "A imagem precisa ser PNG, JPG ou WebP.";
      render();
      return;
    }
    if (item.size > 5 * 1024 * 1024) {
      state.error = "A imagem passa de 5 MB.";
      render();
      return;
    }
  }
  state.busy = true;
  state.error = "";
  render();
  try {
    const supabase = await client();
    if (file instanceof File && file.size) banner.image_url = await uploadImage(supabase, file);
    if (mobileFile instanceof File && mobileFile.size) banner.image_mobile_url = await uploadImage(supabase, mobileFile);
    if (!safeUrl(banner.image_url)) throw new Error("Escolha a imagem do banner.");
    const row = {
      title: banner.title,
      link: banner.link,
      sort_order: banner.sort_order,
      image_url: banner.image_url,
      active: banner.active,
    };
    if (banner.image_mobile_url || hadMobile) row.image_mobile_url = banner.image_mobile_url;
    const query = banner.id
      ? supabase.from("banners").update(row).eq("id", banner.id)
      : supabase.from("banners").insert(row);
    const { error } = await query;
    if (error) throw error;
    await afterChange(supabase);
    state.editor = null;
    state.notice = "Banner salvo.";
  } catch (error) {
    state.error = friendlyError(error);
  } finally {
    state.busy = false;
    render();
  }
}

async function saveTab(formElement) {
  const data = new FormData(formElement);
  const tab = {
    id: state.editor?.id || "",
    type: "tab",
    label: String(data.get("label") || "").trim(),
    href: String(data.get("href") || "").trim(),
    sort_order: Number(data.get("sort_order")) || 0,
    active: data.get("active") === "on",
  };
  state.editor = tab;
  if (!tab.label || !tab.href) {
    state.error = "A aba precisa de nome e destino.";
    render();
    return;
  }
  state.busy = true;
  state.error = "";
  render();
  try {
    const supabase = await client();
    const row = {
      label: tab.label,
      href: tab.href,
      sort_order: tab.sort_order,
      active: tab.active,
    };
    const query = tab.id
      ? supabase.from("store_tabs").update(row).eq("id", tab.id)
      : supabase.from("store_tabs").insert(row);
    const { error } = await query;
    if (error) throw error;
    await afterChange(supabase);
    state.editor = null;
    state.notice = "Aba salva.";
  } catch (error) {
    state.error = friendlyError(error);
  } finally {
    state.busy = false;
    render();
  }
}

async function save(formElement) {
  if (state.editor?.type === "banner") return saveBanner(formElement);
  if (state.editor?.type === "tab") return saveTab(formElement);
  const form = readForm(formElement);
  const problem = validate(form);
  const remembered = { ...form };
  delete remembered.file;
  state.editor = remembered;
  if (problem) {
    state.error = problem;
    state.notice = "";
    render();
    document.querySelector(".editor-body")?.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }
  state.busy = true;
  state.error = "";
  render();
  try {
    const supabase = await client();
    let imageUrl = form.image_url;
    if (form.file) imageUrl = await uploadImage(supabase, form.file);
    const payload = {
      name: form.name,
      kind: form.kind,
      game: form.game,
      collection: form.collection,
      collection_code: form.collection_code,
      card_number: form.card_number,
      language: form.language,
      condition: form.condition,
      finish: form.finish,
      rarity: form.rarity,
      price: Number(form.price),
      compare_at: form.compare_at === "" ? null : Number(form.compare_at),
      stock: Number(form.stock),
      tag: form.tag,
      badge: form.badge,
      image_url: imageUrl,
      description: form.description,
      featured: form.featured,
      active: form.active,
    };
    const query = form.id
      ? supabase.from("products").update(payload).eq("id", form.id)
      : supabase.from("products").insert(payload);
    const { error } = await query;
    if (error) throw error;
    await afterChange(supabase);
    state.editor = null;
    state.notice = form.id ? "Produto atualizado." : "Produto cadastrado.";
    state.error = "";
  } catch (error) {
    state.error = friendlyError(error);
  } finally {
    state.busy = false;
    render();
  }
}

async function toggleProduct(id) {
  const product = state.products.find((item) => item.id === id);
  if (!product) return;
  try {
    const supabase = await client();
    const { error } = await supabase.from("products").update({ active: !product.active }).eq("id", id);
    if (error) throw error;
    await afterChange(supabase);
    state.notice = product.active ? "Produto oculto da loja." : "Produto publicado na loja.";
    state.error = "";
  } catch (error) {
    state.error = friendlyError(error);
  }
  render();
}

async function deleteProduct(id) {
  const product = state.products.find((item) => item.id === id);
  if (!product) return;
  if (!confirm(`Excluir “${product.name}” do catálogo?`)) return;
  try {
    const supabase = await client();
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) throw error;
    await afterChange(supabase);
    state.notice = "Produto excluído.";
    state.error = "";
    if (state.editor?.id === id) state.editor = null;
  } catch (error) {
    state.error = friendlyError(error);
  }
  render();
}

async function saveStock(id) {
  const input = document.querySelector(`[data-stock="${CSS.escape(id)}"]`);
  const stock = Math.floor(Number(input?.value));
  if (!Number.isInteger(stock) || stock < 0) {
    state.error = "O estoque precisa ser um número inteiro.";
    state.notice = "";
    render();
    return;
  }
  try {
    const supabase = await client();
    const { error } = await supabase.from("products").update({ stock }).eq("id", id);
    if (error) throw error;
    await afterChange(supabase);
    state.notice = "Estoque atualizado.";
    state.error = "";
  } catch (error) {
    state.error = friendlyError(error);
  }
  render();
}

async function removeRow(table, id, notice) {
  if (!id || !confirm("Excluir este item?")) return;
  try {
    const supabase = await client();
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) throw error;
    await afterChange(supabase);
    state.notice = notice;
    state.error = "";
  } catch (error) {
    state.error = friendlyError(error);
  }
  render();
}

function markStockDirty(input) {
  const changed = String(Number(input.value)) !== String(input.dataset.saved);
  const row = input.closest(".srow");
  row?.classList.toggle("dirty", changed);
  const button = row?.querySelector("[data-act=stock-save]");
  if (button) button.disabled = !changed;
}

function field(name) {
  return document.querySelector(`.editor [name="${name}"]`);
}

function setField(name, value) {
  const input = field(name);
  if (input && value != null && value !== "") input.value = value;
}

function setKind(kind) {
  const radio = document.querySelector(`.editor [name=kind][value="${kind}"]`);
  if (!radio || radio.checked) return;
  radio.checked = true;
  syncCondition(kind);
}

function syncCondition(kind) {
  const condition = field("condition");
  const autos = new Set(Object.values(AUTO_CONDITION));
  if (condition && autos.has(condition.value)) condition.value = AUTO_CONDITION[kind] || "NM";
}

function updatePreview(url) {
  const preview = document.getElementById("image-preview");
  const empty = document.querySelector(".photo-empty");
  const safe = safeUrl(url);
  if (!preview) return;
  if (safe) {
    preview.src = safe;
    preview.hidden = false;
    if (empty) empty.hidden = true;
  } else {
    preview.hidden = true;
    if (empty) empty.hidden = false;
  }
}

function fillHint(html) {
  const hint = document.getElementById("card-fill");
  if (hint) hint.innerHTML = html;
}

function ensureSets() {
  if (state.sets.length) return;
  loadSets()
    .then((sets) => {
      state.sets = sets;
      const list = document.getElementById("sets");
      if (list) list.innerHTML = setOptions();
    })
    .catch(() => {});
}

function resultsBox() {
  return document.getElementById(RESULT_BOXES[searchField]);
}

function showResults(html) {
  const box = resultsBox();
  const input = document.getElementById(searchField);
  if (!box) return;
  box.innerHTML = html;
  box.hidden = false;
  input?.setAttribute("aria-expanded", "true");
}

function closeResults() {
  clearTimeout(searchTimer);
  searchToken += 1;
  for (const [inputId, boxId] of Object.entries(RESULT_BOXES)) {
    const box = document.getElementById(boxId);
    if (box) {
      box.hidden = true;
      box.innerHTML = "";
    }
    const input = document.getElementById(inputId);
    input?.setAttribute("aria-expanded", "false");
    input?.removeAttribute("aria-activedescendant");
  }
  cardResults = [];
  activeResult = -1;
}

function onCardFieldInput(input) {
  clearTimeout(searchTimer);
  const kind = document.querySelector(".editor [name=kind]:checked")?.value;
  const byNumber = input.id === "f-number";
  const value = input.value.trim();
  const query = byNumber
    ? { name: field("name")?.value || "", number: value }
    : { name: value };
  const sealed = !byNumber && (kind === "sealed" || SEALED_WORDS.test(value));
  const ready = byNumber ? /\d/.test(value) : value.length >= (sealed ? 2 : 3);
  if (kind === "accessory" || (byNumber && kind === "sealed") || !ready) {
    closeResults();
    return;
  }
  searchField = input.id;
  searchTimer = setTimeout(() => (sealed ? runSealedSearch(value) : runSearch(query)), 350);
}

const SEALED_WORDS = /\b(etb|elite trainer|booster box|display|bundle|blister|lata|tin|build & battle|box cole[cç][aã]o|cole[cç][aã]o premium)\b/i;

async function runSealedSearch(query) {
  const token = ++searchToken;
  showResults(`<p class="cr-status"><span class="spinner sm"></span>Buscando lacrados…</p>`);
  try {
    const response = await fetch(`/api/sealed?q=${encodeURIComponent(query)}`);
    const data = await response.json();
    if (token !== searchToken) return;
    if (!response.ok) throw new Error(data.error);
    cardResults = data.results.map((item) => ({ ...item, sealed: true }));
    activeResult = -1;
    if (!cardResults.length) {
      showResults(`<p class="cr-status">Nenhum lacrado encontrado. Tente o tipo e a coleção, como “ETB Fagulhas Impetuosas” ou “Booster Box 151”.</p>`);
      return;
    }
    showResults(`
      ${cardResults.map((item, index) => `
        <button class="cr-item" type="button" role="option" id="cr-${index}" data-act="pick-card" data-index="${index}" aria-selected="false">
          ${item.thumb ? `<img class="sealed" src="${esc(item.thumb)}" alt="" loading="lazy">` : `<span class="cr-ph"></span>`}
          <span><b>${esc(item.name)}</b><small>${esc(item.collection)}${item.code ? ` · ${esc(item.code)}` : ""}</small></span>
        </button>
      `).join("")}
      <p class="cr-foot">Lacrados Pokémon · catálogo TCGplayer</p>
    `);
  } catch {
    if (token === searchToken) showResults(`<p class="cr-status">Não foi possível buscar lacrados agora. Preencha manualmente ou tente de novo.</p>`);
  }
}

function applySealed(item) {
  closeResults();
  setField("name", item.name);
  setKind("sealed");
  setField("game", "Pokémon");
  setField("collection", item.collection);
  setField("collection_code", item.code);
  if (item.image) {
    setField("image_url", item.image);
    updatePreview(item.image);
  }
  fillHint(`${icon("check")}<span>Preenchido: ${esc(item.name)} · ${esc(item.collection)}. Nome e foto são da versão em inglês; ajuste se for outra. Informe preço e estoque.</span>`);
  document.getElementById("f-price")?.focus();
}

const SEARCH_HINTS = {
  single: ["Ex.: Pikachu, Charizard ex…", "Digite o nome ou o número de uma carta Pokémon e escolha na lista: coleção, número, raridade, acabamento e foto são preenchidos sozinhos."],
  sealed: ["Ex.: ETB Fagulhas Impetuosas, Booster Box 151…", "Digite o tipo e a coleção do lacrado (ETB, booster box, bundle, blister, lata…) e escolha na lista: nome, coleção, sigla e foto são preenchidos sozinhos."],
  accessory: ["Ex.: Sleeve Dragon Shield, Pasta 9 bolsos…", "Acessórios não têm busca automática: preencha nome, foto, preço e estoque."],
};

function searchHint(kind) {
  const [placeholder, hint] = SEARCH_HINTS[kind] || SEARCH_HINTS.single;
  return { placeholder, html: `${icon(kind === "accessory" ? "box" : "sparkle")}<span>${hint}</span>` };
}

function syncSearchHint(kind) {
  const name = document.getElementById("f-name");
  if (!name) return;
  closeResults();
  const { placeholder, html } = searchHint(kind);
  name.placeholder = placeholder;
  fillHint(html);
}

async function runSearch(query) {
  const token = ++searchToken;
  const byNumber = Boolean(query.number);
  showResults(`<p class="cr-status"><span class="spinner sm"></span>Buscando cartas…</p>`);
  try {
    const cards = await searchCards(query);
    if (token !== searchToken) return;
    cardResults = cards;
    activeResult = -1;
    if (!cards.length) {
      const empty = byNumber
        ? `Nenhuma carta com o número ${esc(query.number)}${query.name.trim() ? ` chamada ${esc(query.name.trim())}` : ""}. Confira o número ou apague o nome para ver todas.`
        : "Nenhuma carta Pokémon com esse nome. Se for um lacrado ou acessório, é só continuar preenchendo.";
      showResults(`<p class="cr-status">${empty}</p>`);
      return;
    }
    const head = byNumber
      ? `<p class="cr-head">${cards.length === 40 ? "40+" : cards.length} ${cards.length === 1 ? "carta" : "cartas"} com o nº ${esc(query.number)}${query.name.trim() ? ` · ${esc(query.name.trim())}` : ""}</p>`
      : "";
    showResults(`
      ${head}
      ${cards.map((card, index) => `
        <button class="cr-item" type="button" role="option" id="cr-${index}" data-act="pick-card" data-index="${index}" aria-selected="false">
          ${card.image ? `<img src="${esc(card.image)}" alt="" loading="lazy">` : `<span class="cr-ph"></span>`}
          <span><b>${esc(card.name)}</b><small>${esc(card.setName)} · nº ${esc(card.number)}</small></span>
        </button>
      `).join("")}
      <p class="cr-foot">Cartas em português · TCGdex</p>
    `);
  } catch {
    if (token === searchToken) showResults(`<p class="cr-status">Não foi possível buscar agora. Preencha manualmente ou tente de novo.</p>`);
  }
}

function moveActive(step) {
  if (!cardResults.length) return;
  activeResult = (activeResult + step + cardResults.length) % cardResults.length;
  document.querySelectorAll(".cr-item").forEach((item, index) => {
    const on = index === activeResult;
    item.classList.toggle("on", on);
    item.setAttribute("aria-selected", String(on));
    if (on) item.scrollIntoView({ block: "nearest" });
  });
  document.getElementById(searchField)?.setAttribute("aria-activedescendant", `cr-${activeResult}`);
}

async function applyCard(index) {
  const card = cardResults[index];
  if (!card) return;
  if (card.sealed) {
    applySealed(card);
    return;
  }
  closeResults();
  setField("name", card.name);
  fillHint(`<span class="spinner sm"></span><span>Buscando os dados de ${esc(card.name)}…</span>`);
  try {
    const info = await cardDetails(card.id);
    setField("name", info.name);
    setKind("single");
    setField("game", "Pokémon");
    setField("collection", info.collection);
    setField("collection_code", info.collection_code);
    setField("card_number", info.card_number);
    setField("rarity", info.rarity);
    setField("finish", info.finish);
    if (info.image_url) {
      setField("image_url", info.image_url);
      updatePreview(info.image_url);
    }
    const description = field("description");
    if (description && !description.value.trim()) description.value = info.description;
    fillHint(`${icon("check")}<span>Preenchido: ${esc(info.name)} · ${esc(info.collection)} · ${esc(info.card_number)}. Confira a condição e informe preço e estoque.</span>`);
    document.getElementById("f-price")?.focus();
  } catch {
    fillHint(`${icon("alert")}<span>Não foi possível buscar os dados dessa carta. Preencha manualmente.</span>`);
  }
}

async function fillCollectionCode(name) {
  const code = field("collection_code");
  if (!name.trim() || !code || code.value.trim()) return;
  try {
    const found = await collectionCode(name);
    if (found && !code.value.trim()) code.value = found;
  } catch {
    /* sem conexão com a TCGdex: a sigla fica para preencher à mão */
  }
}

function openEditor(form) {
  state.editor = form;
  state.error = "";
  render();
  if (!form.type) ensureSets();
}

function bind() {
  document.addEventListener("click", async (event) => {
    if (!event.target.closest(".card-search")) closeResults();
    const target = event.target.closest("[data-act]");
    if (!target || target.tagName === "FORM") return;
    const act = target.dataset.act;
    if (act === "copy-sql") {
      try {
        await navigator.clipboard.writeText(ADMIN_SQL);
        target.textContent = "Copiado";
      } catch {
        target.textContent = "Selecione o comando acima";
      }
      return;
    }
    if (act === "logout") {
      const supabase = await client();
      await supabase.auth.signOut();
      state.session = null;
      state.mode = "login";
      state.editor = null;
      state.error = "";
      render();
      return;
    }
    if (act === "dismiss") {
      state.error = "";
      render();
      return;
    }
    if (act === "filter") {
      state.filter = target.dataset.filter;
      render();
      return;
    }
    if (act === "stock-filter") {
      state.stockFilter = target.dataset.filter;
      render();
      return;
    }
    if (act === "new") {
      openEditor(blankForm());
      document.getElementById("f-name")?.focus();
      return;
    }
    if (act === "edit") {
      const product = state.products.find((item) => item.id === target.dataset.id);
      if (product) openEditor(formFromProduct(product));
      return;
    }
    if (act === "pick-card") {
      await applyCard(Number(target.dataset.index));
      return;
    }
    if (act === "new-banner") {
      openEditor({ type: "banner", id: "", title: "", image_url: "", link: "", sort_order: state.banners.length, active: true });
      return;
    }
    if (act === "edit-banner") {
      const banner = state.banners.find((item) => item.id === target.dataset.id);
      if (banner) openEditor({ type: "banner", ...banner });
      return;
    }
    if (act === "delete-banner") {
      await removeRow("banners", target.dataset.id, "Banner excluído.");
      return;
    }
    if (act === "new-tab") {
      openEditor({ type: "tab", id: "", label: "", href: "#/", sort_order: state.tabs.length, active: true });
      return;
    }
    if (act === "edit-tab") {
      const tab = state.tabs.find((item) => item.id === target.dataset.id);
      if (tab) openEditor({ type: "tab", ...tab });
      return;
    }
    if (act === "delete-tab") {
      await removeRow("store_tabs", target.dataset.id, "Aba excluída.");
      return;
    }
    if (act === "stock-step") {
      const input = document.querySelector(`[data-stock="${CSS.escape(target.dataset.id)}"]`);
      if (!input) return;
      input.value = String(Math.max(0, (Math.floor(Number(input.value)) || 0) + Number(target.dataset.dir)));
      markStockDirty(input);
      return;
    }
    if (act === "stock-save") {
      await saveStock(target.dataset.id);
      return;
    }
    if (act === "close-editor") {
      state.editor = null;
      state.error = "";
      closeResults();
      render();
      return;
    }
    if (act === "toggle") {
      await toggleProduct(target.dataset.id);
      return;
    }
    if (act === "delete") {
      await deleteProduct(target.dataset.id);
    }
  });

  document.addEventListener("submit", async (event) => {
    const form = event.target;
    if (form.dataset.act === "login") {
      event.preventDefault();
      const data = new FormData(form);
      state.email = String(data.get("email") || "");
      state.busy = true;
      state.error = "";
      render();
      try {
        const supabase = await client();
        const { error } = await supabase.auth.signInWithPassword({
          email: state.email.trim(),
          password: String(data.get("password") || ""),
        });
        if (error) throw error;
        const { data: sessionData } = await supabase.auth.getSession();
        state.session = sessionData.session;
        const allowed = await isAdmin(supabase);
        if (!allowed) state.mode = "denied";
        else {
          await loadAll(supabase);
          state.mode = "app";
        }
      } catch (error) {
        state.error = friendlyError(error);
        state.mode = "login";
      } finally {
        state.busy = false;
        render();
      }
      return;
    }
    if (form.dataset.act === "save") {
      event.preventDefault();
      closeResults();
      await save(form);
    }
  });

  document.addEventListener("input", (event) => {
    const target = event.target;
    if (target.id === "admin-q") {
      state.q = target.value;
      if (!state.editor) render();
      return;
    }
    if (target.id === "f-name" || target.id === "f-number") {
      onCardFieldInput(target);
      return;
    }
    if (target.matches?.(".stock-input")) {
      markStockDirty(target);
      return;
    }
    if (target.name === "image_url" && target.closest(".editor")) updatePreview(target.value);
  });

  document.addEventListener("keydown", (event) => {
    if (event.target.id === searchField && resultsBox() && !resultsBox().hidden) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        moveActive(1);
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        moveActive(-1);
        return;
      }
      if (event.key === "Enter" && activeResult >= 0) {
        event.preventDefault();
        applyCard(activeResult);
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        closeResults();
        return;
      }
    }
    if (event.key === "Escape" && state.editor && !state.busy) {
      state.editor = null;
      state.error = "";
      render();
    }
  });

  document.addEventListener("change", (event) => {
    const target = event.target;
    if (target.id === "image-file" || target.id === "mobile-file") {
      const file = target.files?.[0];
      const preview = document.getElementById(target.id === "mobile-file" ? "mobile-preview" : "image-preview");
      if (file && preview) {
        preview.src = URL.createObjectURL(file);
        preview.hidden = false;
        const empty = document.querySelector(".photo-empty");
        if (empty) empty.hidden = true;
      }
    }
    if (target.name === "kind") {
      syncCondition(target.value);
      syncSearchHint(target.value);
    }
    if (target.id === "f-collection") fillCollectionCode(target.value);
  });

  window.addEventListener("hashchange", () => {
    if (state.mode !== "app") return;
    state.q = "";
    if (!state.editor) render();
    window.scrollTo(0, 0);
  });
}

bind();
boot();
