// Goldpack — configuração da loja
// 1. Cole a Project URL e a chave anon (Settings → API no Supabase).
//    Use só a chave anon / publishable. Nunca coloque a service_role aqui.
// 2. Rode supabase/schema.sql no SQL Editor.
// 3. Crie seu usuário em Authentication → Users e inclua o UUID na tabela admins.
export const SUPABASE_URL = "https://tcgjtnrbpahaifmibudj.supabase.co";
export const SUPABASE_ANON_KEY = "sb_publishable_zox9wgYEwVjiLTm7vzC_9A_lr0xBNJ_";

export const store = {
  name: "Goldpack",
  tagline: "TCG · Colecionáveis · Games",
  whatsapp: "5511975768688",
  jamble: "https://www.jamble.com/u/goldpack",
  email: "",
  hours: "",
  city: "",
  // Identificação exigida pelo Decreto 7.962/2013 (comércio eletrônico).
  legalName: "Goldpack",
  cnpj: "54.212.466/0001-80",
  address: "",
};

// Banners padrão da página inicial, usados só quando o painel não tem nenhum publicado.
export const banners = [];

export const developer = {
  name: "Felipe",
  url: "https://felipeseussites.vercel.app",
};
