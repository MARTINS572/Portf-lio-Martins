/* ==========================================================================
   NEXORA CRM — dados.js
   Listas fixas do sistema e os DADOS DE DEMONSTRAÇÃO.
   Tudo aqui é fictício: empresas, pessoas, e-mails (domínio .exemplo) e
   telefones (final 5555) foram inventados para a demonstração.
   As datas são criadas em volta do dia de hoje, para os gráficos e as
   tarefas sempre parecerem atuais.
   ========================================================================== */
window.NX = window.NX || {};

(function () {
  "use strict";

  /* ---------- Listas do sistema (edite aqui) ---------- */
  NX.ETAPAS = [
    { id: "novo", nome: "Novo lead" },
    { id: "contato", nome: "Primeiro contato" },
    { id: "reuniao", nome: "Reunião agendada" },
    { id: "proposta", nome: "Proposta enviada" },
    { id: "negociacao", nome: "Negociação" },
    { id: "ganho", nome: "Venda concluída" },
    { id: "perdido", nome: "Venda perdida" },
  ];
  NX.ETAPAS_ABERTAS = ["novo", "contato", "reuniao", "proposta", "negociacao"];
  NX.STATUS_LEAD = ["Novo", "Em contato", "Qualificado", "Convertido", "Descartado"];
  NX.ORIGENS = ["Site", "Indicação", "Instagram", "Google", "LinkedIn", "Evento", "WhatsApp"];
  NX.SERVICOS = ["Site institucional", "Loja virtual", "Sistema de agendamento", "Gestão de redes sociais", "Identidade visual", "Tráfego pago", "Manutenção mensal", "Consultoria de marketing"];
  NX.CATEGORIAS = ["Alimentação", "Saúde", "Varejo", "Serviços", "Educação", "Indústria", "Beleza e bem-estar", "Imobiliário"];
  NX.STATUS_CLIENTE = ["Ativo", "Inativo"];
  NX.PRIORIDADES = ["Alta", "Média", "Baixa"];
  NX.MOTIVOS_PERDA = ["Preço acima do orçamento", "Escolheu um concorrente", "Projeto adiado", "Sem resposta", "Outro"];
  NX.TIPOS_CONTATO = ["Ligação", "E-mail", "Reunião", "WhatsApp", "Visita"];

  const EQUIPE = [
    { id: "u1", nome: "Camila Rocha", cargo: "Gerente comercial" },
    { id: "u2", nome: "Rafael Mendes", cargo: "Executivo de contas" },
    { id: "u3", nome: "Beatriz Nogueira", cargo: "Executiva de contas" },
    { id: "u4", nome: "Thiago Prado", cargo: "Pré-vendas" },
  ];

  const EMPRESAS = [
    ["Padaria Trigo de Ouro", "Alimentação"], ["Clínica Vitta Bem-Estar", "Saúde"], ["Construtora Alicerce Forte", "Indústria"],
    ["Ótica Visão Clara", "Varejo"], ["Escola Pequeno Saber", "Educação"], ["Transportes Rota Sul", "Serviços"],
    ["Studio Equilíbrio Pilates", "Beleza e bem-estar"], ["Agro Campo Verde", "Indústria"], ["Café Serra Alta", "Alimentação"],
    ["Contabilidade Exata", "Serviços"], ["Pet Shop Amigo Fiel", "Varejo"], ["Academia Movimento Livre", "Beleza e bem-estar"],
    ["Imobiliária Lar Ideal", "Imobiliário"], ["Floricultura Jardim Secreto", "Varejo"], ["Auto Peças Pistão", "Varejo"],
    ["Odonto Sorriso Leve", "Saúde"], ["Gráfica Prisma", "Indústria"], ["Restaurante Sabor Mineiro", "Alimentação"],
    ["Marcenaria Veio Nobre", "Indústria"], ["Laboratório BioAnálise", "Saúde"], ["Ateliê Linho & Algodão", "Varejo"],
    ["Coworking Sinapse", "Serviços"], ["Consultoria Norte Estratégia", "Serviços"], ["Pousada Maré Alta", "Serviços"],
    ["Distribuidora Água Pura", "Indústria"], ["Escola de Idiomas Ponte", "Educação"], ["Barbearia Navalha de Ouro", "Beleza e bem-estar"],
    ["Clínica Veterinária Patas", "Saúde"], ["Empório Grão Integral", "Alimentação"], ["Loteadora Horizonte Azul", "Imobiliário"],
    ["Espaço Kids Brincar", "Educação"], ["Hamburgueria Brasa 22", "Alimentação"], ["Lavanderia Bolha Limpa", "Serviços"],
    ["Fisioterapia Movimento", "Saúde"], ["Móveis Casa Firme", "Varejo"], ["Estúdio Fotográfico Lume", "Serviços"],
    ["Corretora Seguro Certo", "Serviços"], ["Doceria Açúcar Mascavo", "Alimentação"], ["Centro Automotivo Torque", "Serviços"],
    ["Instituto Aprender Mais", "Educação"], ["Salão Beleza Rara", "Beleza e bem-estar"], ["Engenharia Traço Fino", "Indústria"],
    ["Vidraçaria Cristal", "Indústria"], ["Hotel Fazenda Recanto", "Serviços"], ["Papelaria Ponto e Vírgula", "Varejo"],
    ["Clínica de Estética Aura", "Beleza e bem-estar"], ["Mercearia Dona Lurdes", "Alimentação"], ["Tecelagem Fio Nobre", "Indústria"],
  ];
  const NOMES = ["Ana", "Bruno", "Carla", "Daniel", "Eduarda", "Felipe", "Gabriela", "Henrique", "Isabela", "João", "Larissa", "Marcos", "Natália", "Otávio", "Paula", "Ricardo", "Sabrina", "Tiago", "Vanessa", "William", "Juliana", "Gustavo", "Letícia", "Fernando", "Mariana", "Lucas", "Patrícia", "Rodrigo", "Aline", "Sérgio", "Renata", "Diego", "Priscila", "André", "Cláudia", "Vitor", "Helena", "Márcio"];
  const SOBRENOMES = ["Almeida", "Barbosa", "Cardoso", "Duarte", "Esteves", "Fonseca", "Gomes", "Herrera", "Lacerda", "Machado", "Nascimento", "Oliveira", "Pacheco", "Queiroz", "Ribeiro", "Santana", "Teixeira", "Vasconcelos", "Moreira", "Freitas", "Campos", "Rezende", "Lopes", "Martins", "Siqueira", "Toledo", "Brandão", "Coelho"];
  const DDDS = ["11", "19", "21", "31", "41", "48", "51", "61", "62", "71", "81", "85"];

  // Faixa de valor de cada serviço (R$)
  const FAIXA = {
    "Site institucional": [3500, 8500], "Loja virtual": [9000, 24000], "Sistema de agendamento": [6000, 15000],
    "Gestão de redes sociais": [4800, 12000], "Identidade visual": [2500, 6500], "Tráfego pago": [3000, 9000],
    "Manutenção mensal": [1800, 4800], "Consultoria de marketing": [5000, 16000],
  };

  /* ---------- Gerador com semente: os dados saem sempre iguais ---------- */
  function criarSorteio(semente) {
    let a = semente >>> 0;
    const proximo = () => {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    return {
      numero: proximo,
      inteiro: (min, max) => min + Math.floor(proximo() * (max - min + 1)),
      item: (lista) => lista[Math.floor(proximo() * lista.length)],
      chance: (p) => proximo() < p,
    };
  }

  const slug = (t) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/&/g, "e").replace(/[^a-z0-9]+/g, "");

  NX.criarDadosDemo = function criarDadosDemo() {
    const s = criarSorteio(20261011);
    const U = NX.util;
    const hoje = U.hoje();
    const dia = (n) => U.somarDias(hoje, n);   // n negativo = passado
    const nomesUsados = new Set();
    let seq = 0;
    const id = (p) => `${p}${(++seq).toString(36)}`;

    function pessoa(empresa) {
      let nome;
      do { nome = `${s.item(NOMES)} ${s.item(SOBRENOMES)}`; } while (nomesUsados.has(nome));
      nomesUsados.add(nome);
      const [primeiro, ...resto] = U.semAcento(nome).split(" ");
      return {
        nome,
        email: `${primeiro}.${resto.pop()}@${slug(empresa)}.exemplo`,
        telefone: `(${s.item(DDDS)}) 95555-${String(s.inteiro(1000, 9999))}`,
      };
    }
    const valorDe = (servico) => { const [a, b] = FAIXA[servico]; return Math.round(s.inteiro(a, b) / 50) * 50; };
    const responsavel = () => s.item(["u1", "u2", "u2", "u3", "u3", "u4"]);

    const empresas = EMPRESAS.map(([nome, categoria]) => ({ nome, categoria }));
    const leads = [];
    const clientes = [];
    const negocios = [];
    const tarefas = [];
    const atividades = [];

    /* ----- Clientes (empresas 0–25), cada um veio de um lead convertido ----- */
    for (let i = 0; i < 26; i++) {
      const emp = empresas[i];
      const p = pessoa(emp.nome);
      // A maior parte virou cliente há mais tempo; alguns, nos últimos meses
      const cadastro = i < 18 ? dia(-s.inteiro(190, 420)) : dia(-s.inteiro(12, 170));
      const resp = responsavel();
      const lead = {
        id: id("l"), nome: p.nome, empresa: emp.nome, email: p.email, telefone: p.telefone,
        origem: s.item(NX.ORIGENS), interesse: s.item(NX.SERVICOS), valor: 0, responsavelId: resp,
        primeiroContato: U.somarDias(cadastro, -s.inteiro(5, 25)), status: "Convertido", observacoes: "Convertido em cliente.",
      };
      lead.valor = valorDe(lead.interesse);
      const cliente = {
        id: id("c"), nome: p.nome, empresa: emp.nome, telefone: p.telefone, email: p.email, categoria: emp.categoria,
        cadastro, status: i % 7 === 6 ? "Inativo" : "Ativo", responsavelId: resp, leadId: lead.id,
        contatos: [], observacoes: [],
      };
      lead.clienteId = cliente.id;
      // Histórico de contatos
      const qtd = s.inteiro(2, 5);
      for (let k = 0; k < qtd; k++) {
        const tipo = s.item(NX.TIPOS_CONTATO);
        const resumos = {
          "Ligação": ["Alinhamos o cronograma da próxima etapa.", "Cliente pediu ajuste no orçamento.", "Retorno sobre a entrega: tudo certo."],
          "E-mail": ["Enviado o relatório mensal.", "Mandamos a proposta revisada.", "Cliente aprovou o layout por e-mail."],
          "Reunião": ["Reunião de alinhamento com a equipe do cliente.", "Apresentação dos resultados do trimestre.", "Reunião para entender novas necessidades."],
          "WhatsApp": ["Confirmou o horário da reunião.", "Enviou fotos novas para o site.", "Perguntou sobre o plano de manutenção."],
          "Visita": ["Visita para fotografar o espaço.", "Visita técnica para levantar requisitos."],
        }[tipo];
        cliente.contatos.push({ id: id("h"), data: dia(-s.inteiro(2, U.diasEntre(cadastro, hoje))), tipo, resumo: s.item(resumos), autorId: resp });
      }
      cliente.contatos.sort((a, b) => b.data.localeCompare(a.data));
      if (s.chance(0.6)) cliente.observacoes.push({ id: id("o"), data: dia(-s.inteiro(5, 120)), texto: s.item(["Prefere contato por WhatsApp pela manhã.", "Decisões passam pelo sócio, que só participa às sextas.", "Tem interesse em ampliar o contrato no próximo semestre.", "Pagamento sempre em dia."]), autorId: resp });
      leads.push(lead);
      clientes.push(cliente);
    }

    /* ----- Vendas ganhas e perdidas nos últimos 6 meses (para os gráficos) ----- */
    const inicioMesAtual = U.inicioDoMes(hoje);
    for (let m = 5; m >= 0; m--) {
      const iniMes = U.somarMeses(inicioMesAtual, -m);
      const fimMes = m === 0 ? U.somarDias(hoje, -1) : U.fimDoMes(iniMes);
      const diasNoPeriodo = Math.max(1, U.diasEntre(iniMes, fimMes) + 1);
      const ganhas = m === 0 ? Math.max(2, Math.round(diasNoPeriodo / 5)) : s.inteiro(5, 8);
      const perdidas = m === 0 ? 1 : s.inteiro(3, 5);
      for (let k = 0; k < ganhas + perdidas; k++) {
        const ganhou = k < ganhas;
        const cli = s.item(clientes.filter((c) => c.cadastro <= fimMes));
        if (!cli) continue;
        const fechado = U.somarDias(iniMes, s.inteiro(0, diasNoPeriodo - 1));
        const servico = s.item(NX.SERVICOS);
        negocios.push({
          id: id("n"), titulo: servico, clienteId: cli.id, leadId: null, contato: cli.nome, empresa: cli.empresa,
          valor: valorDe(servico), responsavelId: s.chance(0.5) ? cli.responsavelId : responsavel(),
          etapa: ganhou ? "ganho" : "perdido", criadoEm: U.somarDias(fechado, -s.inteiro(10, 45)),
          ultimaInteracao: fechado, fechadoEm: fechado, motivoPerda: ganhou ? null : s.item(NX.MOTIVOS_PERDA),
        });
      }
    }

    /* ----- Leads em andamento (empresas 26 em diante) ----- */
    const statusAbertos = ["Novo", "Novo", "Em contato", "Em contato", "Qualificado", "Qualificado", "Descartado"];
    for (let i = 26; i < empresas.length; i++) {
      const emp = empresas[i];
      const p = pessoa(emp.nome);
      const status = statusAbertos[(i - 26) % statusAbertos.length];
      const interesse = s.item(NX.SERVICOS);
      const primeiro = status === "Novo" ? dia(-s.inteiro(0, 12)) : dia(-s.inteiro(8, 75));
      const lead = {
        id: id("l"), nome: p.nome, empresa: emp.nome, email: p.email, telefone: p.telefone,
        origem: s.item(NX.ORIGENS), interesse, valor: valorDe(interesse), responsavelId: responsavel(),
        primeiroContato: primeiro, status, clienteId: null,
        observacoes: {
          "Novo": s.item(["Preencheu o formulário do site pedindo orçamento.", "Mandou mensagem pelo Instagram.", "Indicado por um cliente atual."]),
          "Em contato": s.item(["Primeira ligação feita; pediu exemplos de trabalhos.", "Respondeu o e-mail, quer conversar na próxima semana."]),
          "Qualificado": s.item(["Tem orçamento aprovado para este trimestre.", "Decisor identificado; quer começar no próximo mês."]),
          "Descartado": s.item(["Sem orçamento neste ano.", "Procurava apenas um serviço que não oferecemos."]),
        }[status],
      };
      leads.push(lead);
    }
    // Mais alguns leads novos e em contato, de empresas que já são clientes de outra área
    const extras = [["Novo", 1], ["Em contato", 3], ["Qualificado", 5], ["Novo", 2]];
    extras.forEach(([status, dias]) => {
      const emp = s.item(empresas.slice(0, 26));
      const p = pessoa(emp.nome);
      const interesse = s.item(NX.SERVICOS);
      leads.push({ id: id("l"), nome: p.nome, empresa: emp.nome, email: p.email, telefone: p.telefone, origem: s.item(NX.ORIGENS), interesse, valor: valorDe(interesse), responsavelId: responsavel(), primeiroContato: dia(-dias), status, clienteId: null, observacoes: "Outro setor da mesma empresa." });
    });

    /* ----- Oportunidades abertas no pipeline ----- */
    const etapaDoLead = { "Novo": ["novo"], "Em contato": ["contato", "reuniao"], "Qualificado": ["reuniao", "proposta", "negociacao"] };
    leads.filter((l) => etapaDoLead[l.status]).forEach((l) => {
      const etapa = s.item(etapaDoLead[l.status]);
      negocios.push({
        id: id("n"), titulo: l.interesse, clienteId: null, leadId: l.id, contato: l.nome, empresa: l.empresa,
        valor: l.valor, responsavelId: l.responsavelId, etapa, criadoEm: l.primeiroContato,
        ultimaInteracao: U.somarDias(hoje, -Math.min(U.diasEntre(l.primeiroContato, hoje), s.inteiro(0, 18))), fechadoEm: null, motivoPerda: null,
      });
    });
    // Novos negócios com clientes atuais (venda adicional)
    clientes.filter((c) => c.status === "Ativo").slice(0, 7).forEach((c) => {
      const servico = s.item(["Manutenção mensal", "Tráfego pago", "Gestão de redes sociais", "Loja virtual"]);
      negocios.push({
        id: id("n"), titulo: servico, clienteId: c.id, leadId: null, contato: c.nome, empresa: c.empresa,
        valor: valorDe(servico), responsavelId: c.responsavelId, etapa: s.item(["contato", "reuniao", "proposta", "negociacao"]),
        criadoEm: dia(-s.inteiro(5, 40)), ultimaInteracao: dia(-s.inteiro(0, 21)), fechadoEm: null, motivoPerda: null,
      });
    });

    /* ----- Tarefas (atrasadas, de hoje, próximas e concluídas) ----- */
    const modelos = [
      ["Ligar para confirmar a reunião", "Confirmar horário e participantes."],
      ["Enviar proposta revisada", "Ajustar escopo conforme a última conversa."],
      ["Follow-up da proposta", "Perguntar se ficou alguma dúvida."],
      ["Agendar apresentação do projeto", "Mostrar o layout e o cronograma."],
      ["Enviar contrato para assinatura", "Conferir dados de faturamento antes."],
      ["Pedir avaliação do site entregue", "Saber se a equipe está usando o painel."],
      ["Oferecer renovação do plano", "Plano atual vence no fim do mês."],
      ["Mandar exemplos de trabalhos", "Separar três projetos do mesmo segmento."],
      ["Retornar mensagem do WhatsApp", "Cliente pediu orçamento de manutenção."],
      ["Preparar relatório mensal", "Resultados de tráfego e redes sociais."],
    ];
    const prazos = [-9, -6, -4, -2, -1, 0, 0, 0, 1, 1, 2, 3, 4, 5, 7, 9, 12, 15, -12, -10, -8, -7, -5, -3, -2, -1, 6, 10];
    prazos.forEach((p, i) => {
      const concluida = i >= 18 || (p < 0 && i % 5 === 0);
      const vinculoCliente = s.chance(0.55);
      const alvo = vinculoCliente ? s.item(clientes.filter((c) => c.status === "Ativo")) : s.item(leads.filter((l) => !["Convertido", "Descartado"].includes(l.status)));
      const [titulo, descricao] = modelos[i % modelos.length];
      tarefas.push({
        id: id("t"), titulo, descricao, prazo: dia(p), prioridade: s.item(["Alta", "Média", "Média", "Baixa"]),
        responsavelId: i % 3 === 0 ? "u1" : responsavel(), vinculo: { tipo: vinculoCliente ? "cliente" : "lead", id: alvo.id },
        concluida, concluidaEm: concluida ? (p < 0 ? dia(p + s.inteiro(0, 1)) : dia(-s.inteiro(0, 3))) : null, criadaEm: dia(p - s.inteiro(3, 10)),
      });
    });

    /* ----- Atividades recentes ----- */
    const nomeEtapa = (e) => NX.ETAPAS.find((x) => x.id === e).nome;
    negocios.filter((n) => n.fechadoEm && U.diasEntre(n.fechadoEm, hoje) <= 20).forEach((n) => {
      atividades.push({ id: id("a"), data: `${n.fechadoEm}T${String(s.inteiro(9, 17)).padStart(2, "0")}:${String(s.inteiro(0, 59)).padStart(2, "0")}`, tipo: n.etapa === "ganho" ? "ganho" : "perdido", texto: n.etapa === "ganho" ? `Venda concluída: ${n.titulo} para ${n.empresa}` : `Venda perdida: ${n.titulo} (${n.motivoPerda})`, autorId: n.responsavelId, ref: { tipo: "negocio", id: n.id } });
    });
    negocios.filter((n) => !n.fechadoEm && U.diasEntre(n.ultimaInteracao, hoje) <= 6).forEach((n) => {
      atividades.push({ id: id("a"), data: `${n.ultimaInteracao}T${String(s.inteiro(9, 17)).padStart(2, "0")}:${String(s.inteiro(0, 59)).padStart(2, "0")}`, tipo: "movido", texto: `${n.empresa} foi para "${nomeEtapa(n.etapa)}"`, autorId: n.responsavelId, ref: { tipo: "negocio", id: n.id } });
    });
    leads.filter((l) => l.status === "Novo").forEach((l) => {
      atividades.push({ id: id("a"), data: `${l.primeiroContato}T${String(s.inteiro(8, 18)).padStart(2, "0")}:${String(s.inteiro(0, 59)).padStart(2, "0")}`, tipo: "lead", texto: `Novo lead: ${l.nome} (${l.empresa}) via ${l.origem}`, autorId: l.responsavelId, ref: { tipo: "lead", id: l.id } });
    });
    tarefas.filter((t) => t.concluida && U.diasEntre(t.concluidaEm, hoje) <= 7).forEach((t) => {
      atividades.push({ id: id("a"), data: `${t.concluidaEm}T${String(s.inteiro(9, 18)).padStart(2, "0")}:${String(s.inteiro(0, 59)).padStart(2, "0")}`, tipo: "tarefa", texto: `Tarefa concluída: ${t.titulo}`, autorId: t.responsavelId, ref: { tipo: "tarefa", id: t.id } });
    });
    atividades.sort((a, b) => b.data.localeCompare(a.data));

    return {
      versao: 1,
      criadoEm: hoje,
      empresa: "Atlas Digital",
      metaMensal: 60000,
      perfil: { id: "u1", nome: "Camila Rocha", cargo: "Gerente comercial", email: "camila.rocha@atlasdigital.exemplo" },
      equipe: EQUIPE.map((u) => ({ ...u })),
      leads, clientes, negocios, tarefas,
      atividades: atividades.slice(0, 40),
      notificacoesLidas: [],
      seq,
    };
  };
})();
