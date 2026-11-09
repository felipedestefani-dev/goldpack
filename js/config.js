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
  email: "",
  hours: "",
  city: "",
};

export const benefits = [
  { title: "Lacrados", text: "Boxes, boosters e blisters prontos para colecionar" },
  { title: "Avulsos", text: "Cartas com condição e acabamento em cada item" },
  { title: "WhatsApp", text: "Escolheu? Chame a loja e feche pelo WhatsApp" },
];
