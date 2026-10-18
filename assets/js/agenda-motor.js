/* ==========================================================================
   agenda-motor.js — regras de agendamento (sem interface)
   --------------------------------------------------------------------------
   Usado pela Barbearia, pelo Ateliê Aurora e pelo AgendaPro.
   Cada página cria a sua agenda com os próprios serviços, profissionais e
   horários; as regras abaixo são as mesmas para todas:

     • um profissional não pode ter duas reservas ao mesmo tempo
       (a duração do serviço conta para o conflito);
     • não aparecem horários no passado;
     • não aparecem horários fora do expediente;
     • horários bloqueados não podem ser reservados;
     • a disponibilidade é conferida de novo no momento de confirmar.

   MODO DEMONSTRAÇÃO: os dados ficam no localStorage, ou seja, só no
   navegador de quem está testando. Não há sincronização entre aparelhos.

   PARA LIGAR A UM SERVIDOR NO FUTURO: troque as funções carregar() e
   salvar() por chamadas a uma API e repita a conferência de conflitos no
   servidor antes de gravar cada reserva.

   Exemplo de uso:
     const agenda = AgendaMotor.criar({
       chave: "minha-barbearia",
       servicos: [{ id: "corte", nome: "Corte", duracao: 45, preco: 60 }],
       profissionais: [{ id: "teo", nome: "Téo" }],
       expediente: { 2: [["09:00", "12:00"], ["13:00", "19:00"]], ... },
       intervalo: 30,
     });
     agenda.horariosDisponiveis({ data: "2026-10-20", duracao: 45 });
     agenda.reservar({ ... });
   ========================================================================== */

(function () {
  "use strict";

  const VERSAO = 1;
  const STATUS = ["confirmado", "pendente", "cancelado"];

  /* ---------- Funções de data e hora ---------- */
  const doisDigitos = (n) => String(n).padStart(2, "0");

  function paraMinutos(hhmm) {
    const [h, m] = hhmm.split(":").map(Number);
    return h * 60 + m;
  }
  function paraHora(minutos) {
    return `${doisDigitos(Math.floor(minutos / 60))}:${doisDigitos(minutos % 60)}`;
  }
  function chaveData(data) {
    return `${data.getFullYear()}-${doisDigitos(data.getMonth() + 1)}-${doisDigitos(data.getDate())}`;
  }
  function dataDeChave(chave) {
    const [a, m, d] = chave.split("-").map(Number);
    return new Date(a, m - 1, d);
  }
  function somarDias(chave, dias) {
    const d = dataDeChave(chave);
    d.setDate(d.getDate() + dias);
    return chaveData(d);
  }
  function hoje() {
    return chaveData(new Date());
  }
  function agoraEmMinutos() {
    const agora = new Date();
    return agora.getHours() * 60 + agora.getMinutes();
  }
  function diaDaSemana(chave) {
    return dataDeChave(chave).getDay();   // 0 = domingo ... 6 = sábado
  }
  function sobrepoe(inicioA, fimA, inicioB, fimB) {
    return inicioA < fimB && inicioB < fimA;
  }
  function novoId(prefixo) {
    return `${prefixo}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  }

  /* ---------- Criação de uma agenda ---------- */
  function criar(opcoes) {
    const CHAVE = `agenda:${opcoes.chave}`;
    const intervaloPadrao = opcoes.intervalo || 30;
    const antecedencia = opcoes.antecedenciaMinutos || 0;  // ex.: 60 = só a partir de 1h
    let persistente = true;
    const ouvintes = [];

    function inicial() {
      const base = {
        versao: VERSAO,
        servicos: (opcoes.servicos || []).map((s) => ({ ativo: true, ...s })),
        profissionais: (opcoes.profissionais || []).map((p) => ({ ...p })),
        expediente: JSON.parse(JSON.stringify(opcoes.expediente || {})),
        intervalo: intervaloPadrao,
        reservas: [],
        bloqueios: [],
      };
      if (typeof opcoes.exemplos === "function") {
        // A página pode criar reservas de exemplo (sempre marcadas como exemplo)
        opcoes.exemplos(base, { hoje: hoje(), somarDias, diaDaSemana, paraMinutos, paraHora });
        base.reservas.forEach((r) => { r.exemplo = true; r.id = r.id || novoId("res"); });
        base.bloqueios.forEach((b) => { b.id = b.id || novoId("blq"); });
      }
      return base;
    }

    function carregar() {
      try {
        const texto = localStorage.getItem(CHAVE);
        if (!texto) return null;
        const lido = JSON.parse(texto);
        return lido && lido.versao === VERSAO ? lido : null;
      } catch (erro) {
        persistente = false;
        return null;
      }
    }

    function salvar() {
      try {
        localStorage.setItem(CHAVE, JSON.stringify(dados));
        persistente = true;
      } catch (erro) {
        persistente = false;
      }
      ouvintes.forEach((fn) => fn(dados));
    }

    let dados = carregar();
    if (!dados) {
      dados = inicial();
      salvar();
    }

    // Se outra aba mudar a mesma agenda, esta aba também atualiza
    window.addEventListener("storage", (evento) => {
      if (evento.key !== CHAVE) return;
      const novo = carregar();
      if (novo) {
        dados = novo;
        ouvintes.forEach((fn) => fn(dados));
      }
    });

    /* ---------- Consultas simples ---------- */
    const servico = (id) => dados.servicos.find((s) => s.id === id);
    const profissional = (id) => dados.profissionais.find((p) => p.id === id);

    function profissionaisPara(servicoId) {
      return dados.profissionais.filter((p) => !p.servicos || !servicoId || p.servicos.includes(servicoId));
    }

    function expedienteDo(chave) {
      return dados.expediente[diaDaSemana(chave)] || [];
    }

    /* Confere um horário para um profissional. Devolve "" se estiver livre
       ou a explicação do motivo se não estiver. */
    function motivoIndisponivel(profissionalId, data, inicio, fim, ignorarReservaId) {
      if (data < hoje()) return "Esta data já passou.";
      if (data === hoje() && inicio < agoraEmMinutos() + antecedencia) return "Este horário já passou.";

      const dentroDoExpediente = expedienteDo(data).some(([abre, fecha]) =>
        inicio >= paraMinutos(abre) && fim <= paraMinutos(fecha));
      if (!dentroDoExpediente) return "Fora do horário de funcionamento.";

      const conflito = dados.reservas.find((r) =>
        r.id !== ignorarReservaId &&
        r.status !== "cancelado" &&
        r.profissionalId === profissionalId &&
        r.data === data &&
        sobrepoe(inicio, fim, paraMinutos(r.inicio), paraMinutos(r.fim)));
      if (conflito) return "Já existe uma reserva neste horário.";

      const bloqueio = dados.bloqueios.find((b) =>
        (!b.profissionalId || b.profissionalId === profissionalId) &&
        b.data === data &&
        sobrepoe(inicio, fim, paraMinutos(b.inicio), paraMinutos(b.fim)));
      if (bloqueio) return "Horário bloqueado.";

      return "";
    }

    /* Horários livres de um dia.
       Se profissionalId vier vazio, vale qualquer profissional que faça o serviço.
       Devolve [{ hora: "09:00", profissionais: ["teo", "nando"] }, ...]
       ignorarReservaId: ao editar uma reserva, ela não conta como conflito com ela mesma. */
    function horariosDisponiveis({ data, duracao, servicoId, profissionalId, ignorarReservaId }) {
      const tempo = duracao || (servico(servicoId) || {}).duracao;
      if (!data || !tempo) return [];
      const candidatos = profissionalId
        ? [profissional(profissionalId)].filter(Boolean)
        : profissionaisPara(servicoId);
      const passo = dados.intervalo || intervaloPadrao;
      const resultado = [];

      expedienteDo(data).forEach(([abre, fecha]) => {
        for (let inicio = paraMinutos(abre); inicio + tempo <= paraMinutos(fecha); inicio += passo) {
          const livres = candidatos
            .filter((p) => !motivoIndisponivel(p.id, data, inicio, inicio + tempo, ignorarReservaId))
            .map((p) => p.id);
          if (livres.length) resultado.push({ hora: paraHora(inicio), profissionais: livres });
        }
      });
      return resultado;
    }

    /* Todos os horários do expediente, livres ou não (para mostrar ocupados riscados) */
    function gradeDoDia({ data, duracao, servicoId, profissionalId, ignorarReservaId }) {
      const tempo = duracao || (servico(servicoId) || {}).duracao;
      if (!data || !tempo) return [];
      const livres = new Map(horariosDisponiveis({ data, duracao: tempo, servicoId, profissionalId, ignorarReservaId }).map((h) => [h.hora, h.profissionais]));
      const passo = dados.intervalo || intervaloPadrao;
      const grade = [];
      expedienteDo(data).forEach(([abre, fecha]) => {
        for (let inicio = paraMinutos(abre); inicio + tempo <= paraMinutos(fecha); inicio += passo) {
          const hora = paraHora(inicio);
          const passou = data < hoje() || (data === hoje() && inicio < agoraEmMinutos() + antecedencia);
          if (passou) continue;   // horários no passado não aparecem
          grade.push({ hora, livre: livres.has(hora), profissionais: livres.get(hora) || [] });
        }
      });
      return grade;
    }

    /* ---------- Reservas ---------- */
    function validarCliente(cliente) {
      if (!cliente || !cliente.nome || cliente.nome.trim().length < 2) return "Informe o nome.";
      const contato = (cliente.contato || "").replace(/\D/g, "");
      if (contato.length < 10 || contato.length > 11) return "Informe um telefone com DDD (10 ou 11 números).";
      return "";
    }

    function reservar(pedido) {
      const sv = pedido.servicoId ? servico(pedido.servicoId) : null;
      const duracao = pedido.duracao || (sv && sv.duracao);
      if (!duracao) return { ok: false, erro: "Escolha um serviço." };
      if (!pedido.data) return { ok: false, erro: "Escolha uma data." };
      if (!pedido.inicio) return { ok: false, erro: "Escolha um horário." };
      const erroCliente = validarCliente(pedido.cliente);
      if (erroCliente) return { ok: false, erro: erroCliente };

      const inicio = paraMinutos(pedido.inicio);
      const fim = inicio + duracao;

      // Sem profissional definido: escolhe o primeiro livre
      let profissionalId = pedido.profissionalId;
      if (!profissionalId) {
        const livre = profissionaisPara(pedido.servicoId).find((p) => !motivoIndisponivel(p.id, pedido.data, inicio, fim));
        if (!livre) return { ok: false, erro: "Este horário acabou de ser ocupado. Escolha outro." };
        profissionalId = livre.id;
      }

      // Confere de novo no momento da confirmação
      const motivo = motivoIndisponivel(profissionalId, pedido.data, inicio, fim, null);
      if (motivo) return { ok: false, erro: motivo === "Já existe uma reserva neste horário." ? "Este horário acabou de ser ocupado. Escolha outro." : motivo };

      const reserva = {
        id: novoId("res"),
        servicoId: pedido.servicoId || null,
        servicoNome: pedido.servicoNome || (sv && sv.nome) || "Serviço",
        preco: pedido.preco != null ? pedido.preco : (sv ? sv.preco : null),
        duracao,
        profissionalId,
        data: pedido.data,
        inicio: paraHora(inicio),
        fim: paraHora(fim),
        cliente: { nome: pedido.cliente.nome.trim(), contato: pedido.cliente.contato.trim() },
        observacao: (pedido.observacao || "").trim(),
        status: STATUS.includes(pedido.status) ? pedido.status : "confirmado",
        origem: pedido.origem || "site",
        criadoEm: new Date().toISOString(),
        exemplo: false,
      };
      dados.reservas.push(reserva);
      salvar();
      return { ok: true, reserva };
    }

    function atualizar(id, mudancas) {
      const reserva = dados.reservas.find((r) => r.id === id);
      if (!reserva) return { ok: false, erro: "Reserva não encontrada." };
      const nova = { ...reserva, ...mudancas, cliente: { ...reserva.cliente, ...(mudancas.cliente || {}) } };

      if (mudancas.servicoId && mudancas.servicoId !== reserva.servicoId) {
        const sv = servico(mudancas.servicoId);
        if (sv) { nova.duracao = sv.duracao; nova.servicoNome = sv.nome; nova.preco = sv.preco; }
      }
      const inicio = paraMinutos(nova.inicio);
      nova.fim = paraHora(inicio + nova.duracao);

      const erroCliente = validarCliente(nova.cliente);
      if (erroCliente) return { ok: false, erro: erroCliente };
      if (!STATUS.includes(nova.status)) return { ok: false, erro: "Status inválido." };

      // Se mudou dia, horário, profissional ou serviço (e não está cancelada), confere conflitos
      const mudouHorario = ["data", "inicio", "profissionalId", "servicoId"].some((c) => c in mudancas && mudancas[c] !== reserva[c]);
      if (nova.status !== "cancelado" && (mudouHorario || reserva.status === "cancelado")) {
        const motivo = motivoIndisponivel(nova.profissionalId, nova.data, inicio, inicio + nova.duracao, id);
        if (motivo) return { ok: false, erro: motivo };
      }
      Object.assign(reserva, nova, { atualizadoEm: new Date().toISOString() });
      salvar();
      return { ok: true, reserva };
    }

    function cancelar(id) {
      return atualizar(id, { status: "cancelado" });
    }

    function listar(filtro = {}) {
      return dados.reservas
        .filter((r) =>
          (!filtro.de || r.data >= filtro.de) &&
          (!filtro.ate || r.data <= filtro.ate) &&
          (!filtro.data || r.data === filtro.data) &&
          (!filtro.servicoId || r.servicoId === filtro.servicoId) &&
          (!filtro.profissionalId || r.profissionalId === filtro.profissionalId) &&
          (!filtro.status || r.status === filtro.status) &&
          (!filtro.ids || filtro.ids.includes(r.id)))
        .sort((a, b) => (a.data + a.inicio).localeCompare(b.data + b.inicio));
    }

    /* ---------- Bloqueios ---------- */
    function bloquear({ profissionalId, data, inicio, fim, motivo }) {
      if (!data || !inicio || !fim) return { ok: false, erro: "Informe data, início e fim." };
      const ini = paraMinutos(inicio);
      const fi = paraMinutos(fim);
      if (fi <= ini) return { ok: false, erro: "O fim precisa ser depois do início." };
      const ocupado = dados.reservas.find((r) =>
        r.status !== "cancelado" && r.data === data &&
        (!profissionalId || r.profissionalId === profissionalId) &&
        sobrepoe(ini, fi, paraMinutos(r.inicio), paraMinutos(r.fim)));
      if (ocupado) return { ok: false, erro: `Existe uma reserva às ${ocupado.inicio} nesse período. Cancele ou mude a reserva antes de bloquear.` };
      const bloqueio = { id: novoId("blq"), profissionalId: profissionalId || null, data, inicio, fim, motivo: (motivo || "").trim() };
      dados.bloqueios.push(bloqueio);
      salvar();
      return { ok: true, bloqueio };
    }
    function desbloquear(id) {
      dados.bloqueios = dados.bloqueios.filter((b) => b.id !== id);
      salvar();
      return { ok: true };
    }

    /* ---------- Serviços e expediente ---------- */
    function salvarServico(entrada) {
      const nome = (entrada.nome || "").trim();
      const duracao = Number(entrada.duracao);
      const preco = Number(entrada.preco);
      if (nome.length < 2) return { ok: false, erro: "Informe o nome do serviço." };
      if (!Number.isFinite(duracao) || duracao < 10 || duracao > 480 || duracao % 5 !== 0) return { ok: false, erro: "A duração deve ser entre 10 e 480 minutos, de 5 em 5." };
      if (!Number.isFinite(preco) || preco < 0) return { ok: false, erro: "Informe um preço válido." };
      if (entrada.id) {
        const existente = servico(entrada.id);
        if (!existente) return { ok: false, erro: "Serviço não encontrado." };
        Object.assign(existente, { nome, duracao, preco, ativo: entrada.ativo !== false });
        salvar();
        return { ok: true, servico: existente };
      }
      const novo = { id: novoId("srv"), nome, duracao, preco, ativo: true };
      dados.servicos.push(novo);
      salvar();
      return { ok: true, servico: novo };
    }

    /* Quem faz cada serviço (só vale para profissionais com lista de serviços) */
    function definirProfissionaisDoServico(servicoId, ids) {
      if (!servico(servicoId)) return { ok: false, erro: "Serviço não encontrado." };
      if (!Array.isArray(ids) || !ids.length) return { ok: false, erro: "Escolha pelo menos um profissional para este serviço." };
      dados.profissionais.forEach((p) => {
        if (!p.servicos) return;
        const faz = p.servicos.includes(servicoId);
        if (ids.includes(p.id) && !faz) p.servicos.push(servicoId);
        if (!ids.includes(p.id) && faz) p.servicos = p.servicos.filter((id) => id !== servicoId);
      });
      salvar();
      return { ok: true };
    }

    function definirExpediente(dia, intervalos) {
      // intervalos: [] (fechado) ou [["09:00","12:00"], ["13:00","19:00"]]
      for (const [abre, fecha] of intervalos) {
        if (!/^\d\d:\d\d$/.test(abre) || !/^\d\d:\d\d$/.test(fecha)) return { ok: false, erro: "Use o formato 00:00." };
        if (paraMinutos(fecha) <= paraMinutos(abre)) return { ok: false, erro: "O fechamento precisa ser depois da abertura." };
      }
      const ordenados = [...intervalos].sort((a, b) => a[0].localeCompare(b[0]));
      for (let i = 1; i < ordenados.length; i++) {
        if (paraMinutos(ordenados[i][0]) < paraMinutos(ordenados[i - 1][1])) return { ok: false, erro: "Os períodos não podem se sobrepor." };
      }
      dados.expediente[dia] = ordenados;
      salvar();
      return { ok: true };
    }

    function resetar() {
      dados = inicial();
      salvar();
    }

    return {
      // dados (somente leitura: use as funções para alterar)
      get servicos() { return dados.servicos.filter((s) => s.ativo !== false); },
      get todosServicos() { return dados.servicos; },
      get profissionais() { return dados.profissionais; },
      get expediente() { return dados.expediente; },
      get bloqueios() { return dados.bloqueios; },
      get persistente() { return persistente; },
      servico,
      profissional,
      profissionaisPara,
      expedienteDo,
      motivoIndisponivel: (profissionalId, data, inicio, fim, ignorar) => motivoIndisponivel(profissionalId, data, paraMinutos(inicio), paraMinutos(fim), ignorar),
      horariosDisponiveis,
      gradeDoDia,
      reservar,
      atualizar,
      cancelar,
      listar,
      bloquear,
      desbloquear,
      salvarServico,
      definirExpediente,
      definirProfissionaisDoServico,
      resetar,
      aoMudar(fn) { ouvintes.push(fn); },
    };
  }

  window.AgendaMotor = {
    criar,
    util: { paraMinutos, paraHora, chaveData, dataDeChave, somarDias, hoje, diaDaSemana, sobrepoe },
  };
})();
