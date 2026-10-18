/* ==========================================================================
   NEXORA AUTO — dados.js
   Listas fixas do sistema e os dados de DEMONSTRAÇÃO (tudo fictício).

   A oficina, os clientes, os veículos, a equipe, os fornecedores e os
   preços são inventados. As placas começam com "DMO" (demonstração), os
   telefones seguem o padrão (19) 95555-xxxx e os e-mails usam o domínio
   ".exemplo", que não existe na internet. Os registros de exemplo ficam
   marcados como fictícios: o sistema nunca abre o WhatsApp para eles.

   O histórico (cerca de três meses) não é escrito à mão: ele é "vivido"
   dia a dia com um relógio simulado, passando pelas MESMAS regras que o
   sistema usa no dia a dia (abrir OS, orçar, aprovar, reservar e baixar
   peças, faturar, receber). Assim os exemplos nunca contradizem as regras:
   não há estoque negativo, baixa em dobro nem recebimento sem faturamento.
   ========================================================================== */
window.NX = window.NX || {};

(function () {
  "use strict";
  const U = NX.util;

  /* ======================================================================
     LISTAS FIXAS
     ====================================================================== */
  NX.DIAS = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
  NX.DIAS_CURTOS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  // tom: cor do selo (definida no style.css)
  NX.STATUS_OS = [
    { id: "aguardando_avaliacao", nome: "Aguardando avaliação", curto: "Aguard. avaliação", icone: "clipboard-list", tom: "neutro" },
    { id: "em_diagnostico", nome: "Em diagnóstico", curto: "Em diagnóstico", icone: "stethoscope", tom: "info" },
    { id: "aguardando_orcamento", nome: "Aguardando orçamento", curto: "Aguard. orçamento", icone: "calculator", tom: "info" },
    { id: "aguardando_aprovacao", nome: "Aguardando aprovação do cliente", curto: "Aguard. aprovação", icone: "hourglass", tom: "atencao" },
    { id: "aguardando_pecas", nome: "Aguardando peças", curto: "Aguard. peças", icone: "package-search", tom: "atencao" },
    { id: "aprovada", nome: "Aprovada", curto: "Aprovada", icone: "circle-check", tom: "ok" },
    { id: "em_execucao", nome: "Em execução", curto: "Em execução", icone: "wrench", tom: "andamento" },
    { id: "aguardando_retirada", nome: "Aguardando retirada", curto: "Aguard. retirada", icone: "car-front", tom: "pronto" },
    { id: "concluida", nome: "Concluída", curto: "Concluída", icone: "check-check", tom: "pronto" },
    { id: "entregue", nome: "Entregue", curto: "Entregue", icone: "key-round", tom: "fim" },
    { id: "cancelada", nome: "Cancelada", curto: "Cancelada", icone: "circle-x", tom: "perigo" },
  ];
  NX.STATUS_ORC = [
    { id: "rascunho", nome: "Rascunho", icone: "file-pen-line", tom: "neutro" },
    { id: "aguardando_aprovacao", nome: "Aguardando aprovação", icone: "hourglass", tom: "atencao" },
    { id: "aprovado", nome: "Aprovado", icone: "circle-check", tom: "ok" },
    { id: "recusado", nome: "Recusado", icone: "thumbs-down", tom: "perigo" },
    { id: "expirado", nome: "Expirado", icone: "calendar-x", tom: "fim" },
    { id: "cancelado", nome: "Cancelado", icone: "circle-x", tom: "fim" },
  ];
  NX.SITUACOES_FINANCEIRAS = [
    { id: "em_aberto", nome: "Serviço em andamento", tom: "neutro" },
    { id: "a_faturar", nome: "A faturar", tom: "info" },
    { id: "a_receber", nome: "A receber", tom: "atencao" },
    { id: "parcial", nome: "Recebido em parte", tom: "atencao" },
    { id: "pago", nome: "Recebido", tom: "ok" },
    { id: "cancelada", nome: "Cancelada", tom: "fim" },
  ];
  NX.COMBUSTIVEIS = ["Flex", "Gasolina", "Etanol", "Diesel", "GNV", "Híbrido", "Elétrico"];
  NX.TIPOS_VEICULO = ["Hatch", "Sedã", "SUV", "Picape", "Utilitário / van", "Caminhão", "Motocicleta", "Outro"];
  NX.FUNCOES = [
    { id: "chefe", nome: "Chefe de oficina", tecnico: true },
    { id: "mecanico", nome: "Mecânico", tecnico: true },
    { id: "eletricista", nome: "Eletricista automotivo", tecnico: true },
    { id: "auxiliar", nome: "Auxiliar de mecânica", tecnico: true },
    { id: "consultor", nome: "Consultor de serviços (recepção)", tecnico: false },
  ];
  NX.MOTIVOS_SAIDA = ["Uso interno da oficina", "Avaria ou descarte", "Devolução ao fornecedor", "Troca em garantia", "Outro"];
  NX.MOTIVOS_AJUSTE = ["Inventário (contagem)", "Correção de lançamento", "Peça encontrada", "Perda não identificada"];
  NX.CANAIS_APROVACAO = ["Presencial", "WhatsApp", "Telefone", "E-mail"];
  NX.FORMAS_PAGAMENTO = ["Pix", "Dinheiro", "Cartão de débito", "Cartão de crédito", "Boleto", "Transferência"];
  NX.CATEGORIAS_DESPESA = ["Compra de peças", "Aluguel", "Energia e água", "Ferramentas e equipamentos", "Serviços de terceiros", "Impostos e taxas", "Salários e encargos", "Outras"];
  NX.TIPOS_MOVIMENTO = [
    { id: "entrada", nome: "Entrada", icone: "arrow-down-to-line" },
    { id: "saida", nome: "Saída", icone: "arrow-up-from-line" },
    { id: "ajuste", nome: "Ajuste de inventário", icone: "scale" },
    { id: "saida_os", nome: "Baixa em OS", icone: "wrench" },
  ];
  // recurso: "obrigatorio" (técnico ou box), "tecnico" (só técnico) ou "opcional"
  NX.TIPOS_AGENDA = [
    { id: "recepcao", nome: "Recepção de veículo", icone: "car-front", recurso: "opcional" },
    { id: "avaliacao", nome: "Avaliação / diagnóstico", icone: "stethoscope", recurso: "obrigatorio" },
    { id: "servico", nome: "Execução de serviço", icone: "wrench", recurso: "obrigatorio" },
    { id: "entrega", nome: "Entrega ao cliente", icone: "key-round", recurso: "opcional" },
    { id: "indisponivel", nome: "Técnico indisponível", icone: "user-x", recurso: "tecnico" },
  ];
  NX.STATUS_AGENDA = [
    { id: "marcado", nome: "Marcado", tom: "info" },
    { id: "realizado", nome: "Realizado", tom: "ok" },
    { id: "nao_compareceu", nome: "Não compareceu", tom: "atencao" },
    { id: "cancelado", nome: "Cancelado", tom: "fim" },
  ];
  NX.TIPOS_NOTIFICACAO = {
    nova_os: { nome: "Nova OS", icone: "clipboard-plus" },
    status: { nome: "Mudança de status", icone: "refresh-cw" },
    orcamento: { nome: "Orçamento aguardando aprovação", icone: "hourglass" },
    pronto: { nome: "Veículo pronto", icone: "car-front" },
    pecas: { nome: "Peças disponíveis", icone: "package-check" },
  };

  /* ---------- Áreas do sistema e perfis ---------- */
  NX.SECOES = [
    { id: "painel", nome: "Painel", icone: "layout-dashboard", grupo: "Visão geral" },
    { id: "ordens", nome: "Ordens de serviço", icone: "clipboard-list", grupo: "Atendimento" },
    { id: "orcamentos", nome: "Orçamentos", icone: "file-text", grupo: "Atendimento" },
    { id: "agenda", nome: "Agenda da oficina", icone: "calendar-days", grupo: "Atendimento" },
    { id: "clientes", nome: "Clientes", icone: "users", grupo: "Atendimento" },
    { id: "veiculos", nome: "Veículos", icone: "car", grupo: "Atendimento" },
    { id: "servicos", nome: "Serviços e mão de obra", icone: "wrench", grupo: "Catálogo e estoque" },
    { id: "pecas", nome: "Produtos e peças", icone: "package", grupo: "Catálogo e estoque" },
    { id: "estoque", nome: "Estoque", icone: "warehouse", grupo: "Catálogo e estoque" },
    { id: "fornecedores", nome: "Fornecedores", icone: "truck", grupo: "Catálogo e estoque" },
    { id: "equipe", nome: "Equipe técnica", icone: "hard-hat", grupo: "Gestão" },
    { id: "financeiro", nome: "Financeiro", icone: "wallet", grupo: "Gestão" },
    { id: "relatorios", nome: "Relatórios", icone: "chart-column", grupo: "Gestão" },
    { id: "notificacoes", nome: "Notificações", icone: "bell", grupo: "Gestão" },
    { id: "configuracoes", nome: "Configurações", icone: "settings", grupo: "Gestão" },
  ];
  NX.ACOES = {
    os_abrir: "abrir ordens de serviço",
    os_editar: "editar ordens de serviço",
    os_itens: "incluir ou remover itens da ordem",
    os_status: "mudar o andamento técnico da ordem",
    os_cancelar: "cancelar ordens de serviço",
    os_encerrar: "encerrar e faturar ordens",
    os_entregar: "registrar a entrega do veículo",
    orc_criar: "criar, enviar ou revisar orçamentos",
    orc_aprovar: "registrar aprovação ou recusa de orçamentos",
    precos: "alterar preços nos itens",
    cadastros: "alterar cadastros de clientes e veículos",
    catalogo: "alterar serviços, peças e fornecedores",
    equipe: "alterar a equipe",
    estoque_mov: "registrar entradas e saídas de estoque",
    estoque_ajuste: "fazer ajustes de inventário",
    recebimento: "registrar recebimentos",
    despesas: "lançar ou alterar despesas",
    agenda: "alterar a agenda",
    config: "alterar as configurações",
  };
  NX.PERFIS = [
    { id: "admin", nome: "Administrador", usuario: "Renato Alves", cargo: "Administrador", descricao: "Acesso a tudo, inclusive configurações, preços e descontos acima do limite.", secoes: "*", acoes: "*" },
    {
      id: "recepcao", nome: "Recepcionista", usuario: "Bianca Souza", cargo: "Recepcionista",
      descricao: "Atende o cliente: abre ordens, monta e envia orçamentos, registra aprovações, agenda e entrega veículos.",
      secoes: ["painel", "ordens", "orcamentos", "agenda", "clientes", "veiculos", "servicos", "pecas", "estoque", "notificacoes"],
      acoes: ["os_abrir", "os_editar", "os_itens", "os_cancelar", "os_entregar", "orc_criar", "orc_aprovar", "cadastros", "agenda"],
    },
    {
      id: "tecnico", nome: "Técnico", usuario: "Carlos Lima", cargo: "Técnico",
      descricao: "Registra diagnóstico, itens e o andamento técnico das ordens. Não vê o financeiro nem os dados de contato dos clientes.",
      secoes: ["painel", "ordens", "agenda", "veiculos", "servicos", "pecas", "estoque", "notificacoes"],
      acoes: ["os_editar", "os_itens", "os_status"],
    },
    {
      id: "financeiro", nome: "Responsável financeiro", usuario: "Paula Nogueira", cargo: "Responsável financeiro",
      descricao: "Encerra e fatura ordens, registra recebimentos, despesas e compras de peças, e vê os relatórios.",
      secoes: ["painel", "ordens", "orcamentos", "clientes", "financeiro", "relatorios", "estoque", "pecas", "fornecedores", "notificacoes"],
      acoes: ["os_encerrar", "recebimento", "despesas", "estoque_mov"],
    },
  ];

  /* ======================================================================
     DADOS DE EXEMPLO (fictícios)
     ====================================================================== */
  const CATEGORIAS_SERVICO = ["Ar-condicionado", "Arrefecimento", "Diagnóstico", "Elétrica e injeção", "Freios", "Manutenção preventiva", "Motor", "Pneus e rodas", "Suspensão e direção"];
  const CATEGORIAS_PECA = ["Acessórios", "Ar-condicionado", "Arrefecimento", "Combustível", "Elétrica", "Filtros", "Freios", "Ignição", "Lubrificantes", "Motor", "Pneus e rodas", "Suspensão"];

  // nome, categoria, preço, minutos, descrição
  const SERVICOS = [
    ["Diagnóstico eletrônico (scanner)", "Diagnóstico", 120, 45, "Leitura dos códigos de falha, dos parâmetros do motor e teste dos sensores."],
    ["Troca de óleo e filtro de óleo", "Manutenção preventiva", 60, 30, "Drenagem, troca do filtro e reabastecimento com o óleo especificado. Óleo e filtro são cobrados à parte."],
    ["Revisão preventiva", "Manutenção preventiva", 260, 180, "Checklist de freios, suspensão, fluidos, correias e iluminação, com troca de óleo e filtros conforme o plano do fabricante."],
    ["Troca de pastilhas de freio (eixo dianteiro)", "Freios", 140, 60, "Troca das pastilhas, limpeza das pinças e teste de frenagem."],
    ["Troca de discos de freio (par)", "Freios", 160, 90, "Troca dos dois discos do mesmo eixo. Pastilhas cobradas à parte."],
    ["Alinhamento de direção", "Pneus e rodas", 100, 40, "Ajuste de convergência e cambagem dentro da especificação do fabricante."],
    ["Balanceamento (4 rodas)", "Pneus e rodas", 80, 40, "Balanceamento das quatro rodas, com troca dos contrapesos."],
    ["Troca de filtros de ar e cabine", "Manutenção preventiva", 50, 20, "Troca do filtro de ar do motor e do filtro de cabine."],
    ["Revisão do sistema de arrefecimento", "Arrefecimento", 150, 90, "Teste de pressão, verificação de mangueiras e válvula, troca do aditivo."],
    ["Troca de amortecedores (par)", "Suspensão e direção", 220, 150, "Troca dos amortecedores do mesmo eixo, com batentes e coxins verificados."],
    ["Troca de correia dentada", "Motor", 380, 240, "Troca da correia e do tensor, com sincronismo do motor conferido."],
    ["Higienização do ar-condicionado", "Ar-condicionado", 130, 60, "Limpeza da caixa evaporadora e aplicação do higienizador."],
    ["Limpeza de bicos injetores", "Elétrica e injeção", 180, 90, "Limpeza por ultrassom e teste de vazão dos bicos."],
    ["Sangria e troca do fluido de freio", "Freios", 90, 40, "Troca completa do fluido e sangria das quatro rodas."],
  ];
  const SERVICO_INATIVO = "Limpeza de bicos injetores";

  // id, nome, contato, telefone, e-mail, endereço, produtos, observações
  const FORNECEDORES = [
    ["f1", "Rota Peças Distribuidora", "Fernando (vendas)", "19955550201", "vendas@rotapecas.exemplo", "Rua dos Distribuidores, 150 — Distrito Industrial", "Filtros, freios, suspensão, arrefecimento e motor", "Entrega no dia seguinte para pedidos até 16h."],
    ["f2", "Ponto Azul Lubrificantes", "Sílvia (comercial)", "19955550202", "pedidos@pontoazul.exemplo", "Av. Central, 2200 — Vila Operária", "Óleos, fluidos e aditivos", ""],
    ["f3", "Faísca Autoelétrica Distribuidora", "Márcio", "19955550203", "faisca@faisca.exemplo", "Rua Voltaire, 31 — Centro", "Baterias, lâmpadas, velas e peças de injeção", "Peças de injeção sob encomenda (3 a 5 dias úteis)."],
    ["f4", "Climatec Refrigeração Automotiva", "Tatiane", "19955550204", "contato@climatec.exemplo", "Rua do Frio, 404 — Jardim Industrial", "Gás refrigerante, higienizadores e filtros de cabine", ""],
    ["f5", "Pneus & Rodas Center", "Wagner", "19955550205", "", "Av. das Rodas, 90 — Centro", "Válvulas, acessórios e palhetas", "Encerrou o atendimento na região."],
  ];

  // sku, nome, categoria, fabricante, fornecedor, custo, preço, mínimo, local, saldo inicial, nível de reposição (0 = não repõe)
  const PECAS = [
    ["LUB-5W30", "Óleo de motor 5W30 sintético (1 L)", "Lubrificantes", "Lubrin", "f2", 32, 52, 16, "Prateleira A1", 40, 44],
    ["LUB-15W40", "Óleo de motor 15W40 semissintético (1 L)", "Lubrificantes", "Lubrin", "f2", 22, 38, 10, "Prateleira A1", 28, 28],
    ["FIL-OLE-01", "Filtro de óleo (linha leve)", "Filtros", "Filtrex", "f1", 18, 34, 6, "Prateleira B2", 14, 15],
    ["FIL-AR-01", "Filtro de ar do motor", "Filtros", "Filtrex", "f1", 28, 52, 4, "Prateleira B2", 8, 8],
    ["FIL-CAB-01", "Filtro de cabine (ar-condicionado)", "Filtros", "Filtrex", "f4", 24, 45, 4, "Prateleira B3", 8, 8],
    ["FIL-COM-01", "Filtro de combustível", "Filtros", "Filtrex", "f1", 26, 48, 3, "Prateleira B3", 6, 7],
    ["FRE-PAS-D01", "Jogo de pastilhas de freio dianteiras", "Freios", "Freiomax", "f1", 85, 150, 3, "Prateleira C1", 8, 8],
    ["FRE-DIS-D01", "Par de discos de freio dianteiros", "Freios", "Freiomax", "f1", 190, 320, 2, "Prateleira C1", 4, 4],
    ["FRE-FLU-500", "Fluido de freio DOT 4 (500 ml)", "Freios", "Lubrin", "f2", 19, 35, 4, "Prateleira A2", 10, 10],
    ["SUS-AMO-D01", "Amortecedor dianteiro (unidade)", "Suspensão", "Nortec", "f1", 210, 360, 2, "Mezanino M1", 6, 6],
    ["SUS-BIE-01", "Bieleta da barra estabilizadora", "Suspensão", "Nortec", "f1", 38, 70, 4, "Prateleira C2", 10, 8],
    ["ARR-ADI-1L", "Aditivo de radiador concentrado (1 L)", "Arrefecimento", "Termak", "f2", 24, 44, 4, "Prateleira A2", 10, 10],
    ["ARR-VAL-01", "Válvula termostática", "Arrefecimento", "Termak", "f1", 65, 120, 2, "Prateleira C3", 3, 3],
    ["ARR-MAN-01", "Mangueira superior do radiador", "Arrefecimento", "Termak", "f1", 42, 80, 2, "Prateleira C3", 4, 4],
    ["ARR-BOM-01", "Bomba d'água", "Arrefecimento", "Termak", "f1", 160, 290, 1, "Prateleira C3", 2, 2],
    ["MOT-COR-KIT", "Kit correia dentada com tensor", "Motor", "Nortec", "f1", 240, 410, 1, "Mezanino M2", 3, 3],
    ["MOT-VEL-4", "Jogo de velas de ignição (4 un.)", "Ignição", "Voltar", "f3", 72, 130, 2, "Prateleira D1", 6, 5],
    ["ELE-BAT-60", "Bateria 60 Ah", "Elétrica", "Voltar", "f3", 380, 560, 2, "Mezanino M3", 4, 4],
    ["ELE-LAM-H4", "Lâmpada de farol H4", "Elétrica", "Voltar", "f3", 14, 28, 4, "Prateleira D2", 12, 12],
    ["ARC-GAS-R134", "Gás refrigerante R134a (carga de 450 g)", "Ar-condicionado", "Climar", "f4", 85, 150, 2, "Armário de gases", 4, 4],
    ["ARC-HIG-01", "Higienizador do ar-condicionado", "Ar-condicionado", "Climar", "f4", 22, 40, 3, "Prateleira D3", 8, 8],
    ["PNE-VAL-01", "Válvula de pneu (bico)", "Pneus e rodas", "Nortec", "f1", 3, 8, 16, "Gaveta G1", 40, 40],
    ["COM-BOM-01", "Bomba de combustível elétrica (refil)", "Combustível", "Voltar", "f3", 230, 390, 0, "Sob encomenda", 0, 0],
    ["LIM-PAL-01", "Palheta do limpador (par)", "Acessórios", "Nortec", "f5", 45, 80, 2, "Prateleira D4", 3, 0],
  ];

  // id, nome, função, especialidade, categorias de serviço
  const EQUIPE = [
    ["t1", "Carlos Lima", "chefe", "Diagnóstico, motor e injeção", ["Diagnóstico", "Motor", "Elétrica e injeção", "Manutenção preventiva", "Arrefecimento"]],
    ["t2", "Rafael Torres", "mecanico", "Freios, suspensão e rodas", ["Freios", "Suspensão e direção", "Pneus e rodas", "Manutenção preventiva"]],
    ["t3", "Diego Almeida", "eletricista", "Elétrica, injeção e ar-condicionado", ["Elétrica e injeção", "Ar-condicionado", "Diagnóstico"]],
    ["t4", "Marcos Vieira", "mecanico", "Arrefecimento e manutenção preventiva", ["Arrefecimento", "Manutenção preventiva", "Motor", "Pneus e rodas"]],
    ["t5", "Sérgio Bastos", "auxiliar", "Troca de óleo, rodas e apoio", ["Pneus e rodas", "Manutenção preventiva"]],
    ["t6", "Bianca Souza", "consultor", "Atendimento e orçamentos", []],
  ];

  // id, nome, tipo, telefone, e-mail, endereço, observações
  const CLIENTES = [
    ["c1", "Marina Duarte", "pf", "19955550101", "marina.duarte@email.exemplo", "Rua dos Ipês, 45 — Jardim Primavera", ""],
    ["c2", "João Pedro Antunes", "pf", "19955550102", "jp.antunes@email.exemplo", "Rua Treze de Maio, 310 — Centro", "Prefere contato por ligação."],
    ["c3", "Transportes Vale Verde Ltda.", "pj", "19955550103", "frota@valeverde.exemplo", "Rua das Indústrias, 800 — Distrito Industrial", "Frota de 3 veículos. Serviços acima de R$ 1.500 precisam do OK do gestor de frota (Ricardo Mendes). Paga por boleto."],
    ["c4", "Luciana Ferraz", "pf", "19955550104", "", "Rua Bela Vista, 22 — Vila Nova", ""],
    ["c5", "Roberto Teixeira", "pf", "19955550105", "roberto.teixeira@email.exemplo", "", ""],
    ["c6", "Camila Moreira", "pf", "19955550106", "camila.moreira@email.exemplo", "Av. Brasil, 1500, ap. 34 — Centro", "Dois veículos."],
    ["c7", "Eduardo Prado", "pf", "19955550107", "", "Rua Rio Branco, 77 — Jardim América", ""],
    ["c8", "Patrícia Gomes", "pf", "19955550108", "patricia.gomes@email.exemplo", "", ""],
    ["c9", "Henrique Lacerda", "pf", "19955550109", "h.lacerda@email.exemplo", "Rua das Acácias, 9 — Parque das Flores", ""],
    ["c10", "Floricultura Bem-Me-Quer", "pj", "19955550110", "contato@bemmequer.exemplo", "Rua das Rosas, 51 — Centro", "Falar com Aline (compras). Paga por boleto."],
    ["c11", "Vanessa Rocha", "pf", "19955550111", "", "", ""],
    ["c12", "Gustavo Nunes", "pf", "19955550112", "gustavo.nunes@email.exemplo", "", ""],
    ["c13", "Sílvio Ramos", "pf", "19955550113", "", "Rua Sete de Setembro, 640 — Centro", ""],
    ["c14", "Adriana Pacheco", "pf", "19955550114", "adriana.pacheco@email.exemplo", "", ""],
    ["c15", "Thiago Barros", "pf", "19955550115", "thiago.barros@email.exemplo", "Rua das Palmeiras, 18 — Jardim Europa", ""],
    ["c16", "Clínica Veterinária Patas", "pj", "19955550116", "gerencia@clinicapatas.exemplo", "Av. dos Bichos, 300 — Vila Nova", "Veículo de atendimento domiciliar. Aprovação com a gerência."],
    ["c17", "Mônica Siqueira", "pf", "19955550117", "", "", ""],
    ["c18", "Leandro Freitas", "pf", "19955550118", "leandro.freitas@email.exemplo", "", ""],
  ];
  const APROVADORES_PJ = { c3: "Ricardo Mendes (gestor da frota)", c10: "Aline (Floricultura Bem-Me-Quer)", c16: "Gerência (Clínica Veterinária Patas)" };

  // id, placa, marca, modelo, ano fab., ano-modelo, cor, combustível, cliente, km no cadastro
  const VEICULOS = [
    ["v1", "DMO1A11", "Volkswagen", "Gol 1.0", 2018, 2019, "Prata", "Flex", "c1", 81200],
    ["v2", "DMO2B22", "Chevrolet", "Onix 1.0", 2020, 2020, "Branco", "Flex", "c2", 47300],
    ["v3", "DMO4821", "Honda", "Fit 1.5", 2015, 2016, "Cinza", "Flex", "c2", 118400],
    ["v4", "DMO4D44", "Fiat", "Fiorino 1.4", 2019, 2020, "Branco", "Flex", "c3", 131900],
    ["v5", "DMO5E55", "Renault", "Master 2.3", 2017, 2018, "Branco", "Diesel", "c3", 226300],
    ["v6", "DMO6F66", "Fiat", "Strada 1.3", 2021, 2022, "Vermelho", "Flex", "c3", 59800],
    ["v7", "DMO7G77", "Toyota", "Corolla 2.0", 2019, 2020, "Preto", "Flex", "c4", 69500],
    ["v8", "DMO8H88", "Hyundai", "HB20 1.0", 2017, 2018, "Azul", "Flex", "c5", 91200],
    ["v9", "DMO9J99", "Jeep", "Renegade 1.8", 2018, 2018, "Cinza", "Flex", "c6", 77600],
    ["v10", "DMO3307", "Ford", "Ka 1.5", 2016, 2017, "Branco", "Flex", "c2", 104800],
    ["v11", "DMO1K23", "Renault", "Sandero 1.6", 2016, 2016, "Vermelho", "Flex", "c8", 98700],
    ["v12", "DMO2L34", "Volkswagen", "Polo 1.0 TSI", 2021, 2022, "Cinza", "Flex", "c9", 38900],
    ["v13", "DMO3M45", "Fiat", "Doblò 1.8", 2014, 2015, "Branco", "Flex", "c10", 168200],
    ["v14", "DMO4N56", "Volkswagen", "Saveiro 1.6", 2018, 2019, "Prata", "Flex", "c10", 112300],
    ["v15", "DMO5P67", "Nissan", "Kicks 1.6", 2020, 2021, "Vermelho", "Flex", "c11", 52100],
    ["v16", "DMO6512", "Chevrolet", "Prisma 1.4", 2015, 2015, "Preto", "Flex", "c12", 121700],
    ["v17", "DMO7Q89", "Fiat", "Uno 1.0", 2012, 2013, "Branco", "Flex", "c6", 143900],
    ["v18", "DMO8R90", "Toyota", "Hilux 2.8", 2019, 2020, "Prata", "Diesel", "c9", 96400],
    ["v19", "DMO9S12", "Fiat", "Argo 1.3", 2022, 2022, "Cinza", "Flex", "c13", 31200],
    ["v20", "DMO0T23", "Honda", "Civic 2.0", 2017, 2017, "Prata", "Flex", "c14", 102300],
    ["v21", "DMO1U34", "Volkswagen", "T-Cross 1.0 TSI", 2021, 2021, "Branco", "Flex", "c15", 44800],
    ["v22", "DMO5126", "Renault", "Kangoo 1.6", 2016, 2017, "Branco", "Flex", "c16", 154000],
    ["v23", "DMO3V56", "Chevrolet", "Tracker 1.2", 2022, 2023, "Azul", "Flex", "c17", 28400],
    ["v24", "DMO4W67", "Hyundai", "Creta 1.6", 2019, 2020, "Preto", "Flex", "c18", 73900],
  ];

  // Tipo de cada veículo de exemplo (também usado para completar dados salvos antes deste campo existir)
  NX.TIPOS_VEICULO_EXEMPLO = {
    v1: "Hatch", v2: "Hatch", v3: "Hatch", v4: "Utilitário / van", v5: "Utilitário / van", v6: "Picape", v7: "Sedã", v8: "Hatch",
    v9: "SUV", v10: "Hatch", v11: "Hatch", v12: "Hatch", v13: "Utilitário / van", v14: "Picape", v15: "SUV", v16: "Sedã",
    v17: "Hatch", v18: "Picape", v19: "Hatch", v20: "Sedã", v21: "SUV", v22: "Utilitário / van", v23: "SUV", v24: "SUV",
  };

  // Pacotes de serviço usados no histórico. "OLEO" vira 5W30 ou 15W40 conforme o carro.
  const PACOTES = {
    oleo: { peso: 5, cat: "Manutenção preventiva", relatos: ["Troca de óleo no prazo (etiqueta do para-brisa vencida).", "Pediu troca de óleo e uma olhada geral.", "Luz de manutenção acesa no painel."], diag: "Óleo escuro e no limite da troca; filtro de óleo saturado. Sem vazamentos aparentes e demais fluidos no nível correto.", servicos: ["Troca de óleo e filtro de óleo"], pecas: [["OLEO", 4], ["FIL-OLE-01", 1]], diesel: false },
    revisao: { peso: 2, cat: "Manutenção preventiva", relatos: ["Revisão preventiva antes de viagem.", "Revisão pela quilometragem (plano do fabricante)."], diag: "Revisão conforme o plano do fabricante: óleo e filtros no limite da troca; freios, suspensão e iluminação dentro do normal.", servicos: ["Revisão preventiva"], pecas: [["OLEO", 4], ["FIL-OLE-01", 1], ["FIL-AR-01", 1], ["FIL-COM-01", 1]], diesel: false },
    freio: { peso: 3, cat: "Freios", relatos: ["Chiado ao frear em velocidade baixa.", "Pedal de freio mais baixo que o normal."], diag: "Pastilhas dianteiras no limite (cerca de 2 mm). Discos dentro da espessura mínima. Fluido com umidade acima do recomendado no teste.", servicos: ["Troca de pastilhas de freio (eixo dianteiro)", "Sangria e troca do fluido de freio"], pecas: [["FRE-PAS-D01", 1], ["FRE-FLU-500", 1]] },
    freioDisco: { peso: 1, cat: "Freios", relatos: ["Volante trepida ao frear na estrada."], diag: "Discos dianteiros empenados e abaixo da espessura mínima; pastilhas com desgaste irregular.", servicos: ["Troca de discos de freio (par)", "Troca de pastilhas de freio (eixo dianteiro)"], pecas: [["FRE-DIS-D01", 1], ["FRE-PAS-D01", 1]] },
    alinhamento: { peso: 3, cat: "Pneus e rodas", relatos: ["Carro puxando para a direita e volante torto.", "Vibração no volante acima de 90 km/h."], diag: "Convergência fora da especificação e rodas desbalanceadas; pneus dianteiros com desgaste na borda interna.", servicos: ["Alinhamento de direção", "Balanceamento (4 rodas)"], pecas: [["PNE-VAL-01", 4]] },
    arrefecimento: { peso: 1, cat: "Arrefecimento", relatos: ["Temperatura subindo no trânsito.", "Reservatório de água baixando."], diag: "Válvula termostática travando fechada e aditivo diluído. Sem vazamento no radiador.", servicos: ["Revisão do sistema de arrefecimento"], pecas: [["ARR-VAL-01", 1], ["ARR-ADI-1L", 2]] },
    suspensao: { peso: 1, cat: "Suspensão e direção", relatos: ["Barulho na suspensão dianteira em buracos."], diag: "Amortecedores dianteiros com vazamento de óleo e bieletas com folga.", servicos: ["Troca de amortecedores (par)", "Alinhamento de direção"], pecas: [["SUS-AMO-D01", 2], ["SUS-BIE-01", 2]] },
    correia: { peso: 1, cat: "Motor", relatos: ["Troca preventiva da correia dentada (quilometragem de troca atingida)."], diag: "Correia dentada com trincas laterais e tensor com ruído. Troca indicada pelo plano de manutenção.", servicos: ["Troca de correia dentada"], pecas: [["MOT-COR-KIT", 1]], diesel: false },
    bateria: { peso: 1, cat: "Elétrica e injeção", relatos: ["Dificuldade para dar partida de manhã."], diag: "Bateria reprovada no teste de carga (fim da vida útil). Alternador carregando normalmente.", servicos: ["Diagnóstico eletrônico (scanner)"], pecas: [["ELE-BAT-60", 1]] },
    arcondicionado: { peso: 2, cat: "Ar-condicionado", relatos: ["Ar-condicionado com mau cheiro e gelando pouco."], diag: "Filtro de cabine saturado e carga de gás abaixo do normal. Teste de vazamento sem alteração.", servicos: ["Higienização do ar-condicionado", "Troca de filtros de ar e cabine"], pecas: [["ARC-HIG-01", 1], ["FIL-CAB-01", 1], ["ARC-GAS-R134", 1]] },
    ignicao: { peso: 1, cat: "Elétrica e injeção", relatos: ["Motor falhando em marcha lenta e luz da injeção acesa."], diag: "Scanner indicou falha de ignição no cilindro 3. Velas desgastadas; cabos em bom estado.", servicos: ["Diagnóstico eletrônico (scanner)"], mao: ["Troca das velas de ignição", 0.5], pecas: [["MOT-VEL-4", 1]], diesel: false },
    lampada: { peso: 1, cat: "Elétrica e injeção", relatos: ["Farol baixo do lado esquerdo queimado."], diag: "Lâmpada H4 do farol esquerdo queimada e a do lado direito escurecida. Troca do par.", servicos: [], mao: ["Troca das lâmpadas do farol", 0.25], pecas: [["ELE-LAM-H4", 2]] },
  };

  /* ---------- Gerador ---------- */
  function mulberry32(semente) {
    let a = semente >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function estrutura(AGORA) {
    const dia = (abre, fecha) => ({ abre, fecha });
    return {
      versao: 1, revisao: 0, criadoEm: AGORA, demo: { historico: false, geradoEm: AGORA },
      sequencias: { os: 0, orc: 0, movimento: 0, servico: 0 },
      oficina: {
        id: "of1", nome: "AutoPrime Centro Automotivo", razaoSocial: "AutoPrime Centro Automotivo (empresa fictícia)", cnpj: "",
        telefone: "(19) 95555-0100", telefoneFicticio: true, whatsapp: "",
        endereco: "Av. das Oficinas, 1000 — Distrito Industrial (endereço fictício)",
        horarioTexto: "Seg. a sex., 8h às 18h · Sáb., 8h às 12h",
        horarios: { 0: null, 1: dia("08:00", "18:00"), 2: dia("08:00", "18:00"), 3: dia("08:00", "18:00"), 4: dia("08:00", "18:00"), 5: dia("08:00", "18:00"), 6: dia("08:00", "12:00") },
        logo: null,
        orcamento: { validadeDias: 7, valorHora: 140, descontoMax: 10, garantia: "Serviços com garantia de 90 dias; peças conforme a garantia do fabricante. (Texto de exemplo: ajuste em Configurações.)" },
        estoque: { minimoPadrao: 2 },
        documentos: { mostrarCnpj: true, mostrarEndereco: true, mostrarGarantia: true, rodape: "Documento sem valor fiscal." },
        boxes: 4,
        categoriasServico: [...CATEGORIAS_SERVICO],
        categoriasPeca: [...CATEGORIAS_PECA],
      },
      perfil: { papel: "admin", nome: "Renato Alves", cargo: "Administrador" },
      clientes: [], veiculos: [], servicos: [], pecas: [], movimentos: [], fornecedores: [], equipe: [],
      ordens: [], orcamentos: [], agenda: [], despesas: [], notificacoes: [], alertasVistos: [],
    };
  }

  function gerar(HOJE, AGORA, soCadastros) {
    const base = estrutura(AGORA);
    NX.loja.comDados(base, () => {
      try { simular(base, HOJE, AGORA, soCadastros); } finally { U.simularRelogio(null); }
    });
    return base;
  }

  NX.criarDadosDemo = function () {
    const HOJE = U.hoje();
    const AGORA = U.agora();
    try {
      return gerar(HOJE, AGORA, false);
    } catch (erro) {
      // Nunca deveria acontecer (os testes geram o histórico para vários dias e horários),
      // mas, se acontecer, o sistema abre só com os cadastros em vez de travar.
      if (typeof console !== "undefined") console.error("NEXORA AUTO: não foi possível montar o histórico de exemplo.", erro);
      NX.ultimoErroDemo = String(erro && erro.message);
      return gerar(HOJE, AGORA, true);
    }
  };

  function simular(D, HOJE, AGORA, soCadastros) {
    const L = NX.loja;
    const O = NX.oficina;
    const r = mulberry32(20261012);
    const entre = (a, b) => a + Math.floor(r() * (b - a + 1));
    const sorteio = (lista) => lista[Math.floor(r() * lista.length)];
    const horarios = D.oficina.horarios;
    const hDe = (dia) => horarios[U.diaDaSemana(dia)];

    /* ---------- Relógio do histórico ---------- */
    const deslocar = (m, min) => {
      let dia = m.slice(0, 10);
      let x = U.minutos(m.slice(11, 16)) + min;
      while (x < 0) { x += 1440; dia = U.somarDias(dia, -1); }
      while (x >= 1440) { x -= 1440; dia = U.somarDias(dia, 1); }
      return `${dia}T${U.hhmm(x)}`;
    };
    const proximoAberto = (dia, passo) => { let d = dia; do { d = U.somarDias(d, passo); } while (!hDe(d)); return d; };
    const cacheDias = {};
    function diaUtil(k) {                       // k < 0: k-ésimo dia aberto antes de hoje; k > 0: depois
      if (cacheDias[k]) return cacheDias[k];
      let d = HOJE;
      for (let i = 0; i < Math.abs(k); i += 1) d = proximoAberto(d, k > 0 ? 1 : -1);
      cacheDias[k] = d;
      return d;
    }
    function momento(dia, f) {                  // fração f do expediente do dia
      const h = hDe(dia);
      const a = U.minutos(h.abre);
      const b = U.minutos(h.fecha);
      return `${dia}T${U.hhmm(Math.min(Math.round((a + f * (b - a)) / 5) * 5, b - 5))}`;
    }
    const em = (k, f) => momento(diaUtil(k), f);
    // Avança "min" minutos de expediente (pula noites, domingos e o que estiver fechado)
    function avancar(m, min) {
      let dia = m.slice(0, 10);
      let x = U.minutos(m.slice(11, 16));
      let resto = min;
      for (;;) {
        const h = hDe(dia);
        if (h) {
          const a = U.minutos(h.abre);
          const b = U.minutos(h.fecha) - 5;
          if (x < a) x = a;
          if (x + resto <= b) return `${dia}T${U.hhmm(Math.ceil((x + resto) / 5) * 5 > b ? b : Math.ceil((x + resto) / 5) * 5)}`;
          resto -= Math.max(0, b - x);
        }
        dia = U.somarDias(dia, 1);
        x = 0;
      }
    }
    function diasUteisDepois(m, n) {
      let d = m.slice(0, 10);
      for (let i = 0; i < Math.abs(n); i += 1) d = proximoAberto(d, n > 0 ? 1 : -1);
      const h = hDe(d);
      const hora = m.slice(11, 16);
      return `${d}T${hora < h.abre ? h.abre : hora > U.hhmm(U.minutos(h.fecha) - 5) ? U.hhmm(U.minutos(h.fecha) - 5) : hora}`;
    }
    // "Recente": hoje até agora; se a oficina não abriu hoje (ou abriu há pouco), fim do último dia aberto
    const minAgora = U.minutos(AGORA.slice(11, 16));
    const hHoje = hDe(HOJE);
    const hojeServe = !!hHoje && minAgora >= U.minutos(hHoje.abre) + 90;
    function recente(f) {
      if (hojeServe) {
        const a = U.minutos(hHoje.abre);
        const b = Math.min(minAgora - 10, U.minutos(hHoje.fecha) - 5);
        return `${HOJE}T${U.hhmm(Math.floor((a + f * (b - a)) / 5) * 5)}`;
      }
      return em(-1, 0.6 + f * 0.33);
    }
    // Faixas da agenda (múltiplos de 30 min dentro do expediente)
    function faixa(dia, f, dur) {
      const h = hDe(dia);
      const a = U.minutos(h.abre);
      const duracao = Math.min(dur, U.minutos(h.fecha) - a);
      const b = U.minutos(h.fecha) - duracao;
      const ini = a + Math.floor((f * (b - a)) / 30) * 30;
      return { data: dia, inicio: U.hhmm(ini), fim: U.hhmm(ini + duracao) };
    }
    function faixaDepois(f, dur) {              // ainda hoje (se der) ou no próximo dia aberto
      if (hHoje) {
        const a = Math.ceil((minAgora + 60) / 30) * 30;
        const b = U.minutos(hHoje.fecha) - dur;
        if (b >= a) { const ini = a + Math.floor((f * (b - a)) / 30) * 30; return { data: HOJE, inicio: U.hhmm(ini), fim: U.hhmm(ini + dur) }; }
      }
      return faixa(diaUtil(1), f, dur);
    }
    const piso30 = (m) => U.hhmm(Math.floor(U.minutos(m.slice(11, 16)) / 30) * 30);

    /* ---------- Passos (executados em ordem de horário) ---------- */
    const passos = [];
    let seq = 0;
    const passo = (t, rotulo, fn) => { passos.push({ t, rotulo, fn, seq: seq++ }); };
    const exigir = (res, oque) => {
      if (!res || !res.ok) throw new Error(`Gerador (${oque}): ${res ? res.erro || JSON.stringify(res.erros || res.pendencias || res) : "sem resposta"}`);
      return res;
    };
    function como(papel, nome) {
      const p = NX.PERFIS.find((x) => x.id === papel);
      D.perfil = { papel, nome: nome || p.usuario, cargo: p.cargo };
    }
    const nomeMembro = (id) => (EQUIPE.find((m) => m[0] === id) || [])[1];
    const comoTec = (id) => como("tecnico", nomeMembro(id));

    const inicio = em(-70, 0);
    const inicioDia = inicio.slice(0, 10);

    /* ---------- Implantação: catálogo, equipe e fornecedores ---------- */
    const idServico = Object.fromEntries(SERVICOS.map(([nome], i) => [nome, `s${i + 1}`]));
    passo(inicio, "implantação", () => {
      como("admin");
      FORNECEDORES.forEach(([id, nome, contato, telefone, email, endereco, produtos, obs]) => {
        const res = exigir(L.salvarFornecedor({ nome, contato, telefone, email, endereco, produtos, observacoes: obs }), `fornecedor ${nome}`);
        L.fornecedor(res.id).id = id;
      });
      EQUIPE.forEach(([id, nome, funcao, especialidade, categorias]) => {
        const res = exigir(L.salvarMembro({ nome, funcao, especialidade, categorias }), `equipe ${nome}`);
        L.membro(res.id).id = id;
      });
      SERVICOS.forEach(([nome, categoria, preco, tempo, descricao]) => {
        const res = exigir(L.salvarServico({ nome, categoria, preco: String(preco), tempo: String(tempo), descricao }), `serviço ${nome}`);
        L.servico(res.id).id = idServico[nome];
      });
      PECAS.forEach(([sku, nome, categoria, fabricante, forn, custo, preco, minimo, local, inicial]) => {
        const res = exigir(L.salvarPeca({ sku, nome, categoria, fabricante, fornecedorId: forn, custo: String(custo), preco: String(preco), minimo: String(minimo), local }), `peça ${sku}`);
        const p = L.peca(res.id);
        p.id = sku;
        p.historico[0].texto = "Peça cadastrada na implantação do sistema";
        if (inicial > 0) O.lancarMovimento({ pecaId: sku, tipo: "entrada", quantidade: inicial, motivo: "Saldo inicial", observacao: "Contagem da implantação do sistema", custoUnitario: custo });
      });
    });

    /* ---------- Clientes e veículos: cadastrados na primeira vez que aparecem ---------- */
    const defVeiculo = (id) => VEICULOS.find((v) => v[0] === id);
    const primeiroUso = {};
    const usar = (vid, t) => { if (!primeiroUso[vid] || t < primeiroUso[vid]) primeiroUso[vid] = t; };
    function cadastrarVeiculo(vid) {
      const [id, placa, marca, modelo, anoFab, anoModelo, cor, combustivel, cid, km] = defVeiculo(vid);
      if (!L.cliente(cid)) {
        const c = CLIENTES.find((x) => x[0] === cid);
        const res = exigir(L.salvarCliente({ nome: c[1], tipo: c[2], telefone: c[3], email: c[4], endereco: c[5], observacoes: c[6] }), `cliente ${c[1]}`);
        L.cliente(res.id).id = cid;
      }
      const res = exigir(L.salvarVeiculo({ placa, marca, modelo, tipo: NX.TIPOS_VEICULO_EXEMPLO[id], anoFab: String(anoFab), anoModelo: String(anoModelo), cor, combustivel, km: String(km), clienteId: cid }), `veículo ${placa}`);
      L.veiculo(res.id).id = id;
    }

    /* ---------- Itens ---------- */
    const pecaDef = (sku) => PECAS.find((p) => p[0] === sku);
    const diesel = (vid) => defVeiculo(vid)[7] === "Diesel";
    const oleoDo = (vid) => (defVeiculo(vid)[4] < 2017 ? "LUB-15W40" : "LUB-5W30");
    function itensPacote(pac, vid) {
      const itens = pac.servicos.map((nome) => ({ tipo: "servico", refId: idServico[nome], quantidade: "1" }));
      if (pac.mao) itens.push({ tipo: "mao", descricao: pac.mao[0], quantidade: String(pac.mao[1]) });
      pac.pecas.forEach(([sku, q]) => itens.push({ tipo: "peca", refId: sku === "OLEO" ? oleoDo(vid) : sku, quantidade: String(q) }));
      return itens;
    }
    // Item no formato do orçamento avulso (com descrição e valor do catálogo)
    function itemOrc(it) {
      if (it.tipo === "servico") { const s = L.servico(it.refId); return { tipo: "servico", refId: s.id, descricao: `${s.codigo} · ${s.nome}`, quantidade: Number(it.quantidade), unitario: s.preco }; }
      if (it.tipo === "peca") { const p = L.peca(it.refId); return { tipo: "peca", refId: p.id, descricao: `${p.sku} · ${p.nome}`, quantidade: Number(it.quantidade), unitario: p.preco }; }
      return { tipo: "mao", refId: null, descricao: it.descricao, quantidade: Number(it.quantidade), unitario: D.oficina.orcamento.valorHora };
    }
    const duracao = (pac) => pac.servicos.reduce((t, nome) => t + SERVICOS.find((s) => s[0] === nome)[3], 0) + (pac.mao ? pac.mao[1] * 60 : 0);

    /* ---------- Estoque ---------- */
    let nf = 2150;
    // Antes de aprovar: se faltar peça, compra o que falta (pedido avulso já pago)
    function garantirEstoque(orc, os) {
      const papel = D.perfil;
      orc.itens.filter((i) => i.tipo === "peca").forEach((i) => {
        // o que a própria OS já tem reservado volta a valer na nova aprovação
        const proprio = os.itens.filter((x) => x.tipo === "peca" && x.refId === i.refId && x.estado === "reservada").reduce((t, x) => t + x.quantidade, 0);
        const falta = i.quantidade - O.disponivel(i.refId) - proprio;
        if (falta <= 0) return;
        const p = L.peca(i.refId);
        como("admin");
        const res = exigir(O.registrarEntrada({ pecaId: p.id, quantidade: String(falta + p.minimo), fornecedorId: p.fornecedorId, documento: `NF-e ${String(nf++).padStart(6, "0")}`, observacao: `Compra para a ${os.numero}`, lancarDespesa: true }), `compra avulsa ${p.sku}`);
        exigir(O.pagarDespesa(res.despesa.id, U.hoje()), "pagar compra avulsa");
      });
      D.perfil = papel;
    }
    // Reposição semanal: o que chegou ao mínimo volta ao nível de reposição
    function reposicao(t, semRepor = []) {
      const holder = [];
      passo(t, "reposição", () => {
        como("admin");
        const porFornecedor = new Map();
        PECAS.forEach(([sku, , , , forn, custo, , minimo, , , alvo]) => {
          const p = L.peca(sku);
          if (!alvo || p.status !== "ativo" || semRepor.includes(sku)) return;
          if (O.disponivel(sku) > minimo) return;
          const q = alvo - O.saldo(sku) + O.reservado(sku);
          if (q <= 0) return;
          if (!porFornecedor.has(forn)) porFornecedor.set(forn, { doc: `NF-e ${String(nf++).padStart(6, "0")}`, total: 0 });
          const pedido = porFornecedor.get(forn);
          exigir(O.registrarEntrada({ pecaId: sku, quantidade: String(q), fornecedorId: forn, documento: pedido.doc }), `reposição ${sku}`);
          pedido.total += q * custo;
        });
        como("financeiro");
        porFornecedor.forEach((pedido, forn) => {
          const res = exigir(O.salvarDespesa({ descricao: `Compra de peças — ${L.fornecedor(forn).nome} (${pedido.doc})`, categoria: "Compra de peças", valor: String(U.arredondar(pedido.total)), data: U.hoje(), pago: false, fornecedorId: forn, observacao: "Boleto com vencimento em 14 dias." }), "despesa da reposição");
          holder.push(res.id);
        });
      });
      const pagar = diasUteisDepois(t, 10);
      if (pagar <= AGORA) passo(pagar, "pagar reposição", () => { como("financeiro"); holder.forEach((id) => exigir(O.pagarDespesa(id, U.hoje()), "pagar reposição")); });
    }

    /* ---------- História de uma ordem de serviço ---------- */
    const proximoKm = (v) => {
      const ultimo = v.historicoKm[v.historicoKm.length - 1];
      const dias = U.diasEntre(ultimo.em.slice(0, 10), U.hoje());
      return v.km + (dias > 0 ? Math.max(120, dias * entre(25, 55)) : 0);
    };
    function historiaOS(h) {
      const st = {};
      const vid = h.vid;
      if (h.t.agendaCriar) {
        usar(vid, h.t.agendaCriar);
        passo(h.t.agendaCriar, "agenda recepção", () => {
          como("recepcao");
          const ini = piso30(h.t.abrir);
          const v = L.veiculo(vid);
          st.comp = exigir(O.salvarCompromisso({ tipo: "recepcao", data: h.t.abrir.slice(0, 10), inicio: ini, fim: U.hhmm(U.minutos(ini) + 30), clienteId: v.clienteId, veiculoId: vid, observacoes: h.agendaObs || "Agendado por telefone." }), "agenda recepção").compromisso;
        });
      }
      usar(vid, h.t.abrir);
      passo(h.t.abrir, "abrir OS", () => {
        como("recepcao");
        if (st.comp) exigir(O.mudarCompromisso(st.comp.id, "realizado"), "recepção realizada");
        const v = L.veiculo(vid);
        const km = h.kmEntrada ? h.kmEntrada(v) : proximoKm(v);
        st.os = exigir(O.abrirOS({ clienteId: v.clienteId, veiculoId: vid, kmEntrada: String(km), justificativaKm: h.justificativaKm || "", relato: h.relato, previsao: h.previsao || "", tecnicoId: h.tecnicoNaAbertura === false ? "" : h.tecnico || "", observacoes: h.obs || "" }), "abrir OS").os;
        if (st.comp) st.comp.osId = st.os.id;
        if (h.aoAbrir) h.aoAbrir(st);
      });
      if (h.t.diag) passo(h.t.diag, "diagnóstico", () => {
        comoTec(h.tecnico);
        if (!st.os.tecnicoId) exigir(O.editarOS(st.os.id, { tecnicoId: h.tecnico }), "assumir OS");
        exigir(O.mudarStatus(st.os.id, "em_diagnostico"), "em diagnóstico");
      });
      if (h.t.diagFim) passo(h.t.diagFim, "itens", () => {
        comoTec(h.tecnico);
        exigir(O.editarOS(st.os.id, { diagnostico: h.diag }), "registrar diagnóstico");
        h.itens.forEach((it) => exigir(O.adicionarItem(st.os.id, it), "item"));
        exigir(O.mudarStatus(st.os.id, "aguardando_orcamento"), "aguardando orçamento");
      });
      if (h.t.orc) passo(h.t.orc, "orçamento", () => {
        como(h.descontoAdmin ? "admin" : "recepcao");
        const sub = O.totais(st.os.itens).subtotal;
        const desconto = h.descontoPct ? String(U.arredondar(Math.floor(sub * h.descontoPct))) : "";
        st.orc = exigir(O.gerarOrcamento(st.os.id, { desconto, enviar: !h.rascunho, validadeDias: h.validade ? String(h.validade) : "", observacoes: h.obsOrc || "" }), "gerar orçamento").orcamento;
      });
      if (h.t.aprov) passo(h.t.aprov, "aprovação", () => {
        como("recepcao");
        if (h.garantirEstoque !== false) garantirEstoque(st.orc, st.os);
        exigir(O.aprovarOrcamento(st.orc.id, { por: h.aprovador, canal: h.canal, observacao: h.obsAprovacao || "" }), "aprovar");
      });
      if (h.t.recusa) passo(h.t.recusa, "recusa", () => { como("recepcao"); exigir(O.recusarOrcamento(st.orc.id, { motivo: h.motivoRecusa }), "recusar"); });
      if (h.t.cancelar) passo(h.t.cancelar, "cancelar OS", () => { como("recepcao"); exigir(O.mudarStatus(st.os.id, "cancelada", { motivo: h.motivoCancelamento }), "cancelar"); });
      (h.extras || []).forEach((x) => passo(x.t, x.rotulo, () => x.fn(st)));
      if (h.t.exec) passo(h.t.exec, "execução", () => { comoTec(h.tecnico); exigir(O.mudarStatus(st.os.id, "em_execucao"), "em execução"); });
      if (h.t.pronto) passo(h.t.pronto, "pronto", () => { comoTec(h.tecnico); exigir(O.mudarStatus(st.os.id, "aguardando_retirada"), "aguardando retirada"); });
      if (h.t.fatura) passo(h.t.fatura, "faturar", () => { como("financeiro"); exigir(O.mudarStatus(st.os.id, "concluida"), "concluída"); });
      (h.pagamentos || []).forEach((p) => passo(p.t, "recebimento", () => {
        como("financeiro");
        const falta = O.aReceber(st.os);
        const valor = p.fracao ? U.arredondar(Math.round(falta * p.fracao)) : falta;
        const res = exigir(O.registrarRecebimento(st.os.id, { valor: String(valor), forma: p.forma, data: U.hoje(), observacao: p.obs || "" }), "recebimento");
        if (p.estornar) {
          exigir(O.estornarRecebimento(st.os.id, res.recebimento.id, p.estornar), "estorno");
          exigir(O.registrarRecebimento(st.os.id, { valor: String(valor), forma: p.formaCorreta, data: U.hoje(), observacao: "Registro corrigido" }), "recebimento corrigido");
        }
      }));
      if (h.t.entrega) passo(h.t.entrega, "entrega", () => {
        como("recepcao");
        exigir(O.mudarStatus(st.os.id, "entregue", { retiradoPor: h.retiradoPor, kmSaida: String(st.os.kmEntrada + entre(2, 12)) }), "entregue");
      });
      return st;
    }

    /* ---------- Histórias fixas (o que está acontecendo agora na oficina) ---------- */
    const inicioFixo = {};                    // veículo → momento a partir do qual pertence a uma história fixa
    const ocupacao = new Map(VEICULOS.map((v) => [v[0], []]));
    // Um veículo não volta em menos de 14 dias nem passa de 4 visitas no período (fica mais realista)
    const comFolga = (m, dias) => `${U.somarDias(m.slice(0, 10), dias)}${m.slice(10)}`;
    const livre = (vid, ini, fim) => (!inicioFixo[vid] || comFolga(fim, 14) < inicioFixo[vid]) && ocupacao.get(vid).length < 4
      && ocupacao.get(vid).every(([a, b]) => comFolga(fim, 14) < a || ini > comFolga(b, 14));
    const ocupar = (vid, ini, fim) => ocupacao.get(vid).push([ini, fim]);
    const nomeCliente = (cid) => CLIENTES.find((c) => c[0] === cid)[1];
    const pac = (id) => PACOTES[id];
    const SEM_HISTORICO_SORTEADO = ["v10"];   // o Ka trocou de dono: as ordens dele são fixas

    function fixa(h) {
      inicioFixo[h.vid] = inicioFixo[h.vid] && inicioFixo[h.vid] < h.t.abrir ? inicioFixo[h.vid] : h.t.abrir;
      return historiaOS(h);
    }
    function passada(h, fim) { ocupar(h.vid, h.t.agendaCriar || h.t.abrir, fim); return historiaOS(h); }

    if (!soCadastros) {
      // H1 — HB20: chegou hoje, aguardando avaliação (veio com horário marcado)
      const t1 = recente(0.8);
      fixa({ vid: "v8", relato: "Barulho na suspensão dianteira ao passar em lombadas; cliente percebeu há uma semana.", t: { agendaCriar: em(-2, 0.7), abrir: t1 }, tecnicoNaAbertura: false, agendaObs: "Barulho na suspensão. Cliente traz o carro." });

      // H2 — Polo: em diagnóstico
      const tPolo = recente(0.3);
      fixa({
        vid: "v12", tecnico: "t3", relato: "Luz da injeção acesa e perda de força em subidas.", previsao: em(1, 0.3), t: { abrir: tPolo, diag: recente(0.45) },
        extras: [
          { t: em(-2, 0.75), rotulo: "agenda Polo", fn: (st) => { como("recepcao"); const ini = piso30(tPolo); st.ag = exigir(O.salvarCompromisso({ tipo: "avaliacao", data: tPolo.slice(0, 10), inicio: ini, fim: U.hhmm(U.minutos(ini) + 60), tecnicoId: "t3", box: "3", clienteId: "c9", veiculoId: "v12", observacoes: "Luz da injeção acesa. Cliente deixa o carro para avaliação." }), "agenda Polo").compromisso; } },
          { t: recente(0.46), rotulo: "agenda Polo ok", fn: (st) => { como("recepcao"); st.ag.osId = st.os.id; exigir(O.mudarCompromisso(st.ag.id, "realizado"), "agenda Polo realizada"); } },
        ],
      });

      // H3 — Kicks: diagnóstico feito, orçamento em rascunho (aguardando orçamento)
      const p3 = pac("arrefecimento");
      fixa({ vid: "v15", tecnico: "t4", relato: "Temperatura subindo no trânsito e ventoinha ligando toda hora.", previsao: em(1, 0.8), diag: `${p3.diag} Mangueira superior ressecada, com início de trinca.`, itens: [...itensPacote(p3, "v15"), { tipo: "peca", refId: "ARR-MAN-01", quantidade: "1" }], rascunho: true, t: { abrir: em(-1, 0.15), diag: em(-1, 0.22), diagFim: em(-1, 0.35), orc: em(-1, 0.45) } });

      // H4 — Renegade: orçamento enviado, aguardando aprovação do cliente (peças NÃO reservadas ainda)
      const p4 = pac("suspensao");
      fixa({ vid: "v9", tecnico: "t2", relato: p4.relatos[0], previsao: em(2, 0.8), diag: p4.diag, itens: [...itensPacote(p4, "v9"), { tipo: "servico", refId: idServico["Balanceamento (4 rodas)"], quantidade: "1" }], t: { abrir: em(-2, 0.25), diag: em(-2, 0.32), diagFim: em(-2, 0.45), orc: em(-2, 0.55) } });

      // H5 — Doblò: aprovada, mas a bomba de combustível é sob encomenda (aguardando peças)
      fixa({
        vid: "v13", tecnico: "t1", relato: "Motor falhando e apagando em subidas; luz da injeção acesa.", previsao: em(3, 0.8),
        diag: "Pressão da linha de combustível abaixo do especificado: bomba de combustível fraca. Filtro de combustível saturado.",
        itens: [{ tipo: "servico", refId: idServico["Diagnóstico eletrônico (scanner)"], quantidade: "1" }, { tipo: "mao", descricao: "Troca da bomba de combustível", quantidade: "1.5" }, { tipo: "peca", refId: "COM-BOM-01", quantidade: "1" }, { tipo: "peca", refId: "FIL-COM-01", quantidade: "1" }],
        aprovador: "Aline (Floricultura Bem-Me-Quer)", canal: "Telefone", garantirEstoque: false, obsAprovacao: "Cliente ciente do prazo da bomba (sob encomenda).",
        t: { abrir: em(-4, 0.1), diag: em(-4, 0.18), diagFim: em(-4, 0.35), orc: em(-4, 0.45), aprov: em(-3, 0.1) },
      });

      // H6 — Corolla: aprovada hoje, peças reservadas, serviço marcado na agenda
      const p6 = pac("freioDisco");
      fixa({
        vid: "v7", tecnico: "t2", relato: p6.relatos[0], previsao: em(1, 0.5), diag: `${p6.diag} Fluido de freio vencido.`,
        itens: [...itensPacote(p6, "v7"), { tipo: "servico", refId: idServico["Sangria e troca do fluido de freio"], quantidade: "1" }, { tipo: "peca", refId: "FRE-FLU-500", quantidade: "1" }],
        aprovador: "Luciana Ferraz", canal: "WhatsApp", t: { abrir: em(-1, 0.1), diag: em(-1, 0.18), diagFim: em(-1, 0.3), orc: em(-1, 0.4), aprov: recente(0.25) },
        extras: [{ t: recente(0.27), rotulo: "agenda serviço", fn: (st) => { como("recepcao"); exigir(O.salvarCompromisso({ tipo: "servico", ...faixa(diaUtil(1), 0, 150), tecnicoId: "t2", box: "2", osId: st.os.id, observacoes: "Troca de discos e pastilhas." }), "agenda H6"); } }],
      });

      // H7 — Master (frota): em execução, com REVISÃO do orçamento (bomba d'água descoberta no serviço)
      const p7 = pac("correia");
      fixa({
        vid: "v5", tecnico: "t1", relato: "Troca preventiva da correia dentada (frota). Motorista relata leve ruído no motor.", previsao: em(1, 0.9),
        diag: p7.diag, itens: itensPacote(p7, "v5"), aprovador: "Ricardo Mendes (gestor da frota)", canal: "E-mail",
        t: { abrir: em(-5, 0.08), diag: em(-5, 0.15), diagFim: em(-5, 0.3), orc: em(-5, 0.4), aprov: em(-5, 0.7), exec: em(-4, 0.05) },
        extras: [
          { t: em(-3, 0.25), rotulo: "achado", fn: (st) => { comoTec("t1"); exigir(O.editarOS(st.os.id, { observacoes: "Durante a troca da correia, a bomba d'água apresentou vazamento pelo retentor. Cliente avisado; revisão do orçamento enviada." }), "observação H7"); } },
          { t: em(-3, 0.3), rotulo: "revisão", fn: (st) => {
            como("recepcao");
            const rev = exigir(O.revisarOrcamento(st.orc.id), "revisar").orcamento;
            const itens = [...rev.itens.map((i) => ({ tipo: i.tipo, refId: i.refId, descricao: i.descricao, quantidade: i.quantidade, unitario: i.unitario })), itemOrc({ tipo: "peca", refId: "ARR-BOM-01", quantidade: 1 }), itemOrc({ tipo: "peca", refId: "ARR-ADI-1L", quantidade: 2 }), itemOrc({ tipo: "mao", descricao: "Troca da bomba d'água", quantidade: 1.5 })];
            st.rev = exigir(O.salvarOrcamento({ itens, desconto: "", observacoes: "Revisão: inclui a bomba d'água encontrada com vazamento durante o serviço.", enviar: true }, rev.id), "enviar revisão").orcamento;
          } },
          { t: em(-3, 0.6), rotulo: "aprovar revisão", fn: (st) => { como("recepcao"); garantirEstoque(st.rev, st.os); exigir(O.aprovarOrcamento(st.rev.id, { por: "Ricardo Mendes (gestor da frota)", canal: "WhatsApp" }), "aprovar revisão"); } },
          { t: em(-3, 0.65), rotulo: "agenda H7", fn: (st) => { como("recepcao"); exigir(O.salvarCompromisso({ tipo: "servico", ...faixa(diaUtil(1), 0, 180), tecnicoId: "t1", box: "1", osId: st.os.id, observacoes: "Montagem da bomba d'água e teste." }), "agenda H7"); } },
        ],
      });

      // H8 — Gol: em execução com previsão vencida (alerta)
      const p8 = pac("arcondicionado");
      fixa({
        vid: "v1", tecnico: "t3", relato: p8.relatos[0], previsao: em(-1, 0.8), diag: p8.diag, itens: itensPacote(p8, "v1"),
        aprovador: "Marina Duarte", canal: "WhatsApp", obs: "Cliente pediu para avisar pelo WhatsApp quando ficar pronto.",
        t: { abrir: em(-3, 0.15), diag: em(-3, 0.22), diagFim: em(-3, 0.4), orc: em(-3, 0.5), aprov: em(-3, 0.8), exec: em(-2, 0.1) },
        extras: [
          { t: em(-3, 0.85), rotulo: "agenda H8", fn: (st) => { como("recepcao"); st.ag = exigir(O.salvarCompromisso({ tipo: "servico", ...faixa(diaUtil(-2), 0.1, 240), tecnicoId: "t3", box: "3", osId: st.os.id, observacoes: "Higienização e recarga." }), "agenda H8").compromisso; } },
          { t: em(-2, 0.95), rotulo: "agenda H8 ok", fn: (st) => { como("recepcao"); exigir(O.mudarCompromisso(st.ag.id, "realizado"), "agenda H8 realizada"); } },
          { t: em(-2, 0.9), rotulo: "obs H8", fn: (st) => { comoTec("t3"); exigir(O.editarOS(st.os.id, { observacoes: "Cliente pediu para avisar pelo WhatsApp quando ficar pronto. Teste de pressão refeito: aguardando estabilizar para liberar." }), "obs H8"); } },
        ],
      });

      // H9 — Onix: serviço finalizado hoje, aguardando retirada (ainda não faturado)
      const p9 = pac("freio");
      fixa({
        vid: "v2", tecnico: "t2", relato: p9.relatos[0], previsao: em(-1, 0.5), diag: p9.diag, itens: itensPacote(p9, "v2"),
        aprovador: "João Pedro Antunes", canal: "Telefone",
        t: { abrir: em(-3, 0.3), diag: em(-3, 0.38), diagFim: em(-3, 0.5), orc: em(-3, 0.55), aprov: em(-3, 0.75), exec: em(-2, 0.3), pronto: recente(0.1) },
        extras: [
          { t: em(-3, 0.8), rotulo: "agenda H9", fn: (st) => { como("recepcao"); st.ag = exigir(O.salvarCompromisso({ tipo: "servico", ...faixa(diaUtil(-2), 0.3, 120), tecnicoId: "t2", box: "2", osId: st.os.id, observacoes: "Freios dianteiros." }), "agenda H9").compromisso; } },
          { t: em(-2, 0.9), rotulo: "agenda H9 ok", fn: (st) => { como("recepcao"); exigir(O.mudarCompromisso(st.ag.id, "realizado"), "agenda H9 realizada"); } },
          { t: recente(0.12), rotulo: "agenda entrega H9", fn: (st) => { como("recepcao"); exigir(O.salvarCompromisso({ tipo: "entrega", ...faixaDepois(0.85, 30), osId: st.os.id, observacoes: "Cliente avisado por telefone que o carro está pronto." }), "agenda entrega H9"); } },
        ],
      });

      // H10 — Sandero: concluída e faturada; entrega marcada (pagamento na retirada)
      const p10 = pac("revisao");
      fixa({
        vid: "v11", tecnico: "t4", relato: p10.relatos[1], previsao: em(-1, 0.6), diag: p10.diag, itens: itensPacote(p10, "v11"),
        aprovador: "Patrícia Gomes", canal: "Presencial",
        t: { abrir: em(-2, 0.05), diag: em(-2, 0.12), diagFim: em(-2, 0.2), orc: em(-2, 0.3), aprov: em(-2, 0.4), exec: em(-2, 0.6), pronto: em(-1, 0.4), fatura: em(-1, 0.45) },
        extras: [{ t: em(-1, 0.5), rotulo: "agenda entrega", fn: (st) => { como("recepcao"); exigir(O.salvarCompromisso({ tipo: "entrega", ...faixaDepois(0.4, 30), osId: st.os.id, observacoes: "Cliente paga na retirada." }), "agenda entrega H10"); } }],
      });

      // H11 — Saveiro: orçamento recusado e ordem cancelada
      const p11 = pac("bateria");
      fixa({
        vid: "v14", tecnico: "t3", relato: p11.relatos[0], diag: p11.diag, itens: itensPacote(p11, "v14"),
        motivoRecusa: "Cliente vai comprar a bateria por conta própria.", motivoCancelamento: "Orçamento recusado; cliente retirou o veículo sem o serviço.",
        t: { abrir: em(-6, 0.2), diag: em(-6, 0.28), diagFim: em(-6, 0.4), orc: em(-6, 0.5), recusa: em(-5, 0.2), cancelar: em(-5, 0.25) },
      });

      // H12 — Fiorino (frota): troca de óleo feita e entregue hoje; boleto a receber
      const p12 = pac("oleo");
      fixa({
        vid: "v4", tecnico: "t4", relato: p12.relatos[0], previsao: recente(0.55), diag: p12.diag, itens: itensPacote(p12, "v4"),
        aprovador: "Ricardo Mendes (gestor da frota)", canal: "WhatsApp", retiradoPor: "Motorista da frota (Vale Verde)",
        t: { abrir: recente(0.02), diag: recente(0.06), diagFim: recente(0.12), orc: recente(0.16), aprov: recente(0.22), exec: recente(0.26), pronto: recente(0.48), fatura: recente(0.52), entrega: recente(0.6) },
        extras: [
          { t: em(-1, 0.48), rotulo: "agenda Fiorino", fn: (st) => { como("recepcao"); const a = recente(0.02); const b = recente(0.48); const ini = piso30(a); const fim = U.hhmm(Math.max(U.minutos(ini) + 30, Math.ceil(U.minutos(b.slice(11)) / 30) * 30)); st.ag = exigir(O.salvarCompromisso({ tipo: "servico", data: a.slice(0, 10), inicio: ini, fim, tecnicoId: "t4", box: "4", clienteId: "c3", veiculoId: "v4", observacoes: "Troca de óleo da frota (encaixe)." }), "agenda Fiorino").compromisso; } },
          { t: recente(0.5), rotulo: "agenda Fiorino ok", fn: (st) => { como("recepcao"); st.ag.osId = st.os.id; exigir(O.mudarCompromisso(st.ag.id, "realizado"), "agenda Fiorino realizada"); } },
        ],
      });

      /* ---------- Histórias passadas fixas ---------- */
      // Prisma: limpeza de bicos (serviço que depois foi desativado)
      const tBicos = em(-50, 0.1);
      passada({
        vid: "v16", tecnico: "t1", relato: "Marcha lenta irregular e consumo alto.", previsao: avancar(tBicos, 300),
        diag: "Bicos injetores com vazão irregular no teste de bancada; demais componentes da injeção normais.",
        itens: [{ tipo: "servico", refId: idServico["Diagnóstico eletrônico (scanner)"], quantidade: "1" }, { tipo: "servico", refId: idServico[SERVICO_INATIVO], quantidade: "1" }],
        aprovador: "Gustavo Nunes", canal: "Telefone", retiradoPor: "Gustavo Nunes", pagamentos: [{ t: avancar(tBicos, 390), forma: "Pix" }],
        t: { abrir: tBicos, diag: avancar(tBicos, 20), diagFim: avancar(tBicos, 80), orc: avancar(tBicos, 95), aprov: avancar(tBicos, 140), exec: avancar(tBicos, 160), pronto: avancar(tBicos, 330), fatura: avancar(tBicos, 345), entrega: avancar(tBicos, 390) },
      }, avancar(tBicos, 390));

      // Fit: duas visitas; na segunda, o hodômetro marca menos (quadro trocado) e isso fica justificado
      const tFit1 = em(-45, 0.2);
      passada({
        vid: "v3", tecnico: "t5", relato: PACOTES.oleo.relatos[1], diag: PACOTES.oleo.diag, itens: itensPacote(PACOTES.oleo, "v3"), aprovador: "João Pedro Antunes", canal: "Presencial", retiradoPor: "João Pedro Antunes",
        pagamentos: [{ t: avancar(tFit1, 150), forma: "Cartão de débito" }],
        t: { abrir: tFit1, diag: avancar(tFit1, 15), diagFim: avancar(tFit1, 40), orc: avancar(tFit1, 50), aprov: avancar(tFit1, 70), exec: avancar(tFit1, 80), pronto: avancar(tFit1, 120), fatura: avancar(tFit1, 130), entrega: avancar(tFit1, 150) },
      }, avancar(tFit1, 150));
      const tFit2 = em(-22, 0.3);
      passada({
        vid: "v3", tecnico: "t2", relato: PACOTES.alinhamento.relatos[0], diag: PACOTES.alinhamento.diag, itens: itensPacote(PACOTES.alinhamento, "v3"), aprovador: "João Pedro Antunes", canal: "WhatsApp", retiradoPor: "João Pedro Antunes",
        kmEntrada: (v) => v.km - 8400, justificativaKm: "Quadro de instrumentos substituído em outra oficina; o hodômetro novo marca menos que o original (informado pelo cliente).",
        pagamentos: [{ t: avancar(tFit2, 170), forma: "Pix" }],
        t: { abrir: tFit2, diag: avancar(tFit2, 20), diagFim: avancar(tFit2, 45), orc: avancar(tFit2, 55), aprov: avancar(tFit2, 80), exec: avancar(tFit2, 90), pronto: avancar(tFit2, 150), fatura: avancar(tFit2, 160), entrega: avancar(tFit2, 170) },
      }, avancar(tFit2, 170));

      // Ka: cliente antigo (João) e, depois da venda, o novo dono (Eduardo)
      const tKa1 = em(-58, 0.15);
      passada({
        vid: "v10", tecnico: "t4", relato: PACOTES.oleo.relatos[0], diag: PACOTES.oleo.diag, itens: itensPacote(PACOTES.oleo, "v10"), aprovador: "João Pedro Antunes", canal: "Presencial", retiradoPor: "João Pedro Antunes",
        pagamentos: [{ t: avancar(tKa1, 140), forma: "Dinheiro" }],
        t: { abrir: tKa1, diag: avancar(tKa1, 15), diagFim: avancar(tKa1, 40), orc: avancar(tKa1, 50), aprov: avancar(tKa1, 65), exec: avancar(tKa1, 75), pronto: avancar(tKa1, 115), fatura: avancar(tKa1, 125), entrega: avancar(tKa1, 140) },
      }, avancar(tKa1, 140));
      passo(em(-30, 0.3), "troca de dono", () => {
        como("recepcao");
        if (!L.cliente("c7")) {
          const c = CLIENTES.find((x) => x[0] === "c7");
          const res = exigir(L.salvarCliente({ nome: c[1], tipo: c[2], telefone: c[3], email: c[4], endereco: c[5], observacoes: "Comprou o Ka do João Pedro Antunes." }), "cliente c7");
          L.cliente(res.id).id = "c7";
        }
        const v = L.veiculo("v10");
        exigir(L.salvarVeiculo({ ...v, anoFab: String(v.anoFab), anoModelo: String(v.anoModelo), km: String(v.km), clienteId: "c7", observacoes: "Vendido por João Pedro Antunes para Eduardo Prado (informado pelos dois)." }, "v10"), "trocar dono do Ka");
      });
      const tKa2 = em(-28, 0.4);
      passada({
        vid: "v10", tecnico: "t2", relato: PACOTES.freio.relatos[1], diag: PACOTES.freio.diag, itens: itensPacote(PACOTES.freio, "v10"), aprovador: "Eduardo Prado", canal: "WhatsApp", retiradoPor: "Eduardo Prado",
        pagamentos: [{ t: avancar(tKa2, 300), forma: "Cartão de crédito" }], descontoPct: 0.05,
        t: { abrir: tKa2, diag: avancar(tKa2, 20), diagFim: avancar(tKa2, 50), orc: avancar(tKa2, 60), aprov: avancar(tKa2, 120), exec: avancar(tKa2, 140), pronto: avancar(tKa2, 240), fatura: avancar(tKa2, 250), entrega: avancar(tKa2, 300) },
      }, avancar(tKa2, 300));

      /* ---------- Histórico sorteado (ordens já entregues ou canceladas) ---------- */
      const pesos = Object.entries(PACOTES).flatMap(([id, p]) => Array(p.peso).fill(id));
      const limite = em(-4, 0.9);
      const fimSergio = em(-35, 0);
      const ultimaVez = {};                   // veículo → { pacote: momento }
      let estornoFeito = false;
      let parcialFeito = false;
      let descontoAdminFeito = false;
      let recusas = 0;
      for (let k = -68; k <= -7; k += 1) {
        let n = r() < 0.65 ? 1 : 0;
        if (n && r() < 0.3) n = 2;
        for (let i = 0; i < n; i += 1) {
          const t0 = em(k, sorteio([0.03, 0.08, 0.15, 0.22, 0.3, 0.4, 0.5]));
          const pid = sorteio(pesos);
          const p = PACOTES[pid];
          const t = { abrir: t0 };
          t.diag = avancar(t0, entre(10, 35));
          t.diagFim = avancar(t.diag, entre(20, 60));
          t.orc = avancar(t.diagFim, entre(5, 20));
          t.aprov = avancar(t.orc, r() < 0.75 ? entre(20, 120) : entre(150, 420));
          const recusar = recusas < 3 && k < -15 && r() < 0.08;
          if (recusar) {
            t.recusa = t.aprov; delete t.aprov;
            t.cancelar = avancar(t.recusa, entre(10, 40));
          } else {
            t.exec = avancar(t.aprov, entre(10, 90));
            t.pronto = avancar(t.exec, duracao(p) + entre(0, 60));
            t.fatura = avancar(t.pronto, entre(5, 25));
            t.entrega = avancar(t.fatura, r() < 0.6 ? entre(15, 120) : entre(200, 480));
          }
          const fim = t.entrega || t.cancelar;
          if (fim > limite) continue;
          const candidatos = VEICULOS.map((v) => v[0]).filter((vid) => !SEM_HISTORICO_SORTEADO.includes(vid)
            && (p.diesel !== false || !diesel(vid))
            && livre(vid, t0, fim)
            && (!ultimaVez[vid] || !ultimaVez[vid][pid] || U.diasEntre(ultimaVez[vid][pid].slice(0, 10), t0.slice(0, 10)) > (pid === "oleo" ? 40 : 75)));
          if (!candidatos.length) continue;
          const vid = sorteio(candidatos);
          const cid = defVeiculo(vid)[8];
          const pj = CLIENTES.find((c) => c[0] === cid)[2] === "pj";
          const tecnicos = EQUIPE.filter((m) => m[4].includes(p.cat) && (m[0] !== "t5" || fim < fimSergio));
          const tec = sorteio(tecnicos)[0];
          const h = {
            vid, tecnico: tec, relato: sorteio(p.relatos), diag: p.diag, itens: itensPacote(p, vid), previsao: t.pronto ? avancar(t.pronto, 30) : "",
            aprovador: pj ? APROVADORES_PJ[cid] : nomeCliente(cid),
            canal: sorteio(pj ? ["E-mail", "WhatsApp", "Telefone"] : ["Presencial", "WhatsApp", "WhatsApp", "Telefone"]),
            retiradoPor: pj ? "Motorista da empresa" : nomeCliente(cid), t,
          };
          if (r() < 0.45) h.t.agendaCriar = momento(diasUteisDepois(t0, -entre(1, 3)).slice(0, 10), 0.2 + r() * 0.6);
          if (h.t.agendaCriar && h.t.agendaCriar < avancar(inicio, 30)) delete h.t.agendaCriar;
          if (recusar) {
            recusas += 1;
            h.motivoRecusa = sorteio(["Cliente achou o valor alto.", "Cliente vai fazer o serviço mais para frente.", "Cliente preferiu levar a outra oficina."]);
            h.motivoCancelamento = "Orçamento recusado; veículo retirado sem o serviço.";
          } else if (pj) {
            const tPag = diasUteisDepois(t.entrega, entre(3, 8));
            if (!parcialFeito && k < -20) { parcialFeito = true; h.pagamentos = [{ t: tPag, forma: "Boleto", fracao: 0.5, obs: "Primeira parcela do boleto" }]; }
            else if (tPag <= AGORA) h.pagamentos = [{ t: tPag, forma: sorteio(["Boleto", "Boleto", "Transferência"]) }];
          } else {
            const forma = sorteio(["Pix", "Pix", "Pix", "Cartão de crédito", "Cartão de crédito", "Cartão de débito", "Dinheiro"]);
            h.pagamentos = [{ t: t.entrega, forma }];
            if (!estornoFeito && k > -40 && forma === "Cartão de crédito") { estornoFeito = true; h.pagamentos[0].estornar = "Forma de pagamento registrada errada: o cliente pagou no débito."; h.pagamentos[0].formaCorreta = "Cartão de débito"; }
          }
          if (!recusar && !descontoAdminFeito && k < -10 && ["revisao", "suspensao", "correia"].includes(pid)) { descontoAdminFeito = true; h.descontoPct = 0.15; h.descontoAdmin = true; h.obsOrc = "Desconto de cliente antigo autorizado pelo administrador."; }
          else if (!recusar && r() < 0.12) h.descontoPct = 0.05;
          ocupar(vid, h.t.agendaCriar || t0, fim);
          ultimaVez[vid] = { ...(ultimaVez[vid] || {}), [pid]: t0 };
          historiaOS(h);
        }
      }

      /* ---------- Orçamentos avulsos (sem ordem de serviço) ---------- */
      const avulso = (t, vid, itens, extra, rotulo) => {
        usar(vid, t);
        const st = {};
        passo(t, rotulo, () => {
          como("recepcao");
          const v = L.veiculo(vid);
          st.orc = exigir(O.salvarOrcamento({ clienteId: v.clienteId, veiculoId: vid, itens: itens.map(itemOrc), desconto: "", validadeDias: extra.validade ? String(extra.validade) : "", observacoes: extra.obs || "", enviar: extra.enviar !== false }), rotulo).orcamento;
        });
        return st;
      };
      // Prisma: correia, aguardando aprovação
      avulso(recente(0.5), "v16", itensPacote(PACOTES.correia, "v16"), { obs: "Pedido por telefone. Cliente vai confirmar a data." }, "orçamento Prisma");
      // Uno: alinhamento e balanceamento enviado há duas semanas, sem resposta (expirado)
      avulso(em(-14, 0.5), "v17", itensPacote(PACOTES.alinhamento, "v17"), { obs: "Cliente pediu o orçamento pelo WhatsApp." }, "orçamento Uno");
      // Ka: ar-condicionado recusado
      const q3 = avulso(em(-9, 0.4), "v10", itensPacote(PACOTES.arcondicionado, "v10"), { obs: "" }, "orçamento Ka");
      passo(em(-8, 0.3), "recusa Ka", () => { como("recepcao"); exigir(O.recusarOrcamento(q3.orc.id, { motivo: "Cliente achou o valor alto e vai avaliar." }), "recusa Ka"); });
      // Hilux: aprovado por telefone; a OS será aberta a partir dele quando o carro chegar
      const q4 = avulso(em(-2, 0.6), "v18", [...itensPacote(PACOTES.freio, "v18"), ...itensPacote(PACOTES.alinhamento, "v18")], { obs: "Cliente vai trazer a caminhonete no próximo dia útil." }, "orçamento Hilux");
      passo(em(-1, 0.3), "aprovar Hilux", () => { como("recepcao"); exigir(O.aprovarOrcamento(q4.orc.id, { por: "Henrique Lacerda", canal: "Telefone", observacao: "Aprovou por telefone; traz o carro amanhã cedo." }), "aprovar Hilux"); });
      passo(em(-1, 0.32), "agenda Hilux", () => { como("recepcao"); exigir(O.salvarCompromisso({ tipo: "recepcao", ...faixa(diaUtil(1), 0.05, 30), clienteId: "c9", veiculoId: "v18", observacoes: `Orçamento ${O.rotuloOrc(q4.orc)} já aprovado: abrir a OS a partir dele.` }), "agenda Hilux"); });
      // Fiorino: rascunho de revisão para a frota
      avulso(recente(0.7), "v4", itensPacote(PACOTES.revisao, "v4"), { obs: "Rascunho para o gestor da frota.", enviar: false }, "rascunho Fiorino");

      /* ---------- Agenda: faltas, cancelamentos, indisponibilidades e próximos dias ---------- */
      const agendar = (tCriar, dados, rotulo, depois) => {
        if (dados.veiculoId) usar(dados.veiculoId, tCriar);
        const st = {};
        passo(tCriar, rotulo, () => { como("recepcao"); st.c = exigir(O.salvarCompromisso(dados), rotulo).compromisso; });
        if (depois) passo(depois.t, `${rotulo} (situação)`, () => { como("recepcao"); exigir(O.mudarCompromisso(st.c.id, depois.status, depois.motivo), `${rotulo} (situação)`); });
      };
      agendar(em(-14, 0.4), { tipo: "recepcao", ...faixa(diaUtil(-12), 0.3, 30), clienteId: "c5", veiculoId: "v8", observacoes: "Revisão dos freios." }, "falta", { t: em(-12, 0.45), status: "nao_compareceu" });
      agendar(em(-22, 0.5), { tipo: "recepcao", ...faixa(diaUtil(-20), 0.5, 30), clienteId: "c4", veiculoId: "v7", observacoes: "Troca de óleo." }, "cancelado", { t: em(-21, 0.3), status: "cancelado", motivo: "Cliente pediu para remarcar." });
      agendar(em(-30, 0.5), { tipo: "indisponivel", ...faixa(diaUtil(-25), 0, 240), tecnicoId: "t3", observacoes: "Curso de atualização em injeção eletrônica (externo)." }, "curso");
      agendar(em(-1, 0.52), { tipo: "avaliacao", ...faixa(diaUtil(1), 0.5, 60), tecnicoId: "t3", box: "3", clienteId: "c3", veiculoId: "v6", observacoes: "Ruído no motor de partida." }, "avaliação Strada");
      agendar(em(-1, 0.55), { tipo: "avaliacao", ...faixaDepois(0.7, 60), tecnicoId: "t4", box: "4", clienteId: "c2", veiculoId: "v3", observacoes: "Barulho no escapamento." }, "avaliação Fit");
      agendar(em(-2, 0.4), { tipo: "recepcao", ...faixa(diaUtil(2), 0.1, 30), clienteId: "c6", veiculoId: "v17", observacoes: "Revisão preventiva." }, "recepção Uno");
      agendar(em(-2, 0.42), { tipo: "servico", ...faixa(diaUtil(2), 0.15, 180), tecnicoId: "t4", box: "4", clienteId: "c6", veiculoId: "v17", observacoes: "Reserva do box para a revisão do Uno." }, "box Uno");
      agendar(em(-6, 0.5), { tipo: "indisponivel", ...faixa(diaUtil(3), 0, 240), tecnicoId: "t3", observacoes: "Curso de climatização automotiva (externo)." }, "curso 2");
      agendar(recente(0.55), { tipo: "recepcao", ...faixa(diaUtil(4), 0.3, 30), clienteId: "c12", veiculoId: "v16", observacoes: "Correia dentada, se o orçamento for aprovado." }, "recepção Prisma");
      agendar(em(-8, 0.5), { tipo: "indisponivel", ...faixa(diaUtil(5), 0, 600), tecnicoId: "t2", observacoes: "Folga (banco de horas)." }, "folga");

      /* ---------- Estoque: reposições, inventário, saídas e itens desativados ---------- */
      for (let k = -64; k <= -10; k += 6) reposicao(em(k, 0.02));
      passo(em(-33, 0.6), "uso interno", () => { como("admin"); exigir(O.registrarSaida({ pecaId: "ELE-LAM-H4", quantidade: "2", motivo: "Uso interno da oficina", observacao: "Troca das lâmpadas do carro de apoio da oficina." }), "uso interno"); });
      passo(em(-26, 0.2), "devolução", () => {
        como("admin");
        exigir(O.registrarSaida({ pecaId: "LIM-PAL-01", quantidade: String(O.saldo("LIM-PAL-01")), motivo: "Devolução ao fornecedor", observacao: "Linha descontinuada: palhetas devolvidas ao fornecedor." }), "devolução palhetas");
        exigir(L.alternarPeca("LIM-PAL-01"), "desativar palheta");
      });
      passo(em(-20, 0.01), "inventário", () => {
        como("admin");
        exigir(O.registrarAjuste({ pecaId: "PNE-VAL-01", contada: String(O.saldo("PNE-VAL-01") - 3), motivo: "Inventário (contagem)", observacao: "Contagem mensal: 3 válvulas a menos que o registrado." }), "inventário válvulas");
        exigir(O.registrarAjuste({ pecaId: "FIL-OLE-01", contada: String(O.saldo("FIL-OLE-01") + 1), motivo: "Peça encontrada", observacao: "1 filtro encontrado no armário do box 3." }), "inventário filtro");
      });
      passo(em(-15, 0.7), "avaria", () => { como("admin"); exigir(O.registrarSaida({ pecaId: "ELE-LAM-H4", quantidade: "1", motivo: "Avaria ou descarte", observacao: "Lâmpada quebrada ao abrir a caixa." }), "avaria"); });
      passo(em(-35, 0.01), "desligamento", () => { como("admin"); exigir(L.alternarMembro("t5"), "desativar Sérgio"); });
      passo(em(-30, 0.01), "serviço desativado", () => { como("admin"); exigir(L.alternarServico(idServico[SERVICO_INATIVO]), "desativar serviço"); });
      passo(em(-40, 0.01), "fornecedor desativado", () => { como("admin"); exigir(L.alternarFornecedor("f5"), "desativar fornecedor"); });

      /* ---------- Despesas fixas e avulsas ---------- */
      const CONTAS = [[5, "Aluguel do galpão", "Aluguel", () => 1800], [10, "Contabilidade (honorários)", "Serviços de terceiros", () => 380], [12, "Energia elétrica e água", "Energia e água", () => 520 + entre(0, 140)], [15, "Internet e telefone", "Outras", () => 149.9]];
      for (let mes = U.inicioDoMes(inicioDia); mes <= HOJE; mes = U.somarMeses(mes, 1)) {
        const ref = mes;
        const contas = [...CONTAS, [20, "Simples Nacional (DAS)", "Impostos e taxas", () => {
          const ant = U.somarMeses(ref, -1);
          const fat = O.resumoFinanceiro(ant, U.fimDoMes(ant)).faturado;
          return fat > 0 ? U.arredondar(fat * 0.06) : 380;
        }]];
        contas.forEach(([diaMes, descricao, categoria, valor]) => {
          const data = `${ref.slice(0, 8)}${String(diaMes).padStart(2, "0")}`;
          if (data < inicioDia) return;
          const paga = data <= HOJE;
          let t = paga ? `${data}T09:00` : (`${ref}T08:00` < inicio ? inicio : `${ref}T08:00`);
          if (t > AGORA) t = AGORA;
          passo(t, `conta ${descricao}`, () => { como("financeiro"); exigir(O.salvarDespesa({ descricao, categoria, valor: String(valor()), data, pago: paga, pagoEm: paga ? data : "" }), `conta ${descricao}`); });
        });
      }
      passo(em(-40, 0.5), "ferramentas", () => { como("financeiro"); exigir(O.salvarDespesa({ descricao: "Torquímetro e jogo de soquetes", categoria: "Ferramentas e equipamentos", valor: "690", data: U.hoje(), pago: true, pagoEm: U.hoje() }), "ferramentas"); });
      passo(em(-18, 0.5), "elevador", () => { como("financeiro"); exigir(O.salvarDespesa({ descricao: "Manutenção do elevador automotivo do box 2", categoria: "Serviços de terceiros", valor: "480", data: U.hoje(), pago: true, pagoEm: U.hoje() }), "elevador"); });
      passo(em(-10, 0.5), "duplicada", () => {
        como("financeiro");
        const conta = D.despesas.filter((x) => x.categoria === "Energia e água").sort((a, b) => b.data.localeCompare(a.data))[0];
        const res = exigir(O.salvarDespesa({ descricao: conta.descricao, categoria: conta.categoria, valor: String(conta.valor), data: conta.data, pago: false }), "despesa duplicada");
        exigir(O.cancelarDespesa(res.id, "Lançada em duplicidade."), "cancelar duplicada");
      });
    }

    /* ---------- Cadastros na primeira aparição ---------- */
    const semUso = VEICULOS.map((v) => v[0]).filter((vid) => !primeiroUso[vid]);
    Object.entries(primeiroUso).forEach(([vid, t]) => {
      let tc = deslocar(t, -5);
      if (tc <= inicio) tc = inicio;
      passo(tc, `cadastro ${vid}`, () => { como("recepcao"); if (!L.veiculo(vid)) cadastrarVeiculo(vid); });
    });
    passo(inicio, "cadastros sem uso", () => { como("recepcao"); semUso.forEach((vid) => cadastrarVeiculo(vid)); });

    /* ---------- Executa tudo em ordem ---------- */
    passos.sort((a, b) => (a.t < b.t ? -1 : a.t > b.t ? 1 : a.seq - b.seq));
    passos.forEach((p) => {
      if (p.t > AGORA) throw new Error(`Gerador: passo no futuro (${p.rotulo} em ${p.t})`);
      U.simularRelogio(p.t);
      p.fn();
    });
    U.simularRelogio(null);

    /* ---------- Acabamento ---------- */
    const ontem = deslocar(AGORA, -1440);
    D.notificacoes.forEach((n) => { if (n.em < ontem) n.lida = true; });
    ["clientes", "veiculos", "servicos", "pecas", "fornecedores", "equipe", "ordens", "orcamentos", "agenda", "despesas", "movimentos"].forEach((lista) => D[lista].forEach((x) => { x.ficticio = true; }));
    D.perfil = { papel: "admin", nome: "Renato Alves", cargo: "Administrador" };
    D.demo = { historico: !soCadastros, geradoEm: AGORA };
    D.revisao = 1;
  }
})();
