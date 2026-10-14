/* ==========================================================================
   Agenda de Estúdio — motor.js
   AS REGRAS DE HORÁRIO. O site (agendamento da cliente) e o painel usam
   exatamente estas funções; nada aqui mexe na tela nem grava dados.

   Um horário só é oferecido quando, ao mesmo tempo:
   • o serviço existe e está ativo, e a profissional existe, está ativa e é
     habilitada para esse serviço;
   • o estabelecimento abre nesse dia da semana e a profissional trabalha
     nesse dia (sem folga semanal nem folga cadastrada na data);
   • o atendimento INTEIRO (início + duração do serviço) cabe dentro do
     expediente do estabelecimento e da jornada da profissional, fora das
     pausas dela e de qualquer bloqueio de agenda;
   • não encosta em outra reserva ativa (pendente, confirmada ou concluída)
     da mesma profissional, respeitando o intervalo entre atendimentos;
   • não está no passado (no fuso do estabelecimento) e, no site, respeita
     a antecedência mínima e o limite de dias para a frente.
   Reservas canceladas e faltas NÃO ocupam horário.
   ========================================================================== */
window.AE = window.AE || {};

(function () {
  "use strict";
  const U = AE.util;

  const ATIVAS = ["pendente", "confirmado", "concluido"];
  const ocupa = (r) => ATIVAS.includes(r.status);
  const sobrepoe = (a1, a2, b1, b2) => a1 < b2 && b1 < a2;

  const STATUS = {
    pendente: { nome: "Pendente", descricao: "Aguardando confirmação do estúdio" },
    confirmado: { nome: "Confirmado", descricao: "Horário confirmado" },
    concluido: { nome: "Concluído", descricao: "Atendimento realizado" },
    cancelado: { nome: "Cancelado", descricao: "Não ocupa mais o horário" },
    nao_compareceu: { nome: "Não compareceu", descricao: "Não veio no horário" },
  };
  // Para onde cada status pode ir. Concluído e "não compareceu" só depois do horário.
  const TRANSICOES = {
    pendente: ["confirmado", "cancelado"],
    confirmado: ["concluido", "nao_compareceu", "cancelado"],
    concluido: [],
    cancelado: [],
    nao_compareceu: [],
  };

  const MENSAGENS = {
    servico_inexistente: "Este serviço não existe mais.",
    servico_inativo: "Este serviço não está disponível para novas reservas.",
    profissional_inexistente: "Profissional não encontrad{s}.",
    profissional_inativo: "Est{s} profissional não está atendendo.",
    nao_habilitado: "Est{s} profissional não faz este serviço.",
    invalido: "Data ou horário inválido.",
    passado: "Esse horário já passou.",
    antecedencia: "Esse horário não respeita a antecedência mínima para reservas pelo site.",
    muito_distante: "Ainda não abrimos a agenda para essa data.",
    fechado: "O estúdio não abre nesse dia.",
    folga: "{A} profissional está de folga nessa data.",
    folga_semanal: "{A} profissional não trabalha nesse dia da semana.",
    bloqueado: "A agenda está bloqueada nesse período.",
    fora_do_expediente: "O atendimento não cabe no expediente desse dia.",
    ocupado: "Esse horário acabou de ser reservado por outra pessoa.",
  };
  const mensagem = (codigo) => AE.t(MENSAGENS[codigo] || "Não foi possível usar esse horário.");

  /* ---------- Intervalos em minutos ---------- */
  const paraMinutos = (lista) => (lista || [])
    .filter(([a, b]) => U.horaValida(a) && U.horaValida(b))
    .map(([a, b]) => [U.minutos(a), U.minutos(b)])
    .filter(([a, b]) => b > a)
    .sort((x, y) => x[0] - y[0]);
  function intersecao(A, B) {
    const res = [];
    A.forEach(([a1, a2]) => B.forEach(([b1, b2]) => {
      const i = Math.max(a1, b1), f = Math.min(a2, b2);
      if (f > i) res.push([i, f]);
    }));
    return res.sort((x, y) => x[0] - y[0]);
  }
  function subtrair(janelas, p1, p2) {
    const res = [];
    janelas.forEach(([a, b]) => {
      if (!sobrepoe(a, b, p1, p2)) { res.push([a, b]); return; }
      if (p1 > a) res.push([a, p1]);
      if (p2 < b) res.push([p2, b]);
    });
    return res.filter(([a, b]) => b - a >= 5);
  }

  const servico = (d, id) => d.servicos.find((s) => s.id === id) || null;
  const profissional = (d, id) => d.profissionais.find((p) => p.id === id) || null;
  const habilitadas = (d, s, { incluirInativas = false } = {}) => d.profissionais.filter((p) => (incluirInativas || p.ativo) && (s.profissionais || []).includes(p.id));

  /* ---------- Expediente de uma profissional num dia ----------
     Devolve { janelas: [[inícioMin, fimMin], ...], motivo } — o motivo explica um dia vazio. */
  function janelasDoDia(d, prof, data) {
    if (!U.dataValida(data)) return { janelas: [], motivo: "invalido" };
    const dow = U.diaDaSemana(data);
    const negocio = paraMinutos((d.horarios || {})[dow]);
    if (!negocio.length) return { janelas: [], motivo: "fechado" };
    if (!prof) return { janelas: [], motivo: "profissional_inexistente" };
    if (!prof.ativo) return { janelas: [], motivo: "profissional_inativo" };
    const folga = (prof.folgas || []).find((f) => f.data === data);
    if (folga) return { janelas: [], motivo: "folga", detalhe: folga.motivo };
    const jornada = paraMinutos((prof.jornada || {})[dow]);
    if (!jornada.length) return { janelas: [], motivo: "folga_semanal" };
    let janelas = intersecao(negocio, jornada);
    (prof.pausas || []).filter((p) => (p.dias || []).includes(dow) && U.horaValida(p.inicio) && U.horaValida(p.fim))
      .forEach((p) => { janelas = subtrair(janelas, U.minutos(p.inicio), U.minutos(p.fim)); });
    (d.bloqueios || []).filter((b) => b.data === data && (!b.profissionalId || b.profissionalId === prof.id))
      .forEach((b) => { janelas = subtrair(janelas, U.minutos(b.inicio), U.minutos(b.fim)); });
    return { janelas, motivo: janelas.length ? null : "bloqueado" };
  }

  const reservasDoDia = (d, profId, data, ignorarId) => d.reservas.filter((r) => r.profissionalId === profId && r.data === data && ocupa(r) && r.id !== ignorarId);

  /* Só a agenda (expediente, pausas, bloqueios e outras reservas), sem olhar o relógio */
  function livreNaAgenda(d, prof, data, ini, dur, ignorarId) {
    const { janelas, motivo } = janelasDoDia(d, prof, data);
    if (!janelas.length) return { ok: false, codigo: motivo || "bloqueado" };
    const fim = ini + dur;
    if (!janelas.some(([a, b]) => ini >= a && fim <= b)) return { ok: false, codigo: "fora_do_expediente" };
    const intervalo = Number(d.regras.intervaloEntre) || 0;
    const choque = reservasDoDia(d, prof.id, data, ignorarId)
      .find((r) => sobrepoe(ini, fim, U.minutos(r.inicio) - intervalo, U.minutos(r.fim) + intervalo));
    if (choque) return { ok: false, codigo: "ocupado", reserva: choque };
    return { ok: true };
  }

  /* ---------- Conferência completa de um horário ----------
     contexto "site": regras da cliente (antecedência, limite de dias).
     contexto "painel": o estúdio pode marcar em cima da hora, mas nunca no passado.
     ignorarId: a própria reserva, quando se está reagendando. */
  function conferir(d, { servicoId, profissionalId, data, inicio, contexto = "site", ignorarId = null, duracao = null }) {
    const s = servico(d, servicoId);
    if (!s) return { ok: false, codigo: "servico_inexistente", mensagem: mensagem("servico_inexistente") };
    if (!s.ativo && !ignorarId) return { ok: false, codigo: "servico_inativo", mensagem: mensagem("servico_inativo") };
    const p = profissional(d, profissionalId);
    if (!p) return { ok: false, codigo: "profissional_inexistente", mensagem: mensagem("profissional_inexistente") };
    if (!p.ativo) return { ok: false, codigo: "profissional_inativo", mensagem: mensagem("profissional_inativo") };
    if (!(s.profissionais || []).includes(p.id)) return { ok: false, codigo: "nao_habilitado", mensagem: mensagem("nao_habilitado") };
    if (!U.dataValida(data) || !U.horaValida(inicio)) return { ok: false, codigo: "invalido", mensagem: mensagem("invalido") };
    const ini = U.minutos(inicio);
    const dur = Number(duracao) || Number(s.duracao);
    const hj = U.hoje();
    const faltam = U.diasEntre(hj, data) * 1440 + ini - U.agoraMin();   // minutos até o início
    if (faltam < 0 || data < hj) return { ok: false, codigo: "passado", mensagem: mensagem("passado") };
    if (contexto === "site") {
      if (faltam < (Number(d.regras.antecedenciaMin) || 0)) return { ok: false, codigo: "antecedencia", mensagem: mensagem("antecedencia") };
      if (U.diasEntre(hj, data) > (Number(d.regras.diasFuturos) || 60)) return { ok: false, codigo: "muito_distante", mensagem: mensagem("muito_distante") };
    }
    const r = livreNaAgenda(d, p, data, ini, dur, ignorarId);
    if (!r.ok) return { ...r, mensagem: mensagem(r.codigo) };
    return { ok: true, fim: U.hhmm(ini + dur), duracao: dur };
  }

  /* ---------- Horários livres ----------
     profissionalId pode ser "qualquer": junta os horários de todas as habilitadas
     e informa, em cada horário, quem está livre. */
  function horarios(d, { servicoId, profissionalId, data, contexto = "site", ignorarId = null, duracao = null }) {
    const s = servico(d, servicoId);
    if (!s || (!s.ativo && !ignorarId)) return [];
    const profs = profissionalId === "qualquer" ? habilitadas(d, s) : [profissional(d, profissionalId)].filter(Boolean);
    const passo = Number(d.regras.passo) || 15;
    const dur = Number(duracao) || Number(s.duracao);
    const mapa = new Map();
    profs.forEach((p) => {
      janelasDoDia(d, p, data).janelas.forEach(([a, b]) => {
        for (let t = Math.ceil(a / passo) * passo; t + dur <= b; t += passo) {
          const h = U.hhmm(t);
          if (conferir(d, { servicoId, profissionalId: p.id, data, inicio: h, contexto, ignorarId, duracao: dur }).ok) {
            if (!mapa.has(h)) mapa.set(h, []);
            mapa.get(h).push(p.id);
          }
        }
      });
    });
    return [...mapa.entries()].sort((x, y) => x[0].localeCompare(y[0])).map(([inicio, ids]) => ({ inicio, profissionais: ids }));
  }

  /* ---------- Situação de um dia no calendário ---------- */
  function resumoDia(d, { servicoId, profissionalId, data, contexto = "site" }) {
    const s = servico(d, servicoId);
    const hj = U.hoje();
    if (data < hj) return { estado: "passado", total: 0, motivo: "passado" };
    if (contexto === "site" && U.diasEntre(hj, data) > (Number(d.regras.diasFuturos) || 60)) return { estado: "fora", total: 0, motivo: "muito_distante" };
    if (!s) return { estado: "fechado", total: 0, motivo: "servico_inexistente" };
    const profs = profissionalId === "qualquer" ? habilitadas(d, s) : [profissional(d, profissionalId)].filter(Boolean);
    if (!profs.length) return { estado: "fechado", total: 0, motivo: "profissional_inativo" };
    const motivos = profs.map((p) => janelasDoDia(d, p, data)).filter((j) => !j.janelas.length).map((j) => j.motivo);
    if (motivos.length === profs.length) return { estado: "fechado", total: 0, motivo: motivos.includes("fechado") ? "fechado" : motivos[0] };
    const total = horarios(d, { servicoId, profissionalId, data, contexto }).length;
    return { estado: total ? "livre" : "lotado", total, motivo: total ? null : "lotado" };
  }

  /* Quando a cliente escolhe "qualquer profissional": fica com quem tem menos
     atendimento no dia (empate: a ordem do cadastro). */
  function escolherProfissional(d, ids, data) {
    const carga = (id) => reservasDoDia(d, id, data).reduce((t, r) => t + (Number(r.duracao) || 0), 0);
    const ordem = (id) => d.profissionais.findIndex((p) => p.id === id);
    return [...ids].sort((a, b) => carga(a) - carga(b) || ordem(a) - ordem(b))[0] || null;
  }

  function proximasDatas(d, { servicoId, profissionalId, contexto = "site", desde = U.hoje(), limite = 4, maxDias = 45 }) {
    const res = [];
    for (let i = 0; i <= maxDias && res.length < limite; i += 1) {
      const data = U.somarDias(desde, i);
      const r = resumoDia(d, { servicoId, profissionalId, data, contexto });
      if (r.estado === "fora") break;
      if (r.estado === "livre") res.push({ data, total: r.total });
    }
    return res;
  }

  /* ---------- Conferências usadas pelo painel ---------- */
  const comecou = (r) => r.data < U.hoje() || (r.data === U.hoje() && U.minutos(r.inicio) <= U.agoraMin());
  const futura = (r) => !comecou(r);
  function podeMudar(r, novo) {
    if (!(TRANSICOES[r.status] || []).includes(novo)) return { ok: false, erro: `Uma reserva "${STATUS[r.status].nome.toLowerCase()}" não pode virar "${STATUS[novo].nome.toLowerCase()}".` };
    if ((novo === "concluido" || novo === "nao_compareceu") && !comecou(r)) return { ok: false, erro: "Esse horário ainda não chegou." };
    return { ok: true };
  }
  // Reservas futuras que deixariam de caber na agenda (depois de uma mudança em "d")
  function afetadas(d) {
    return d.reservas.filter((r) => ["pendente", "confirmado"].includes(r.status) && futura(r)).filter((r) => {
      const p = profissional(d, r.profissionalId);
      if (!p || !p.ativo) return true;
      return !livreNaAgenda(d, p, r.data, U.minutos(r.inicio), Number(r.duracao), r.id).ok;
    });
  }

  /* ---------- Ocupação: minutos reservados ÷ minutos de agenda aberta ---------- */
  function ocupacao(d, { de, ate, profissionalId = "" }) {
    let capacidade = 0, reservado = 0;
    const profs = d.profissionais.filter((p) => p.ativo && (!profissionalId || p.id === profissionalId));
    for (let data = de; data <= ate; data = U.somarDias(data, 1)) {
      profs.forEach((p) => {
        const janelas = janelasDoDia(d, p, data).janelas;
        capacidade += janelas.reduce((t, [a, b]) => t + (b - a), 0);
        reservasDoDia(d, p.id, data).forEach((r) => {
          const a = U.minutos(r.inicio), b = U.minutos(r.fim);
          janelas.forEach(([x, y]) => { reservado += Math.max(0, Math.min(b, y) - Math.max(a, x)); });
        });
      });
    }
    return { capacidade, reservado, pct: capacidade ? reservado / capacidade : 0 };
  }

  AE.motor = {
    ATIVAS, STATUS, TRANSICOES, MENSAGENS, mensagem, ocupa,
    servico, profissional, habilitadas, janelasDoDia, reservasDoDia, livreNaAgenda,
    conferir, horarios, resumoDia, escolherProfissional, proximasDatas,
    comecou, futura, podeMudar, afetadas, ocupacao,
  };
})();
