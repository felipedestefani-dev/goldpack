export function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[char]));
}

export function money(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "R$ 0,00";
  return number.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function safeUrl(value) {
  try {
    const url = new URL(String(value), location.origin);
    if (url.protocol === "http:" || url.protocol === "https:") return url.href;
  } catch {
    /* ignore invalid urls */
  }
  return "";
}

export const KIND_LABEL = {
  sealed: "Lacrado",
  single: "Avulso",
  accessory: "Acessório",
};

export function kindLabel(kind) {
  return KIND_LABEL[kind] || "Produto";
}

export function discountOf(product) {
  const price = Number(product.price);
  const compare = Number(product.compare_at);
  if (!Number.isFinite(compare) || !Number.isFinite(price) || compare <= price) return 0;
  return Math.round((1 - price / compare) * 100);
}

export function friendlyError(error) {
  const message = error?.message || "";
  if (/invalid login credentials/i.test(message)) return "E-mail ou senha incorretos.";
  if (/email not confirmed/i.test(message)) {
    return "E-mail ainda não confirmado. Confirme o usuário no Supabase ou desative a confirmação em Authentication → Providers → Email.";
  }
  if (/row-level security|42501/i.test(message) || error?.code === "42501") {
    return "Sem permissão. Confira se esta conta está na tabela admins e se o schema.sql foi executado.";
  }
  if (/could not find the table|PGRST205|schema cache/i.test(message)) {
    return "A loja já está ligada ao Supabase. Falta criar as tabelas: no SQL Editor, execute o arquivo supabase/schema.sql.";
  }
  if (/bucket not found|storage/i.test(message)) {
    return "Não foi possível enviar a imagem. Confira se o bucket products existe e está público.";
  }
  return message || "Algo deu errado. Tente de novo.";
}
