/* ==========================================================================
   NEXORA BOOKING — regras.js
   MOTOR DE DISPONIBILIDADE. É a única fonte das regras de horário: o painel
   (agenda, formulários) e a página pública de reservas usam estas mesmas
   funções. Nada aqui mexe na tela nem salva dados.

   Um horário só está livre quando, ao mesmo tempo:
   • o serviço existe e está ativo, e o profissional existe, está ativo e é
     habilitado para esse serviço;
   • a data não é feriado, não é folga do profissional e o estabelecimento
     abre nesse dia da semana;
   • o atendimento inteiro (início + duração do serviço) cabe dentro do
     expediente do estabelecimento E da jornada do profissional, fora das
     pausas de ambos;
   • não encosta em nenhuma reserva ativa (pendente, confirmada, em
     atendimento ou concluída) nem em bloqueio desse profissional;
   • não está no passado (no fuso do estabelecimento) e, na página pública,
     respeita a antecedência mínima e o limite de dias futuros.
   Reservas canceladas e faltas (não compareceu) NÃO ocupam horário.
   ========================================================================== */
window.NX = window.NX || {};

(function () {
  "use strict";
  const U = NX.util;

  const ATIVOS = ["pendente", "confirmado", "em_atendimento", "concluido"];
  const ocupa = (a) => ATIVOS.includes(a.status);
  const sobrepoe = (a1, a2, b1, b2) => a1 < b2 && b1 < a2;

  // Subtrai um intervalo [p1, p2] de uma lista de janelas
  function subtrair(janelas, p1, p2) {
    const res = [];
    janelas.forEach(([a, b]) => {
      if (!sobrepoe(a, b, p1, p2)) { res.push([a, b]); return; }
      if (p1 > a) res.push([a, p1]);
      if (p2 < b) res.push([p2, b]);
    });
    return res.filter(([a, b]) => b - a >= 5);
  }

  /* ---------- Expediente de um profissional em um dia ----------
     Devolve { janelas: [[inícioMin, fimMin], ...], motivo } — motivo explica dias vazios. */
  function janelasDoDia(d, prof, data) {
    if (!U.dataValida(data)) return { janelas: [], motivo: "data_invalida" };
    const dow = U.diaDaSemana(data);
    const est = d.estabelecimento.horarios[dow];
    const feriado = d.feriados.find((f) => f.data === data);
    if (feriado) return { janelas: [], motivo: "feriado", detalhe: feriado.nome };
    if (!est) return { janelas: [], motivo: "fechado" };
    if (!prof) return { janelas: [[U.minutos(est.abre), U.minutos(est.fecha)]], motivo: null };
    if ((prof.folgas || []).includes(data)) return { janelas: [], motivo: "folga" };
    const j = prof.jornada[dow];
    if (!j) return { janelas: [], motivo: "folga_semanal" };
    const ini = Math.max(U.minutos(est.abre), U.minutos(j.inicio));
    const fim = Math.min(U.minutos(est.fecha), U.minutos(j.fim));
    if (fim - ini < 5) return { janelas: [], motivo: "sem_jornada" };
    let janelas = [[ini, fim]];
    if (est.pausa) janelas = subtrair(janelas, U.minutos(est.pausa.inicio), U.minutos(est.pausa.fim));
    if (j.pausa) janelas = subtrair(janelas, U.minutos(j.pausa.inicio), U.minutos(j.pausa.fim));
    return { janelas, motivo: janelas.length ? null : "sem_jornada" };
  }

  /* ---------- O que já ocupa a agenda do profissional no dia ---------- */
  function ocupacoesDoDia(d, profissionalId, data, { ignorarId } = {}) {
    const lista = [];
    d.agendamentos.forEach((a) => {
      if (a.profissionalId !== profissionalId || a.data !== data || a.id === ignorarId || !ocupa(a)) return;
      lista.push({ inicio: U.minutos(a.inicio), fim: U.minutos(a.fim), tipo: "agendamento", ref: a });
    });
    d.bloqueios.forEach((b) => {
      if (b.data !== data || (b.profissionalId && b.profissionalId !== profissionalId)) return;
      lista.push({ inicio: b.diaInteiro ? 0 : U.minutos(b.inicio), fim: b.diaInteiro ? 1440 : U.minutos(b.fim), tipo: "bloqueio", ref: b });
    });
    return lista.sort((a, b) => a.inicio - b.inicio);
  }

  const MENSAGENS = {
    servico_inexistente: "Escolha um serviço.",
    servico_inativo: "Este serviço está inativo e não recebe novas reservas.",
    profissional_inexistente: "Escolha um profissional.",
    profissional_inativo: "Este profissional está inativo e não recebe reservas.",
    nao_habilitado: "Este profissional não realiza este serviço.",
    data_invalida: "Informe uma data e um horário válidos.",
    passado: "Não é possível agendar em data ou horário que já passou.",
    antecedencia: "Este horário está muito próximo. Escolha um horário com mais antecedência.",
    limite_futuro: "Esta data está além do limite de dias aceitos para reservas.",
    feriado: "O estabelecimento não abre neste feriado.",
    fechado: "O estabelecimento não abre neste dia da semana.",
    folga: "O profissional está de folga nesta data.",
    folga_semanal: "O profissional não trabalha neste dia da semana.",
    sem_jornada: "O profissional não tem horário de trabalho neste dia.",
    fora_expediente: "O atendimento não cabe no expediente (considerando a duração do serviço e as pausas).",
    conflito: "Já existe um agendamento neste horário para este profissional.",
    bloqueio: "Este horário está bloqueado na agenda do profissional.",
  };

  /* ---------- Verificação completa de um horário ----------
     contexto: "painel" (equipe) ou "pagina" (cliente). Na página pública a mensagem
     nunca revela dados de outros clientes. */
  function verificar(d, { servicoId, profissionalId, data, inicio, ignorarId, contexto = "painel", reserva }) {
    const erro = (codigo, detalhe) => ({ ok: false, codigo, mensagem: MENSAGENS[codigo] + (detalhe && contexto === "painel" ? ` ${detalhe}` : "") });
    const servico = d.servicos.find((s) => s.id === servicoId);
    const atual = reserva || (ignorarId ? d.agendamentos.find((a) => a.id === ignorarId) : null);
    if (!servico) return erro("servico_inexistente");
    // Uma reserva antiga de um serviço que foi desativado pode ser reagendada; reservas novas, não.
    if (servico.status !== "ativo" && !(atual && atual.servicoId === servico.id)) return erro("servico_inativo");
    const prof = d.profissionais.find((p) => p.id === profissionalId);
    if (!prof) return erro("profissional_inexistente");
    if (prof.status !== "ativo") return erro("profissional_inativo");
    if (!prof.servicos.includes(servico.id)) return erro("nao_habilitado");
    if (!U.dataValida(data) || !U.horaValida(inicio)) return erro("data_invalida");
    const duracao = atual && atual.servicoId === servico.id ? atual.duracao : servico.duracao;
    const ini = U.minutos(inicio);
    const fim = ini + duracao;
    const agora = U.agora();
    if (`${data}T${inicio}` <= agora) return erro("passado");
    const regras = d.estabelecimento.regras;
    if (contexto === "pagina") {
      const minutosAte = U.diasEntre(agora.slice(0, 10), data) * 1440 + ini - U.minutos(agora.slice(11));
      if (minutosAte < regras.antecedenciaMinima) return erro("antecedencia");
      if (U.diasEntre(U.hoje(), data) > regras.diasFuturos) return erro("limite_futuro");
    } else if (U.diasEntre(U.hoje(), data) > 366) return erro("limite_futuro");
    const dia = janelasDoDia(d, prof, data);
    if (!dia.janelas.length) return erro(dia.motivo === "data_invalida" ? "data_invalida" : dia.motivo, dia.detalhe ? `(${dia.detalhe})` : "");
    if (fim > 1440 || !dia.janelas.some(([a, b]) => ini >= a && fim <= b)) return erro("fora_expediente");
    const choque = ocupacoesDoDia(d, prof.id, data, { ignorarId }).find((o) => sobrepoe(ini, fim, o.inicio, o.fim));
    if (choque) {
      if (choque.tipo === "bloqueio") return erro("bloqueio", choque.ref.motivo ? `(${choque.ref.motivo})` : "");
      return erro("conflito", `(${choque.ref.inicio}–${choque.ref.fim}, ${choque.ref.codigo})`);
    }
    return { ok: true, servico, profissional: prof, inicio, fim: U.hhmm(fim), duracao };
  }

  /* ---------- Horários livres de um dia ----------
     profissionalId pode ser "qualquer": junta todos os habilitados. */
  function horarios(d, { servicoId, profissionalId, data, contexto = "painel", ignorarId }) {
    const servico = d.servicos.find((s) => s.id === servicoId);
    if (!servico) return { slots: [], motivo: "servico_inexistente" };
    const candidatos = profissionalId && profissionalId !== "qualquer"
      ? d.profissionais.filter((p) => p.id === profissionalId)
      : d.profissionais.filter((p) => p.status === "ativo" && p.servicos.includes(servicoId));
    const passo = d.estabelecimento.regras.intervaloGrade || 15;
    const mapa = new Map();
    const motivos = new Set();
    candidatos.forEach((prof) => {
      const dia = janelasDoDia(d, prof, data);
      if (!dia.janelas.length) { motivos.add(dia.motivo); return; }
      dia.janelas.forEach(([a, b]) => {
        for (let t = Math.ceil(a / passo) * passo; t + 5 <= b; t += passo) {
          const v = verificar(d, { servicoId, profissionalId: prof.id, data, inicio: U.hhmm(t), contexto, ignorarId });
          if (!v.ok) { motivos.add(v.codigo); continue; }
          const chave = v.inicio;
          if (!mapa.has(chave)) mapa.set(chave, { inicio: v.inicio, fim: v.fim, profissionais: [] });
          mapa.get(chave).profissionais.push(prof.id);
        }
      });
    });
    const slots = [...mapa.values()].sort((a, b) => a.inicio.localeCompare(b.inicio));
    let motivo = null;
    if (!slots.length) {
      if (!candidatos.length) motivo = "sem_profissional";
      else if (motivos.has("feriado")) motivo = "feriado";
      else if (motivos.has("fechado")) motivo = "fechado";
      else if ([...motivos].every((m) => ["folga", "folga_semanal", "sem_jornada"].includes(m))) motivo = "folga";
      else if (motivos.has("limite_futuro")) motivo = "limite_futuro";
      else motivo = "lotado";
    }
    return { slots, motivo };
  }
  const MOTIVO_DIA = {
    feriado: "Feriado: o estabelecimento não abre.",
    fechado: "O estabelecimento não abre neste dia.",
    folga: "Sem profissionais trabalhando neste dia.",
    lotado: "Todos os horários deste dia já estão ocupados ou já passaram.",
    limite_futuro: "Fora do período aberto para reservas.",
    sem_profissional: "Nenhum profissional ativo realiza este serviço.",
    servico_inexistente: "Escolha um serviço.",
  };

  // Escolhe o profissional para "qualquer um": o que tem menos reservas no dia (depois, a ordem do cadastro)
  function escolherProfissional(d, slot, data) {
    const carga = (pid) => d.agendamentos.filter((a) => a.profissionalId === pid && a.data === data && ocupa(a)).length;
    return [...slot.profissionais].sort((a, b) => carga(a) - carga(b) || d.profissionais.findIndex((p) => p.id === a) - d.profissionais.findIndex((p) => p.id === b))[0];
  }

  // Próximos dias com quantidade de horários (para a página pública)
  function proximosDias(d, { servicoId, profissionalId, contexto = "pagina", dias }) {
    const total = dias || d.estabelecimento.regras.diasFuturos;
    const lista = [];
    for (let i = 0; i <= total; i += 1) {
      const data = U.somarDias(U.hoje(), i);
      const r = horarios(d, { servicoId, profissionalId, data, contexto });
      lista.push({ data, quantidade: r.slots.length, motivo: r.motivo });
    }
    return lista;
  }

  /* ---------- Ocupação da agenda (minutos reservados ÷ minutos de trabalho) ---------- */
  function ocupacao(d, { de, ate, profissionalId }) {
    let disponivel = 0;
    let reservado = 0;
    const profs = d.profissionais.filter((p) => (profissionalId ? p.id === profissionalId : true));
    for (let data = de; data <= ate; data = U.somarDias(data, 1)) {
      profs.forEach((p) => {
        const dia = janelasDoDia(d, p, data);
        let janelas = dia.janelas;
        d.bloqueios.filter((b) => b.data === data && (!b.profissionalId || b.profissionalId === p.id)).forEach((b) => {
          janelas = subtrair(janelas, b.diaInteiro ? 0 : U.minutos(b.inicio), b.diaInteiro ? 1440 : U.minutos(b.fim));
        });
        const minutosDia = janelas.reduce((t, [a, b]) => t + (b - a), 0);
        const reservas = d.agendamentos.filter((a) => a.profissionalId === p.id && a.data === data && a.status !== "cancelado");
        const reservadoDia = reservas.reduce((t, a) => t + (U.minutos(a.fim) - U.minutos(a.inicio)), 0);
        // profissional inativo só conta nos dias em que teve reservas
        if (p.status !== "ativo" && !reservas.length) return;
        disponivel += minutosDia;
        reservado += Math.min(reservadoDia, minutosDia || reservadoDia);
      });
    }
    return { disponivel, reservado, taxa: disponivel ? reservado / disponivel : 0 };
  }

  // Agendamentos ativos que deixariam de caber se uma regra mudasse (para avisar antes de salvar)
  function afetados(d, teste) {
    const agora = U.agora();
    return d.agendamentos.filter((a) => ["pendente", "confirmado"].includes(a.status) && `${a.data}T${a.inicio}` > agora && teste(a));
  }

  // Confere a agenda inteira: nenhuma sobreposição entre reservas ativas do mesmo profissional
  function conferirAgenda(d) {
    const problemas = [];
    const porChave = new Map();
    d.agendamentos.filter(ocupa).forEach((a) => {
      const k = `${a.profissionalId}|${a.data}`;
      if (!porChave.has(k)) porChave.set(k, []);
      porChave.get(k).push(a);
    });
    porChave.forEach((lista) => {
      lista.sort((a, b) => a.inicio.localeCompare(b.inicio));
      for (let i = 1; i < lista.length; i += 1) {
        if (lista[i].inicio < lista[i - 1].fim) problemas.push(`${lista[i - 1].codigo} e ${lista[i].codigo} se sobrepõem em ${lista[i].data}`);
      }
    });
    d.agendamentos.forEach((a) => {
      if (!d.clientes.some((c) => c.id === a.clienteId)) problemas.push(`${a.codigo}: cliente não encontrado`);
      if (!d.servicos.some((s) => s.id === a.servicoId)) problemas.push(`${a.codigo}: serviço não encontrado`);
      if (!d.profissionais.some((p) => p.id === a.profissionalId)) problemas.push(`${a.codigo}: profissional não encontrado`);
      if (U.minutos(a.fim) - U.minutos(a.inicio) !== a.duracao) problemas.push(`${a.codigo}: duração não confere`);
    });
    const codigos = new Set();
    d.agendamentos.forEach((a) => { if (codigos.has(a.codigo)) problemas.push(`Código repetido: ${a.codigo}`); codigos.add(a.codigo); });
    return { ok: problemas.length === 0, problemas, total: d.agendamentos.length };
  }

  NX.regras = { ATIVOS, ocupa, sobrepoe, janelasDoDia, ocupacoesDoDia, verificar, horarios, MOTIVO_DIA, MENSAGENS, escolherProfissional, proximosDias, ocupacao, afetados, conferirAgenda };
})();
