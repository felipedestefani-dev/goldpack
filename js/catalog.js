import { developer, store } from "./config.js";
import { POLICIES, policyTitle, policyView } from "./policies.js";
import { discountOf, esc, friendlyError, kindLabel, money, safeUrl } from "./format.js";
import { getClient, isConfigured } from "./supabase.js";

const state = {
  products: [],
  tabs: [],
  status: isConfigured() ? "loading" : "unconfigured",
  error: "",
  menuOpen: false,
  noticeOpen: !noticeSeen(),
  filtersOpen: false,
  qty: 1,
  qtyFor: "",
};

const app = document.querySelector("#app");

function noticeSeen() {
  try {
    return localStorage.getItem("goldpack-aviso") === "1";
  } catch {
    return false;
  }
}

function currentRoute() {
  const raw = (location.hash || "#/").replace(/^#/, "");
  const [path, query] = raw.split("?");
  const parts = path.split("/").filter(Boolean);
  return {
    name: parts[0] || "home",
    id: decodeURIComponent(parts[1] || ""),
    params: new URLSearchParams(query || ""),
  };
}

function phoneDigits() {
  return String(store.whatsapp || "").replace(/\D/g, "");
}

function phoneLabel() {
  const digits = phoneDigits();
  if (digits.length === 13 && digits.startsWith("55")) {
    const local = digits.slice(2);
    return `(${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`;
  }
  return store.whatsapp;
}

function productById(id) {
  return state.products.find((product) => product.id === id) || null;
}

function buyMessage(product, qty = 1) {
  const stock = Number(product.stock) || 0;
  if (stock <= 0) return `Olá, Goldpack! Quero saber quando chegar: ${product.name}.`;
  const amount = qty > 1 ? `${qty} unidades de ` : "";
  return `Olá, Goldpack! Quero comprar ${amount}${product.name} (${money(product.price)}).`;
}

async function hideBoot() {
  const boot = document.getElementById("boot");
  if (!boot || boot.dataset.done) return;
  boot.dataset.done = "1";
  const animations = boot.getAnimations ? boot.getAnimations({ subtree: true }) : [];
  await Promise.all(animations.map((animation) => animation.finished.catch(() => {})));
  boot.classList.add("is-done");
  setTimeout(() => boot.remove(), 500);
}

function initials(name) {
  const parts = String(name || "").trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0] || "").join("").toUpperCase() || "GP";
}

function applyFilters(list, params) {
  const q = (params.get("q") || "").trim().toLowerCase();
  const kind = params.get("kind") || "";
  const game = params.get("game") || "";
  const collection = params.get("collection") || "";
  const language = params.get("language") || "";
  const condition = params.get("condition") || "";
  const finish = params.get("finish") || "";
  const stock = params.get("stock") || "";
  const filtered = list.filter((product) => {
    if (kind && product.kind !== kind) return false;
    if (game && product.game !== game) return false;
    if (collection && product.collection !== collection) return false;
    if (language && product.language !== language) return false;
    if (condition && product.condition !== condition) return false;
    if (finish && product.finish !== finish) return false;
    if (stock === "1" && Number(product.stock) <= 0) return false;
    if (!q) return true;
    const blob = [
      product.name,
      product.game,
      product.collection,
      product.collection_code,
      product.card_number,
      product.tag,
      product.rarity,
    ].join(" ").toLowerCase();
    return blob.includes(q);
  });
  const sort = params.get("sort") || "recent";
  const price = (product) => Number(product.price) || 0;
  if (sort === "price-asc") filtered.sort((a, b) => price(a) - price(b));
  else if (sort === "price-desc") filtered.sort((a, b) => price(b) - price(a));
  else if (sort === "name") filtered.sort((a, b) => String(a.name).localeCompare(String(b.name), "pt-BR"));
  else if (sort === "stock") filtered.sort((a, b) => Number(b.stock) - Number(a.stock));
  else filtered.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  return filtered;
}

function uniqueValues(key) {
  return [...new Set(state.products.map((product) => product[key]).filter(Boolean))].sort((a, b) => (
    String(a).localeCompare(String(b), "pt-BR")
  ));
}

function render() {
  const active = document.activeElement;
  const focusId = active?.id || "";
  const selectionStart = active?.selectionStart;
  const selectionEnd = active?.selectionEnd;
  const route = currentRoute();
  if (route.name === "p" && state.qtyFor !== route.id) {
    state.qtyFor = route.id;
    state.qty = 1;
  }
  document.title = titleFor(route);
  app.innerHTML = view(route);
  document.body.classList.toggle("lock", state.menuOpen);
  if (!focusId) return;
  const field = document.getElementById(focusId);
  if (!field) return;
  field.focus();
  if (selectionStart != null && field.setSelectionRange) {
    field.setSelectionRange(selectionStart, selectionEnd);
  }
}

function titleFor(route) {
  if (route.name === "catalog") return "Catálogo — Goldpack";
  if (route.name === "contato") return "Contato — Goldpack";
  if (policyTitle(route.name)) return `${policyTitle(route.name)} — Goldpack`;
  if (route.name === "p") {
    const product = productById(route.id);
    return product ? `${product.name} — Goldpack` : "Produto — Goldpack";
  }
  return "Goldpack — TCG, colecionáveis e games";
}

function view(route) {
  return `
    <a class="skip" href="#conteudo">Ir para o conteúdo</a>
    ${header(route)}
    <main id="conteudo">
      ${route.name === "catalog" ? catalogView(route) : ""}
      ${route.name === "p" ? productView(route) : ""}
      ${route.name === "contato" ? contactView() : ""}
      ${policyTitle(route.name) ? policyView(route.name, { phone: phoneLabel(), whatsapp: whatsappLink("Olá, Goldpack!") }) : ""}
      ${route.name === "home" || !(["catalog", "p", "contato"].includes(route.name) || policyTitle(route.name)) ? homeView() : ""}
    </main>
    ${footer()}
    ${state.menuOpen ? menuDrawer() : ""}
    ${state.noticeOpen ? privacyNotice() : ""}
  `;
}

function header(route) {
  const params = route.params;
  const q = route.name === "catalog" || route.name === "home" ? params.get("q") || "" : "";
  const kind = params.get("kind") || "";
  return `
    <header class="header">
      <div class="wrap header-inner">
        <a class="logo" href="#/" aria-label="Goldpack, início">
          <img src="assets/logo.png" alt="Goldpack — TCG, colecionáveis e games">
        </a>
        <div class="header-row">
        <form class="search" data-act="search">
          <label class="sr" for="q">Buscar produtos</label>
          <select id="scope" aria-label="Escolher o que buscar">
            ${options([["", "Tudo"], ["sealed", "Lacrados"], ["single", "Avulsos"], ["accessory", "Acessórios"]], kind)}
          </select>
          <input id="q" type="search" placeholder="Buscar produtos" value="${esc(q)}">
          <button type="submit" aria-label="Buscar">${searchIcon()}</button>
        </form>
        <div class="header-actions">
          <nav class="nav-desktop" aria-label="Principal">
            ${navLinks()}
          </nav>
          <a class="btn btn-orange header-wa" href="${whatsappLink("Olá, Goldpack! Vim pelo catálogo.")}" target="_blank" rel="noopener">WhatsApp</a>
          <button class="menu-btn" type="button" data-act="menu-open" aria-label="Abrir menu">${menuIcon()}</button>
        </div>
        </div>
      </div>
    </header>
  `;
}

function safeHref(value) {
  const raw = String(value || "").trim();
  if (safeUrl(raw)) return safeUrl(raw);
  if (/^#\/[A-Za-z0-9/?=&%_.-]*$/.test(raw)) return raw;
  if (/^\/[A-Za-z0-9/?=&%_.-]*$/.test(raw)) return raw;
  return "";
}

function navLinks() {
  const tabs = state.tabs.length
    ? state.tabs
    : [
      { label: "Início", href: "#/" },
      { label: "Catálogo", href: "#/catalog" },
      { label: "Contato", href: "#/contato" },
    ];
  return tabs
    .map((tab) => {
      const href = safeHref(tab.href);
      return href ? `<a href="${esc(href)}">${esc(tab.label)}</a>` : "";
    })
    .join("");
}

function options(pairs, current) {
  return pairs.map(([value, label]) => (
    `<option value="${esc(value)}" ${value === current ? "selected" : ""}>${esc(label)}</option>`
  )).join("");
}

function homeView() {
  const ready = state.status === "ready";
  const sealed = state.products.filter((product) => product.kind === "sealed").slice(0, 8);
  const singles = state.products.filter((product) => product.kind === "single").slice(0, 8);
  const featured = state.products.filter((product) => product.featured).slice(0, 8);
  const accessories = state.products.filter((product) => product.kind === "accessory").slice(0, 8);
  return `
    ${statusBlock()}
    ${ready && featured.length ? section("Destaques", featured, "#/catalog?sort=recent") : ""}
    ${ready && sealed.length ? section("Lacrados", sealed, "#/catalog?kind=sealed") : ""}
    ${ready && singles.length ? section("Avulsos", singles, "#/catalog?kind=single") : ""}
    ${ready && accessories.length ? section("Acessórios", accessories, "#/catalog?kind=accessory") : ""}
    ${ready && !state.products.length ? emptyCatalog() : ""}
  `;
}

function section(title, products, href, { plain = false } = {}) {
  return `
    <section class="section ${plain ? "" : "wrap"}">
      <h2 class="section-title"><a href="${esc(href)}">${esc(title)}<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6"></path></svg></a></h2>
      <div class="grid">${products.map(card).join("")}</div>
    </section>
  `;
}

function card(product) {
  const image = safeUrl(product.image_url);
  const discount = discountOf(product);
  const stock = Number(product.stock) || 0;
  const number = product.card_number ? `#${product.card_number}` : "";
  return `
    <article class="pcard">
      <a class="pcard-hit" href="#/p/${encodeURIComponent(product.id)}">
        <div class="visual">
          ${discount ? `<span class="off">-${discount}%</span>` : ""}
          <span class="stock ${stock > 0 ? "" : "out"}">${stock > 0 ? `${stock} un` : "Esgotado"}</span>
          ${product.language ? `<span class="lang">${esc(product.language)}</span>` : ""}
          ${image ? `<img src="${esc(image)}" alt="">` : `<div class="ph"><b>${esc(initials(product.name))}</b></div>`}
        </div>
        ${product.tag ? `<span class="tag">${esc(product.tag)}</span>` : `<span class="tag alt">${esc(kindLabel(product.kind))}</span>`}
        <h3 class="name">${esc(product.name)}</h3>
        <p class="meta">
          ${product.collection ? `<span>${esc(product.collection)} ${esc(number)}</span>` : ""}
          ${product.condition ? `<b>${esc(product.condition)}</b>` : ""}
          ${product.finish && product.finish !== "Normal" ? `<span>${esc(product.finish)}</span>` : ""}
        </p>
        <div class="price-row">
          <div>
            ${discount ? `<div class="compare">${money(product.compare_at)}</div>` : ""}
            <div class="price">${money(product.price)}</div>
          </div>
        </div>
      </a>
      <a class="btn btn-orange buy-card" href="${whatsappLink(buyMessage(product))}" target="_blank" rel="noopener">Comprar</a>
    </article>
  `;
}

function statusBlock() {
  if (state.status === "loading") return "";
  if (state.status === "unconfigured" || state.status === "error") {
    return `<section class="section wrap"><div class="panel"><h2>Catálogo em atualização</h2><p>Não conseguimos mostrar os produtos agora. Chame a Goldpack no WhatsApp que a gente te ajuda.</p>${phoneDigits() ? `<a class="btn btn-orange" href="${whatsappLink("Olá, Goldpack! O catálogo não abriu aqui. Podem me ajudar?")}">Falar no WhatsApp</a>` : ""}</div></section>`;
  }
  return "";
}

function emptyCatalog() {
  return `<section class="section wrap empty-state"><h2>Novidades a caminho</h2><p>A vitrine está sendo atualizada. Confira o catálogo completo da Goldpack.</p><a class="btn btn-orange" href="#/catalog">Ver Catálogo</a></section>`;
}

function catalogView(route) {
  const params = route.params;
  const products = state.status === "ready" ? applyFilters(state.products, params) : [];
  const select = (name, label, values) => `
    <label>${label}
      <select data-filter="${name}">
        <option value="">Todos</option>
        ${values.map((value) => `<option value="${esc(value)}" ${params.get(name) === value ? "selected" : ""}>${esc(value)}</option>`).join("")}
      </select>
    </label>
  `;
  const statusLabel = state.status === "ready"
    ? `${products.length} ${products.length === 1 ? "produto" : "produtos"}`
    : "Carregando produtos";
  return `
    <div class="wrap catalog-layout">
      <div class="catalog-top">
        <div>
          <h1>Catálogo</h1>
          <p>${statusLabel}</p>
        </div>
        <button class="btn btn-line filter-toggle" type="button" data-act="filters">${state.filtersOpen ? "Fechar filtros" : "Filtros"}</button>
      </div>
      <aside class="filters ${state.filtersOpen ? "" : "is-closed"}">
        <h2>Busca avançada</h2>
        <label>Tipo
          <select data-filter="kind">
            ${options([["", "Todos"], ["sealed", "Lacrados"], ["single", "Avulsos"], ["accessory", "Acessórios"]], params.get("kind") || "")}
          </select>
        </label>
        ${select("game", "Jogo", uniqueValues("game"))}
        ${select("collection", "Coleção", uniqueValues("collection"))}
        ${select("language", "Idioma", uniqueValues("language"))}
        ${select("condition", "Condição", uniqueValues("condition"))}
        ${select("finish", "Acabamento", uniqueValues("finish"))}
        <label>Ordenar
          <select data-filter="sort">
            ${options([
              ["recent", "Mais recentes"],
              ["price-asc", "Menor preço"],
              ["price-desc", "Maior preço"],
              ["name", "Nome"],
              ["stock", "Maior estoque"],
            ], params.get("sort") || "recent")}
          </select>
        </label>
        <label class="check"><input type="checkbox" data-filter="stock" ${params.get("stock") === "1" ? "checked" : ""}> Somente em estoque</label>
        <a href="#/catalog">Limpar filtros</a>
      </aside>
      <div class="catalog-results">
        ${state.status !== "ready" ? statusBlock() : ""}
        ${state.status === "ready" && !state.products.length ? emptyCatalog() : ""}
        ${state.status === "ready" && state.products.length && !products.length ? `<div class="panel"><h2>Nada encontrado</h2><p>Tente outro nome, coleção ou limpe a busca.</p></div>` : ""}
        ${products.length ? `<div class="grid">${products.map(card).join("")}</div>` : ""}
      </div>
    </div>
  `;
}

function productView(route) {
  if (state.status !== "ready") {
    return `<div class="wrap">${statusBlock()}</div>`;
  }
  const product = productById(route.id);
  if (!product) {
    return `<div class="wrap section"><div class="panel"><h2>Produto não encontrado</h2><p>Esse item não está mais no catálogo.</p><a class="btn btn-orange" href="#/catalog">Voltar ao catálogo</a></div></div>`;
  }
  const image = safeUrl(product.image_url);
  const stock = Number(product.stock) || 0;
  const maxQty = Math.max(stock, 1);
  const qty = Math.min(Math.max(state.qty, 1), maxQty);
  state.qty = qty;
  const related = state.products.filter((item) => item.id !== product.id && item.collection && item.collection === product.collection).slice(0, 4);
  const specs = [
    ["Tipo", kindLabel(product.kind)],
    ["Jogo", product.game],
    ["Coleção", product.collection],
    ["Código", product.collection_code],
    ["Número", product.card_number],
    ["Idioma", product.language],
    ["Condição", product.condition],
    ["Acabamento", product.finish],
    ["Raridade", product.rarity],
    ["Estoque", stock > 0 ? `${stock} un` : "Esgotado"],
  ].filter(([, value]) => value);
  return `
    <div class="wrap">
      <nav class="crumbs">
        <a href="#/">Início</a><span>/</span>
        <a href="#/catalog">Catálogo</a><span>/</span>
        <span>${esc(product.name)}</span>
      </nav>
      <article class="product">
        <div class="gallery">
          ${image ? `<img src="${esc(image)}" alt="${esc(product.name)}">` : `<div class="ph"><b>${esc(initials(product.name))}</b></div>`}
        </div>
        <div>
          ${product.badge ? `<span class="tag">${esc(product.badge)}</span>` : ""}
          <h1>${esc(product.name)}</h1>
          <p class="meta">${[product.game, product.collection, product.collection_code].filter(Boolean).map(esc).join(" · ")}</p>
          ${discountOf(product) ? `<div class="compare">${money(product.compare_at)}</div>` : ""}
          <div class="price">${money(product.price)}</div>
          <div class="specs">
            ${specs.map(([label, value]) => `<div class="spec"><small>${esc(label)}</small><b>${esc(value)}</b></div>`).join("")}
          </div>
          ${product.description ? `<p class="desc">${esc(product.description)}</p>` : ""}
          <div class="buy">
            ${stock > 0 ? `
              <div class="stepper" aria-label="Quantidade">
                <button type="button" data-act="qty" data-dir="-1" aria-label="Diminuir">−</button>
                <span>${qty}</span>
                <button type="button" data-act="qty" data-dir="1" aria-label="Aumentar">+</button>
              </div>
            ` : ""}
            <a class="btn btn-orange" href="${whatsappLink(buyMessage(product, qty))}" target="_blank" rel="noopener">${stock > 0 ? "Comprar no WhatsApp" : "Avisar no WhatsApp"}</a>
          </div>
        </div>
      </article>
      ${related.length ? section("Da mesma coleção", related, `#/catalog?collection=${encodeURIComponent(product.collection)}`, { plain: true }) : ""}
    </div>
  `;
}

function contactView() {
  const lines = [
    store.city ? ["Cidade", store.city] : null,
    store.hours ? ["Horário", store.hours] : null,
    store.email ? ["E-mail", store.email] : null,
    phoneDigits() ? ["WhatsApp", phoneLabel()] : null,
  ].filter(Boolean);
  return `
    <div class="wrap">
      <section class="contact-card">
        <h1>Fale com a Goldpack</h1>
        <p class="note">Reserve um produto ou mande sua dúvida. A resposta chega no WhatsApp ${esc(phoneLabel())}.</p>
        ${lines.map(([label, value]) => `<div class="spec"><small>${esc(label)}</small><b>${esc(value)}</b></div>`).join("")}
        ${phoneDigits() ? `
          <form data-act="contact">
            <label class="sr" for="contact-name">Nome</label>
            <input id="contact-name" name="name" placeholder="Seu nome" required>
            <label class="sr" for="contact-message">Mensagem</label>
            <textarea id="contact-message" name="message" placeholder="Escreva sua mensagem" required></textarea>
            <button class="btn btn-orange" type="submit">Enviar no WhatsApp</button>
          </form>
        ` : `<p class="note">O WhatsApp da loja volta em instantes.</p>`}
      </section>
    </div>
  `;
}

function footer() {
  return `
    <footer class="footer">
      <nav class="footer-links" aria-label="Institucional">
        <a href="#/contato">Contato</a>
        ${POLICIES.map(([id, label]) => `<a href="#/${id}">${esc(label)}</a>`).join("")}
      </nav>
      <p class="credit">Site desenvolvido por <a href="${esc(developer.url)}" target="_blank" rel="noopener">${esc(developer.name)}</a></p>
    </footer>
  `;
}

function privacyNotice() {
  return `
    <div class="notice" role="region" aria-label="Aviso de privacidade">
      <p>Registramos dados técnicos da visita, como IP e página, para segurança e estatística, conforme a LGPD. Saiba mais em <a href="#/privacidade">Privacidade</a> e <a href="#/cookies">Cookies</a>.</p>
      <button class="btn btn-orange" type="button" data-act="notice-ok">Entendi</button>
    </div>
  `;
}

function menuDrawer() {
  return `
    <div class="menu-back" data-act="menu-close"></div>
    <nav class="menu" aria-label="Menu">
      <header>
        <strong>Menu</strong>
        <button class="close" type="button" data-act="menu-close" aria-label="Fechar menu">×</button>
      </header>
      ${navLinks()}
      <a href="${whatsappLink("Olá, Goldpack! Vim pelo catálogo.")}" target="_blank" rel="noopener">WhatsApp ${esc(phoneLabel())}</a>
    </nav>
  `;
}

function searchIcon() {
  return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><path d="M20 20l-3.5-3.5"></path></svg>`;
}

function menuIcon() {
  return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"></path></svg>`;
}

function whatsappLink(message) {
  return `https://wa.me/${phoneDigits()}?text=${encodeURIComponent(message)}`;
}

function writeQuery(mutate) {
  const route = currentRoute();
  const params = route.params;
  mutate(params);
  [...params.entries()].forEach(([key, value]) => {
    if (!value) params.delete(key);
  });
  const qs = params.toString();
  const hash = `#/catalog${qs ? `?${qs}` : ""}`;
  if (location.hash === hash) render();
  else history.replaceState(null, "", hash);
  render();
}

function bind() {
  document.addEventListener("click", (event) => {
    const target = event.target.closest("[data-act]");
    if (!target || target.tagName === "FORM") return;
    const act = target.dataset.act;
    if (act === "notice-ok") {
      state.noticeOpen = false;
      try {
        localStorage.setItem("goldpack-aviso", "1");
      } catch {
        /* storage blocked: the notice just shows again next visit */
      }
    } else if (act === "menu-open") state.menuOpen = true;
    else if (act === "menu-close") state.menuOpen = false;
    else if (act === "filters") state.filtersOpen = !state.filtersOpen;
    else if (act === "qty") {
      const product = productById(currentRoute().id);
      const stock = Math.max(1, Number(product?.stock) || 1);
      state.qty = Math.min(stock, Math.max(1, state.qty + Number(target.dataset.dir)));
    } else return;
    render();
  });

  document.addEventListener("submit", (event) => {
    const form = event.target;
    if (form.dataset.act === "search") {
      event.preventDefault();
      const params = new URLSearchParams();
      const q = document.getElementById("q")?.value.trim() || "";
      const kind = document.getElementById("scope")?.value || "";
      if (q) params.set("q", q);
      if (kind) params.set("kind", kind);
      location.hash = `#/catalog${params.toString() ? `?${params}` : ""}`;
      return;
    }
    if (form.dataset.act === "contact") {
      event.preventDefault();
      const data = new FormData(form);
      const message = `Olá, Goldpack! Meu nome é ${data.get("name")}.\n\n${data.get("message")}`;
      window.open(whatsappLink(message), "_blank", "noopener");
    }
  });

  document.addEventListener("change", (event) => {
    const filter = event.target.dataset.filter;
    if (!filter) return;
    writeQuery((params) => {
      if (filter === "stock") params.set("stock", event.target.checked ? "1" : "");
      else params.set(filter, event.target.value);
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && state.menuOpen) {
      state.menuOpen = false;
      render();
    }
  });

  window.addEventListener("hashchange", () => {
    state.menuOpen = false;
    window.scrollTo(0, 0);
    render();
  });
}

async function loadProducts() {
  if (!isConfigured()) {
    state.status = "unconfigured";
    return;
  }
  try {
    const supabase = await getClient();
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("active", true)
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw error;
    state.products = data || [];
    state.status = "ready";
    await loadStorefrontExtras(supabase);
  } catch (error) {
    state.status = "error";
    state.error = friendlyError(error);
  }
}

async function loadStorefrontExtras(supabase) {
  const tabs = await supabase.from("store_tabs").select("*").eq("active", true).order("sort_order", { ascending: true });
  if (!tabs.error) state.tabs = tabs.data || [];
}

async function recordVisit() {
  if (!isConfigured() || sessionStorage.getItem("goldpack-visit")) return;
  sessionStorage.setItem("goldpack-visit", "1");
  try {
    const supabase = await getClient();
    let ip = "";
    try {
      const response = await fetch("https://api.ipify.org?format=json");
      const payload = await response.json();
      ip = String(payload.ip || "");
    } catch {
      ip = "";
    }
    const { error } = await supabase.from("visits").insert({
      ip,
      path: `${location.pathname}${location.hash || ""}`,
      referrer: document.referrer || "",
      user_agent: navigator.userAgent || "",
    });
    if (error) throw error;
  } catch {
    sessionStorage.removeItem("goldpack-visit");
  }
}

bind();
render();
loadProducts().then(() => {
  render();
  hideBoot();
  recordVisit();
});
