import { store } from "./config.js";
import { esc } from "./format.js";

export const POLICY_UPDATED = "9 de novembro de 2026";

export const POLICIES = [
  ["privacidade", "Privacidade"],
  ["cookies", "Cookies"],
  ["trocas", "Trocas e devoluções"],
  ["reembolso", "Reembolso"],
  ["envio", "Envio"],
  ["termos", "Termos de uso"],
];

function identity() {
  const parts = [
    store.legalName ? `Empresa: ${esc(store.legalName)}` : "",
    store.cnpj ? `CNPJ: ${esc(store.cnpj)}` : "",
    store.address ? `Endereço: ${esc(store.address)}` : "",
  ].filter(Boolean);
  return parts.length ? `<p>${parts.join("<br>")}</p>` : "";
}

function channels(ctx) {
  const items = [
    ctx.phone ? `WhatsApp <a href="${ctx.whatsapp}" target="_blank" rel="noopener">${esc(ctx.phone)}</a>` : "",
    store.email ? `e-mail <a href="mailto:${esc(store.email)}">${esc(store.email)}</a>` : "",
  ].filter(Boolean);
  return items.join(" ou ") || "os canais informados na página de Contato";
}

const pages = {
  privacidade: (ctx) => `
    <p>Esta política explica como a Goldpack trata dados pessoais neste site e no atendimento, conforme a Lei Geral de Proteção de Dados (Lei 13.709/2018, LGPD) e o Marco Civil da Internet (Lei 12.965/2014).</p>

    <h2>Quem é o controlador</h2>
    <p>A Goldpack é a controladora dos dados tratados neste site. Para qualquer assunto sobre seus dados, fale com a gente pelo ${channels(ctx)}.</p>
    ${identity()}

    <h2>Quais dados tratamos</h2>
    <ul>
      <li><strong>Dados de navegação:</strong> endereço IP, página acessada, site de origem, navegador e dispositivo (user agent), data e hora do acesso. São registrados uma vez por dia quando você abre a loja.</li>
      <li><strong>Dados do pedido e atendimento:</strong> o que você nos envia pelo WhatsApp, como nome, telefone, endereço de entrega e, quando necessário para emissão de nota ou envio, CPF.</li>
      <li><strong>Formulário de contato:</strong> nome e mensagem digitados na página de Contato. O site não guarda esse conteúdo; ele apenas abre o WhatsApp com a mensagem pronta.</li>
    </ul>
    <p>Não vendemos dados pessoais e não usamos dados para publicidade de terceiros.</p>

    <h2>Para que usamos e com qual base legal</h2>
    <ul>
      <li><strong>Atender, vender e entregar seu pedido</strong>: execução de contrato e procedimentos preliminares (art. 7º, V, da LGPD).</li>
      <li><strong>Emitir documentos fiscais e cumprir obrigações legais</strong>, incluindo guardar registros de acesso por 6 meses (art. 15 do Marco Civil): cumprimento de obrigação legal (art. 7º, II).</li>
      <li><strong>Segurança do site, prevenção a fraudes e estatísticas de visitas</strong>: legítimo interesse (art. 7º, IX), limitado ao necessário.</li>
      <li><strong>Exercer direitos em processos</strong>, se houver: exercício regular de direitos (art. 7º, VI).</li>
    </ul>

    <h2>Com quem compartilhamos</h2>
    <p>Somente com fornecedores necessários para o site e o pedido funcionarem, que tratam dados conforme nossas instruções:</p>
    <ul>
      <li>Vercel, que hospeda o site;</li>
      <li>Supabase, que guarda o catálogo e o registro de visitas;</li>
      <li>WhatsApp (Meta), usado no atendimento;</li>
      <li>ipify, que informa o IP do acesso;</li>
      <li>Google Fonts e jsDelivr, que entregam fontes e bibliotecas e recebem o IP técnico da conexão;</li>
      <li>Correios ou transportadoras, quando há entrega;</li>
      <li>autoridades públicas, quando houver obrigação legal ou ordem judicial.</li>
    </ul>
    <p>Alguns desses fornecedores mantêm servidores fora do Brasil. Nesses casos a transferência internacional segue o art. 33 da LGPD.</p>

    <h2>Por quanto tempo guardamos</h2>
    <p>Registros de acesso: no mínimo 6 meses, como exige o Marco Civil, e depois podem ser excluídos. Dados de pedidos: pelo prazo exigido pela legislação fiscal e de defesa do consumidor. Conversas de atendimento: enquanto forem necessárias para o pedido, garantias e eventuais reclamações.</p>

    <h2>Seus direitos</h2>
    <p>Pelo art. 18 da LGPD, você pode pedir a qualquer momento:</p>
    <ul>
      <li>confirmação de que tratamos seus dados e acesso a eles;</li>
      <li>correção de dados incompletos, inexatos ou desatualizados;</li>
      <li>anonimização, bloqueio ou eliminação de dados desnecessários ou tratados em desconformidade;</li>
      <li>portabilidade;</li>
      <li>informação sobre com quem compartilhamos;</li>
      <li>revogação de consentimento, quando ele for a base do tratamento;</li>
      <li>oposição a tratamento feito com base em legítimo interesse.</li>
    </ul>
    <p>Envie o pedido pelo ${channels(ctx)}. Respondemos em até 15 dias. Você também pode reclamar à Autoridade Nacional de Proteção de Dados (<a href="https://www.gov.br/anpd" target="_blank" rel="noopener">ANPD</a>).</p>

    <h2>Encarregado</h2>
    <p>Como agente de tratamento de pequeno porte, a Goldpack é dispensada de indicar encarregado (Resolução CD/ANPD nº 2/2022). O canal para titulares é o mesmo do atendimento: ${channels(ctx)}.</p>

    <h2>Segurança</h2>
    <p>Usamos conexão criptografada (HTTPS), acesso restrito ao painel da loja e controle de permissões no banco de dados. Nenhum sistema é totalmente imune a falhas; se houver incidente relevante, comunicaremos os titulares e a ANPD conforme a lei.</p>

    <h2>Crianças e adolescentes</h2>
    <p>Compras de menores de 18 anos devem ser feitas ou autorizadas por pai, mãe ou responsável. Dados de crianças só são tratados no melhor interesse delas e com consentimento do responsável (art. 14 da LGPD).</p>

    <h2>Mudanças nesta política</h2>
    <p>Podemos atualizar esta política. A data da última versão fica no fim da página.</p>
  `,

  cookies: (ctx) => `
    <p>Esta página explica o que o site da Goldpack guarda no seu navegador.</p>

    <h2>Não usamos cookies de publicidade ou rastreamento</h2>
    <p>O site não usa cookies de anúncios, remarketing nem ferramentas de análise de terceiros como Google Analytics ou Meta Pixel.</p>

    <h2>O que fica salvo no seu navegador</h2>
    <ul>
      <li><strong>goldpack-visit</strong> (armazenamento local): guarda só a data da última visita registrada, para contar cada visitante uma vez por dia.</li>
      <li><strong>goldpack-aviso</strong> (armazenamento local): lembra que você já viu o aviso de privacidade, para ele não aparecer de novo.</li>
      <li><strong>goldpack-auth</strong> (armazenamento local): usado só no painel da loja, para manter a equipe conectada. Clientes não recebem esse item.</li>
    </ul>
    <p>Esses itens são necessários para o funcionamento do site e não identificam você para terceiros.</p>

    <h2>Serviços de terceiros</h2>
    <p>Para carregar fontes e bibliotecas, o navegador se conecta ao Google Fonts e ao jsDelivr, e para identificar o IP do acesso, ao ipify. Esses serviços recebem dados técnicos da conexão, como o IP. Ao tocar em WhatsApp, você sai do site e passa a seguir as regras do WhatsApp.</p>

    <h2>Como controlar</h2>
    <p>Você pode apagar ou bloquear esses dados nas configurações do seu navegador, em "Privacidade" ou "Dados de sites". O catálogo continua funcionando; apenas o aviso pode aparecer de novo.</p>

    <p>Mais detalhes na <a href="#/privacidade">Política de Privacidade</a>. Dúvidas: ${channels(ctx)}.</p>
  `,

  trocas: (ctx) => `
    <p>Esta política segue o Código de Defesa do Consumidor (Lei 8.078/1990, CDC) e o Decreto 7.962/2013, que regula o comércio eletrônico. Ela não reduz nenhum direito previsto em lei.</p>

    <h2>Direito de arrependimento: 7 dias</h2>
    <p>Como a compra é feita fora da loja física (pelo site e WhatsApp), você pode desistir em até 7 dias corridos a partir do recebimento do produto, sem precisar justificar (art. 49 do CDC).</p>
    <ul>
      <li>Avise pelo ${channels(ctx)} informando o pedido.</li>
      <li>O frete da devolução é por conta da Goldpack. Enviamos as instruções ou o código de postagem.</li>
      <li>Devolva o produto com tudo o que o acompanhava.</li>
      <li>Lacrados: abrir boosters, boxes e blisters consome o conteúdo, porque as cartas sorteadas não podem voltar à venda como produto lacrado. Por isso, para desistência, pedimos que o lacre esteja intacto. Isso não afeta seus direitos em caso de defeito.</li>
      <li>O valor é devolvido integralmente, incluindo o frete pago, conforme a <a href="#/reembolso">Política de Reembolso</a>.</li>
    </ul>

    <h2>Produto com defeito ou diferente do anúncio</h2>
    <p>Se o produto chegar danificado, com defeito, faltando itens ou diferente do anunciado, incluindo carta avulsa em condição (NM, LP, MP etc.), idioma, edição ou acabamento diferente do informado:</p>
    <ul>
      <li>Você tem 30 dias para reclamar de produtos não duráveis e 90 dias para produtos duráveis, contados da entrega para problemas aparentes, ou de quando o defeito aparecer, se for oculto (art. 26 do CDC).</li>
      <li>Mande fotos ou vídeo do produto e da embalagem pelo ${channels(ctx)}. Gravar a abertura da encomenda ajuda a resolver mais rápido, mas não é obrigatório.</li>
      <li>Resolvemos em até 30 dias (art. 18 do CDC). Se não for resolvido nesse prazo, você escolhe entre: troca por outro produto igual, devolução do valor pago corrigido ou abatimento proporcional do preço.</li>
      <li>Todo o frete nesses casos é por conta da Goldpack.</li>
    </ul>

    <h2>Encomenda avariada na entrega</h2>
    <p>Se a embalagem chegar violada ou amassada, você pode recusar o recebimento ou registrar fotos e nos avisar assim que possível. O risco do transporte é da loja até a entrega.</p>

    <h2>Troca por outro produto</h2>
    <p>Fora dos casos acima, trocas por gosto, tamanho de coleção ou outro item dependem de combinação e disponibilidade de estoque. Fale com a gente.</p>
  `,

  reembolso: (ctx) => `
    <p>Regras de devolução de valores, conforme o Código de Defesa do Consumidor.</p>

    <h2>Quando você tem direito ao reembolso</h2>
    <ul>
      <li>Desistência em até 7 dias do recebimento (art. 49 do CDC);</li>
      <li>defeito ou divergência que não foi resolvida em até 30 dias, se você escolher a devolução do valor (art. 18 do CDC);</li>
      <li>pedido pago que não puder ser atendido, por exemplo por falta de estoque;</li>
      <li>cobrança indevida, que será devolvida conforme o art. 42 do CDC.</li>
    </ul>

    <h2>Como devolvemos</h2>
    <ul>
      <li>O valor é devolvido integralmente, incluindo o frete pago, e corrigido quando a lei exigir.</li>
      <li>Pix ou transferência: devolução para a conta de origem, em até 7 dias úteis após recebermos e conferirmos o produto devolvido, ou imediatamente quando não houver produto a devolver.</li>
      <li>Cartão de crédito: pedimos o estorno à operadora em até 7 dias úteis. O crédito aparece na fatura conforme o prazo do banco emissor.</li>
      <li>Em desistência, também comunicamos a operadora do cartão para que a cobrança não seja lançada ou seja estornada (art. 5º do Decreto 7.962/2013).</li>
    </ul>

    <h2>Como pedir</h2>
    <p>Fale com a gente pelo ${channels(ctx)} informando o pedido. Confirmamos o recebimento do seu pedido de reembolso pelo mesmo canal.</p>
    <p>Veja também a <a href="#/trocas">Política de Trocas e Devoluções</a>.</p>
  `,

  envio: (ctx) => `
    <h2>Como funciona</h2>
    <p>Depois que você escolhe o produto e chama no WhatsApp, a Goldpack confirma o estoque, o valor do frete, a forma de envio e o prazo antes do pagamento. Nada é cobrado sem a sua confirmação.</p>

    <h2>Prazo e rastreio</h2>
    <ul>
      <li>O prazo de postagem e de entrega é informado na conversa, antes do pagamento, e passa a fazer parte do pedido.</li>
      <li>Depois da postagem, enviamos o código de rastreio pelo WhatsApp.</li>
      <li>Se houver atraso em relação ao prazo combinado, você pode exigir o cumprimento, aceitar outro produto ou cancelar com devolução integral (art. 35 do CDC).</li>
    </ul>

    <h2>Transporte</h2>
    <p>O risco do transporte é da Goldpack até a entrega. Se a encomenda chegar avariada, veja a <a href="#/trocas">Política de Trocas e Devoluções</a>.</p>

    <h2>Endereço e dados</h2>
    <p>Confira o endereço de entrega antes de confirmar. Os dados usados para envio seguem a <a href="#/privacidade">Política de Privacidade</a>.</p>
    <p>Dúvidas sobre um envio: ${channels(ctx)}.</p>
  `,

  termos: (ctx) => `
    <p>Ao usar este site, você concorda com estes termos. Eles não afastam os direitos garantidos pelo Código de Defesa do Consumidor.</p>

    <h2>O que é este site</h2>
    <p>Um catálogo da Goldpack com lacrados, cartas avulsas e acessórios. O site não processa pagamentos: a compra é combinada e confirmada com a loja pelo WhatsApp.</p>
    ${identity()}

    <h2>Produtos, preços e estoque</h2>
    <ul>
      <li>Preços em reais (R$). O preço anunciado vale para a compra, salvo erro evidente de digitação, que será informado antes do pagamento.</li>
      <li>O estoque é atualizado pela loja, mas pode mudar enquanto você navega. A disponibilidade é confirmada no WhatsApp antes do pagamento.</li>
      <li>As fotos são do produto ou do item equivalente. Em cartas avulsas, a condição (NM, LP, MP etc.), o idioma e o acabamento informados no anúncio fazem parte da oferta.</li>
    </ul>

    <h2>Pedido</h2>
    <p>O pedido é concluído quando a Goldpack confirma itens, valor total, frete e prazo pelo WhatsApp e você faz o pagamento combinado. Você recebe o resumo do pedido na conversa.</p>

    <h2>Trocas, devoluções e reembolso</h2>
    <p>Veja a <a href="#/trocas">Política de Trocas e Devoluções</a> e a <a href="#/reembolso">Política de Reembolso</a>.</p>

    <h2>Uso do site</h2>
    <p>Não é permitido tentar acessar áreas restritas, copiar o catálogo em massa ou usar o site para fins ilegais. Marcas e personagens de jogos citados pertencem aos seus donos e aparecem apenas para identificar os produtos.</p>

    <h2>Atendimento e reclamações</h2>
    <p>Fale com a gente pelo ${channels(ctx)}. Você também pode procurar o Procon ou a plataforma <a href="https://www.consumidor.gov.br" target="_blank" rel="noopener">consumidor.gov.br</a>.</p>

    <h2>Foro</h2>
    <p>Fica eleito o foro do domicílio do consumidor (art. 101, I, do CDC).</p>
  `,
};

export function policyView(slug, ctx) {
  const entry = POLICIES.find(([id]) => id === slug);
  if (!entry) return "";
  const [, title] = entry;
  return `
    <div class="wrap">
      <article class="policy">
        <h1>${esc(title)}</h1>
        ${pages[slug](ctx)}
        <p class="note">Última atualização: ${POLICY_UPDATED}.</p>
      </article>
    </div>
  `;
}

export function policyTitle(slug) {
  return POLICIES.find(([id]) => id === slug)?.[1] || "";
}
