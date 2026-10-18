/* ==========================================================================
   NEXORA BOOKING — dados.js
   Listas fixas do sistema e os dados de DEMONSTRAÇÃO (tudo fictício).

   O estabelecimento, os profissionais, os clientes e os preços são
   inventados. Os e-mails usam o domínio ".exemplo" (não existe na
   internet) e os clientes de exemplo são marcados como fictícios: o sistema
   nunca abre o WhatsApp para os números deles.

   As reservas são simuladas dia a dia (60 dias para trás e 3 semanas para
   frente, a partir do dia em que o sistema é aberto) usando o MESMO motor
   de disponibilidade das reservas reais, então nenhuma delas fura o
   expediente, as pausas, as folgas, os feriados ou os bloqueios.
   ========================================================================== */
window.NX = window.NX || {};

(function () {
  "use strict";
  const U = NX.util;

  /* ---------- Listas fixas ---------- */
  NX.STATUS = [
    { id: "pendente", nome: "Pendente", icone: "hourglass" },
    { id: "confirmado", nome: "Confirmado", icone: "circle-check" },
    { id: "em_atendimento", nome: "Em atendimento", icone: "user-check" },
    { id: "concluido", nome: "Concluído", icone: "check-check" },
    { id: "cancelado", nome: "Cancelado", icone: "circle-x" },
    { id: "nao_compareceu", nome: "Não compareceu", icone: "user-x" },
  ];
  NX.FORMAS_PAGAMENTO = ["Pix", "Dinheiro", "Cartão de débito", "Cartão de crédito"];
  NX.MOTIVOS_CANCELAMENTO = ["Pedido do cliente", "Imprevisto do profissional", "Erro de agendamento", "Estabelecimento fechado", "Outro"];
  NX.DIAS = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
  NX.DIAS_CURTOS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  NX.FUSOS = [
    ["America/Sao_Paulo", "Horário de Brasília (SP, RJ, MG, Sul, Nordeste, GO, DF…)"],
    ["America/Manaus", "Amazonas, Roraima, Rondônia (Brasília − 1h)"],
    ["America/Cuiaba", "Mato Grosso e Mato Grosso do Sul (Brasília − 1h)"],
    ["America/Rio_Branco", "Acre (Brasília − 2h)"],
    ["America/Noronha", "Fernando de Noronha (Brasília + 1h)"],
  ];
  // Cores da página pública (texto branco sobre elas com contraste acima de 5:1)
  NX.CORES_PAGINA = [
    { id: "violeta", nome: "Violeta", cor: "#5A35D8", forte: "#4826B8" },
    { id: "vinho", nome: "Vinho", cor: "#8E2C5A", forte: "#73203F" },
    { id: "verde", nome: "Verde", cor: "#17795A", forte: "#0F5E45" },
    { id: "azul", nome: "Azul", cor: "#2659C9", forte: "#1C46A6" },
    { id: "grafite", nome: "Grafite", cor: "#2A2D35", forte: "#15171C" },
  ];
  NX.MODELOS_PADRAO = {
    novo: "Olá, {cliente}! Recebemos sua solicitação de {servico} com {profissional} para {data} às {hora}. Código: {codigo}. Assim que confirmarmos, avisamos você. {estabelecimento}",
    confirmado: "Olá, {cliente}! Seu horário de {servico} com {profissional} está confirmado para {data} às {hora}. Código: {codigo}. Até lá! {estabelecimento}",
    reagendado: "Olá, {cliente}! Seu horário de {servico} foi alterado para {data} às {hora}, com {profissional}. Código: {codigo}. {estabelecimento}",
    cancelado: "Olá, {cliente}. Seu horário de {servico} de {data} às {hora} foi cancelado. Se quiser remarcar, é só responder esta mensagem. {estabelecimento}",
    lembrete: "Olá, {cliente}! Lembrete: hoje às {hora} você tem {servico} com {profissional}. Código: {codigo}. {estabelecimento}",
  };

  /* ---------- Feriados nacionais (datas oficiais) ---------- */
  const FERIADOS_NACIONAIS = [
    ["2026-01-01", "Confraternização Universal"], ["2026-04-03", "Paixão de Cristo"], ["2026-04-21", "Tiradentes"], ["2026-05-01", "Dia do Trabalho"],
    ["2026-09-07", "Independência do Brasil"], ["2026-10-12", "Nossa Senhora Aparecida"], ["2026-11-02", "Finados"], ["2026-11-15", "Proclamação da República"],
    ["2026-11-20", "Dia Nacional de Zumbi e da Consciência Negra"], ["2026-12-25", "Natal"],
    ["2027-01-01", "Confraternização Universal"], ["2027-03-26", "Paixão de Cristo"], ["2027-04-21", "Tiradentes"], ["2027-05-01", "Dia do Trabalho"],
    ["2027-09-07", "Independência do Brasil"], ["2027-10-12", "Nossa Senhora Aparecida"], ["2027-11-02", "Finados"], ["2027-11-15", "Proclamação da República"],
    ["2027-11-20", "Dia Nacional de Zumbi e da Consciência Negra"], ["2027-12-25", "Natal"],
  ];

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

  const NOMES = ["Ana Clara", "Bruno", "Carla", "Diego", "Eduarda", "Felipe", "Gabriela", "Henrique", "Isabela", "João Pedro", "Karina", "Leonardo", "Mariana", "Nicolas", "Olívia", "Pedro", "Quésia", "Rodrigo", "Sabrina", "Thiago", "Valéria", "Vinícius", "Yasmin", "Lucas", "Fernanda", "Gustavo", "Beatriz", "Matheus", "Letícia", "André", "Patrícia", "Renato", "Camila", "Daniel", "Elaine", "Fábio", "Giovana", "Igor", "Juliana", "Marcelo", "Natália", "Otávio"];
  const SOBRENOMES = ["Albuquerque", "Barros", "Cardoso", "Dias", "Esteves", "Freitas", "Gomes", "Hora", "Lacerda", "Macedo", "Nogueira", "Pacheco", "Queiroz", "Ramos", "Siqueira", "Teles", "Vasconcelos", "Xavier", "Zanetti", "Moura", "Pinheiro", "Rezende"];

  NX.criarDadosDemo = function criarDadosDemo() {
    const r = mulberry32(20261011);
    const entre = (a, b) => a + Math.floor(r() * (b - a + 1));
    const sorteio = (lista) => lista[Math.floor(r() * lista.length)];
    const HOJE = U.hoje();
    const AGORA = U.agora();
    const dia = (n) => U.somarDias(HOJE, n);
    const momento = (data, hhmm) => `${data}T${hhmm}`;
    const PASSADO = -60;
    const FUTURO = 21;

    const jornada = (dias, inicio, fim, pausa) => Object.fromEntries([0, 1, 2, 3, 4, 5, 6].map((dow) => [dow, dias.includes(dow) ? { inicio, fim, pausa } : null]));
    const est = {
      id: "est1",
      nome: "Espaço Cora — Beleza & Barbearia",
      descricao: "Cabelo, barba, unhas e sobrancelha num só lugar. Atendimento com hora marcada.",
      telefone: "(19) 95555-0130", telefoneFicticio: true, whatsapp: "", endereco: "Rua das Palmeiras, 120 — Centro (endereço fictício)",
      logo: null, fuso: "America/Sao_Paulo",
      horarios: {
        0: { abre: "09:00", fecha: "13:00", pausa: null },
        1: { abre: "10:00", fecha: "19:00", pausa: null },
        2: { abre: "09:00", fecha: "20:00", pausa: null }, 3: { abre: "09:00", fecha: "20:00", pausa: null },
        4: { abre: "09:00", fecha: "20:00", pausa: null }, 5: { abre: "09:00", fecha: "20:00", pausa: null },
        6: { abre: "09:00", fecha: "17:00", pausa: null },
      },
      regras: { intervaloGrade: 15, antecedenciaMinima: 120, diasFuturos: 30, confirmacaoAutomatica: false, cancelamentoHoras: 4, reagendamentoHoras: 4, reagendamentosMax: 2 },
      pagina: { cor: "violeta", boasVindas: "Escolha o serviço, o profissional e o melhor horário. Leva menos de um minuto.", mostrarPrecos: true, mostrarEndereco: true, permitirEscolherProfissional: true },
      agenda: { visaoInicial: "dia", mostrarCancelados: false },
      mensagens: { ...NX.MODELOS_PADRAO },
    };

    const servicos = [
      ["s1", "Corte masculino", "Cabelo", 55, 45, "Corte na tesoura ou máquina, com lavagem e finalização."],
      ["s2", "Barba completa", "Barba", 40, 30, "Toalha quente, navalha e hidratação."],
      ["s3", "Corte + barba", "Combos", 85, 75, "Os dois serviços no mesmo horário, com valor especial."],
      ["s4", "Corte feminino", "Cabelo", 90, 60, "Corte com lavagem, hidratação rápida e escova simples."],
      ["s5", "Escova modelada", "Cabelo", 70, 45, "Escova com babyliss ou chapinha."],
      ["s6", "Manicure", "Unhas", 40, 45, "Cutilagem, lixamento e esmaltação tradicional."],
      ["s7", "Pedicure", "Unhas", 45, 50, "Cutilagem, lixamento, esfoliação e esmaltação."],
      ["s8", "Esmaltação em gel", "Unhas", 110, 75, "Preparação da unha e gel com cabine de secagem."],
      ["s9", "Design de sobrancelha", "Sobrancelha", 45, 30, "Desenho com pinça e linha, sem coloração."],
      ["s10", "Hidratação capilar", "Cabelo", 80, 40, "Serviço pausado temporariamente."],
    ].map(([id, nome, categoria, preco, duracao, descricao]) => ({ id, nome, categoria, preco, duracao, descricao, imagem: null, status: id === "s10" ? "inativo" : "ativo", criadoEm: momento(dia(-120), "10:00"), atualizadoEm: momento(dia(id === "s1" ? -20 : -120), "10:00") }));
    const servico = (id) => servicos.find((s) => s.id === id);
    const precoEm = (s, data) => (s.id === "s1" && data < dia(-20) ? 50 : s.preco);   // o corte custava R$ 50 até 20 dias atrás

    const profissionais = [
      { id: "p1", nome: "Rafael Torres", especialidades: ["Barbeiro", "Cortes clássicos"], servicos: ["s1", "s2", "s3"], jornada: jornada([0, 2, 3, 4, 5, 6], "09:00", "19:00", { inicio: "12:00", fim: "13:00" }), folgas: [], cor: 0 },
      { id: "p2", nome: "Helena Duarte", especialidades: ["Cabeleireira", "Sobrancelha"], servicos: ["s4", "s5", "s9", "s10"], jornada: jornada([1, 2, 3, 4, 5, 6], "10:00", "19:00", { inicio: "13:00", fim: "14:00" }), folgas: [], cor: 1 },
      { id: "p3", nome: "Camila Nunes", especialidades: ["Manicure", "Pedicure", "Sobrancelha"], servicos: ["s6", "s7", "s8", "s9"], jornada: jornada([2, 3, 4, 5, 6], "09:00", "18:00", { inicio: "12:30", fim: "13:30" }), folgas: [dia(6)], cor: 2 },
      { id: "p4", nome: "Bruno Lima", especialidades: ["Barbeiro"], servicos: ["s1", "s2"], jornada: jornada([2, 3, 4, 5], "13:00", "20:00", null), folgas: [], cor: 3 },
    ].map((p) => ({ ...p, foto: null, status: "ativo", criadoEm: momento(dia(-120), "10:00") }));
    const ATE_INATIVO = -25;    // Bruno deixou de atender há 25 dias

    const clientes = [];
    const usados = new Set();
    for (let i = 0; i < 46; i += 1) {
      let nome;
      do { nome = `${sorteio(NOMES)} ${sorteio(SOBRENOMES)}`; } while (usados.has(nome));
      usados.add(nome);
      const slug = U.semAcento(nome).replace(/[^a-z ]/g, "").trim().replace(/\s+/g, ".");
      clientes.push({
        id: `c${i + 1}`, nome, telefone: `${sorteio(["11", "19", "19", "19", "15"])}95555${String(1000 + i * 7).slice(-4)}`,
        email: r() < 0.55 ? `${slug}@email.exemplo` : "", observacoes: "", criadoEm: momento(dia(-130 + entre(0, 40)), "10:00"), origem: r() < 0.3 ? "pagina" : "painel", ficticio: true,
      });
    }
    clientes[2].observacoes = "Prefere atendimento no começo da manhã.";
    clientes[5].observacoes = "Alergia a esmalte com formaldeído: usar linha hipoalergênica.";
    clientes[9].observacoes = "Cliente desde a inauguração.";

    const dados = {
      versao: 1, revisao: 1, estabelecimento: est,
      perfil: { id: "u1", nome: "Bianca Moreira", cargo: "Recepção" },
      servicos, profissionais, clientes, agendamentos: [], notificacoes: [],
      feriados: FERIADOS_NACIONAIS.filter(([d]) => d >= dia(PASSADO) && d <= dia(150)).map(([data, nome], i) => ({ id: `fe${i + 1}`, data, nome })),
      bloqueios: [
        { id: "b1", profissionalId: "p2", data: dia(3), diaInteiro: false, inicio: "14:00", fim: "18:00", motivo: "Curso de atualização" },
        { id: "b2", profissionalId: null, data: dia(9), diaInteiro: false, inicio: "09:00", fim: "10:30", motivo: "Manutenção do ar-condicionado" },
        { id: "b3", profissionalId: "p1", data: dia(-12), diaInteiro: false, inicio: "15:00", fim: "17:00", motivo: "Consulta médica" },
      ],
      sequencias: { agendamento: 0 },
      criadoEm: AGORA,
    };

    /* ---------- Simulação das reservas ---------- */
    const codigos = new Set();
    const ALFABETO = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
    const novoCodigo = () => { let c; do { c = `NXB-${Array.from({ length: 5 }, () => ALFABETO[Math.floor(r() * ALFABETO.length)]).join("")}`; } while (codigos.has(c)); codigos.add(c); return c; };
    const freguesia = new Map();   // clientes que voltam com o mesmo profissional
    const escolherCliente = (pid) => {
      const fieis = freguesia.get(pid) || [];
      if (fieis.length && r() < 0.55) return sorteio(fieis);
      const c = sorteio(clientes);
      if (!fieis.includes(c)) fieis.push(c);
      freguesia.set(pid, fieis);
      return c;
    };
    const ocupacaoAlvo = (n) => (n < 0 ? 0.62 : n === 0 ? 0.66 : n <= 3 ? 0.55 : n <= 10 ? 0.3 : 0.12);

    for (let n = PASSADO; n <= FUTURO; n += 1) {
      const data = dia(n);
      profissionais.forEach((p) => {
        if (p.id === "p4" && n >= ATE_INATIVO) return;
        const jan = NX.regras.janelasDoDia(dados, p, data);
        let janelas = jan.janelas;
        dados.bloqueios.filter((b) => b.data === data && (!b.profissionalId || b.profissionalId === p.id)).forEach((b) => {
          const a1 = U.minutos(b.inicio); const a2 = U.minutos(b.fim);
          janelas = janelas.flatMap(([x, y]) => (a1 < y && x < a2 ? [[x, a1], [a2, y]].filter(([i, f]) => f - i >= 15) : [[x, y]]));
        });
        janelas.forEach(([ini, fim]) => {
          let t = ini;
          while (t < fim) {
            if (r() > ocupacaoAlvo(n)) { t += sorteio([15, 30, 45]); continue; }
            const opcoes = p.servicos.filter((sid) => {
              const s = servico(sid);
              if (sid === "s10" && n >= -15) return false;   // hidratação pausada há 15 dias
              return t + s.duracao <= fim;
            });
            if (!opcoes.length) break;
            const s = servico(sorteio(opcoes));
            const inicio = U.hhmm(t);
            const fimMin = t + s.duracao;
            const passou = momento(data, U.hhmm(fimMin)) <= AGORA;
            const emCurso = !passou && momento(data, inicio) <= AGORA;
            const origem = r() < 0.36 ? "pagina" : "painel";
            const criadoDias = n < 0 ? entre(1, 12) : entre(0, Math.min(12, n + 6));
            let criadoEm = momento(dia(n - criadoDias), `${String(entre(9, 19)).padStart(2, "0")}:${String(entre(0, 59)).padStart(2, "0")}`);
            if (criadoEm > AGORA) criadoEm = AGORA;
            if (criadoEm >= momento(data, inicio)) criadoEm = momento(dia(n - 1), "18:30");
            const sorte = r();
            let status;
            if (passou) status = sorte < 0.085 ? "cancelado" : sorte < 0.14 ? "nao_compareceu" : "concluido";
            else if (emCurso) status = "em_atendimento";
            else status = sorte < 0.07 ? "cancelado" : origem === "pagina" && sorte < 0.42 ? "pendente" : "confirmado";
            const cliente = escolherCliente(p.id);
            const preco = precoEm(s, data);
            const historico = [{ em: criadoEm, acao: "criado", texto: origem === "pagina" ? "Solicitado pela página de agendamento" : "Criado no painel", por: origem === "pagina" ? "cliente" : "Bianca Moreira" }];
            const confirmadoEm = origem === "pagina" ? criadoEm.slice(0, 11) + "19:40" : criadoEm;
            if (status !== "pendente" && origem === "pagina") historico.push({ em: confirmadoEm < momento(data, inicio) ? confirmadoEm : criadoEm, acao: "confirmado", texto: "Confirmado pela recepção", por: "Bianca Moreira" });
            if (["em_atendimento", "concluido"].includes(status)) historico.push({ em: momento(data, inicio), acao: "iniciado", texto: "Atendimento iniciado", por: p.nome });
            const a = {
              id: `a${dados.agendamentos.length + 1}`, codigo: novoCodigo(), clienteId: cliente.id, servicoId: s.id, servicoNome: s.nome, profissionalId: p.id,
              data, inicio, fim: U.hhmm(fimMin), duracao: s.duracao, preco, status, observacoes: "", origem,
              criadoEm, atualizadoEm: criadoEm, historico, reagendamentos: 0, cancelamento: null, pagamento: null,
            };
            if (status === "concluido") {
              historico.push({ em: momento(data, a.fim), acao: "concluido", texto: "Atendimento concluído", por: p.nome });
              if (r() < 0.9 || n < -7) {
                const desconto = r() < 0.08 ? 0.9 : 1;
                a.pagamento = { valor: U.arredondar(preco * desconto), forma: sorteio(["Pix", "Pix", "Cartão de crédito", "Cartão de débito", "Dinheiro"]), em: momento(data, a.fim), por: "Bianca Moreira", observacao: desconto < 1 ? "Desconto de 10% (cliente frequente)" : "" };
                historico.push({ em: a.pagamento.em, acao: "pagamento", texto: `Pagamento registrado: ${U.moeda(a.pagamento.valor)} (${a.pagamento.forma})`, por: "Bianca Moreira" });
              }
              a.atualizadoEm = historico[historico.length - 1].em;
            } else if (status === "nao_compareceu") {
              historico.push({ em: momento(data, a.fim), acao: "nao_compareceu", texto: "Cliente não compareceu", por: "Bianca Moreira" });
              a.atualizadoEm = momento(data, a.fim);
            } else if (status === "cancelado") {
              const quando = criadoEm < momento(dia(n - 1), "20:00") ? momento(dia(n - 1), "17:15") : criadoEm;
              const pedidoCliente = r() < 0.7;
              a.cancelamento = { em: quando > AGORA ? AGORA : quando, motivo: pedidoCliente ? "Pedido do cliente" : "Imprevisto do profissional", detalhe: pedidoCliente ? "Cliente avisou pelo WhatsApp." : "", por: pedidoCliente && origem === "pagina" && r() < 0.5 ? "cliente" : "estabelecimento" };
              historico.push({ em: a.cancelamento.em, acao: "cancelado", texto: `Cancelado: ${a.cancelamento.motivo}`, por: a.cancelamento.por === "cliente" ? "cliente" : "Bianca Moreira" });
              a.atualizadoEm = a.cancelamento.em;
            }
            historico.sort((x, y) => x.em.localeCompare(y.em));
            dados.agendamentos.push(a);
            t = Math.ceil((fimMin + (r() < 0.35 ? sorteio([0, 15]) : 0)) / 15) * 15;   // próximo horário da grade
          }
        });
      });
    }

    // Alguns agendamentos futuros que já foram reagendados uma vez
    dados.agendamentos.filter((a) => a.data > HOJE && a.status === "confirmado").slice(0, 60).filter((_, i) => i % 9 === 0).forEach((a) => {
      a.reagendamentos = 1;
      const quando = a.criadoEm < AGORA ? a.criadoEm.slice(0, 11) + "20:10" : AGORA;
      a.historico.push({ em: quando > AGORA ? AGORA : quando, acao: "reagendado", texto: `Reagendado de ${U.dataCurta(U.somarDias(a.data, 1))} para ${U.dataCurta(a.data)} às ${a.inicio}`, por: "Bianca Moreira" });
      a.atualizadoEm = a.historico[a.historico.length - 1].em;
    });

    // Bruno ficou inativo (com histórico preservado)
    profissionais.find((p) => p.id === "p4").status = "inativo";

    /* ---------- Notificações recentes (últimos 3 dias) ---------- */
    const limite = momento(dia(-3), "00:00");
    const eventos = [];
    dados.agendamentos.forEach((a) => {
      a.historico.forEach((h) => {
        if (h.em < limite || h.em > AGORA) return;
        const tipo = { criado: "novo", confirmado: "confirmado", reagendado: "reagendado", cancelado: "cancelado" }[h.acao];
        if (!tipo) return;
        if (tipo === "novo" && a.origem !== "pagina") return;
        eventos.push({ tipo, a, em: h.em, por: h.por });
      });
    });
    eventos.sort((x, y) => y.em.localeCompare(x.em)).slice(0, 30).forEach((e, i) => {
      dados.notificacoes.push({ id: `n${i + 1}`, tipo: e.tipo, agendamentoId: e.a.id, em: e.em, lida: i >= 6, origem: e.por === "cliente" ? "cliente" : "equipe" });
    });

    dados.sequencias.agendamento = dados.agendamentos.length;
    return dados;
  };
})();
