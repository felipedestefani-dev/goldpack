const TCGCSV = "https://tcgcsv.com/tcgplayer/3";
const TCGDEX = "https://api.tcgdex.net/v2";
// tcgcsv bloqueia user-agents genéricos (node, python…): precisa se identificar.
const HEADERS = { "User-Agent": "GoldpackTCG/1.0 (+https://goldpacktcg.com.br)" };
const DAY = 24 * 60 * 60 * 1000;

const TYPES = [
  { key: "etb", words: /\b(etb|elite|trainer|treinador|avancado)\b/g, test: (name) => /elite trainer box/.test(name) },
  { key: "box", words: /\b(booster box|display|caixa de boosters?)\b/g, test: (name) => /booster box/.test(name) },
  { key: "bundle", words: /\b(bundle|pacote de boosters?)\b/g, test: (name) => /bundle/.test(name) },
  { key: "blister", words: /\b(blister|blisters|triplo|tripack)\b/g, test: (name) => /blister/.test(name) },
  { key: "tin", words: /\b(lata|latas|tin|tins)\b/g, test: (name) => /\btins?\b/.test(name) },
  { key: "battle", words: /\b(build|battle|pre ?release)\b/g, test: (name) => /build & battle/.test(name) },
  { key: "collection", words: /\b(colecao|collection|premium)\b/g, test: (name) => /collection|premium/.test(name) },
  { key: "pack", words: /\b(booster|boosters|pacote|pack)\b/g, test: (name) => /booster pack/.test(name) },
];
const NOISE = new Set(["de", "da", "do", "e", "a", "o", "the", "of", "and", "pokemon", "tcg", "box", "caixa", "lacrado"]);

let cache = { at: 0, groups: [], ptById: new Map(), idByEn: new Map(), enById: new Map() };
const productCache = new Map();

function normalize(text) {
  return String(text || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9&\s]/g, " ").replace(/\s+/g, " ").trim();
}

function setTitle(groupName) {
  return String(groupName).replace(/^[A-Za-z0-9]+:\s*/, "");
}

async function getJson(url) {
  const response = await fetch(url, { headers: HEADERS });
  if (!response.ok) throw new Error(`${url} respondeu ${response.status}`);
  return response.json();
}

async function loadIndex() {
  if (Date.now() - cache.at < DAY && cache.groups.length) return cache;
  const [groups, ptSets, enSets] = await Promise.all([
    getJson(`${TCGCSV}/groups`),
    getJson(`${TCGDEX}/pt/sets`).catch(() => []),
    getJson(`${TCGDEX}/en/sets`).catch(() => []),
  ]);
  cache = {
    at: Date.now(),
    groups: (groups.results || []).map((group) => ({ ...group, title: setTitle(group.name), key: normalize(setTitle(group.name)) })),
    ptById: new Map(ptSets.map((set) => [set.id, set.name])),
    idByEn: new Map(enSets.map((set) => [normalize(set.name), set.id])),
    enById: new Map(enSets.map((set) => [set.id, set.name])),
  };
  return cache;
}

async function loadProducts(groupId) {
  const hit = productCache.get(groupId);
  if (hit && Date.now() - hit.at < DAY) return hit.products;
  const data = await getJson(`${TCGCSV}/${groupId}/products`);
  const products = (data.results || []).filter((product) => (
    !(product.extendedData || []).some((item) => item.name === "Rarity" || item.name === "Number")
  ));
  productCache.set(groupId, { at: Date.now(), products });
  return products;
}

function translateSetNames(text, index) {
  let result = ` ${text} `;
  const names = [...index.ptById.entries()].sort((a, b) => b[1].length - a[1].length);
  for (const [id, ptName] of names) {
    const pt = normalize(ptName);
    const en = index.enById.get(id);
    if (pt.length < 3 || !en || !result.includes(` ${pt} `)) continue;
    result = result.replace(` ${pt} `, ` ${normalize(en)} `);
  }
  const english = new Set([...index.groups.flatMap((group) => group.key.split(" "))]);
  return result.trim().split(" ").map((word) => {
    if (word.length < 4 || english.has(word)) return word;
    const match = [...index.ptById.entries()].reverse().find(([id, ptName]) => (
      index.enById.has(id) && normalize(ptName).split(" ").includes(word)
    ));
    return match ? normalize(index.enById.get(match[0])) : word;
  }).join(" ");
}

function pickGroups(words, index) {
  if (!words.length) {
    return index.groups
      .filter((group) => !/promo|exclusive|energies|trainer kit|mcdonald|jumbo|sample/i.test(group.name))
      .sort((a, b) => b.groupId - a.groupId)
      .slice(0, 6);
  }
  const scored = index.groups
    .map((group) => {
      const groupWords = new Set(group.key.split(" "));
      const hits = words.filter((word) => groupWords.has(word) || (word.length >= 4 && group.key.includes(word))).length;
      return { group, hits };
    })
    .filter((item) => item.hits > 0);
  const best = Math.max(0, ...scored.map((item) => item.hits));
  return scored
    .filter((item) => item.hits === best)
    .sort((a, b) => b.group.groupId - a.group.groupId)
    .slice(0, 4)
    .map((item) => item.group);
}

function ptCollection(group, index) {
  const id = index.idByEn.get(group.key);
  return (id && index.ptById.get(id)) || group.title;
}

module.exports = async function handler(req, res) {
  const query = normalize(req.query?.q || "").slice(0, 80);
  if (query.length < 2) {
    res.status(400).json({ error: "Digite pelo menos 2 letras." });
    return;
  }
  try {
    const index = await loadIndex();
    let text = query;
    const type = TYPES.find((item) => item.words.test(text));
    if (type) {
      type.words.lastIndex = 0;
      text = text.replace(type.words, " ").replace(/\s+/g, " ").trim();
    }
    TYPES.forEach((item) => { item.words.lastIndex = 0; });
    text = translateSetNames(text, index);
    const words = text.split(" ").filter((word) => word && !NOISE.has(word));
    const groups = pickGroups(words, index);
    const lists = await Promise.all(groups.map(async (group) => {
      const products = await loadProducts(group.groupId).catch(() => []);
      return products.map((product) => ({ product, group }));
    }));
    const extra = words.filter((word) => !groups.some((group) => group.key.includes(word)));
    const results = lists.flat()
      .filter(({ product }) => {
        const name = normalize(product.name);
        if (type && !type.test(name)) return false;
        return extra.every((word) => name.includes(word));
      })
      .sort((a, b) => Number(/\bcase\b/i.test(a.product.name)) - Number(/\bcase\b/i.test(b.product.name)))
      .slice(0, 40)
      .map(({ product, group }) => ({
        id: product.productId,
        name: product.name,
        set: group.title,
        collection: ptCollection(group, index),
        code: group.abbreviation || "",
        image: String(product.imageUrl || "").replace(/_200w\.jpg$/, "_400w.jpg"),
        thumb: product.imageUrl || "",
      }));
    res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
    res.status(200).json({ results });
  } catch {
    res.status(502).json({ error: "Catálogo de lacrados indisponível agora." });
  }
};
