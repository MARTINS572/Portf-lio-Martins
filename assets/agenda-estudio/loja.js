/* ==========================================================================
   Agenda de Estúdio — loja.js
   GUARDA OS DADOS e faz todas as alterações (reservas, serviços,
   profissionais, folgas, bloqueios, clientes, depoimentos e configurações).

   COMO A GRAVAÇÃO FUNCIONA (modo demonstração, sem servidor):
   • os dados ficam no localStorage DESTE navegador;
   • cada alteração acontece dentro de uma "transação": trava a agenda
     (Web Locks, entre abas do mesmo navegador), relê o que está salvo,
     confere de novo as regras, grava e LÊ DE VOLTA para ter certeza de
     que gravou. Só então a tela mostra a confirmação;
   • se a gravação falhar (armazenamento cheio ou bloqueado), nada muda e a
     tela informa que a operação NÃO foi concluída.

   O QUE ISSO NÃO RESOLVE: duas clientes em aparelhos diferentes não veem a
   mesma agenda. Para uso real, troque carregar/transacao por chamadas a um
   servidor que faça a mesma conferência dentro de uma transação do banco
   de dados (com restrição de horário único por profissional).
   ========================================================================== */
window.AE = window.AE || {};

(function () {
  "use strict";
  const U = AE.util;
  const M = AE.motor;
  const VERSAO = 1;

  const falhaGravacao = { ok: false, codigo: "falha_gravacao", erro: "Não foi possível salvar neste navegador (armazenamento cheio ou bloqueado). Nada foi alterado." };
  const copiar = (o) => JSON.parse(JSON.stringify(o));

  function criar({ chave, semente }) {
    let dados = null;
    let persistente = true;
    const ouvintes = new Set();
    const avisar = () => ouvintes.forEach((fn) => { try { fn(); } catch (e) { console.error(e); } });

    function ler() {
      try {
        const texto = localStorage.getItem(chave);
        if (!texto) return null;
        const o = JSON.parse(texto);
        return o && o.versao === VERSAO && Array.isArray(o.reservas) && o.negocio ? o : null;
      } catch (e) { return null; }
    }
    function gravar(obj) { localStorage.setItem(chave, JSON.stringify(obj)); }

    function carregar() {
      const lido = ler();
      if (lido) dados = lido;
      else {
        dados = semente();
        dados.versao = VERSAO;
        dados.revisao = 1;
        try { gravar(dados); persistente = true; } catch (e) { persistente = false; }
      }
      U.definirFuso(dados.negocio.fuso || "America/Sao_Paulo");
      return dados;
    }
    // Pega o que outra aba gravou, se for mais novo
    function sincronizar() {
      const lido = ler();
      if (lido && (lido.revisao || 0) > (dados.revisao || 0)) { dados = lido; U.definirFuso(dados.negocio.fuso); return true; }
      return false;
    }
    if (typeof window.addEventListener === "function") {
      window.addEventListener("storage", (e) => {
        if (e.key !== chave) return;
        if (sincronizar()) avisar();
      });
    }

    /* ---------- Transação ----------
       fn recebe uma CÓPIA dos dados. Se devolver ok, a cópia é gravada, conferida
       e passa a valer; se não, nada muda. */
    function executar(fn) {
      sincronizar();
      const copia = copiar(dados);
      let r;
      try { r = fn(copia); } catch (e) { console.error(e); return { ok: false, codigo: "erro", erro: "Algo deu errado ao processar. Nada foi alterado." }; }
      if (!r || r.ok === false) return r || { ok: false };
      copia.revisao = (copia.revisao || 0) + 1;
      copia.atualizadoEm = U.momentoISO();
      try { gravar(copia); } catch (e) { persistente = false; return falhaGravacao; }
      const lido = ler();
      if (!lido || lido.revisao !== copia.revisao || (r.verificar && !r.verificar(lido))) return falhaGravacao;
      persistente = true;
      dados = copia;
      U.definirFuso(dados.negocio.fuso);
      delete r.verificar;
      avisar();
      return r;
    }
    function transacao(fn) {
      if (typeof navigator !== "undefined" && navigator.locks && navigator.locks.request) {
        return navigator.locks.request(`${chave}:trava`, () => executar(fn)).catch((e) => { console.error(e); return falhaGravacao; });
      }
      return Promise.resolve().then(() => executar(fn));
    }

    const quem = (por) => U.limpar(por, 60) || "Estúdio";
    const hist = (r, texto, por) => { r.historico = r.historico || []; r.historico.push({ em: U.momentoISO(), texto, por: quem(por) }); };
    const afetaReservas = (d) => {
      const lista = M.afetadas(d).concat(d.reservas.filter((r) => ["pendente", "confirmado"].includes(r.status) && M.futura(r) && (() => {
        const s = M.servico(d, r.servicoId);
        return s && !(s.profissionais || []).includes(r.profissionalId);
      })()));
      const unicas = [...new Map(lista.map((r) => [r.id, r])).values()];
      if (!unicas.length) return null;
      return { ok: false, codigo: "afeta_reservas", erro: `Essa mudança deixaria ${U.plural(unicas.length, "reserva", "reservas")} fora da agenda. Reagende ou cancele antes:`, reservas: unicas.map((r) => ({ id: r.id, codigo: r.codigo, data: r.data, inicio: r.inicio, cliente: r.cliente.nome, servico: r.servicoNome, profissional: r.profissionalNome })) };
    };

    /* ======================================================================
       RESERVAS
       ====================================================================== */
    function validarCliente(v, { exigirConsentimento }) {
      const erros = {};
      const nome = U.limpar(v.nome, 80);
      if (nome.length < 3 || !/[A-Za-zÀ-ÿ]{2}/.test(nome)) erros.nome = "Informe o nome (pelo menos 3 letras).";
      const telefone = U.normalizarTelefone(v.telefone);
      if (!U.telefoneValido(telefone)) erros.telefone = "Informe um celular ou telefone com DDD, por exemplo (11) 98765-4321.";
      const email = U.limpar(v.email, 120);
      if (email && !U.emailValido(email)) erros.email = "Confira o e-mail ou deixe em branco.";
      if (String(v.observacao || "").length > 300) erros.observacao = "Use no máximo 300 caracteres.";
      if (exigirConsentimento && !v.consentimento) erros.consentimento = "Para reservar, marque a concordância com o uso dos dados para este agendamento.";
      return { erros, cliente: { nome, telefone, email }, observacao: U.limparLongo(v.observacao, 300) };
    }

    function reservar(v, { contexto = "site", por = "" } = {}) {
      const { erros, cliente, observacao } = validarCliente(v, { exigirConsentimento: contexto === "site" });
      if (Object.keys(erros).length) return Promise.resolve({ ok: false, codigo: "dados", erros, erro: "Confira os campos destacados." });
      return transacao((d) => {
        const s = M.servico(d, v.servicoId);
        if (!s) return { ok: false, codigo: "servico_inexistente", erro: M.mensagem("servico_inexistente") };
        let profId = v.profissionalId;
        if (profId === "qualquer") {
          const slot = M.horarios(d, { servicoId: s.id, profissionalId: "qualquer", data: v.data, contexto }).find((h) => h.inicio === v.inicio);
          if (!slot) return { ok: false, codigo: "ocupado", erro: M.mensagem("ocupado") };
          profId = M.escolherProfissional(d, slot.profissionais, v.data);
        }
        const c = M.conferir(d, { servicoId: s.id, profissionalId: profId, data: v.data, inicio: v.inicio, contexto });
        if (!c.ok) return { ok: false, codigo: c.codigo, erro: c.mensagem };
        const p = M.profissional(d, profId);
        let cli = d.clientes.find((x) => x.telefone === cliente.telefone);
        if (!cli) {
          cli = { id: U.novoId("c"), nome: cliente.nome, telefone: cliente.telefone, email: cliente.email, observacoes: "", criadoEm: U.momentoISO(), ficticio: false };
          d.clientes.push(cli);
        } else if (cliente.email && !cli.email) cli.email = cliente.email;
        let codigo;
        do { codigo = U.codigoReserva(); } while (d.reservas.some((r) => r.codigo === codigo));
        const status = contexto === "site" ? (d.regras.aprovacao === "automatica" ? "confirmado" : "pendente") : (v.status === "pendente" ? "pendente" : "confirmado");
        const agora = U.momentoISO();
        const r = {
          id: U.novoId("r"), codigo, servicoId: s.id, servicoNome: s.nome, categoria: s.categoria,
          profissionalId: p.id, profissionalNome: p.nome, escolhaQualquer: v.profissionalId === "qualquer",
          data: v.data, inicio: v.inicio, fim: c.fim, duracao: c.duracao, preco: Number(s.preco),
          clienteId: cli.id, cliente, observacao, consentimentoEm: contexto === "site" ? agora : null,
          status, origem: contexto, criadaEm: agora, atualizadaEm: agora, historico: [], ficticia: false,
        };
        hist(r, contexto === "site"
          ? (status === "pendente" ? "Solicitação feita pelo site (aguardando confirmação)" : "Reserva feita pelo site (confirmada automaticamente)")
          : `Reserva criada no painel (${M.STATUS[status].nome.toLowerCase()})`, contexto === "site" ? "Cliente pelo site" : por);
        d.reservas.push(r);
        return { ok: true, reserva: r, verificar: (lido) => lido.reservas.some((x) => x.id === r.id && x.status === r.status && x.data === r.data && x.inicio === r.inicio) };
      });
    }

    function acharPorCodigo(d, codigo, telefone) {
      const cod = U.normalizarCodigo(codigo);
      const tel = U.normalizarTelefone(telefone);
      if (cod.length !== 6 || !U.telefoneValido(tel)) return null;
      return d.reservas.find((r) => r.codigo === cod && r.cliente.telefone === tel) || null;
    }
    // A cliente só vê a reserva se informar o código E o telefone usado nela
    function consultar(codigo, telefone) {
      sincronizar();
      const r = acharPorCodigo(dados, codigo, telefone);
      return r ? { ok: true, reserva: r } : { ok: false, erro: "Não encontramos uma reserva com esse código e telefone neste navegador. Confira os dados." };
    }
    function podeCancelarPeloSite(d, r) {
      if (!["pendente", "confirmado"].includes(r.status)) return { ok: false, erro: `Esta reserva já está ${M.STATUS[r.status].nome.toLowerCase()}.` };
      const faltam = U.diasEntre(U.hoje(), r.data) * 1440 + U.minutos(r.inicio) - U.agoraMin();
      const limite = (Number(d.regras.cancelamentoHoras) || 0) * 60;
      if (faltam < 0) return { ok: false, erro: "O horário desta reserva já passou." };
      if (faltam < limite) return { ok: false, erro: `Pelo site, o cancelamento vai até ${U.plural(Number(d.regras.cancelamentoHoras), "hora", "horas")} antes do horário. Agora, fale direto com o estúdio.` };
      return { ok: true };
    }
    function cancelarPeloCliente(codigo, telefone) {
      return transacao((d) => {
        const r = acharPorCodigo(d, codigo, telefone);
        if (!r) return { ok: false, erro: "Não encontramos uma reserva com esse código e telefone." };
        const pode = podeCancelarPeloSite(d, r);
        if (!pode.ok) return pode;
        r.status = "cancelado";
        r.cancelamento = { em: U.momentoISO(), por: "Cliente pelo site" };
        r.atualizadaEm = U.momentoISO();
        hist(r, AE.t("Cancelada pel{ca} cliente no site. O horário foi liberado."), "Cliente pelo site");
        return { ok: true, reserva: r, verificar: (lido) => lido.reservas.some((x) => x.id === r.id && x.status === "cancelado") };
      });
    }

    function mudarStatus(id, novo, { por = "", motivo = "" } = {}) {
      return transacao((d) => {
        const r = d.reservas.find((x) => x.id === id);
        if (!r) return { ok: false, erro: "Reserva não encontrada." };
        const pode = M.podeMudar(r, novo);
        if (!pode.ok) return pode;
        const antes = r.status;
        r.status = novo;
        r.atualizadaEm = U.momentoISO();
        if (novo === "cancelado") r.cancelamento = { em: U.momentoISO(), por: quem(por), motivo: U.limpar(motivo, 120) };
        hist(r, `${M.STATUS[antes].nome} → ${M.STATUS[novo].nome}${motivo ? ` (${U.limpar(motivo, 120)})` : ""}${novo === "cancelado" ? ". O horário foi liberado." : ""}`, por);
        return { ok: true, reserva: r };
      });
    }

    function reagendar(id, v, { por = "" } = {}) {
      return transacao((d) => {
        const r = d.reservas.find((x) => x.id === id);
        if (!r) return { ok: false, erro: "Reserva não encontrada." };
        if (!["pendente", "confirmado"].includes(r.status)) return { ok: false, erro: "Só reservas pendentes ou confirmadas podem ser reagendadas." };
        const profId = v.profissionalId || r.profissionalId;
        const c = M.conferir(d, { servicoId: r.servicoId, profissionalId: profId, data: v.data, inicio: v.inicio, contexto: "painel", ignorarId: r.id, duracao: r.duracao });
        if (!c.ok) return { ok: false, codigo: c.codigo, erro: c.mensagem };
        const antes = `${U.dataBR(r.data)} às ${r.inicio} com ${r.profissionalNome}`;
        const p = M.profissional(d, profId);
        Object.assign(r, { data: v.data, inicio: v.inicio, fim: c.fim, profissionalId: p.id, profissionalNome: p.nome, atualizadaEm: U.momentoISO() });
        hist(r, `Reagendada de ${antes} para ${U.dataBR(r.data)} às ${r.inicio} com ${p.nome}`, por);
        return { ok: true, reserva: r };
      });
    }

    /* ======================================================================
       SERVIÇOS
       ====================================================================== */
    function validarServico(d, v, id) {
      const erros = {};
      const nome = U.limpar(v.nome, 60);
      if (nome.length < 3) erros.nome = "Informe o nome do serviço.";
      else if (d.servicos.some((s) => s.id !== id && U.semAcento(s.nome) === U.semAcento(nome))) erros.nome = "Já existe um serviço com esse nome.";
      const descricao = U.limparLongo(v.descricao, 400);
      if (descricao.length < 10) erros.descricao = "Escreva uma descrição curta (pelo menos 10 caracteres).";
      if (String(v.descricao || "").length > 280) erros.descricao = "Use no máximo 280 caracteres.";
      const categoria = U.limpar(v.categoria, 40);
      if (!d.categorias.includes(categoria)) erros.categoria = "Escolha uma categoria.";
      const preco = typeof v.preco === "number" ? v.preco : U.lerValor(v.preco);
      if (!(preco >= 0) || preco > 10000) erros.preco = "Informe um valor entre R$ 0,00 e R$ 10.000,00.";
      const duracao = Number(v.duracao);
      if (!Number.isInteger(duracao) || duracao < 10 || duracao > 480 || duracao % 5) erros.duracao = "Informe a duração em minutos (de 10 a 480, de 5 em 5).";
      const profissionais = [...new Set((v.profissionais || []).filter((pid) => d.profissionais.some((p) => p.id === pid)))];
      const ativo = v.ativo !== false;
      if (ativo && !profissionais.length) erros.profissionais = AE.t("Marque pelo menos {uma} profissional habilitad{s}.");
      return { erros, limpo: { nome, descricao, categoria, preco: Math.round(preco * 100) / 100, duracao, profissionais, ativo, regras: U.limparLongo(v.regras, 200), arte: U.limpar(v.arte, 40) } };
    }
    function salvarServico(v, id = null, { por = "" } = {}) {
      return transacao((d) => {
        const { erros, limpo } = validarServico(d, v, id);
        if (Object.keys(erros).length) return { ok: false, erros, erro: "Confira os campos destacados." };
        let s;
        if (id) {
          s = d.servicos.find((x) => x.id === id);
          if (!s) return { ok: false, erro: "Serviço não encontrado." };
          Object.assign(s, limpo, { atualizadoEm: U.momentoISO(), atualizadoPor: quem(por) });
        } else {
          s = { id: U.novoId("s"), ...limpo, ordem: d.servicos.length + 1, criadoEm: U.momentoISO() };
          d.servicos.push(s);
        }
        const problema = afetaReservas(d);
        if (problema) return problema;
        return { ok: true, servico: s };
      });
    }
    function alternarServico(id) {
      return transacao((d) => {
        const s = d.servicos.find((x) => x.id === id);
        if (!s) return { ok: false, erro: "Serviço não encontrado." };
        if (!s.ativo && !(s.profissionais || []).some((pid) => (M.profissional(d, pid) || {}).ativo)) return { ok: false, erro: AE.t("Antes de ativar, habilite pelo menos {uma} profissional ativ{s} para este serviço.") };
        s.ativo = !s.ativo;
        return { ok: true, servico: s };
      });
    }

    /* ======================================================================
       PROFISSIONAIS, FOLGAS E BLOQUEIOS
       ====================================================================== */
    function validarIntervalos(lista, rotulo, erros, campo) {
      const res = [];
      (lista || []).forEach(([a, b]) => {
        if (!a && !b) return;
        if (!U.horaValida(a) || !U.horaValida(b) || U.minutos(b) <= U.minutos(a)) { erros[campo] = `${rotulo}: o horário final precisa ser depois do inicial.`; return; }
        res.push([a, b]);
      });
      return res;
    }
    function validarProfissional(d, v, id) {
      const erros = {};
      const nome = U.limpar(v.nome, 60);
      if (nome.length < 3) erros.nome = "Informe o nome.";
      else if (d.profissionais.some((p) => p.id !== id && U.semAcento(p.nome) === U.semAcento(nome))) erros.nome = AE.t("Já existe {uma} profissional com esse nome.");
      const especialidades = U.limpar(v.especialidades, 120);
      if (especialidades.length < 3) erros.especialidades = "Informe as especialidades (por exemplo: nail art, gel).";
      const descricao = U.limparLongo(v.descricao, 300);
      if (String(v.descricao || "").length > 280) erros.descricao = "Use no máximo 280 caracteres.";
      const jornada = {};
      for (let dia = 0; dia < 7; dia += 1) jornada[dia] = validarIntervalos((v.jornada || {})[dia], `Jornada de ${U.DIAS[dia]}`, erros, "jornada");
      const pausas = [];
      (v.pausas || []).forEach((p) => {
        if (!p.inicio && !p.fim) return;
        if (!U.horaValida(p.inicio) || !U.horaValida(p.fim) || U.minutos(p.fim) <= U.minutos(p.inicio)) { erros.pausas = "Pausa: o horário final precisa ser depois do inicial."; return; }
        const dias = (p.dias || []).map(Number).filter((x) => x >= 0 && x <= 6);
        if (!dias.length) { erros.pausas = "Marque os dias da pausa."; return; }
        pausas.push({ dias, inicio: p.inicio, fim: p.fim });
      });
      const servicos = (v.servicos || []).filter((sid) => d.servicos.some((s) => s.id === sid));
      return { erros, limpo: { nome, especialidades, descricao, jornada, pausas, ativo: v.ativo !== false, arte: U.limpar(v.arte, 40) }, servicos };
    }
    function salvarProfissional(v, id = null, { por = "" } = {}) {
      return transacao((d) => {
        const { erros, limpo, servicos } = validarProfissional(d, v, id);
        if (Object.keys(erros).length) return { ok: false, erros, erro: "Confira os campos destacados." };
        let p;
        if (id) {
          p = d.profissionais.find((x) => x.id === id);
          if (!p) return { ok: false, erro: AE.t("Profissional não encontrad{s}.") };
          Object.assign(p, limpo, { atualizadoEm: U.momentoISO(), atualizadoPor: quem(por) });
        } else {
          p = { id: U.novoId("p"), ...limpo, folgas: [], ordem: d.profissionais.length + 1, criadoEm: U.momentoISO(), ficticio: false };
          d.profissionais.push(p);
        }
        d.servicos.forEach((s) => {
          const tem = (s.profissionais || []).includes(p.id);
          const quer = servicos.includes(s.id);
          if (quer && !tem) s.profissionais = [...(s.profissionais || []), p.id];
          if (!quer && tem) s.profissionais = s.profissionais.filter((x) => x !== p.id);
        });
        const semNinguem = d.servicos.find((s) => s.ativo && !(s.profissionais || []).some((pid) => (M.profissional(d, pid) || {}).ativo));
        if (semNinguem) return { ok: false, erro: AE.t(`O serviço "${semNinguem.nome}" ficaria sem {nenhuma} profissional. Habilite outra pessoa ou desative o serviço antes.`) };
        const problema = afetaReservas(d);
        if (problema) return problema;
        return { ok: true, profissional: p };
      });
    }
    function alternarProfissional(id) {
      return transacao((d) => {
        const p = d.profissionais.find((x) => x.id === id);
        if (!p) return { ok: false, erro: AE.t("Profissional não encontrad{s}.") };
        p.ativo = !p.ativo;
        if (!p.ativo) {
          const semNinguem = d.servicos.find((s) => s.ativo && !(s.profissionais || []).some((pid) => (M.profissional(d, pid) || {}).ativo));
          if (semNinguem) return { ok: false, erro: AE.t(`O serviço "${semNinguem.nome}" ficaria sem {nenhuma} profissional ativ{s}. Habilite outra pessoa ou desative o serviço antes.`) };
          const problema = afetaReservas(d);
          if (problema) return problema;
        }
        return { ok: true, profissional: p };
      });
    }
    function adicionarFolga(profId, v) {
      return transacao((d) => {
        const p = d.profissionais.find((x) => x.id === profId);
        if (!p) return { ok: false, erro: AE.t("Profissional não encontrad{s}.") };
        const erros = {};
        if (!U.dataValida(v.data)) erros.data = "Escolha a data.";
        else if (v.data < U.hoje()) erros.data = "A folga precisa ser de hoje em diante.";
        else if ((p.folgas || []).some((f) => f.data === v.data)) erros.data = "Já existe uma folga nessa data.";
        if (Object.keys(erros).length) return { ok: false, erros, erro: erros.data };
        p.folgas = [...(p.folgas || []), { id: U.novoId("f"), data: v.data, motivo: U.limpar(v.motivo, 60) || "Folga" }].sort((a, b) => a.data.localeCompare(b.data));
        const problema = afetaReservas(d);
        if (problema) return problema;
        return { ok: true };
      });
    }
    function removerFolga(profId, folgaId) {
      return transacao((d) => {
        const p = d.profissionais.find((x) => x.id === profId);
        if (!p) return { ok: false, erro: AE.t("Profissional não encontrad{s}.") };
        p.folgas = (p.folgas || []).filter((f) => f.id !== folgaId);
        return { ok: true };
      });
    }
    function salvarBloqueio(v, { por = "" } = {}) {
      return transacao((d) => {
        const erros = {};
        if (v.profissionalId && !d.profissionais.some((p) => p.id === v.profissionalId)) erros.profissionalId = AE.t("Profissional não encontrad{s}.");
        if (!U.dataValida(v.data)) erros.data = "Escolha a data.";
        else if (v.data < U.hoje()) erros.data = "O bloqueio precisa ser de hoje em diante.";
        if (!U.horaValida(v.inicio)) erros.inicio = "Informe o início.";
        if (!U.horaValida(v.fim)) erros.fim = "Informe o fim.";
        else if (U.horaValida(v.inicio) && U.minutos(v.fim) <= U.minutos(v.inicio)) erros.fim = "O fim precisa ser depois do início.";
        const motivo = U.limpar(v.motivo, 80);
        if (motivo.length < 3) erros.motivo = "Escreva o motivo (aparece só no painel).";
        if (Object.keys(erros).length) return { ok: false, erros, erro: "Confira os campos destacados." };
        const b = { id: U.novoId("b"), profissionalId: v.profissionalId || "", data: v.data, inicio: v.inicio, fim: v.fim, motivo, criadoEm: U.momentoISO(), por: quem(por) };
        d.bloqueios.push(b);
        const problema = afetaReservas(d);
        if (problema) return problema;
        return { ok: true, bloqueio: b };
      });
    }
    function removerBloqueio(id) {
      return transacao((d) => {
        if (!d.bloqueios.some((b) => b.id === id)) return { ok: false, erro: "Bloqueio não encontrado." };
        d.bloqueios = d.bloqueios.filter((b) => b.id !== id);
        return { ok: true };
      });
    }

    /* ======================================================================
       CLIENTES E DEPOIMENTOS
       ====================================================================== */
    function salvarCliente(v, id) {
      return transacao((d) => {
        const c = d.clientes.find((x) => x.id === id);
        if (!c) return { ok: false, erro: AE.t("Cliente não encontrad{cs}.") };
        const erros = {};
        const nome = U.limpar(v.nome, 80);
        if (nome.length < 3) erros.nome = "Informe o nome.";
        const telefone = U.normalizarTelefone(v.telefone);
        if (!U.telefoneValido(telefone)) erros.telefone = "Informe um telefone com DDD.";
        else if (d.clientes.some((x) => x.id !== id && x.telefone === telefone)) erros.telefone = "Outro cadastro já usa esse telefone.";
        const email = U.limpar(v.email, 120);
        if (email && !U.emailValido(email)) erros.email = "Confira o e-mail.";
        if (String(v.observacoes || "").length > 300) erros.observacoes = "Use no máximo 300 caracteres.";
        if (Object.keys(erros).length) return { ok: false, erros, erro: "Confira os campos destacados." };
        Object.assign(c, { nome, telefone, email, observacoes: U.limparLongo(v.observacoes, 300), atualizadoEm: U.momentoISO() });
        // As reservas que ainda vão acontecer passam a usar o contato corrigido
        d.reservas.filter((r) => r.clienteId === id && ["pendente", "confirmado"].includes(r.status)).forEach((r) => { r.cliente = { nome, telefone, email }; });
        return { ok: true, cliente: c };
      });
    }
    function salvarDepoimento(v, id = null) {
      return transacao((d) => {
        const erros = {};
        const texto = U.limparLongo(v.texto, 400);
        if (texto.length < 20) erros.texto = "Escreva o depoimento (pelo menos 20 caracteres).";
        if (String(v.texto || "").length > 400) erros.texto = "Use no máximo 400 caracteres.";
        const autor = U.limpar(v.autor, 60);
        if (autor.length < 2) erros.autor = "Informe como a pessoa quer ser identificada.";
        const ficticio = !!v.ficticio;
        if (!ficticio && !v.autorizado) erros.autorizado = "Só publique um depoimento real com autorização de quem escreveu.";
        if (Object.keys(erros).length) return { ok: false, erros, erro: "Confira os campos destacados." };
        const limpo = { texto, autor, contexto: U.limpar(v.contexto, 60), ficticio, autorizado: !ficticio && !!v.autorizado, ativo: v.ativo !== false };
        let dep;
        if (id) {
          dep = d.depoimentos.find((x) => x.id === id);
          if (!dep) return { ok: false, erro: "Depoimento não encontrado." };
          Object.assign(dep, limpo, { atualizadoEm: U.momentoISO() });
        } else {
          dep = { id: U.novoId("d"), ...limpo, criadoEm: U.momentoISO() };
          d.depoimentos.push(dep);
        }
        return { ok: true, depoimento: dep };
      });
    }
    function alternarDepoimento(id) {
      return transacao((d) => {
        const dep = d.depoimentos.find((x) => x.id === id);
        if (!dep) return { ok: false, erro: "Depoimento não encontrado." };
        dep.ativo = !dep.ativo;
        return { ok: true, depoimento: dep };
      });
    }
    function removerDepoimento(id) {
      return transacao((d) => {
        if (!d.depoimentos.some((x) => x.id === id)) return { ok: false, erro: "Depoimento não encontrado." };
        d.depoimentos = d.depoimentos.filter((x) => x.id !== id);
        return { ok: true };
      });
    }

    /* ======================================================================
       CONFIGURAÇÕES
       ====================================================================== */
    const FUSOS = ["America/Sao_Paulo", "America/Manaus", "America/Cuiaba", "America/Fortaleza", "America/Recife", "America/Belem", "America/Rio_Branco", "America/Noronha"];
    function cnpjValido(s) {
      const c = U.soDigitos(s);
      if (c.length !== 14 || /^(\d)\1+$/.test(c)) return false;
      const calc = (n) => { let soma = 0, peso = n - 7; for (let i = 0; i < n; i += 1) { soma += Number(c[i]) * peso; peso = peso === 2 ? 9 : peso - 1; } const r = soma % 11; return r < 2 ? 0 : 11 - r; };
      return calc(12) === Number(c[12]) && calc(13) === Number(c[13]);
    }
    function salvarNegocio(v) {
      return transacao((d) => {
        const erros = {};
        const nome = U.limpar(v.nome, 60);
        if (nome.length < 2) erros.nome = "Informe o nome do estúdio.";
        const telefone = U.normalizarTelefone(v.telefone);
        if (v.telefone && !U.telefoneValido(telefone)) erros.telefone = "Confira o telefone (com DDD) ou deixe em branco.";
        const whatsapp = U.whatsappComercial(v.whatsapp);
        if (String(v.whatsapp || "").trim() && !whatsapp) erros.whatsapp = "Informe o WhatsApp com DDD, por exemplo (11) 98765-4321, ou deixe em branco.";
        const email = U.limpar(v.email, 120);
        if (email && !U.emailValido(email)) erros.email = "Confira o e-mail ou deixe em branco.";
        const instagram = U.limpar(v.instagram, 120);
        if (instagram && !/^https:\/\/(www\.)?instagram\.com\/[A-Za-z0-9._]+\/?$/.test(instagram)) erros.instagram = "Use o endereço completo, por exemplo https://www.instagram.com/seuestudio";
        const endereco = {
          rua: U.limpar(v.rua, 80), numero: U.limpar(v.numero, 10), complemento: U.limpar(v.complementoEndereco, 40),
          bairro: U.limpar(v.bairro, 50), cidade: U.limpar(v.cidade, 50), uf: U.limpar(v.uf, 2).toUpperCase(), cep: U.soDigitos(v.cep).slice(0, 8),
        };
        const algum = endereco.rua || endereco.cidade || endereco.bairro;
        if (algum && (!endereco.rua || !endereco.cidade || !/^[A-Z]{2}$/.test(endereco.uf))) erros.endereco = "Para mostrar o endereço, preencha pelo menos rua, cidade e UF.";
        if (endereco.cep && endereco.cep.length !== 8) erros.endereco = "O CEP precisa ter 8 dígitos.";
        const enderecoConfirmado = !!v.enderecoConfirmado && !!algum && !erros.endereco;
        if (!FUSOS.includes(v.fuso)) erros.fuso = "Escolha um fuso horário da lista.";
        const cnpj = U.soDigitos(v.cnpj);
        if (cnpj && !cnpjValido(cnpj)) erros.cnpj = "CNPJ inválido. Confira ou deixe em branco.";
        let logo = d.negocio.logo || "";
        if (v.logo === "") logo = "";
        else if (typeof v.logo === "string" && v.logo.startsWith("data:image/")) {
          if (v.logo.length > 280000) erros.logo = "A imagem do logotipo é grande demais (máximo de 200 KB).";
          else logo = v.logo;
        }
        if (!["sistema", "claro", "escuro"].includes(v.temaPadrao)) erros.temaPadrao = "Escolha o tema.";
        if (Object.keys(erros).length) return { ok: false, erros, erro: "Confira os campos destacados." };
        Object.assign(d.negocio, {
          nome, nomeCurto: U.limpar(v.nomeCurto, 30) || nome, complemento: U.limpar(v.complemento, 40), telefone: v.telefone ? telefone : "", whatsapp, email, instagram,
          endereco, enderecoConfirmado, fuso: v.fuso, razaoSocial: U.limpar(v.razaoSocial, 100), cnpj, logo, temaPadrao: v.temaPadrao,
        });
        return { ok: true };
      });
    }
    function salvarRegras(v) {
      return transacao((d) => {
        const erros = {};
        const num = (x, min, max, campo, msg) => { const n = Number(x); if (!Number.isInteger(n) || n < min || n > max) erros[campo] = msg; return n; };
        const antecedenciaMin = num(v.antecedenciaMin, 0, 4320, "antecedenciaMin", "Use de 0 a 4320 minutos (3 dias).");
        const diasFuturos = num(v.diasFuturos, 1, 180, "diasFuturos", "Use de 1 a 180 dias.");
        const intervaloEntre = num(v.intervaloEntre, 0, 60, "intervaloEntre", "Use de 0 a 60 minutos.");
        const passo = Number(v.passo);
        if (![5, 10, 15, 20, 30, 60].includes(passo)) erros.passo = "Escolha um dos intervalos da lista.";
        const cancelamentoHoras = num(v.cancelamentoHoras, 0, 72, "cancelamentoHoras", "Use de 0 a 72 horas.");
        if (!["manual", "automatica"].includes(v.aprovacao)) erros.aprovacao = "Escolha como as reservas do site são aprovadas.";
        const politica = U.limparLongo(v.politicaCancelamento, 400);
        if (politica.length < 20) erros.politicaCancelamento = "Explique a política de cancelamento em uma ou duas frases.";
        if (Object.keys(erros).length) return { ok: false, erros, erro: "Confira os campos destacados." };
        d.regras = { antecedenciaMin, diasFuturos, intervaloEntre, passo, cancelamentoHoras, aprovacao: v.aprovacao, politicaCancelamento: politica };
        const problema = afetaReservas(d);
        if (problema) return problema;
        return { ok: true };
      });
    }
    function salvarHorarios(h) {
      return transacao((d) => {
        const erros = {};
        const horarios = {};
        for (let dia = 0; dia < 7; dia += 1) horarios[dia] = validarIntervalos((h || {})[dia], `Horário de ${U.DIAS[dia]}`, erros, "horarios");
        if (Object.keys(erros).length) return { ok: false, erros, erro: erros.horarios };
        if (!Object.values(horarios).some((l) => l.length)) return { ok: false, erro: "O estúdio precisa abrir em pelo menos um dia." };
        d.horarios = horarios;
        const problema = afetaReservas(d);
        if (problema) return problema;
        return { ok: true };
      });
    }
    function restaurar() {
      return transacao((d) => {
        const novo = semente();
        Object.keys(d).forEach((k) => { if (k !== "revisao") delete d[k]; });
        Object.assign(d, novo, { versao: VERSAO });
        return { ok: true };
      });
    }
    // Apaga as reservas e clientes de exemplo, mantendo serviços, equipe e configurações
    function limparExemplos() {
      return transacao((d) => {
        d.reservas = d.reservas.filter((r) => !r.ficticia);
        d.clientes = d.clientes.filter((c) => !c.ficticio || d.reservas.some((r) => r.clienteId === c.id));
        return { ok: true };
      });
    }

    return {
      chave,
      get dados() { return dados; },
      get persistente() { return persistente; },
      carregar, sincronizar, ler, transacao, ouvir: (fn) => { ouvintes.add(fn); return () => ouvintes.delete(fn); },
      validarCliente, reservar, consultar, cancelarPeloCliente, podeCancelarPeloSite, mudarStatus, reagendar,
      salvarServico, alternarServico, salvarProfissional, alternarProfissional, adicionarFolga, removerFolga, salvarBloqueio, removerBloqueio,
      salvarCliente, salvarDepoimento, alternarDepoimento, removerDepoimento,
      salvarNegocio, salvarRegras, salvarHorarios, restaurar, limparExemplos, FUSOS, cnpjValido,
      exportar: () => JSON.stringify(dados, null, 2),
    };
  }

  /* ======================================================================
     EXEMPLOS — monta reservas fictícias passando pelas mesmas regras
     (expediente, pausas, folgas, bloqueios e conflitos).
     ====================================================================== */
  function gerarExemplos(d, { semente = 7, clientes, diasAntes = 35, diasDepois = 12, intensidade = 0.6 }) {
    const sortear = U.sorteio(semente);
    const escolher = (lista) => lista[Math.floor(sortear() * lista.length) % lista.length];
    const hj = U.hoje();
    const agoraMin = U.agoraMin();
    d.clientes = clientes.map((c, i) => ({
      id: `cx${i + 1}`, nome: c.nome, telefone: c.telefone, email: c.email || "", observacoes: "", criadoEm: `${U.somarDias(hj, -diasAntes - 20)}T12:00:00.000Z`, ficticio: true,
    }));
    const codigos = new Set();
    const passo = Number(d.regras.passo) || 15;
    for (let k = -diasAntes; k <= diasDepois; k += 1) {
      const data = U.somarDias(hj, k);
      d.profissionais.filter((p) => p.ativo).forEach((p) => {
        const servicos = d.servicos.filter((s) => s.ativo && s.profissionais.includes(p.id));
        if (!servicos.length) return;
        const { janelas } = M.janelasDoDia(d, p, data);
        if (!janelas.length) return;
        const capacidade = janelas.reduce((t, [a, b]) => t + (b - a), 0);
        // passado mais cheio; daqui para a frente, cada vez mais horários livres
        const fator = k < 0 ? 1 : k <= 2 ? 0.6 : Math.max(0.15, 0.45 - (k - 3) * 0.04);
        const alvo = Math.round(capacidade * intensidade * (0.55 + sortear() * 0.6) * fator);
        let ocupado = 0;
        for (let tentativa = 0; tentativa < 40 && ocupado < alvo; tentativa += 1) {
          const s = escolher(servicos);
          const [a, b] = escolher(janelas);
          const vagas = Math.floor((b - a - s.duracao) / passo);
          if (vagas < 0) continue;
          const ini = Math.ceil(a / passo) * passo + passo * Math.floor(sortear() * (vagas + 1));
          if (!M.livreNaAgenda(d, p, data, ini, s.duracao).ok) continue;
          const passou = k < 0 || (k === 0 && ini + s.duracao <= agoraMin);
          const comecou = k < 0 || (k === 0 && ini <= agoraMin);
          const x = sortear();
          let status;
          if (passou) status = x < 0.82 ? "concluido" : x < 0.93 ? "cancelado" : "nao_compareceu";
          else if (comecou) status = "confirmado";
          else status = x < 0.62 ? "confirmado" : x < 0.86 ? "pendente" : "cancelado";
          const cli = escolher(d.clientes);
          let codigo;
          do { codigo = Array.from({ length: 6 }, () => "ACDEFGHJKMNPQRTUVWXY34679"[Math.floor(sortear() * 25) % 25]).join(""); } while (codigos.has(codigo));
          codigos.add(codigo);
          const antecedencia = 1 + Math.floor(sortear() * 9);
          const criada = `${U.somarDias(data, -antecedencia)}T${U.dd(10 + Math.floor(sortear() * 10))}:${U.dd(Math.floor(sortear() * 60))}:00.000Z`;
          const origem = sortear() < 0.7 ? "site" : "painel";
          const r = {
            id: `rx${d.reservas.length + 1}`, codigo, servicoId: s.id, servicoNome: s.nome, categoria: s.categoria,
            profissionalId: p.id, profissionalNome: p.nome, escolhaQualquer: false,
            data, inicio: U.hhmm(ini), fim: U.hhmm(ini + s.duracao), duracao: s.duracao, preco: s.preco,
            clienteId: cli.id, cliente: { nome: cli.nome, telefone: cli.telefone, email: cli.email }, observacao: "",
            consentimentoEm: origem === "site" ? criada : null, status, origem, criadaEm: criada, atualizadaEm: criada,
            historico: [{ em: criada, texto: origem === "site" ? "Solicitação feita pelo site" : "Reserva criada no painel", por: origem === "site" ? "Cliente pelo site" : "Estúdio" }],
            ficticia: true,
          };
          if (status !== "pendente") r.historico.push({ em: criada, texto: `Pendente → ${M.STATUS[status].nome}`, por: "Estúdio" });
          if (status === "cancelado") r.cancelamento = { em: criada, por: sortear() < 0.5 ? "Cliente pelo site" : "Estúdio" };
          if (status === "cancelado") { d.reservas.push(r); continue; }   // cancelada não ocupa: não conta no alvo
          d.reservas.push(r);
          ocupado += s.duracao;
        }
      });
    }
    d.reservas.sort((a, b) => (a.data + a.inicio).localeCompare(b.data + b.inicio));
    return d;
  }

  // Confere a agenda inteira (usado nos testes e no painel, em Configurações)
  function conferirAgenda(d) {
    const problemas = [];
    const ativas = d.reservas.filter(M.ocupa);
    const intervalo = Number(d.regras.intervaloEntre) || 0;
    ativas.forEach((r, i) => {
      ativas.slice(i + 1).forEach((o) => {
        if (o.profissionalId === r.profissionalId && o.data === r.data &&
          U.minutos(r.inicio) < U.minutos(o.fim) + intervalo && U.minutos(o.inicio) < U.minutos(r.fim) + intervalo) problemas.push(`Conflito: ${r.codigo} e ${o.codigo}`);
      });
      if (U.minutos(r.fim) - U.minutos(r.inicio) !== Number(r.duracao)) problemas.push(`Duração incoerente em ${r.codigo}`);
    });
    const codigos = new Set();
    d.reservas.forEach((r) => { if (codigos.has(r.codigo)) problemas.push(`Código repetido ${r.codigo}`); codigos.add(r.codigo); });
    return { ok: !problemas.length, problemas };
  }

  AE.loja = { criar, VERSAO };
  AE.exemplos = { gerar: gerarExemplos, conferirAgenda };
})();
