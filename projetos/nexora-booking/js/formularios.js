/* ==========================================================================
   NEXORA BOOKING — formularios.js
   Janelas de cadastro: cliente, serviço (com foto opcional), profissional
   (com jornada semanal, pausas, folgas e serviços que realiza), bloqueio
   de agenda e feriado. Também o editor de semana usado no expediente.
   Mudanças que tirariam reservas futuras do horário pedem um segundo
   clique em Salvar: nada é cancelado sozinho.
   ========================================================================== */
window.NX = window.NX || {};

(function () {
  "use strict";
  const U = NX.util;
  const L = NX.loja;
  const R = NX.regras;
  const C = () => NX.componentes;
  const { el, icone, $ } = U;

  /* ---------- Foto opcional (reduzida no próprio navegador) ---------- */
  function campoImagem(inicial, { titulo = "Foto (opcional)", lado = 320, id = "f-imagem", botao = () => $("#form-salvar"), aoMudar } = {}) {
    let imagem = inicial || null;
    let processando = false;
    const previa = el("span", { class: "miniatura" });
    const entrada = el("input", { type: "file", accept: "image/png,image/jpeg,image/webp", id, "aria-describedby": `${id}-status` });
    const status = el("span", { id: `${id}-status`, "aria-live": "polite" });
    const remover = el("button", { class: "btn btn--fantasma btn--pequeno", type: "button", texto: "Remover foto" });
    const escolher = el("label", { class: "btn btn--linha btn--pequeno", for: id, tabindex: "0", role: "button" }, icone("image-plus", 15), "Escolher foto");
    escolher.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); entrada.click(); } });
    const caixa = el("div", { class: "imagem-campo" }, previa,
      el("div", { class: "imagem-campo__texto" }, el("b", { texto: titulo }), status, el("div", { class: "imagem-campo__botoes" }, escolher, remover)),
      entrada);
    const desenhar = () => {
      U.trocar(previa, imagem ? el("img", { src: imagem, alt: "Prévia da foto" }) : icone("image", 26));
      remover.hidden = !imagem;
      if (!processando) status.textContent = imagem ? "Foto pronta. Ela é salva só neste navegador." : "JPG, PNG ou WebP de até 8 MB. A foto é reduzida antes de salvar.";
    };
    remover.addEventListener("click", () => { imagem = null; entrada.value = ""; desenhar(); if (aoMudar) aoMudar(null); });
    entrada.addEventListener("change", () => {
      const arq = entrada.files && entrada.files[0];
      if (!arq) return;
      if (!/^image\/(png|jpeg|webp)$/.test(arq.type)) { status.textContent = "Formato não aceito. Use JPG, PNG ou WebP."; entrada.value = ""; return; }
      if (arq.size > 8 * 1024 * 1024) { status.textContent = "Arquivo maior que 8 MB. Escolha uma foto menor."; entrada.value = ""; return; }
      processando = true;
      caixa.classList.add("is-processando");
      status.textContent = "Processando a foto…";
      const salvar = botao();
      if (salvar) salvar.disabled = true;
      const leitor = new FileReader();
      const terminar = (msg) => { processando = false; caixa.classList.remove("is-processando"); if (salvar) salvar.disabled = false; desenhar(); if (msg) status.textContent = msg; else if (aoMudar) aoMudar(imagem); };
      leitor.onerror = () => terminar("Não foi possível ler o arquivo.");
      leitor.onload = () => {
        const img = new Image();
        img.onerror = () => terminar("Não foi possível abrir a imagem.");
        img.onload = () => {
          const escala = Math.min(1, lado / Math.max(img.width, img.height));
          const canvas = document.createElement("canvas");
          canvas.width = Math.max(1, Math.round(img.width * escala));
          canvas.height = Math.max(1, Math.round(img.height * escala));
          const ctx = canvas.getContext("2d");
          ctx.fillStyle = "#FFFFFF";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          imagem = canvas.toDataURL("image/jpeg", 0.82);
          terminar();
        };
        img.src = leitor.result;
      };
      leitor.readAsDataURL(arq);
    });
    desenhar();
    return { caixa, valor: () => imagem, ocupado: () => processando };
  }

  /* ---------- Editor da semana (jornada do profissional ou expediente) ----------
     linhas: { 0..6: { marcado, inicio, fim, pausaInicio, pausaFim } } */
  function editorSemana(linhas, { rotuloMarcar = "Trabalha", rotuloDesmarcado = "Folga", padrao = { inicio: "09:00", fim: "18:00" }, nome = "semana" } = {}) {
    const controles = {};
    const errosDia = {};
    const erroGeral = el("p", { class: "form-secao-erro", role: "alert" });
    const ordem = [1, 2, 3, 4, 5, 6, 0];          // segunda a domingo
    const caixa = el("div", { class: "jornada", role: "group", "aria-label": nome === "expediente" ? "Expediente da semana" : "Jornada da semana" },
      el("div", { class: "jornada__cab", "aria-hidden": "true" }, el("span", { texto: "Dia" }), el("span", { texto: "Início" }), el("span", { texto: "Fim" }), el("span"), el("span", { texto: "Intervalo de" }), el("span", { texto: "até" }), el("span")));
    ordem.forEach((dow) => {
      const v = linhas[dow] || {};
      const marcar = el("input", { type: "checkbox", id: `${nome}-${dow}-marcado` });
      marcar.checked = !!v.marcado;
      const hora = (campo, valor, rotulo) => {
        const i = el("input", { type: "time", step: 300, id: `${nome}-${dow}-${campo}`, "aria-label": `${NX.DIAS[dow]}: ${rotulo}`, value: valor || "" });
        return i;
      };
      const ini = hora("inicio", v.inicio || padrao.inicio, "início");
      const fim = hora("fim", v.fim || padrao.fim, "fim");
      const pi = hora("pausaInicio", v.pausaInicio, "início do intervalo (opcional)");
      const pf = hora("pausaFim", v.pausaFim, "fim do intervalo (opcional)");
      const erro = el("p", { class: "jornada__erro", id: `${nome}-${dow}-erro`, role: "alert" });
      errosDia[dow] = erro;
      const estado = el("small", { class: "suave" });
      const linha = el("div", { class: "jornada__linha" },
        el("label", { class: "caixa-marcar", for: marcar.id }, marcar, el("span", {}, el("b", { texto: NX.DIAS[dow] }), " ", estado)),
        el("span", { class: "jornada__campo" }, el("span", { class: "jornada__rotulo-movel", texto: "Início" }), ini),
        el("span", { class: "jornada__campo" }, el("span", { class: "jornada__rotulo-movel", texto: "Fim" }), fim),
        el("span", { class: "jornada__sep", "aria-hidden": "true", texto: "·" }),
        el("span", { class: "jornada__campo" }, el("span", { class: "jornada__rotulo-movel", texto: "Intervalo de" }), pi),
        el("span", { class: "jornada__campo" }, el("span", { class: "jornada__rotulo-movel", texto: "até" }), pf),
        el("span"), erro);
      const atualizar = () => {
        linha.classList.toggle("is-folga", !marcar.checked);
        [ini, fim, pi, pf].forEach((x) => { x.disabled = !marcar.checked; });
        estado.textContent = marcar.checked ? "" : `(${rotuloDesmarcado.toLowerCase()})`;
      };
      marcar.addEventListener("change", atualizar);
      atualizar();
      [ini, fim, pi, pf].forEach((x) => x.setAttribute("aria-describedby", erro.id));
      controles[dow] = { marcar, ini, fim, pi, pf };
      caixa.append(linha);
    });
    caixa.append(erroGeral);
    return {
      caixa,
      valor() {
        return Object.fromEntries(Object.entries(controles).map(([dow, c]) => [dow, { marcado: c.marcar.checked, inicio: c.ini.value, fim: c.fim.value, pausaInicio: c.pi.value, pausaFim: c.pf.value }]));
      },
      erros(mapa, prefixo) {
        Object.entries(errosDia).forEach(([dow, p]) => { p.textContent = mapa[`${prefixo}${dow}`] || ""; });
        erroGeral.textContent = mapa[prefixo] || mapa.geral || "";
        const dow = Object.keys(errosDia).find((k) => mapa[`${prefixo}${k}`]);
        return dow != null ? controles[dow].ini : null;
      },
      rotuloMarcar,
    };
  }

  // Grupo de caixas de marcar (serviços que o profissional realiza)
  function grupoMarcar(itens, marcados, { nome, rotulo }) {
    const erro = el("p", { class: "form-secao-erro", role: "alert", id: `${nome}-erro` });
    const caixas = itens.map((it) => {
      const i = el("input", { type: "checkbox", value: it.valor, id: `${nome}-${it.valor}` });
      i.checked = marcados.includes(it.valor);
      return el("label", { class: "caixa-marcar", for: i.id }, i, el("span", {}, it.rotulo, it.sub ? el("small", { texto: ` ${it.sub}` }) : null));
    });
    const caixa = el("fieldset", { class: "opcoes", "aria-describedby": erro.id }, el("legend", { texto: rotulo }), el("div", { class: "marcar-grade" }, ...caixas), erro);
    return { caixa, valor: () => caixas.map((c) => c.querySelector("input")).filter((i) => i.checked).map((i) => i.value), erro: (t) => { erro.textContent = t || ""; } };
  }

  // Lista de datas (folgas do profissional)
  function listaDatas(iniciais, { rotulo, ajuda }) {
    let datas = [...iniciais].filter((x) => x >= U.somarDias(U.hoje(), -60)).sort();
    const lista = el("div", { class: "datas-lista", "aria-live": "polite" });
    const entrada = el("input", { type: "date", min: U.hoje(), max: U.somarDias(U.hoje(), 366), "aria-label": "Data da folga" });
    const erro = el("p", { class: "form-secao-erro", role: "alert" });
    const desenhar = () => {
      U.trocar(lista, ...(datas.length ? datas.map((dt) => el("span", { class: "data-chip" }, U.dataCompleta(dt), el("button", { type: "button", "aria-label": `Remover folga de ${U.dataCompleta(dt)}`, onclick: () => { datas = datas.filter((x) => x !== dt); desenhar(); } }, icone("x", 13)))) : [el("span", { class: "suave", texto: "Nenhuma folga avulsa marcada." })]));
    };
    const adicionar = el("button", { class: "btn btn--linha btn--pequeno", type: "button", onclick: () => {
      erro.textContent = "";
      if (!U.dataValida(entrada.value)) { erro.textContent = "Escolha a data."; entrada.focus(); return; }
      if (entrada.value < U.hoje()) { erro.textContent = "Escolha uma data de hoje em diante."; return; }
      if (datas.includes(entrada.value)) { erro.textContent = "Esta data já está na lista."; return; }
      datas = [...datas, entrada.value].sort();
      entrada.value = "";
      desenhar();
    } }, icone("plus", 15), "Adicionar folga");
    desenhar();
    return { caixa: el("div", {}, el("p", { class: "subtitulo-form" }, rotulo, ajuda ? el("small", { texto: ajuda }) : null), lista, el("div", { class: "adicionar-data", style: { marginTop: "8px" } }, entrada, adicionar), erro), valor: () => datas };
  }

  /* ======================================================================
     CLIENTE
     ====================================================================== */
  function formCliente({ id, aoCriar } = {}) {
    const c = id ? L.cliente(id) : null;
    U.formulario({
      titulo: c ? "Editar cliente" : "Novo cliente",
      descricao: el("span", { texto: "Guarde só o necessário para o atendimento: nome e telefone. O e-mail é opcional." }),
      campos: [
        { nome: "nome", rotulo: "Nome", obrigatorio: true, valor: c?.nome, max: 80, largura: "inteira", autocomplete: "off" },
        { nome: "telefone", rotulo: "Telefone (WhatsApp)", tipo: "tel", obrigatorio: true, valor: c ? U.mascaraTelefone(c.telefone) : "", placeholder: "(00) 00000-0000", max: 16 },
        { nome: "email", rotulo: "E-mail", tipo: "email", valor: c?.email, max: 120 },
        { nome: "observacoes", rotulo: "Observações", tipo: "textarea", valor: c?.observacoes, max: 500, largura: "inteira", placeholder: "Ex.: preferências, alergias informadas pelo cliente" },
      ],
      aoSalvar: (v) => {
        const r = L.salvarCliente(v, id);
        if (r.ok) { U.aviso(c ? "Cliente atualizado." : `Cliente ${v.nome.trim()} cadastrado.`); if (!c && aoCriar) aoCriar(r.id); }
        return r;
      },
    });
  }

  /* ======================================================================
     SERVIÇO
     ====================================================================== */
  function formServico({ id } = {}) {
    const s = id ? L.servico(id) : null;
    const imagem = campoImagem(s ? s.imagem : null, { titulo: "Foto do serviço (opcional)" });
    const reservasFuturas = s ? L.dados.agendamentos.filter((a) => a.servicoId === s.id && ["pendente", "confirmado"].includes(a.status) && `${a.data}T${a.inicio}` > U.agora()).length : 0;
    U.formulario({
      titulo: s ? "Editar serviço" : "Novo serviço",
      descricao: s ? el("span", {}, "Reservas já feitas guardam o preço e a duração da época em que foram marcadas.", reservasFuturas ? ` Este serviço tem ${U.plural(reservasFuturas, "reserva futura", "reservas futuras")}: elas não mudam.` : "") : null,
      largura: "larga",
      campos: [
        { nome: "nome", rotulo: "Nome", obrigatorio: true, valor: s?.nome, max: 60 },
        { nome: "categoria", rotulo: "Categoria", obrigatorio: true, valor: s?.categoria, max: 30, ajuda: `Existentes: ${L.categorias().join(", ")}` },
        { nome: "preco", rotulo: "Preço (R$)", tipo: "dinheiro", obrigatorio: true, valor: s ? U.decimal(s.preco) : "" },
        { nome: "duracao", rotulo: "Duração (minutos)", tipo: "inteiro", obrigatorio: true, valor: s ? String(s.duracao) : "", ajuda: "Múltiplos de 5. A agenda reserva esse tempo inteiro." },
        { nome: "descricao", rotulo: "Descrição", tipo: "textarea", valor: s?.descricao, max: 300, largura: "inteira", placeholder: "Aparece na página de agendamento" },
      ],
      extra: imagem.caixa,
      aoSalvar: (v) => {
        if (imagem.ocupado()) return { ok: false, erro: "Espere a foto terminar de processar." };
        const r = L.salvarServico({ ...v, imagem: imagem.valor() }, id);
        if (r.ok) U.aviso(s ? "Serviço atualizado." : `Serviço ${v.nome.trim()} criado. Agora marque quais profissionais o realizam.`);
        return r;
      },
    });
  }
  async function alternarServico(id) {
    const s = L.servico(id);
    if (!s) return;
    if (s.status === "ativo") {
      const futuras = L.dados.agendamentos.filter((a) => a.servicoId === id && ["pendente", "confirmado"].includes(a.status) && `${a.data}T${a.inicio}` > U.agora()).length;
      const ok = await U.confirmar({ titulo: `Desativar ${s.nome}?`, texto: `O serviço deixa de aparecer para novas reservas no painel e na página de agendamento. O histórico continua nos relatórios.${futuras ? ` As ${U.plural(futuras, "reserva futura", "reservas futuras")} deste serviço continuam valendo.` : ""}`, rotulo: "Desativar" });
      if (!ok) return;
    }
    const r = L.alternarServico(id);
    if (!r.ok) { U.aviso(r.erro, "erro"); return; }
    const semProf = r.status === "ativo" && !L.dados.profissionais.some((p) => p.status === "ativo" && p.servicos.includes(id));
    U.aviso(r.status === "ativo" ? (semProf ? `${s.nome} ativado, mas nenhum profissional ativo o realiza: ele ainda não aparece para reservas.` : `${s.nome} ativado: já aceita reservas.`) : `${s.nome} desativado: não recebe novas reservas.`, semProf ? "info" : "ok");
  }

  /* ======================================================================
     PROFISSIONAL
     ====================================================================== */
  const jornadaParaLinhas = (jornada) => Object.fromEntries([0, 1, 2, 3, 4, 5, 6].map((dow) => {
    const j = jornada ? jornada[dow] : null;
    return [dow, j ? { marcado: true, inicio: j.inicio, fim: j.fim, pausaInicio: j.pausa ? j.pausa.inicio : "", pausaFim: j.pausa ? j.pausa.fim : "" } : { marcado: false }];
  }));
  // Reservas futuras que deixariam de caber com a mudança (nada é cancelado: só avisa)
  function reservasForaDaRegra(dadosSimulados, filtro) {
    return R.afetados(L.dados, filtro).filter((a) => !R.verificar(dadosSimulados, { servicoId: a.servicoId, profissionalId: a.profissionalId, data: a.data, inicio: a.inicio, ignorarId: a.id, contexto: "painel" }).ok);
  }
  const listaAfetadas = (lista) => lista.slice(0, 4).map((a) => `${U.dataCurta(a.data)} ${a.inicio} (${C().nomeDoCliente(a.clienteId).split(" ")[0]})`).join(", ") + (lista.length > 4 ? ` e mais ${lista.length - 4}` : "");

  function formProfissional({ id } = {}) {
    const p = id ? L.profissional(id) : null;
    const foto = campoImagem(p ? p.foto : null, { titulo: "Foto do profissional (opcional)", lado: 240 });
    const semana = editorSemana(jornadaParaLinhas(p ? p.jornada : { 2: { inicio: "09:00", fim: "18:00", pausa: { inicio: "12:00", fim: "13:00" } }, 3: { inicio: "09:00", fim: "18:00", pausa: { inicio: "12:00", fim: "13:00" } }, 4: { inicio: "09:00", fim: "18:00", pausa: { inicio: "12:00", fim: "13:00" } }, 5: { inicio: "09:00", fim: "18:00", pausa: { inicio: "12:00", fim: "13:00" } }, 6: { inicio: "09:00", fim: "18:00", pausa: { inicio: "12:00", fim: "13:00" } } }), { nome: "jornada" });
    const servicos = grupoMarcar(L.dados.servicos.map((s) => ({ valor: s.id, rotulo: s.nome, sub: s.status === "ativo" ? `${s.duracao} min` : "(inativo)" })), p ? p.servicos : [], { nome: "servicos", rotulo: "Serviços que realiza *" });
    const folgas = listaDatas(p ? p.folgas || [] : [], { rotulo: "Folgas avulsas", ajuda: "Dias específicos sem atendimento (além dos dias da semana desmarcados)." });
    let avisado = "";
    const extra = el("div", {},
      el("p", { class: "subtitulo-form" }, "Jornada semanal", el("small", { texto: "Só vale dentro do expediente do estabelecimento." })),
      semana.caixa,
      el("div", { style: { marginTop: "14px" } }, servicos.caixa),
      folgas.caixa,
      foto.caixa);
    U.formulario({
      titulo: p ? `Editar ${p.nome}` : "Novo profissional",
      largura: "larga",
      campos: [
        { nome: "nome", rotulo: "Nome", obrigatorio: true, valor: p?.nome, max: 60 },
        { nome: "especialidades", rotulo: "Especialidades", obrigatorio: true, valor: p ? p.especialidades.join(", ") : "", max: 120, ajuda: "Separe por vírgula. Ex.: Barbeiro, Cortes clássicos", largura: "inteira" },
      ],
      extra,
      aoSalvar: (v) => {
        if (foto.ocupado()) return { ok: false, erro: "Espere a foto terminar de processar." };
        const linhas = semana.valor();
        const jornadaEntrada = Object.fromEntries(Object.entries(linhas).map(([dow, x]) => [dow, { trabalha: x.marcado, inicio: x.inicio, fim: x.fim, pausaInicio: x.pausaInicio, pausaFim: x.pausaFim }]));
        const dadosForm = { ...v, servicos: servicos.valor(), jornada: jornadaEntrada, folgas: folgas.valor(), foto: foto.valor() };
        // Validação completa sem gravar (usa a mesma função da loja numa cópia)
        servicos.erro("");
        semana.erros({}, "jornada");
        if (p) {
          const jornadaSim = Object.fromEntries(Object.entries(linhas).map(([dow, x]) => [dow, x.marcado ? { inicio: x.inicio, fim: x.fim, pausa: x.pausaInicio && x.pausaFim ? { inicio: x.pausaInicio, fim: x.pausaFim } : null } : null]));
          const sim = { ...L.dados, profissionais: L.dados.profissionais.map((x) => (x.id === p.id ? { ...x, jornada: jornadaSim, servicos: dadosForm.servicos, folgas: dadosForm.folgas } : x)) };
          const fora = reservasForaDaRegra(sim, (a) => a.profissionalId === p.id);
          const chave = fora.map((a) => a.id).join(",");
          if (fora.length && avisado !== chave && Object.values(linhas).every((x) => !x.marcado || (U.horaValida(x.inicio) && U.horaValida(x.fim) && x.inicio < x.fim))) {
            avisado = chave;
            return { ok: false, erro: `Atenção: ${U.plural(fora.length, "reserva futura fica", "reservas futuras ficam")} fora da nova jornada ou dos serviços marcados: ${listaAfetadas(fora)}. Elas NÃO são canceladas automaticamente. Clique em Salvar de novo para confirmar e depois reagende-as.` };
          }
        }
        const r = L.salvarProfissional(dadosForm, id);
        if (!r.ok) {
          const e = r.erros || {};
          servicos.erro(e.servicos);
          const alvo = semana.erros(e, "jornada");
          if (!e.nome && !e.especialidades && alvo) alvo.focus();
          return { ok: false, erros: e, erro: "Confira os campos destacados." };
        }
        U.aviso(p ? "Profissional atualizado." : `${v.nome.trim()} cadastrado e disponível para reservas.`);
        return r;
      },
    });
  }
  async function alternarProfissional(id) {
    const p = L.profissional(id);
    if (!p) return;
    if (p.status === "ativo") {
      const futuras = R.afetados(L.dados, (a) => a.profissionalId === id);
      const ok = await U.confirmar({
        titulo: `Inativar ${p.nome}?`,
        texto: `${p.nome.split(" ")[0]} deixa de receber reservas no painel e na página de agendamento. O histórico continua nos relatórios.${futuras.length ? ` Atenção: há ${U.plural(futuras.length, "reserva futura", "reservas futuras")} com ${p.nome.split(" ")[0]} (${listaAfetadas(futuras)}). Elas não são canceladas: reagende ou cancele cada uma.` : ""}`,
        rotulo: "Inativar", perigo: futuras.length > 0,
        exigirCiencia: futuras.length ? "Entendo que as reservas futuras precisam ser reagendadas por mim." : undefined,
      });
      if (!ok) return;
    }
    const r = L.alternarProfissional(id);
    U.aviso(r.status === "ativo" ? `${p.nome} ativo de novo: volta a aparecer para reservas.` : `${p.nome} inativo: não recebe novas reservas.`);
  }

  /* ======================================================================
     BLOQUEIO E FERIADO
     ====================================================================== */
  function formBloqueio(pre = {}) {
    let avisado = "";
    U.formulario({
      titulo: "Bloquear horário",
      descricao: el("span", { texto: "Use para cursos, consultas, manutenção ou qualquer período sem atendimento. O horário bloqueado some da agenda de reservas." }),
      campos: [
        { nome: "profissionalId", rotulo: "Quem fica bloqueado", tipo: "select", opcoes: C().opcoesProfissionais({ todos: "Todos os profissionais (estabelecimento)" }), valor: pre.profissionalId || "", largura: "inteira" },
        { nome: "data", rotulo: "Data", tipo: "date", obrigatorio: true, valor: pre.data || U.hoje(), min: U.hoje(), max: U.somarDias(U.hoje(), 366) },
        { nome: "diaInteiro", rotulo: "Dia inteiro", tipo: "checkbox", valor: false, aoMudar: (marcado, form) => { form.elements.inicio.disabled = marcado; form.elements.fim.disabled = marcado; } },
        { nome: "inicio", rotulo: "Início", tipo: "time", valor: pre.inicio || "14:00" },
        { nome: "fim", rotulo: "Fim", tipo: "time", valor: pre.fim || "16:00" },
        { nome: "motivo", rotulo: "Motivo", obrigatorio: true, max: 80, largura: "inteira", placeholder: "Ex.: curso de atualização" },
      ],
      rotuloSalvar: "Bloquear",
      aoSalvar: (v) => {
        const { erros, limpo } = L.validarBloqueio(v);
        if (Object.keys(erros).length) return { ok: false, erros };
        const sim = { ...L.dados, bloqueios: [...L.dados.bloqueios, { id: "simulado", ...limpo }] };
        const fora = reservasForaDaRegra(sim, (a) => a.data === limpo.data && (!limpo.profissionalId || a.profissionalId === limpo.profissionalId));
        const chave = fora.map((a) => a.id).join(",");
        if (fora.length && avisado !== chave) {
          avisado = chave;
          return { ok: false, erro: `Já existem ${U.plural(fora.length, "reserva", "reservas")} neste período: ${listaAfetadas(fora)}. O bloqueio não as cancela. Clique em Bloquear de novo para confirmar e depois reagende-as.` };
        }
        const r = L.adicionarBloqueio(v);
        if (r.ok) U.aviso(`Horário bloqueado em ${U.dataCurta(limpo.data)}.`);
        return r;
      },
    });
  }
  function formFeriado() {
    let avisado = "";
    U.formulario({
      titulo: "Adicionar feriado ou dia fechado",
      descricao: el("span", { texto: "Nesse dia ninguém recebe reservas (painel e página)." }),
      campos: [
        { nome: "data", rotulo: "Data", tipo: "date", obrigatorio: true, min: U.hoje(), max: U.somarDias(U.hoje(), 730) },
        { nome: "nome", rotulo: "Nome", obrigatorio: true, max: 60, placeholder: "Ex.: Aniversário da cidade" },
      ],
      rotuloSalvar: "Adicionar",
      aoSalvar: (v) => {
        const fora = U.dataValida(v.data) ? R.afetados(L.dados, (a) => a.data === v.data) : [];
        if (fora.length && avisado !== v.data && !L.dados.feriados.some((f) => f.data === v.data)) {
          avisado = v.data;
          return { ok: false, erro: `Há ${U.plural(fora.length, "reserva ativa", "reservas ativas")} nesse dia: ${listaAfetadas(fora)}. Elas não são canceladas. Clique em Adicionar de novo para confirmar e depois reagende-as.` };
        }
        const r = L.adicionarFeriado(v);
        if (r.ok) U.aviso(`${v.nome} adicionado: ${U.dataCompleta(v.data)} fechado para reservas.`);
        return r;
      },
    });
  }

  NX.form = { cliente: formCliente, servico: formServico, profissional: formProfissional, bloqueio: formBloqueio, feriado: formFeriado };
  NX.acoes = { alternarServico, alternarProfissional };
  NX.editores = { campoImagem, editorSemana, reservasForaDaRegra, listaAfetadas };
})();
