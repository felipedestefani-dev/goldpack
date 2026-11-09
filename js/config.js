// Goldpack — configuração da loja
// 1. Cole a Project URL e a chave anon (Settings → API no Supabase).
//    Use só a chave anon / publishable. Nunca coloque a service_role aqui.
// 2. Rode supabase/schema.sql no SQL Editor.
// 3. Crie seu usuário em Authentication → Users e inclua o UUID na tabela admins.
// 4. Preencha o WhatsApp da loja (só números, com DDI: 5511999999999).

export const SUPABASE_URL = "";
export const SUPABASE_ANON_KEY = "";

export const store = {
  name: "Goldpack",
  tagline: "TCG · Colecionáveis · Games",
  whatsapp: "",
  email: "",
  hours: "",
  city: "",
};

export const benefits = [
  { title: "Lacrados", text: "Boxes, boosters e blisters publicados pela loja" },
  { title: "Avulsos", text: "Condição e acabamento em cada anúncio" },
  { title: "Pedido", text: "Confirmado com a loja pelo WhatsApp" },
];
