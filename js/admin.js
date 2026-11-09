import { getClient, isConfigured } from "./supabase.js";
import { esc, friendlyError, kindLabel, money, safeUrl } from "./format.js";

const AUTO_CONDITION = { sealed: "Lacrado", single: "NM", accessory: "Novo" };
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
const LANGUAGES = ["PT-BR", "EN", "JP", "KO", "ZH", "ES", "DE", "FR", "IT"];
const CONDITIONS = ["Lacrado", "Novo", "NM", "SP", "MP", "HP", "Danificada"];
const FINISHES = ["Normal", "Foil", "Reverse", "Etched"];
const ADMIN_SQL = "insert into public.admins (user_id) values ('cole-o-uuid-aqui');";

const app = document.querySelector("#app");
const state = {
  mode: "boot",
  session: null,
  products: [],
  error: "",
  notice: "",
  banners: [],
  tabs: [],
  visits: [],
  extraError: "",
  q: "",
  editor: null,
  busy: false,
};

function blankForm() {
  return {
    id: "",
    name: "",
    kind: "sealed",
    game: "",
    collection: "",
    collection_code: "",
    card_number: "",
    language: "PT-BR",
    condition: "Lacrado",
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
  return `<img src="/assets/logo.png" alt="Goldpack">`;
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
      ${state.error ? `<p class="alert" role="alert">${esc(state.error)}</p>` : ""}
      <label>E-mail
        <input name="email" type="email" autocomplete="username" required value="${esc(state.email || "")}">
      </label>
      <label>Senha
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

const SECTIONS = [
  ["visao", "Visão geral"],
  ["produtos", "Produtos"],
  ["estoque", "Estoque"],
  ["banners", "Banners"],
  ["abas", "Abas"],
  ["visitas", "Visitas"],
];

function currentSection() {
  const name = (location.hash || "#visao").replace(/^#/, "").split("?")[0];
  return SECTIONS.some(([id]) => id === name) ? name : "visao";
}

function appShell() {
  const section = currentSection();
  return `
    <div class="shell">
      <aside class="side">
        <a href="/">${logo()}</a>
        <nav class="side-nav" aria-label="Seções do painel">
          ${SECTIONS.map(([id, label]) => `<a class="${id === section ? "on" : ""}" href="#${id}">${label}</a>`).join("")}
        </nav>
        <p>${esc(state.session?.user?.email || "")}</p>
        <button class="btn btn-orange" type="button" data-act="logout">Sair</button>
      </aside>
      <section class="workspace">
        ${state.notice ? `<p class="ok">${esc(state.notice)}</p>` : ""}
        ${state.error ? `<p class="alert" role="alert">${esc(state.error)}</p>` : ""}
        ${state.extraError ? `<p class="note">${esc(state.extraError)}</p>` : ""}
        ${section === "visao" ? overview() : ""}
        ${section === "produtos" ? productsPanel() : ""}
        ${section === "estoque" ? stockPanel() : ""}
        ${section === "banners" ? bannersPanel() : ""}
        ${section === "abas" ? tabsPanel() : ""}
        ${section === "visitas" ? visitsPanel() : ""}
      </section>
    </div>
    ${state.editor ? editor(state.editor) : ""}
  `;
}

function filteredProducts() {
  const q = state.q.trim().toLowerCase();
  return state.products.filter((product) => {
    if (!q) return true;
    return [product.name, product.game, product.collection, product.card_number].join(" ").toLowerCase().includes(q);
  });
}

function productsPanel() {
  const products = filteredProducts();
  return `
    <div class="workspace-head">
      <div>
        <h1>Produtos</h1>
        <p class="note">${state.products.length} no banco · só os publicados aparecem na loja</p>
      </div>
      <button class="btn btn-orange" type="button" data-act="new">Novo produto</button>
    </div>
    <div class="toolbar">
      <input id="admin-q" type="search" placeholder="Buscar produto" value="${esc(state.q)}">
    </div>
    <div class="list">
      ${products.length ? products.map(row).join("") : `<div class="panel"><h2>${state.products.length ? "Nenhum produto com essa busca" : "Nenhum produto ainda"}</h2><p>${state.products.length ? "Tente outro termo." : "Use Novo produto para publicar o primeiro anúncio."}</p></div>`}
    </div>
  `;
}

function when(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleString("pt-BR");
}

function overview() {
  const units = state.products.reduce((sum, product) => sum + (Number(product.stock) || 0), 0);
  const published = state.products.filter((product) => product.active).length;
  const out = state.products.filter((product) => (Number(product.stock) || 0) <= 0).length;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const today = state.visits.filter((visit) => new Date(visit.created_at) >= start).length;
  const cards = [
    ["Produtos", state.products.length],
    ["Publicados", published],
    ["Unidades", units],
    ["Esgotados", out],
    ["Visitas hoje", today],
    ["Visitas", state.visits.length],
  ];
  return `
    <div class="workspace-head"><h1>Visão geral</h1></div>
    <div class="stats">${cards.map(([label, value]) => `<article class="stat"><span>${label}</span><b>${value}</b></article>`).join("")}</div>
    <h2>Últimas visitas</h2>
    ${state.visits.slice(0, 5).map((visit) => `<p class="note">${esc(when(visit.created_at))} · ${esc(visit.ip || "IP não identificado")} · ${esc(visit.path || "/")}</p>`).join("") || `<p class="note">Nenhuma visita ainda.</p>`}
  `;
}

function stockPanel() {
  const products = filteredProducts();
  return `
    <div class="workspace-head">
      <div>
        <h1>Estoque</h1>
        <p class="note">Ajuste a quantidade de cada anúncio.</p>
      </div>
    </div>
    <div class="toolbar">
      <input id="admin-q" type="search" placeholder="Buscar no estoque" value="${esc(state.q)}">
    </div>
    <div class="list">
      ${products.length ? products.map((product) => `
        <article class="item plain">
          <div>
            <h2>${esc(product.name)}</h2>
            <p class="meta">${(Number(product.stock) || 0) <= 0 ? "Esgotado" : `${Number(product.stock)} un`}</p>
          </div>
          <div class="switches">
            <input class="stock-input" data-stock="${esc(product.id)}" type="number" min="0" step="1" value="${Number(product.stock) || 0}">
            <button class="tiny" type="button" data-act="stock-save" data-id="${esc(product.id)}">Salvar</button>
          </div>
        </article>
      `).join("") : `<div class="panel"><h2>Nenhum produto no estoque</h2></div>`}
    </div>
  `;
}

function bannersPanel() {
  return `
    <div class="workspace-head">
      <div>
        <h1>Banners</h1>
        <p class="note">Aparecem debaixo da busca na loja.</p>
      </div>
      <button class="btn btn-orange" type="button" data-act="new-banner">Novo banner</button>
    </div>
    <div class="list">
      ${state.banners.length ? state.banners.map((banner) => `
        <article class="item">
          ${safeUrl(banner.image_url) ? `<img src="${esc(safeUrl(banner.image_url))}" alt="">` : `<div class="thumb ph"><b>B</b></div>`}
          <div>
            <h2>${esc(banner.title || "Sem título")}</h2>
            <p class="meta">${banner.active ? "Na loja" : "Oculto"} · ordem ${Number(banner.sort_order) || 0}</p>
          </div>
          <div class="switches">
            <button class="tiny" type="button" data-act="edit-banner" data-id="${esc(banner.id)}">Editar</button>
            <button class="danger tiny" type="button" data-act="delete-banner" data-id="${esc(banner.id)}">Excluir</button>
          </div>
        </article>
      `).join("") : `<div class="panel"><h2>Nenhum banner</h2><p>Enquanto não houver imagem publicada, a loja mostra o banner animado da Goldpack.</p></div>`}
    </div>
  `;
}

function tabsPanel() {
  return `
    <div class="workspace-head">
      <div>
        <h1>Abas</h1>
        <p class="note">Os atalhos do menu da loja.</p>
      </div>
      <button class="btn btn-orange" type="button" data-act="new-tab">Nova aba</button>
    </div>
    <div class="list">
      ${state.tabs.length ? state.tabs.map((tab) => `
        <article class="item plain">
          <div>
            <h2>${esc(tab.label)}</h2>
            <p class="meta">${esc(tab.href)} · ${tab.active ? "Visível" : "Oculta"}</p>
          </div>
          <div class="switches">
            <button class="tiny" type="button" data-act="edit-tab" data-id="${esc(tab.id)}">Editar</button>
            <button class="danger tiny" type="button" data-act="delete-tab" data-id="${esc(tab.id)}">Excluir</button>
          </div>
        </article>
      `).join("") : `<div class="panel"><h2>Nenhuma aba</h2><p>Crie atalhos como Catálogo, Lacrados ou Contato.</p></div>`}
    </div>
  `;
}

function visitsPanel() {
  return `
    <div class="workspace-head">
      <div>
        <h1>Visitas</h1>
        <p class="note">${state.visits.length} registros de quem entrou na loja.</p>
      </div>
    </div>
    <div class="list">
      ${state.visits.length ? state.visits.map((visit) => `
        <article class="item visit">
          <div>
            <h2>${esc(visit.ip || "IP não identificado")}</h2>
            <p class="meta">${esc(when(visit.created_at))} · ${esc(visit.path || "/")} ${visit.referrer ? `· veio de ${esc(visit.referrer)}` : ""}</p>
          </div>
        </article>
      `).join("") : `<div class="panel"><h2>Nenhuma visita ainda</h2><p>Cada pessoa que abrir a loja entra aqui com IP, página e horário.</p></div>`}
    </div>
  `;
}

function row(product) {
  const image = safeUrl(product.image_url);
  return `
    <article class="item">
      ${image ? `<img src="${esc(image)}" alt="">` : `<div class="thumb ph"><b>${esc(initials(product.name))}</b></div>`}
      <div>
        <h2>${esc(product.name)}</h2>
        <p class="meta">${esc(kindLabel(product.kind))} · ${money(product.price)} · ${Number(product.stock) || 0} un ${product.active ? "" : "· oculto na loja"}</p>
      </div>
      <div class="switches">
        <button class="tiny" type="button" data-act="toggle" data-id="${esc(product.id)}">${product.active ? "Ocultar" : "Publicar"}</button>
        <button class="tiny" type="button" data-act="edit" data-id="${esc(product.id)}">Editar</button>
        <button class="danger tiny" type="button" data-act="delete" data-id="${esc(product.id)}">Excluir</button>
      </div>
    </article>
  `;
}

function initials(name) {
  return String(name || "GP").trim().split(/\s+/).slice(0, 2).map((part) => part[0] || "").join("").toUpperCase();
}

function bannerEditor(form) {
  const preview = safeUrl(form.image_url);
  return `
    <div class="editor-back" data-act="close-editor"></div>
    <form class="editor stack" data-act="save">
      <div class="workspace-head">
        <h2>${form.id ? "Editar banner" : "Novo banner"}</h2>
        <button class="close" type="button" data-act="close-editor" aria-label="Fechar">×</button>
      </div>
      <label class="field">Título
        <input name="title" value="${esc(form.title)}" placeholder="Opcional, só para você reconhecer">
      </label>
      <label class="field">Link
        <input name="link" value="${esc(form.link)}" placeholder="https:// ou #/catalog">
      </label>
      <label class="field">Ordem
        <input name="sort_order" type="number" step="1" value="${Number(form.sort_order) || 0}">
      </label>
      <label class="field">Imagem
        <input id="image-file" name="image" type="file" accept="image/png,image/jpeg,image/webp">
      </label>
      <img id="image-preview" alt="" src="${esc(preview)}" ${preview ? "" : "hidden"}>
      <label class="check"><input name="active" type="checkbox" ${form.active ? "checked" : ""}> Mostrar na loja</label>
      <button class="btn btn-purple" type="submit" ${state.busy ? "disabled" : ""}>Salvar banner</button>
    </form>
  `;
}

function tabEditor(form) {
  return `
    <div class="editor-back" data-act="close-editor"></div>
    <form class="editor stack" data-act="save">
      <div class="workspace-head">
        <h2>${form.id ? "Editar aba" : "Nova aba"}</h2>
        <button class="close" type="button" data-act="close-editor" aria-label="Fechar">×</button>
      </div>
      <label class="field">Nome
        <input name="label" required value="${esc(form.label)}" placeholder="Lacrados">
      </label>
      <label class="field">Destino
        <input name="href" required value="${esc(form.href)}" placeholder="#/catalog">
      </label>
      <label class="field">Ordem
        <input name="sort_order" type="number" step="1" value="${Number(form.sort_order) || 0}">
      </label>
      <label class="check"><input name="active" type="checkbox" ${form.active ? "checked" : ""}> Mostrar na loja</label>
      <button class="btn btn-purple" type="submit" ${state.busy ? "disabled" : ""}>Salvar aba</button>
    </form>
  `;
}

function editor(form) {
  if (form.type === "banner") return bannerEditor(form);
  if (form.type === "tab") return tabEditor(form);
  const preview = safeUrl(form.image_url);
  return `
    <div class="editor-back" data-act="close-editor"></div>
    <form class="editor stack" data-act="save">
      <div class="workspace-head">
        <h2>${form.id ? "Editar produto" : "Novo produto"}</h2>
        <button class="close" type="button" data-act="close-editor" aria-label="Fechar">×</button>
      </div>
      <label class="field">Nome
        <input name="name" required value="${esc(form.name)}" placeholder="Nome do produto">
      </label>
      <div class="split">
        <label class="field">Tipo
          <select name="kind">
            ${choice([["sealed", "Lacrado"], ["single", "Avulso"], ["accessory", "Acessório"]], form.kind)}
          </select>
        </label>
        <label class="field">Jogo
          <input name="game" list="games" value="${esc(form.game)}" placeholder="Pokémon, Magic, One Piece…">
        </label>
      </div>
      <datalist id="games">${GAMES.map((game) => `<option value="${esc(game)}"></option>`).join("")}</datalist>
      <div class="split">
        <label class="field">Coleção
          <input name="collection" value="${esc(form.collection)}">
        </label>
        <label class="field">Código da coleção
          <input name="collection_code" value="${esc(form.collection_code)}">
        </label>
      </div>
      <div class="split">
        <label class="field">Número da carta
          <input name="card_number" value="${esc(form.card_number)}">
        </label>
        <label class="field">Raridade
          <input name="rarity" value="${esc(form.rarity)}">
        </label>
      </div>
      <div class="split">
        <label class="field">Idioma
          <select name="language">${choice(LANGUAGES.map((item) => [item, item]), form.language)}</select>
        </label>
        <label class="field">Condição
          <select name="condition">${choice(CONDITIONS.map((item) => [item, item]), form.condition)}</select>
        </label>
      </div>
      <div class="split">
        <label class="field">Acabamento
          <select name="finish">${choice(FINISHES.map((item) => [item, item]), form.finish)}</select>
        </label>
        <label class="field">Estoque
          <input name="stock" type="number" min="0" step="1" required value="${esc(form.stock)}">
        </label>
      </div>
      <div class="split">
        <label class="field">Preço (R$)
          <input name="price" type="number" min="0" step="0.01" required value="${esc(form.price)}">
        </label>
        <label class="field">Preço anterior (opcional)
          <input name="compare_at" type="number" min="0" step="0.01" value="${esc(form.compare_at)}">
        </label>
      </div>
      <div class="split">
        <label class="field">Etiqueta do card
          <input name="tag" value="${esc(form.tag)}" placeholder="Box selada, Blister…">
        </label>
        <label class="field">Selo
          <input name="badge" value="${esc(form.badge)}" placeholder="Lançamento, Promoção…">
        </label>
      </div>
      <label class="field">Descrição
        <textarea name="description">${esc(form.description)}</textarea>
      </label>
      <div class="drop">
        <strong>Foto</strong>
        <img id="image-preview" alt="" ${preview ? `src="${esc(preview)}"` : "hidden"}>
        <input id="image-file" name="image" type="file" accept="image/png,image/jpeg,image/webp">
        <label class="field">Ou cole o link da imagem
          <input name="image_url" value="${esc(form.image_url)}" placeholder="https://">
        </label>
      </div>
      <div class="checks">
        <label><input name="featured" type="checkbox" ${form.featured ? "checked" : ""}> Destaque na home</label>
        <label><input name="active" type="checkbox" ${form.active ? "checked" : ""}> Publicado na loja</label>
      </div>
      <div class="row-actions">
        <button class="btn btn-orange" type="submit" ${state.busy ? "disabled" : ""}>${state.busy ? "Salvando…" : "Salvar"}</button>
        <button class="btn btn-line" type="button" data-act="close-editor">Cancelar</button>
      </div>
    </form>
  `;
}

function choice(pairs, current) {
  return pairs.map(([value, label]) => (
    `<option value="${esc(value)}" ${String(value) === String(current) ? "selected" : ""}>${esc(label)}</option>`
  )).join("");
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
    await loadProducts(supabase);
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

async function loadProducts(supabase) {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  state.products = data || [];
  const [banners, tabs, visits] = await Promise.all([
    supabase.from("banners").select("*").order("sort_order", { ascending: true }),
    supabase.from("store_tabs").select("*").order("sort_order", { ascending: true }),
    supabase.from("visits").select("*").order("created_at", { ascending: false }).limit(300),
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
  if (!Number.isFinite(price) || price < 0) return "Informe um preço válido.";
  if (!Number.isInteger(stock) || stock < 0) return "O estoque precisa ser um número inteiro.";
  if (form.compare_at !== "") {
    const compare = Number(form.compare_at);
    if (!Number.isFinite(compare) || compare < 0) return "O preço anterior não é válido.";
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

async function saveBanner(formElement) {
  const data = new FormData(formElement);
  const file = data.get("image");
  const banner = {
    id: state.editor?.id || "",
    type: "banner",
    title: String(data.get("title") || "").trim(),
    link: String(data.get("link") || "").trim(),
    sort_order: Number(data.get("sort_order")) || 0,
    image_url: state.editor?.image_url || "",
    active: data.get("active") === "on",
  };
  if (file instanceof File && file.size) {
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      state.error = "A foto precisa ser PNG, JPG ou WebP.";
      render();
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      state.error = "A foto passa de 5 MB.";
      render();
      return;
    }
  }
  state.busy = true;
  state.error = "";
  state.editor = banner;
  render();
  try {
    const supabase = await client();
    if (file instanceof File && file.size) banner.image_url = await uploadImage(supabase, file);
    if (!safeUrl(banner.image_url)) throw new Error("Envie a imagem do banner.");
    const row = {
      title: banner.title,
      link: banner.link,
      sort_order: banner.sort_order,
      image_url: banner.image_url,
      active: banner.active,
    };
    const query = banner.id
      ? supabase.from("banners").update(row).eq("id", banner.id)
      : supabase.from("banners").insert(row);
    const { error } = await query;
    if (error) throw error;
    await loadProducts(supabase);
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
  if (!tab.label || !tab.href) {
    state.error = "A aba precisa de nome e destino.";
    state.editor = tab;
    render();
    return;
  }
  state.busy = true;
  state.error = "";
  state.editor = tab;
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
    await loadProducts(supabase);
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
    await loadProducts(supabase);
    state.editor = null;
    state.notice = "Produto salvo.";
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
    await loadProducts(supabase);
    state.notice = product.active ? "Produto oculto na loja." : "Produto publicado.";
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
    await loadProducts(supabase);
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
    await loadProducts(supabase);
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
    await loadProducts(supabase);
    state.notice = notice;
    state.error = "";
  } catch (error) {
    state.error = friendlyError(error);
  }
  render();
}

function bind() {
  document.addEventListener("click", async (event) => {
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
    if (act === "new") {
      state.editor = blankForm();
      state.error = "";
      render();
      return;
    }
    if (act === "new-banner") {
      state.editor = { type: "banner", id: "", title: "", image_url: "", link: "", sort_order: state.banners.length, active: true };
      state.error = "";
      render();
      return;
    }
    if (act === "edit-banner") {
      const banner = state.banners.find((item) => item.id === target.dataset.id);
      if (banner) state.editor = { type: "banner", ...banner };
      state.error = "";
      render();
      return;
    }
    if (act === "delete-banner") {
      await removeRow("banners", target.dataset.id, "Banner excluído.");
      return;
    }
    if (act === "new-tab") {
      state.editor = { type: "tab", id: "", label: "", href: "#/", sort_order: state.tabs.length, active: true };
      state.error = "";
      render();
      return;
    }
    if (act === "edit-tab") {
      const tab = state.tabs.find((item) => item.id === target.dataset.id);
      if (tab) state.editor = { type: "tab", ...tab };
      state.error = "";
      render();
      return;
    }
    if (act === "delete-tab") {
      await removeRow("store_tabs", target.dataset.id, "Aba excluída.");
      return;
    }
    if (act === "stock-save") {
      await saveStock(target.dataset.id);
      return;
    }
    if (act === "edit") {
      const product = state.products.find((item) => item.id === target.dataset.id);
      if (product) state.editor = formFromProduct(product);
      state.error = "";
      render();
      return;
    }
    if (act === "close-editor") {
      state.editor = null;
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
          await loadProducts(supabase);
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
      await save(form);
    }
  });

  document.addEventListener("input", (event) => {
    if (event.target.id !== "admin-q") return;
    state.q = event.target.value;
    if (!state.editor) render();
  });

  document.addEventListener("change", (event) => {
    if (event.target.id === "image-file") {
      const file = event.target.files?.[0];
      const preview = document.getElementById("image-preview");
      if (file && preview) {
        preview.src = URL.createObjectURL(file);
        preview.hidden = false;
      }
    }
    if (event.target.name === "kind") {
      const condition = document.querySelector("[name=condition]");
      const autos = new Set(Object.values(AUTO_CONDITION));
      if (condition && autos.has(condition.value)) {
        condition.value = AUTO_CONDITION[event.target.value] || "NM";
      }
    }
  });

  window.addEventListener("hashchange", () => {
    if (state.mode === "app" && !state.editor) render();
  });
}

bind();
boot();
