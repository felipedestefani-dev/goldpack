import { store } from "./config.js";
import { esc, safeUrl } from "./format.js";

const SOCIAL_ICONS = {
  instagram: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" stroke="none"/></svg>`,
  whatsapp: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3.5a8.5 8.5 0 1 1-4.15 15.92L3.5 20.5l1.1-4.2A8.5 8.5 0 0 1 12 3.5z"/><path d="M9.3 8.4c.3-.5.9-.6 1.3-.2l.8 1c.3.4.2.9-.1 1.2l-.4.4c.5 1 1.3 1.8 2.3 2.3l.4-.4c.3-.3.8-.4 1.2-.1l1 .8c.4.4.3 1-.2 1.3-1 .6-2.2.5-3.1-.2a11 11 0 0 1-3-3c-.7-.9-.8-2.1-.2-3.1z" stroke-width="1.4"/></svg>`,
  jamble: `<svg class="is-full" viewBox="0 0 48 48">${[0, 1, 2, 3, 4].map((k) => `<g fill="${k % 2 ? "#a58aff" : "#8a63ff"}"><rect x="${k * 9.6}" y="0" width="9.6" height="10"/><circle cx="${k * 9.6 + 4.8}" cy="10" r="4.8"/></g>`).join("")}<path fill="#fff" transform="translate(17.4 17) scale(.74)" d="M8.57532 24C9.9783 24 11.2219 23.8038 12.306 23.4114C12.4073 23.3744 12.5071 23.3358 12.6055 23.2958C12.7472 23.2381 12.8548 23.1263 12.907 22.9904L17.246 11.6937C17.2686 11.6347 17.2802 11.5726 17.2802 11.5099V1.29411C17.2802 0.993725 17.0196 0.750215 16.6981 0.750215H11.3175C8.8278 0.750215 6.51587 0.689444 4.29603 0.0113596C4.16247 -0.0294377 4.0187 0.0433213 3.98548 0.170897L2.72644 5.00532C2.69792 5.11484 2.76193 5.22723 2.87559 5.26499C5.33532 6.08202 7.36975 6.11304 11.1581 6.11304C11.2814 6.11304 11.3813 6.20641 11.3813 6.3216V15.498C11.3813 17.5581 10.074 18.4083 8.63909 18.4083C7.28698 18.4083 5.9941 17.6794 5.90212 15.7532C5.89627 15.6307 5.79048 15.5307 5.6592 15.5307H0.23568C0.104405 15.5307 -0.00222579 15.6314 3.53082e-05 15.7541C0.0923444 20.7611 3.29657 24 8.57532 24Z"/></svg>`,
};

export function socialLinks() {
  return [
    ["instagram", "Instagram", store.instagram],
    ["whatsapp", "Grupo do WhatsApp", store.whatsappGroup],
    ["jamble", "Jamble", store.jamble],
  ].filter(([, , href]) => href);
}

function socialsHtml() {
  return `<span class="ad-socials">${socialLinks().map(([id, label, href]) => (
    `<a class="ad-social is-${id}" href="${esc(href)}" target="_blank" rel="noopener" aria-label="${label}" title="${label}">${SOCIAL_ICONS[id]}</a>`
  )).join("")}</span>`;
}

export const AD_THEMES = [
  ["ouro", "Roxo e dourado"],
  ["roxo", "Roxo e lilás"],
  ["claro", "Claro"],
  ["verde", "Verde e azul"],
];

export const AD_FIELDS = ["tag", "title", "highlight", "subtitle", "cta"];
export const AD_MAX = 60;

export function isAdBanner(banner) {
  return banner?.style === "anim" && Boolean(String(banner.title || "").trim());
}

function adTheme(theme) {
  return AD_THEMES.some(([id]) => id === theme) ? theme : AD_THEMES[0][0];
}

export function adHtml(banner, { art, cutout } = {}) {
  const src = art ?? safeUrl(banner.image_url);
  const isCutout = cutout ?? !/\.jpe?g(\?|$)/i.test(src);
  const text = (key) => String(banner[key] || "").trim().slice(0, AD_MAX);
  return `<div class="ad-box"><div class="ad ad-${adTheme(banner.theme)}${src ? "" : " no-art"}${banner.socials ? " has-socials" : ""}">
    <span class="ad-ring ad-r1"></span><span class="ad-ring ad-r2"></span>
    <div class="ad-art">${src ? `<img class="ad-pic${isCutout ? "" : " is-card"}" src="${esc(src)}" alt="">` : ""}${banner.live ? `<span class="ad-live">AO VIVO</span>` : ""}</div>
    ${text("tag") ? `<span class="ad-tag">${esc(text("tag"))}</span>` : ""}
    <strong class="ad-title"><span class="ad-l1">${esc(text("title"))}</span>${text("highlight") ? ` <span class="ad-hl">${esc(text("highlight"))}</span>` : ""}</strong>
    ${text("subtitle") ? `<span class="ad-sub">${esc(text("subtitle"))}</span>` : ""}
    ${banner.socials ? socialsHtml() : text("cta") ? `<span class="ad-cta">${esc(text("cta"))}</span>` : ""}
  </div></div>`;
}
