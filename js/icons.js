// Ícones em imagem (assets/icons) das abas da loja e das seções do painel.
const RULES = [
  [/wa\.me|whatsapp/i, "whatsapp"],
  [/kind=sealed|lacrad/i, "sealed"],
  [/kind=single|avuls|carta/i, "single"],
  [/kind=accessory|acess[oó]ri/i, "accessory"],
  [/contato|fale/i, "contact"],
  [/privacidade|trocas|termos|pol[ií]tica|devolu/i, "shield"],
  [/destaque|novidade|lan[cç]amento|promo/i, "crown"],
  [/catalog|cat[aá]logo|produtos|loja/i, "catalog"],
];

export function iconSrc(name) {
  return `/assets/icons/${name}.svg`;
}

// Pintado pela cor do texto (máscara), então fica branco no escuro e preto no claro.
export function iconImg(name, className = "tab-ico") {
  return `<span class="${className}" style="--ico:url('${iconSrc(name)}')" aria-hidden="true"></span>`;
}

export function tabIconName(href = "", label = "") {
  const link = String(href).trim();
  if (link === "" || link === "#/" || link === "/" || /^\/?#\/?$/.test(link) || /^in[ií]cio$/i.test(String(label).trim())) return "home";
  const text = `${link} ${label}`;
  for (const [pattern, name] of RULES) {
    if (pattern.test(text)) return name;
  }
  return /^https?:/i.test(link) ? "store" : "crown";
}

export function tabIcon(href, label) {
  return iconImg(tabIconName(href, label));
}
