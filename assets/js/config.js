/*
 * CONFIGURAÇÃO CENTRAL DO SITE
 * ---------------------------------------------------------------
 * Tudo o que muda com frequência fica aqui: WhatsApp, mensagens e projetos.
 *
 * Projetos (lista "projects"):
 *   - links: botões do card. Cada um com { label, url }. Use caminhos do próprio
 *     site (ex.: "projetos/autoprime/index.html") ou endereços https://.
 *   - status: "preparing" mostra "Em preparação" e nenhum botão.
 *     "published" mostra "Demonstração no ar" e os botões, mas só depois de
 *     conferir que o endereço responde: se a pasta da demo sumir do site, o card
 *     volta sozinho para "Em preparação" (sem botão quebrado).
 *   - demo: true mostra a etiqueta "Demonstração" (empresa fictícia).
 *     Use false apenas para cliente real, com autorização dele.
 *   - note: aviso exibido no card (ex.: demonstração local, sem servidor).
 *   - preview: captura real da demonstração (imagem 800x500 em assets/img/previas/).
 *     Para gerar de novo: python tools/capturar-previas.py (veja o README).
 *   - mockup: capa desenhada usada quando não há "preview" e para as cores do card.
 *     Variantes: hero, catalog, calendar, pipeline, table. Cores no formato #RRGGBB.
 */
window.SITE_CONFIG = {
  brand: "Martins | Criação de Sites",
  region: "Campinas e região — SP",

  whatsapp: {
    // Somente números, com código do país (55) e DDD (19).
    number: "5519993128050",
    display: "+55 19 99312-8050",
    messages: {
      quote: "Olá, Martins! Vim pelo seu portfólio e gostaria de solicitar um orçamento.",
      hello: "Olá, Martins! Gostaria de conversar sobre um projeto."
    }
  },

  // Grupos usados pelos filtros. Cada projeto precisa ter "group" igual a uma destas chaves.
  groups: {
    sites: "Sites",
    sistemas: "Sistemas"
  },

  projects: [
    {
      id: "autoprime",
      preview: "assets/img/previas/autoprime.webp",
      name: "AutoPrime",
      group: "sites",
      category: "Centro automotivo",
      demo: true,
      status: "published",
      links: [{ label: "Abrir demonstração", url: "projetos/autoprime/index.html" }],
      problem: "Site premium para centro automotivo: cada serviço já escolhe o orçamento, um guia mostra o que verificar pelo sinal do carro e o pedido é revisado antes de abrir o WhatsApp.",
      features: ["Pedido de orçamento com revisão", "Guia de sinais do carro", "Galeria ampliável"],
      mockup: {
        variant: "hero", kicker: "Centro automotivo", headline: "AutoPrime", cta: "Orçamento",
        colors: { bg: "#15171B", fg: "#F3F1EC", sub: "#8D9098", accent: "#F2A93B", onAccent: "#15171B", block: "#22252B", line: "#2E323A" }
      }
    },
    {
      id: "black-copper",
      preview: "assets/img/previas/black-copper.webp",
      name: "Black Copper",
      group: "sites",
      category: "Barbearia",
      demo: true,
      status: "published",
      links: [
        { label: "Abrir demonstração", url: "projetos/black-copper/index.html" },
        { label: "Painel da barbearia", url: "projetos/black-copper/painel.html" }
      ],
      problem: "Barbearia em preto, creme e cobre: tabela de preços em letreiro de feltro, barbeiros com a disponibilidade do dia, agendamento sem conflito de horário e painel da barbearia.",
      features: ["Letreiro de serviços", "Agendamento", "Painel"],
      mockup: {
        variant: "hero", kicker: "Barber studio", headline: "Black Copper", cta: "Agendar",
        colors: { bg: "#131110", fg: "#EFE4D2", sub: "#9C8A76", accent: "#B87333", onAccent: "#131110", block: "#221D19", line: "#342B24" }
      }
    },
    {
      id: "violet-studio",
      preview: "assets/img/previas/violet-studio.webp",
      name: "Violet Studio",
      group: "sites",
      category: "Estúdio de unhas",
      demo: true,
      status: "published",
      links: [
        { label: "Abrir demonstração", url: "projetos/violet-studio/index.html" },
        { label: "Painel do estúdio", url: "projetos/violet-studio/painel.html" }
      ],
      problem: "Marca em preto, branco e roxo com catálogo de preços editáveis, galeria ilustrada e agendamento em 7 etapas que respeita jornada, pausas, folgas e bloqueios. Inclui consulta e cancelamento pelo código e um painel de demonstração para o estúdio.",
      features: ["Agendamento sem conflito", "Painel do estúdio", "Galeria"],
      mockup: {
        variant: "hero", kicker: "Nails & beauty", headline: "violet studio", cta: "Agendar",
        colors: { bg: "#100E16", fg: "#F4F0FF", sub: "#9B93B3", accent: "#8B5CF6", onAccent: "#FFFFFF", block: "#1D1929", line: "#2B2540" }
      }
    },
    {
      id: "solado",
      preview: "assets/img/previas/solado.webp",
      name: "Solado",
      group: "sites",
      category: "Loja de tênis",
      demo: true,
      status: "published",
      links: [{ label: "Abrir demonstração", url: "projetos/tenis/index.html" }],
      problem: "Loja de sneakers com direção de arte de campanha: vitrine de lançamentos, filtros, ordenação, detalhes do produto e carrinho com subtotal.",
      features: ["Filtros e ordenação", "Escolha de tamanho", "Carrinho"],
      mockup: {
        variant: "catalog", headline: "SOLADO",
        colors: { bg: "#F2F2EE", fg: "#111111", sub: "#8F8F87", accent: "#B7F02E", onAccent: "#111111", block: "#E2E2DC", line: "#D6D6CF" }
      }
    },
    {
      id: "avesso",
      preview: "assets/img/previas/avesso.webp",
      name: "Avesso",
      group: "sites",
      category: "Moda urbana",
      demo: true,
      status: "published",
      links: [{ label: "Abrir demonstração", url: "projetos/moda/index.html" }],
      problem: "Catálogo de marca independente: categorias, filtros por tamanho e preço, cores por peça e sacola com edição de quantidades.",
      features: ["Catálogo", "Cor e tamanho", "Carrinho"],
      mockup: {
        variant: "catalog", headline: "Avesso",
        colors: { bg: "#EEE8DF", fg: "#2B2723", sub: "#A99C8D", accent: "#2B2723", onAccent: "#EEE8DF", block: "#DDD3C5", line: "#D3C8B9" }
      }
    },
    {
      id: "ponto",
      preview: "assets/img/previas/ponto.webp",
      name: "Ponto",
      group: "sites",
      category: "Doces e salgados",
      demo: true,
      status: "published",
      links: [{ label: "Abrir demonstração", url: "projetos/doces-salgados/index.html" }],
      problem: "Catálogo de doces, salgados e caixas para eventos, com montagem de encomenda, data desejada e resumo enviado pelo WhatsApp.",
      features: ["Encomenda", "Resumo do pedido"],
      mockup: {
        variant: "catalog", headline: "Ponto",
        colors: { bg: "#FFF5E8", fg: "#3B2418", sub: "#C59A80", accent: "#C4501E", onAccent: "#FFFFFF", block: "#F6DFC2", line: "#EFD3B2" }
      }
    },
    {
      id: "agendapro",
      preview: "assets/img/previas/agendapro.webp",
      name: "AgendaPro",
      group: "sistemas",
      category: "Sistema de agendamento",
      demo: true,
      status: "published",
      links: [{ label: "Abrir o sistema", url: "projetos/agendapro/index.html" }],
      problem: "Uma demonstração funcional de reservas: o cliente escolhe serviço, profissional, data e horário livre; o estabelecimento acompanha tudo em um painel.",
      features: ["Agenda por dia e por semana", "Bloqueio de horários em conflito", "Serviços e expediente configuráveis", "Status: confirmado, pendente e cancelado"],
      note: "Demonstração local: os dados ficam salvos só no navegador de quem testa.",
      mockup: {
        variant: "calendar", headline: "AgendaPro", label: "Semana", button: "+ Novo",
        colors: { bg: "#F6F5FB", fg: "#1A1730", sub: "#8B87A3", accent: "#6D4AFF", onAccent: "#FFFFFF", block: "#ECEAF6", line: "#E1DEEF" }
      }
    },
    {
      id: "nexora-crm",
      preview: "assets/img/previas/nexora-crm.webp",
      name: "Nexora CRM",
      tagline: "Gestão de clientes e oportunidades comerciais",
      group: "sistemas",
      category: "Gestão comercial",
      demo: true,
      status: "published",
      links: [{ label: "Abrir o sistema", url: "projetos/nexora-crm/index.html" }],
      problem: "CRM demonstrativo para centralizar clientes, organizar negociações, acompanhar tarefas comerciais e visualizar indicadores de vendas em uma única plataforma.",
      features: ["Pipeline com arrastar e soltar", "Indicadores calculados a partir dos registros", "Leads, clientes e histórico de contatos", "Tarefas e relatórios em CSV"],
      note: "Demonstração local com dados fictícios: não há login nem servidor, e tudo fica salvo só no navegador de quem testa.",
      mockup: {
        variant: "pipeline", headline: "Nexora CRM", lanes: ["Novo lead", "Proposta", "Concluída"],
        colors: { bg: "#0D1714", fg: "#E3F2EC", sub: "#7A938A", accent: "#34C38F", onAccent: "#0D1714", block: "#142420", line: "#1F332D" }
      }
    },
    {
      id: "nexora-stock",
      preview: "assets/img/previas/nexora-stock.webp",
      name: "Nexora Stock",
      tagline: "Controle de estoque",
      group: "sistemas",
      category: "Controle de estoque",
      demo: true,
      status: "published",
      links: [{ label: "Abrir o sistema", url: "projetos/nexora-stock/index.html" }],
      problem: "Centraliza produtos, fornecedores e movimentações para acompanhar os níveis de mercadoria, identificar a necessidade de reposição e organizar as compras.",
      features: ["Entradas, saídas e ajustes com histórico", "Saída maior que o saldo é bloqueada", "Pedidos de compra com recebimento parcial", "Relatórios por período em CSV"],
      note: "Demonstração local com dados fictícios: não há login nem servidor, e tudo fica salvo só no navegador de quem testa. O valor do estoque é uma estimativa pelo preço de custo.",
      mockup: {
        variant: "table", headline: "Nexora Stock", button: "+ Entrada", columns: ["Produto", "Saldo", "Situação"], flag: "Baixo",
        colors: { bg: "#14121A", fg: "#ECEAF2", sub: "#8A86A0", accent: "#2EC4D6", onAccent: "#14121A", block: "#1E1B27", line: "#2A2636" }
      }
    },
    {
      id: "nexora-booking",
      preview: "assets/img/previas/nexora-booking.webp",
      name: "Nexora Booking",
      tagline: "Agendamento online e gestão de horários",
      group: "sistemas",
      category: "Agendamento online",
      demo: true,
      status: "published",
      links: [
        { label: "Abrir o painel", url: "projetos/nexora-booking/index.html" },
        { label: "Página do cliente", url: "projetos/nexora-booking/reservar.html" }
      ],
      problem: "Para salões, barbearias, clínicas e estúdios: o cliente reserva sozinho, só nos horários realmente livres, e a equipe acompanha agenda, clientes, profissionais e faturamento em um painel.",
      features: ["Agenda por dia, semana, mês e lista", "Conflitos, pausas, folgas e bloqueios conferidos", "Código da reserva, cancelamento e reagendamento", "Dashboard, financeiro e relatórios em CSV"],
      note: "Demonstração local com dados fictícios: não há login nem servidor, nada é enviado por WhatsApp ou e-mail e nenhum pagamento é processado.",
      mockup: {
        variant: "calendar", headline: "Booking", label: "Agenda · dia", button: "+ Reserva",
        colors: { bg: "#0E1320", fg: "#E8ECF7", sub: "#7E879E", accent: "#5B8CFF", onAccent: "#0E1320", block: "#172035", line: "#212B44" }
      }
    },
    {
      id: "nexora-auto",
      preview: "assets/img/previas/nexora-auto.webp",
      name: "Nexora Auto",
      tagline: "Ordens de serviço, orçamentos, peças e financeiro da oficina",
      group: "sistemas",
      category: "Gestão de oficina",
      demo: true,
      status: "published",
      links: [{ label: "Abrir o sistema", url: "projetos/nexora-auto/index.html" }],
      problem: "Do recebimento do veículo à entrega: orçamento aprovado pelo cliente, peças reservadas e baixadas do estoque na hora certa, agenda de técnicos e boxes e financeiro separado entre faturado e recebido.",
      features: ["Ordem de serviço com etapas e histórico", "Orçamento aprovado vira revisão ao mudar", "Reserva e baixa de peças no estoque", "Agenda sem conflito de técnico ou box"],
      note: "Demonstração local com a oficina fictícia AutoPrime: não há login nem servidor (os perfis são uma simulação) e nenhum pagamento é processado.",
      mockup: {
        variant: "table", headline: "Nexora Auto", button: "+ OS", columns: ["Ordem", "Placa", "Etapa"], flag: "Execução",
        colors: { bg: "#17140F", fg: "#F2ECE2", sub: "#9A8F7E", accent: "#F2A93B", onAccent: "#17140F", block: "#221E17", line: "#2F2A21" }
      }
    }
  ]
};
