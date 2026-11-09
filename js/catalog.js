import { benefits, store } from "./config.js";
import { discountOf, esc, kindLabel, money, safeUrl } from "./format.js";
import { getClient, isConfigured } from "./supabase.js";

const CART_KEY = "goldpack-cart";
const state = {
  products: [],
  status: isConfigured() ? "loading" : "unconfigured",
  error: "",
  cart: loadCart(),
  cartOpen: false,
  menuOpen: false,
  filtersOpen: false,
  qty: 1,
  qtyFor: "",
  toast: "",
  toastTimer: 0,
};

const app = document.querySelector("#app");

function loadCart() {
  try {
    const parsed = JSON.parse(localStorage.getItem(CART_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.filter((line) => line?.id && line.qty > 0) : [];
  } catch {
    return [];
  }
}

function saveCart() {
  localStorage.setItem(CART_KEY, JSON.stringify(state.cart));
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

function productById(id) {
  return state.products.find((product) => product.id === id) || null;
}

function cartCount() {
  return state.cart.reduce((sum, line) => sum + line.qty, 0);
}

function cartDetailed() {
  return state.cart
    .map((line) => {
      const product = productById(line.id);
      if (!product) return null;
      const qty = Math.min(line.qty, Math.max(0, Number(product.stock) || 0) || line.qty);
      return { ...line, qty, product, total: qty * Number(product.price || 0) };
    })
    .filter(Boolean);
}

function showToast(message) {
  state.toast = message;
  clearTimeout(state.toastTimer);
  state.toastTimer = setTimeout(() => {
    state.toast = "";
    render();
  }, 2200);
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
  document.body.classList.toggle("lock", state.cartOpen || state.menuOpen);
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
      ${route.name === "home" || !["catalog", "p", "contato"].includes(route.name) ? homeView() : ""}
    </main>
    ${footer()}
    ${state.cartOpen ? cartDrawer() : ""}
    ${state.menuOpen ? menuDrawer() : ""}
    ${state.toast ? `<div class="toast" role="status">${esc(state.toast)}</div>` : ""}
    ${phoneDigits() ? `<a class="wa" href="${whatsappLink("Olá, Goldpack! Vim pelo catálogo.")}" target="_blank" rel="noopener" aria-label="Falar no WhatsApp">${whatsappIcon()}</a>` : ""}
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
            <a href="#/">Início</a>
            <a href="#/catalog">Catálogo</a>
            <a href="#/contato">Contato</a>
          </nav>
          <button class="icon-btn" type="button" data-act="cart-open" aria-label="Abrir carrinho">
            ${cartIcon()}
            ${cartCount() ? `<span class="badge">${cartCount()}</span>` : ""}
          </button>
          <button class="menu-btn" type="button" data-act="menu-open" aria-label="Abrir menu">${menuIcon()}</button>
        </div>
      </div>
    </header>
  `;
}

function options(pairs, current) {
  return pairs.map(([value, label]) => (
    `<option value="${esc(value)}" ${value === current ? "selected" : ""}>${esc(label)}</option>`
  )).join("");
}

function homeView() {
  const featured = state.products.filter((product) => product.featured);
  const sealed = state.products.filter((product) => product.kind === "sealed").slice(0, 8);
  const accessories = state.products.filter((product) => product.kind === "accessory").slice(0, 8);
  const groups = new Map();
  state.products.filter((product) => product.kind === "single").forEach((product) => {
    const key = product.collection || "Outras cartas";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(product);
  });
  const sections = [];
  if (featured.length) sections.push(section("Destaques", "Escolhidos pela loja", featured.slice(0, 8), "#/catalog?sort=recent"));
  if (sealed.length) sections.push(section("Lacrados", "Boxes, boosters e blisters", sealed, "#/catalog?kind=sealed"));
  let shown = 0;
  for (const [collection, items] of groups) {
    if (shown >= 4) break;
    const code = items.find((item) => item.collection_code)?.collection_code;
    const game = items.find((item) => item.game)?.game;
    sections.push(section(
      "Avulsos",
      [collection, code, game].filter(Boolean).join(" · "),
      items.slice(0, 8),
      `#/catalog?kind=single&collection=${encodeURIComponent(collection)}`,
    ));
    shown += 1;
  }
  if (accessories.length) sections.push(section("Acessórios", "Sleeves, pastas e o que a loja publicar", accessories, "#/catalog?kind=accessory"));

  return `
    <section class="hero wrap">
      <div class="hero-copy">
        <span class="kicker">Catálogo Goldpack</span>
        <h1>Você encontra na Goldpack</h1>
        <p>Lacrados, avulsos e acessórios. O estoque desta vitrine é o que a loja publicou.</p>
        <div class="hero-actions">
          <a class="btn btn-orange" href="#/catalog">Ver catálogo</a>
          <a class="btn btn-ghost" href="#/contato">Fale com a loja</a>
        </div>
        ${state.status === "ready" ? `<p class="hero-count">${state.products.length} ${state.products.length === 1 ? "anúncio no catálogo" : "anúncios no catálogo"}</p>` : ""}
      </div>
      <div class="hero-brand">
        <img src="assets/logo.png" alt="">
      </div>
    </section>
    <section class="benefits wrap" aria-label="Como comprar">
      ${benefits.map((item) => `<article class="benefit"><strong>${esc(item.title)}</strong><span>${esc(item.text)}</span></article>`).join("")}
    </section>
    ${statusBlock()}
    ${state.status === "ready" && state.products.length ? sections.join("") : ""}
    ${state.status === "ready" && !state.products.length ? emptyCatalog() : ""}
  `;
}

function section(title, subtitle, products, href, plain = false) {
  return `
    <section class="section ${plain ? "" : "wrap"}">
      <div class="section-head">
        <div>
          <h2>${esc(title)}</h2>
          <p>${esc(subtitle)}</p>
        </div>
        <a href="${esc(href)}">Ver todos</a>
      </div>
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
          ${image ? `<img src="${esc(image)}" alt="">` : `<div class="ph"><b>${esc(initials(product.name))}</b><small>Sem foto</small></div>`}
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
      ${stock > 0 ? `<button class="plus" type="button" data-act="add" data-id="${esc(product.id)}" aria-label="Adicionar ${esc(product.name)} ao carrinho">+</button>` : ""}
    </article>
  `;
}

function statusBlock() {
  if (state.status === "loading") {
    return `<section class="section wrap"><div class="panel"><div class="spinner"></div><h2>Carregando catálogo</h2><p>Buscando os anúncios publicados.</p></div></section>`;
  }
  if (state.status === "unconfigured") {
    return `<section class="section wrap"><div class="panel"><h2>Catálogo pronto para conectar</h2><p>Quando a URL e a chave anon do Supabase estiverem em js/config.js, os produtos publicados aparecem aqui. Nada é exibido antes disso.</p><a class="btn btn-orange" href="admin.html">Como conectar</a></div></section>`;
  }
  if (state.status === "error") {
    return `<section class="section wrap"><div class="panel"><h2>Não foi possível carregar os produtos</h2><p>${esc(state.error)}</p><p>Confira a URL, a chave anon e se o arquivo supabase/schema.sql já foi executado.</p></div></section>`;
  }
  return "";
}

function emptyCatalog() {
  return `<section class="section wrap"><div class="panel"><h2>Nenhum produto publicado</h2><p>Esta vitrine só mostra o que for cadastrado no painel. Inclua lacrados, avulsos e acessórios por lá.</p><a class="btn btn-orange" href="admin.html">Abrir painel admin</a></div></section>`;
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
    ? `${products.length} ${products.length === 1 ? "anúncio" : "anúncios"}`
    : "Conecte o Supabase para publicar anúncios";
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
        ${state.status === "ready" && state.products.length && !products.length ? `<div class="panel"><h2>Nenhum anúncio com esses filtros</h2><p>Tente outro nome, coleção ou limpe a busca.</p></div>` : ""}
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
    return `<div class="wrap section"><div class="panel"><h2>Produto não encontrado</h2><p>Esse anúncio não está publicado.</p><a class="btn btn-orange" href="#/catalog">Voltar ao catálogo</a></div></div>`;
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
          ${image ? `<img src="${esc(image)}" alt="${esc(product.name)}">` : `<div class="ph"><b>${esc(initials(product.name))}</b><small>Sem foto</small></div>`}
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
              <button class="btn btn-orange" type="button" data-act="add" data-id="${esc(product.id)}" data-qty="${qty}">Adicionar ao carrinho</button>
            ` : (phoneDigits()
              ? `<a class="btn btn-orange" href="${whatsappLink(`Olá, Goldpack! Quero saber quando chegar: ${product.name}`)}">Avise-me no WhatsApp</a>`
              : `<span class="note">Esgotado.</span>`)}
          </div>
        </div>
      </article>
      ${related.length ? section("Da mesma coleção", product.collection, related, `#/catalog?collection=${encodeURIComponent(product.collection)}`, true) : ""}
    </div>
  `;
}

function contactView() {
  const lines = [
    store.city ? ["Cidade", store.city] : null,
    store.hours ? ["Horário", store.hours] : null,
    store.email ? ["E-mail", store.email] : null,
    phoneDigits() ? ["WhatsApp", store.whatsapp] : null,
  ].filter(Boolean);
  return `
    <div class="wrap">
      <section class="contact-card">
        <h1>Fale com a Goldpack</h1>
        <p class="note">O pedido do carrinho também pode ser enviado por aqui, quando o WhatsApp da loja estiver ativo.</p>
        ${lines.map(([label, value]) => `<div class="spec"><small>${esc(label)}</small><b>${esc(value)}</b></div>`).join("")}
        ${phoneDigits() ? `
          <form data-act="contact">
            <label class="sr" for="contact-name">Nome</label>
            <input id="contact-name" name="name" placeholder="Seu nome" required>
            <label class="sr" for="contact-message">Mensagem</label>
            <textarea id="contact-message" name="message" placeholder="Escreva sua mensagem" required></textarea>
            <button class="btn btn-orange" type="submit">Enviar no WhatsApp</button>
          </form>
        ` : `<p class="note">O WhatsApp da loja ainda não foi configurado.</p>`}
      </section>
    </div>
  `;
}

function footer() {
  const contact = [
    store.city ? `<p>${esc(store.city)}</p>` : "",
    store.hours ? `<p>${esc(store.hours)}</p>` : "",
    store.email ? `<a href="mailto:${esc(store.email)}">${esc(store.email)}</a>` : "",
    phoneDigits() ? `<a href="${whatsappLink("Olá, Goldpack!")}" target="_blank" rel="noopener">WhatsApp</a>` : "",
  ].filter(Boolean);
  return `
    <footer class="footer">
      <div class="wrap footer-grid">
        <div>
          <img class="footer-logo" src="assets/logo.png" alt="Goldpack">
          <p>${esc(store.tagline)}</p>
        </div>
        <div>
          <h2>Loja</h2>
          <a href="#/">Início</a>
          <a href="#/catalog">Catálogo</a>
          <a href="#/contato">Contato</a>
          <a href="admin.html">Admin</a>
        </div>
        <div>
          <h2>Atendimento</h2>
          ${contact.join("") || "<p>O pedido é confirmado pelo WhatsApp.</p>"}
        </div>
      </div>
      <div class="wrap legal">Imagens dos anúncios são as fotos enviadas pela loja. Goldpack · TCG, colecionáveis e games.</div>
    </footer>
  `;
}

function cartDrawer() {
  const lines = cartDetailed();
  const total = lines.reduce((sum, line) => sum + line.total, 0);
  const message = [
    "Olá, Goldpack! Quero fazer um pedido:",
    "",
    ...lines.map((line) => `• ${line.qty}x ${line.product.name} — ${money(line.total)}`),
    "",
    `Total: ${money(total)}`,
  ].join("\n");
  return `
    <div class="drawer-back" data-act="cart-close"></div>
    <aside class="drawer" role="dialog" aria-label="Carrinho">
      <header class="drawer-head">
        <h2>Carrinho</h2>
        <button class="close" type="button" data-act="cart-close" aria-label="Fechar carrinho">×</button>
      </header>
      <div class="cart-lines">
        ${lines.length ? lines.map((line) => `
          <article class="cart-line">
            ${safeUrl(line.product.image_url) ? `<img src="${esc(safeUrl(line.product.image_url))}" alt="">` : `<div class="thumb ph"><b>${esc(initials(line.product.name))}</b></div>`}
            <div>
              <strong>${esc(line.product.name)}</strong>
              <p class="meta">${[line.product.condition, line.product.finish, line.product.language].filter(Boolean).map(esc).join(" · ")}</p>
              <div class="stepper">
                <button type="button" data-act="cart-qty" data-id="${esc(line.id)}" data-dir="-1" aria-label="Diminuir">−</button>
                <span>${line.qty}</span>
                <button type="button" data-act="cart-qty" data-id="${esc(line.id)}" data-dir="1" aria-label="Aumentar">+</button>
              </div>
              <strong>${money(line.total)}</strong>
              <button class="btn btn-line" type="button" data-act="remove" data-id="${esc(line.id)}">Remover</button>
            </div>
          </article>
        `).join("") : `<div class="panel"><h2>Seu carrinho está vazio</h2><p>Os produtos publicados no catálogo aparecem aqui.</p></div>`}
      </div>
      <div class="cart-foot">
        <div class="total"><span>Total</span><span>${money(total)}</span></div>
        <p class="note">Frete e pagamento são combinados na confirmação.</p>
        ${lines.length && phoneDigits()
          ? `<a class="btn btn-orange" href="${whatsappLink(message)}" target="_blank" rel="noopener">Finalizar no WhatsApp</a>`
          : `<span class="btn btn-orange disabled">${lines.length ? "WhatsApp da loja ainda não configurado" : "Carrinho vazio"}</span>`}
      </div>
    </aside>
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
      <a href="#/">Início</a>
      <a href="#/catalog">Catálogo</a>
      <a href="#/catalog?kind=sealed">Lacrados</a>
      <a href="#/catalog?kind=single">Avulsos</a>
      <a href="#/catalog?kind=accessory">Acessórios</a>
      <a href="#/contato">Contato</a>
      <a href="admin.html">Admin</a>
    </nav>
  `;
}

function searchIcon() {
  return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><path d="M20 20l-3.5-3.5"></path></svg>`;
}

function cartIcon() {
  return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M6 6h15l-1.5 9h-12z"></path><path d="M6 6L5 3H2"></path><circle cx="9" cy="20" r="1.4"></circle><circle cx="18" cy="20" r="1.4"></circle></svg>`;
}

function menuIcon() {
  return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"></path></svg>`;
}

function whatsappIcon() {
  return `<svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12.04 2C6.58 2 2.15 6.4 2.15 11.83c0 1.74.46 3.44 1.34 4.94L2 22l5.39-1.4a10 10 0 0 0 4.65 1.18h.01c5.46 0 9.89-4.4 9.89-9.83C21.94 6.4 17.5 2 12.04 2zm5.76 14.56c-.24.68-1.4 1.3-1.94 1.38-.5.08-1.12.11-1.81-.11-.42-.14-.95-.31-1.64-.6-2.88-1.24-4.76-4.14-4.9-4.33-.14-.19-1.16-1.54-1.16-2.94s.73-2.08 1-2.37c.24-.28.64-.41 1.02-.41h.73c.23 0 .55-.09.86.65.32.77 1.08 2.64 1.18 2.83.1.19.16.42.03.67-.13.26-.2.42-.39.64-.19.23-.4.51-.57.68-.19.19-.39.4-.17.77.22.37 1 1.64 2.14 2.66 1.47 1.3 2.71 1.7 3.08 1.89.37.19.59.16.8-.1.22-.26.92-1.07 1.17-1.44.24-.37.49-.3.82-.18.33.13 2.08 1 2.44 1.18.36.19.6.28.68.43.08.16.08.9-.16 1.58z"></path></svg>`;
}

function whatsappLink(message) {
  return `https://wa.me/${phoneDigits()}?text=${encodeURIComponent(message)}`;
}

function addToCart(id, qty) {
  const product = productById(id);
  if (!product) return;
  const stock = Number(product.stock) || 0;
  if (stock <= 0) {
    showToast("Produto esgotado.");
    render();
    return;
  }
  const line = state.cart.find((item) => item.id === id);
  const next = (line?.qty || 0) + qty;
  if (next > stock) {
    showToast("Quantidade maior que o estoque.");
    render();
    return;
  }
  if (line) line.qty = next;
  else state.cart.push({ id, qty });
  saveCart();
  showToast("Adicionado ao carrinho.");
  state.cartOpen = true;
  render();
}

function setCartQty(id, dir) {
  const product = productById(id);
  const line = state.cart.find((item) => item.id === id);
  if (!line) return;
  const stock = Number(product?.stock) || line.qty;
  line.qty += dir;
  if (line.qty <= 0) state.cart = state.cart.filter((item) => item.id !== id);
  else line.qty = Math.min(line.qty, stock);
  saveCart();
  render();
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
    if (act === "cart-open") state.cartOpen = true;
    else if (act === "cart-close") state.cartOpen = false;
    else if (act === "menu-open") state.menuOpen = true;
    else if (act === "menu-close") state.menuOpen = false;
    else if (act === "filters") state.filtersOpen = !state.filtersOpen;
    else if (act === "add") addToCart(target.dataset.id, Number(target.dataset.qty) || 1);
    else if (act === "remove") {
      state.cart = state.cart.filter((line) => line.id !== target.dataset.id);
      saveCart();
    } else if (act === "cart-qty") setCartQty(target.dataset.id, Number(target.dataset.dir) || 0);
    else if (act === "qty") {
      const product = productById(currentRoute().id);
      const stock = Math.max(1, Number(product?.stock) || 1);
      state.qty = Math.min(stock, Math.max(1, state.qty + Number(target.dataset.dir)));
    } else return;
    if (act !== "add") render();
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
    if (event.key === "Escape") {
      state.cartOpen = false;
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
  } catch (error) {
    state.status = "error";
    state.error = error.message || "Falha ao buscar o catálogo.";
  }
}

bind();
render();
loadProducts().then(render);
