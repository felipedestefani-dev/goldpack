// Cartas e coleções de Pokémon TCG em português, pela API pública da TCGdex (tcgdex.dev).
const API = "https://api.tcgdex.net/v2/pt";
// Coleções do TCG Pocket (jogo de celular) não existem como carta física.
const POCKET = /^(A\d|B\d|P-A)/i;

let setsPromise = null;
const setCache = new Map();

async function getJson(path) {
  const response = await fetch(`${API}${path}`);
  if (!response.ok) throw new Error(`TCGdex respondeu ${response.status}`);
  return response.json();
}

export function loadSets() {
  if (!setsPromise) {
    setsPromise = getJson("/sets")
      .then((list) => list.filter((set) => !POCKET.test(set.id)).reverse())
      .catch((error) => {
        setsPromise = null;
        throw error;
      });
  }
  return setsPromise;
}

async function setDetails(id) {
  if (!setCache.has(id)) {
    setCache.set(id, getJson(`/sets/${encodeURIComponent(id)}`).catch((error) => {
      setCache.delete(id);
      throw error;
    }));
  }
  return setCache.get(id);
}

function setIdOf(card) {
  const local = String(card.localId || "");
  return card.id.endsWith(`-${local}`) ? card.id.slice(0, -(local.length + 1)) : card.id.split("-")[0];
}

function normalizeNumber(value) {
  return String(value || "").trim().toUpperCase().replace(/^([A-Z-]*)0+(?=\d)/, "$1");
}

// "125/197" → número 125 de uma coleção com 197 cartas; "TG05" → número TG05.
export function parseCardNumber(value) {
  const [local = "", total = ""] = String(value || "").split("/").map((part) => part.trim());
  const official = Number.parseInt(total, 10);
  return { local: normalizeNumber(local), total: Number.isFinite(official) && official > 0 ? official : null };
}

export async function searchCards({ name = "", number = "" } = {}) {
  const wantedName = name.trim();
  const { local, total } = parseCardNumber(number);
  if (!local && wantedName.length < 2) return [];
  const params = [];
  if (wantedName) params.push(`name=${encodeURIComponent(wantedName)}`);
  if (local) params.push(`localId=${encodeURIComponent(local)}`);
  else params.push("pagination:itemsPerPage=80");
  const [sets, cards] = await Promise.all([loadSets(), getJson(`/cards?${params.join("&")}`)]);
  const byId = new Map(sets.map((set, index) => [set.id, { name: set.name, rank: index, official: set.cardCount?.official }]));
  return cards
    .map((card) => {
      const set = byId.get(setIdOf(card));
      if (!set) return null;
      if (local && normalizeNumber(card.localId) !== local) return null;
      if (total && set.official !== total) return null;
      return {
        id: card.id,
        name: card.name,
        number: cardNumber(card.localId, set.official),
        setName: set.name,
        rank: set.rank,
        image: card.image ? `${card.image}/low.webp` : "",
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.rank - b.rank)
    .slice(0, local ? 40 : 30);
}

function cardNumber(localId, official) {
  const local = String(localId || "");
  if (!/^\d+$/.test(local) || !official) return local;
  const width = Math.max(3, String(official).length);
  return `${local.padStart(width, "0")}/${String(official).padStart(width, "0")}`;
}

function finishOf(variants) {
  if (!variants) return "Normal";
  if (variants.holo && !variants.normal) return "Foil";
  return "Normal";
}

const RARITIES = {
  "none": "",
  "pikachu rare": "Rara Pikachu",
  "futuristic rare": "Rara Futurista",
  "mega attack rare": "Rara de Ataque Mega",
  "rgb rare": "Rara RGB",
  "rare secreta": "Rara Secreta",
  "hiper rara": "Hiper Rara",
  "shiny rara": "Rara Brilhante",
  "shiny rara v": "Rara Brilhante V",
  "shiny rara vmax": "Rara Brilhante VMAX",
  "ace spec raro": "ACE SPEC Rara",
  "mega hiper raro": "Mega Hiper Rara",
};

function rarityOf(value) {
  const text = String(value || "").trim();
  const mapped = RARITIES[text.toLowerCase()];
  return mapped ?? text;
}

function describe(card, set) {
  const lines = [];
  const serie = set.serie?.name ? ` (${set.serie.name})` : "";
  lines.push(`${card.name}, carta da coleção ${set.name}${serie}.`);
  const traits = [];
  if (card.types?.length) traits.push(`Tipo ${card.types.join(" / ")}`);
  if (card.hp) traits.push(`${card.hp} PS`);
  if (card.stage) traits.push(card.stage);
  if (traits.length) lines.push(`${traits.join(" · ")}.`);
  if (card.illustrator) lines.push(`Ilustração: ${card.illustrator}.`);
  return lines.join("\n");
}

export async function cardDetails(id) {
  const card = await getJson(`/cards/${encodeURIComponent(id)}`);
  const set = await setDetails(card.set.id).catch(() => card.set);
  return {
    name: card.name,
    collection: set.name || card.set.name || "",
    collection_code: set.abbreviation?.official || String(card.set.id || "").toUpperCase(),
    card_number: cardNumber(card.localId, set.cardCount?.official || card.set.cardCount?.official),
    rarity: rarityOf(card.rarity),
    finish: finishOf(card.variants),
    image_url: card.image ? `${card.image}/high.webp` : "",
    description: describe(card, set),
  };
}

export async function collectionCode(name) {
  const sets = await loadSets();
  const wanted = name.trim().toLowerCase();
  const match = sets.find((set) => set.name.toLowerCase() === wanted);
  if (!match) return "";
  const set = await setDetails(match.id).catch(() => null);
  return set?.abbreviation?.official || match.id.toUpperCase();
}
