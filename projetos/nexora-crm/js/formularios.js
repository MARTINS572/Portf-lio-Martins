/* ==========================================================================
   NEXORA CRM — formularios.js
   Formulários de cadastro/edição, janelas de detalhes e ações que várias
   telas usam (ex.: mover uma oportunidade de etapa).
   ========================================================================== */
window.NX = window.NX || {};

(function () {
  "use strict";
  const U = NX.util;
  const L = NX.loja;
  const { el, icone } = U;

  NX.ir = (rota) => { if (location.hash !== `#/${rota}`) location.hash = `#/${rota}`; };

  /* ---------- Opções reutilizadas ---------- */
  const opcoesEquipe = () => L.dados.equipe.map((u) => ({ valor: u.id, rotulo: u.nome }));
  function opcoesVinculo() {
    const clientes = [...L.dados.clientes].sort((a, b) => a.empresa.localeCompare(b.empresa, "pt-BR"))
      .map((c) => ({ valor: `cliente:${c.id}`, rotulo: `${c.empresa} · ${c.nome}`, grupo: "Clientes" }));
    const leads = L.dados.leads.filter((l) => l.status !== "Convertido").sort((a, b) => a.empresa.localeCompare(b.empresa, "pt-BR"))
      .map((l) => ({ valor: `lead:${l.id}`, rotulo: `${l.empresa} · ${l.nome}`, grupo: "Leads" }));
    return [...clientes, ...leads];
  }
  const nomeEtapa = (id) => L.etapa(id).nome;

  /* ---------- Formulários ---------- */
  function formLead(id) {
    const l = id ? L.lead(id) : null;
    U.formulario({
      titulo: l ? "Editar lead" : "Novo lead",
      descricao: l ? null : "Campos com * são obrigatórios. Os dados ficam só neste navegador.",
      rotuloSalvar: l ? "Salvar alterações" : "Cadastrar lead",
      campos: [
        { nome: "nome", rotulo: "Nome completo", obrigatorio: true, valor: l?.nome, autocomplete: "off" },
        { nome: "empresa", rotulo: "Empresa", obrigatorio: true, valor: l?.empresa },
        { nome: "email", rotulo: "E-mail", tipo: "email", obrigatorio: true, valor: l?.email },
        { nome: "telefone", rotulo: "Telefone", tipo: "tel", obrigatorio: true, valor: l?.telefone, placeholder: "(00) 00000-0000" },
        { nome: "origem", rotulo: "Origem do contato", tipo: "select", opcoes: NX.ORIGENS, obrigatorio: true, valor: l?.origem, vazio: "Escolha…" },
        { nome: "interesse", rotulo: "Interesse", tipo: "select", opcoes: NX.SERVICOS, obrigatorio: true, valor: l?.interesse, vazio: "Escolha…" },
        { nome: "valor", rotulo: "Valor estimado (R$)", obrigatorio: true, valor: l ? String(l.valor).replace(".", ",") : "", tipo: "text", placeholder: "Ex.: 8.500", ajuda: "Quanto a oportunidade pode valer." },
        { nome: "responsavelId", rotulo: "Responsável", tipo: "select", opcoes: opcoesEquipe(), obrigatorio: true, valor: l?.responsavelId || L.dados.perfil.id },
        { nome: "primeiroContato", rotulo: "Primeiro contato", tipo: "date", obrigatorio: true, valor: l?.primeiroContato || U.hoje(), max: U.hoje() },
        { nome: "status", rotulo: "Status", tipo: "select", opcoes: NX.STATUS_LEAD, obrigatorio: true, valor: l?.status || "Novo" },
        { nome: "observacoes", rotulo: "Observações", tipo: "textarea", largura: "inteira", valor: l?.observacoes },
      ],
      aoSalvar: (v) => {
        const r = L.salvarLead({ ...v, id });
        if (r.ok) U.aviso(l ? "Lead atualizado." : `Lead ${r.registro.nome} cadastrado.`);
        return r;
      },
    });
  }

  function formCliente(id) {
    const c = id ? L.cliente(id) : null;
    U.formulario({
      titulo: c ? "Editar cliente" : "Novo cliente",
      rotuloSalvar: c ? "Salvar alterações" : "Cadastrar cliente",
      campos: [
        { nome: "nome", rotulo: "Nome do contato", obrigatorio: true, valor: c?.nome },
        { nome: "empresa", rotulo: "Empresa", obrigatorio: true, valor: c?.empresa },
        { nome: "email", rotulo: "E-mail", tipo: "email", obrigatorio: true, valor: c?.email },
        { nome: "telefone", rotulo: "Telefone", tipo: "tel", obrigatorio: true, valor: c?.telefone, placeholder: "(00) 00000-0000" },
        { nome: "categoria", rotulo: "Categoria", tipo: "select", opcoes: NX.CATEGORIAS, obrigatorio: true, valor: c?.categoria, vazio: "Escolha…" },
        { nome: "status", rotulo: "Status", tipo: "select", opcoes: NX.STATUS_CLIENTE, obrigatorio: true, valor: c?.status || "Ativo" },
        { nome: "responsavelId", rotulo: "Responsável pela conta", tipo: "select", opcoes: opcoesEquipe(), obrigatorio: true, valor: c?.responsavelId || L.dados.perfil.id },
      ],
      aoSalvar: (v) => {
        const r = L.salvarCliente({ ...v, id });
        if (r.ok) {
          U.aviso(c ? "Cliente atualizado." : `Cliente ${r.registro.empresa} cadastrado.`);
          if (!c) NX.ir(`clientes/${r.registro.id}`);
        }
        return r;
      },
    });
  }

  function formNegocio({ id, vinculo, etapa } = {}) {
    const n = id ? L.negocio(id) : null;
    const vinculoAtual = n ? (n.clienteId ? `cliente:${n.clienteId}` : `lead:${n.leadId}`) : vinculo;
    const titulos = NX.SERVICOS.includes(n?.titulo) || !n ? NX.SERVICOS : [n.titulo, ...NX.SERVICOS];
    const campos = [
      { nome: "titulo", rotulo: "Serviço", tipo: "select", opcoes: titulos, obrigatorio: true, valor: n?.titulo, vazio: "Escolha…" },
      { nome: "vinculo", rotulo: "Cliente ou lead", tipo: "select", opcoes: opcoesVinculo(), obrigatorio: true, valor: vinculoAtual, vazio: "Escolha…", largura: "inteira" },
      { nome: "valor", rotulo: "Valor estimado (R$)", obrigatorio: true, valor: n ? String(n.valor).replace(".", ",") : "", placeholder: "Ex.: 12.000" },
      { nome: "responsavelId", rotulo: "Responsável", tipo: "select", opcoes: opcoesEquipe(), obrigatorio: true, valor: n?.responsavelId || L.dados.perfil.id },
      { nome: "etapa", rotulo: "Etapa", tipo: "select", obrigatorio: true, valor: n?.etapa || etapa || "novo",
        opcoes: (n ? NX.ETAPAS : NX.ETAPAS.filter((e) => NX.ETAPAS_ABERTAS.includes(e.id))).map((e) => ({ valor: e.id, rotulo: e.nome })) },
    ];
    if (n) campos.push({ nome: "motivo", rotulo: "Motivo da perda", tipo: "select", opcoes: NX.MOTIVOS_PERDA, valor: n.motivoPerda, vazio: "—", ajuda: "Só para venda perdida." });
    U.formulario({
      titulo: n ? "Editar oportunidade" : "Nova oportunidade",
      rotuloSalvar: n ? "Salvar alterações" : "Criar oportunidade",
      campos,
      aoSalvar: (v) => {
        const r = L.salvarNegocio({ ...v, id });
        if (r.ok) U.aviso(n ? "Oportunidade atualizada." : `Oportunidade criada em "${nomeEtapa(r.registro.etapa)}".`);
        return r;
      },
    });
  }

  function formTarefa({ id, vinculo } = {}) {
    const t = id ? L.tarefa(id) : null;
    U.formulario({
      titulo: t ? "Editar tarefa" : "Nova tarefa",
      rotuloSalvar: t ? "Salvar alterações" : "Criar tarefa",
      campos: [
        { nome: "titulo", rotulo: "Título", obrigatorio: true, valor: t?.titulo, largura: "inteira", placeholder: "Ex.: Ligar para confirmar a reunião" },
        { nome: "vinculo", rotulo: "Lead ou cliente", tipo: "select", opcoes: opcoesVinculo(), obrigatorio: true, valor: t ? `${t.vinculo.tipo}:${t.vinculo.id}` : vinculo, vazio: "Escolha…", largura: "inteira" },
        { nome: "prazo", rotulo: "Prazo", tipo: "date", obrigatorio: true, valor: t?.prazo || U.somarDias(U.hoje(), 1), min: t ? null : U.hoje() },
        { nome: "prioridade", rotulo: "Prioridade", tipo: "select", opcoes: NX.PRIORIDADES, obrigatorio: true, valor: t?.prioridade || "Média" },
        { nome: "responsavelId", rotulo: "Responsável", tipo: "select", opcoes: opcoesEquipe(), obrigatorio: true, valor: t?.responsavelId || L.dados.perfil.id },
        { nome: "descricao", rotulo: "Descrição", tipo: "textarea", largura: "inteira", valor: t?.descricao },
      ],
      aoSalvar: (v) => {
        const r = L.salvarTarefa({ ...v, id });
        if (r.ok) U.aviso(t ? "Tarefa atualizada." : `Tarefa criada para ${U.relativo(r.registro.prazo)}.`);
        return r;
      },
    });
  }

  function formObservacao(clienteId) {
    U.formulario({
      titulo: "Adicionar observação",
      rotuloSalvar: "Adicionar",
      campos: [{ nome: "texto", rotulo: "Observação", tipo: "textarea", obrigatorio: true, largura: "inteira", linhas: 4 }],
      aoSalvar: (v) => { const r = L.adicionarObservacao(clienteId, v.texto); if (r.ok) U.aviso("Observação adicionada."); return r; },
    });
  }

  function formContato(clienteId) {
    U.formulario({
      titulo: "Registrar contato",
      descricao: "O contato entra no histórico do cliente e atualiza a última interação das oportunidades abertas.",
      rotuloSalvar: "Registrar",
      campos: [
        { nome: "tipo", rotulo: "Tipo", tipo: "select", opcoes: NX.TIPOS_CONTATO, obrigatorio: true, valor: "Ligação" },
        { nome: "data", rotulo: "Data", tipo: "date", obrigatorio: true, valor: U.hoje(), max: U.hoje() },
        { nome: "resumo", rotulo: "Resumo", tipo: "textarea", obrigatorio: true, largura: "inteira" },
      ],
      aoSalvar: (v) => { const r = L.registrarContato(clienteId, v); if (r.ok) U.aviso("Contato registrado no histórico."); return r; },
    });
  }

  // Pergunta o motivo da perda. Devolve uma promessa com o motivo (ou null se cancelar).
  function pedirMotivo(negocio) {
    return new Promise((resolver) => {
      let motivo = null;
      const dlg = U.formulario({
        titulo: "Registrar venda perdida",
        descricao: `${negocio.titulo} · ${negocio.empresa} · ${U.moeda(negocio.valor, { compacto: false })}`,
        rotuloSalvar: "Marcar como perdida",
        campos: [
          { nome: "motivo", rotulo: "Motivo", tipo: "select", opcoes: NX.MOTIVOS_PERDA, obrigatorio: true, vazio: "Escolha…" },
          { nome: "detalhe", rotulo: "Detalhe", tipo: "textarea", linhas: 2, largura: "inteira", placeholder: "Ex.: fechou com uma agência local" },
        ],
        aoSalvar: (v) => { motivo = { motivo: v.motivo, detalhe: v.detalhe }; return { ok: true }; },
      });
      dlg.addEventListener("close", () => resolver(motivo), { once: true });
    });
  }

  /* ---------- Ações compartilhadas ---------- */
  // Move uma oportunidade (pipeline, menu do cartão ou janela de detalhes)
  async function mover(id, destino) {
    const n = L.negocio(id);
    if (!n || n.etapa === destino) return false;
    let perda = null;
    if (destino === "perdido") {
      perda = await pedirMotivo(n);
      if (!perda) { U.aviso("Movimento cancelado: a oportunidade continua onde estava.", "info"); return false; }
    }
    const motivoCategoria = perda ? perda.motivo : undefined;
    const r = L.moverNegocio(id, destino, { motivo: motivoCategoria, detalhe: perda ? perda.detalhe : null });
    if (!r.ok) { U.aviso(r.erro, "erro"); return false; }
    if (destino === "ganho") {
      U.aviso(r.convertido ? `Venda concluída! ${r.convertido.empresa} agora é cliente.` : `Venda concluída: ${U.moeda(n.valor, { compacto: false })} registrados.`);
    } else if (destino === "perdido") {
      U.aviso(`Venda marcada como perdida (${motivoCategoria}).`, "info");
    } else {
      U.aviso(`${n.empresa} movida para "${nomeEtapa(destino)}".`);
    }
    return true;
  }

  async function excluirLead(id) {
    const l = L.lead(id);
    if (!l) return false;
    const abertos = L.dados.negocios.filter((n) => n.leadId === id && L.aberto(n)).length;
    const ok = await U.confirmar({
      titulo: "Excluir lead?",
      texto: `${l.nome} (${l.empresa}) será removido${abertos ? `, junto com ${U.plural(abertos, "oportunidade aberta", "oportunidades abertas")} no pipeline` : ""} e as tarefas ligadas a ele. Esta ação não pode ser desfeita.`,
      rotulo: "Excluir lead", perigo: true,
    });
    if (!ok) return false;
    L.excluirLead(id);
    U.aviso("Lead excluído.");
    return true;
  }

  /* ---------- Janela de detalhes ---------- */
  function linhaDetalhe(rotulo, valor) {
    return el("div", { class: "ficha__linha" }, el("dt", { texto: rotulo }), el("dd", {}, valor ?? "—"));
  }
  function pilulaStatusLead(status) {
    const classe = { "Novo": "azul", "Em contato": "neutro", "Qualificado": "roxo", "Convertido": "verde", "Descartado": "cinza" }[status] || "neutro";
    return el("span", { class: `pilula pilula--${classe}`, texto: status });
  }
  function pilulaEtapa(id) {
    const classe = id === "ganho" ? "verde" : id === "perdido" ? "vermelho" : "azul";
    return el("span", { class: `pilula pilula--${classe}` }, nomeEtapa(id));
  }
  function avatar(id, tamanho = "p") {
    const u = L.membro(id);
    return el("span", { class: `avatar avatar--${tamanho} avatar--${id}`, title: u.nome, "aria-hidden": "true", texto: U.iniciais(u.nome) });
  }
  function pessoaComAvatar(id) {
    return el("span", { class: "pessoa" }, avatar(id), el("span", { texto: L.membro(id).nome }));
  }

  function listaRelacionada(titulo, itens, vazio) {
    return el("section", { class: "relacionados" },
      el("h3", { class: "relacionados__titulo", texto: titulo }),
      itens.length ? el("ul", { class: "relacionados__lista" }, ...itens) : el("p", { class: "vazio-pequeno", texto: vazio }));
  }

  function abrirDetalhe({ tipo, titulo, corpo, botoes }) {
    const dlg = U.$("#dlg-detalhe");
    U.$("#detalhe-tipo").textContent = tipo;
    U.$("#detalhe-titulo").textContent = titulo;
    U.$("#detalhe-corpo").replaceChildren(...corpo);
    U.$("#detalhe-botoes").replaceChildren(...botoes);
    if (!dlg.open) dlg.showModal();
    return dlg;
  }
  const botao = (texto, classe, acao, nomeIcone) => el("button", { class: `btn ${classe}`, type: "button", onclick: acao }, nomeIcone ? icone(nomeIcone, 16) : null, texto);
  const fecharDetalhe = () => { const d = U.$("#dlg-detalhe"); if (d.open) d.close(); };

  function detalheLead(id) {
    const l = L.lead(id);
    if (!l) { U.aviso("Este lead não existe mais.", "erro"); return; }
    const negocios = L.dados.negocios.filter((n) => n.leadId === id || (l.clienteId && n.clienteId === l.clienteId));
    const tarefas = L.dados.tarefas.filter((t) => t.vinculo.tipo === "lead" && t.vinculo.id === id);
    const corpo = [
      el("dl", { class: "ficha" },
        linhaDetalhe("Empresa", l.empresa),
        linhaDetalhe("Status", pilulaStatusLead(l.status)),
        linhaDetalhe("E-mail", el("span", { class: "mono", texto: l.email })),
        linhaDetalhe("Telefone", el("span", { class: "mono", texto: l.telefone })),
        linhaDetalhe("Origem", l.origem),
        linhaDetalhe("Interesse", l.interesse),
        linhaDetalhe("Valor estimado", U.moeda(l.valor, { compacto: false })),
        linhaDetalhe("Responsável", pessoaComAvatar(l.responsavelId)),
        linhaDetalhe("Primeiro contato", `${U.dataCompleta(l.primeiroContato)} (${U.relativo(l.primeiroContato)})`),
        el("div", { class: "ficha__linha ficha__linha--inteira" }, el("dt", { texto: "Observações" }), el("dd", { texto: l.observacoes || "Sem observações." }))),
      listaRelacionada("Oportunidades", negocios.map((n) => el("li", {}, el("button", { class: "relacionado", type: "button", onclick: () => detalheNegocio(n.id) }, el("span", { texto: n.titulo }), pilulaEtapa(n.etapa), el("b", { class: "mono", texto: U.moeda(n.valor) })))), "Nenhuma oportunidade ainda."),
      listaRelacionada("Tarefas", tarefas.map((t) => el("li", { class: "relacionado relacionado--texto" }, el("span", { texto: t.titulo }), el("span", { class: `situacao situacao--${L.situacaoDaTarefa(t)}`, texto: t.concluida ? "Concluída" : U.relativo(t.prazo) }))), "Nenhuma tarefa."),
    ];
    const botoes = [
      botao("Excluir", "btn--perigo", async () => { fecharDetalhe(); await excluirLead(id); }, "trash"),
      el("span", { class: "janela__espaco" }),
      botao("Nova tarefa", "btn--linha", () => { fecharDetalhe(); formTarefa({ vinculo: `lead:${id}` }); }, "list-checks"),
      l.status !== "Convertido" ? botao("Criar oportunidade", "btn--linha", () => { fecharDetalhe(); formNegocio({ vinculo: `lead:${id}` }); }, "handshake") : null,
      l.status === "Convertido" && l.clienteId
        ? botao("Ver cliente", "btn--linha", () => { fecharDetalhe(); NX.ir(`clientes/${l.clienteId}`); }, "building")
        : botao("Converter em cliente", "btn--linha", () => {
          const r = L.converterLead(id);
          if (r.ok) { fecharDetalhe(); U.aviso(`${r.cliente.empresa} agora é cliente.`); NX.ir(`clientes/${r.cliente.id}`); }
        }, "circle-check"),
      botao("Editar", "btn--primario", () => { fecharDetalhe(); formLead(id); }, "pencil"),
    ].filter(Boolean);
    abrirDetalhe({ tipo: "Lead", titulo: l.nome, corpo, botoes });
  }

  function detalheNegocio(id) {
    const n = L.negocio(id);
    if (!n) { U.aviso("Esta oportunidade não existe mais.", "erro"); return; }
    const alvo = n.clienteId ? L.cliente(n.clienteId) : L.lead(n.leadId);
    const tarefas = L.dados.tarefas.filter((t) => (n.clienteId && t.vinculo.tipo === "cliente" && t.vinculo.id === n.clienteId) || (n.leadId && t.vinculo.tipo === "lead" && t.vinculo.id === n.leadId));
    const seletor = el("select", { id: "mover-etapa", "aria-label": "Mover para a etapa" }, ...NX.ETAPAS.map((e) => { const o = el("option", { value: e.id, texto: e.nome }); if (e.id === n.etapa) o.selected = true; return o; }));
    const corpo = [
      el("dl", { class: "ficha" },
        linhaDetalhe(n.clienteId ? "Cliente" : "Lead", alvo ? `${alvo.nome} · ${alvo.empresa}` : n.empresa),
        linhaDetalhe("Etapa", pilulaEtapa(n.etapa)),
        linhaDetalhe("Valor estimado", U.moeda(n.valor, { compacto: false })),
        linhaDetalhe("Responsável", pessoaComAvatar(n.responsavelId)),
        linhaDetalhe("Criada em", U.dataCompleta(n.criadoEm)),
        linhaDetalhe("Última interação", `${U.dataCompleta(n.ultimaInteracao)} (${U.relativo(n.ultimaInteracao)})`),
        n.fechadoEm ? linhaDetalhe(n.etapa === "ganho" ? "Venda concluída em" : "Perdida em", U.dataCompleta(n.fechadoEm)) : null,
        n.motivoPerda ? linhaDetalhe("Motivo da perda", n.motivoDetalhe ? `${n.motivoPerda}: ${n.motivoDetalhe}` : n.motivoPerda) : null),
      el("div", { class: "mover" },
        el("label", { for: "mover-etapa", texto: "Mover para" }), seletor,
        botao("Mover", "btn--linha btn--pequeno", async () => {
          if (await mover(id, seletor.value)) detalheNegocio(id);
        })),
      listaRelacionada("Tarefas ligadas", tarefas.map((t) => el("li", { class: "relacionado relacionado--texto" }, el("span", { texto: t.titulo }), el("span", { class: `situacao situacao--${L.situacaoDaTarefa(t)}`, texto: t.concluida ? "Concluída" : U.relativo(t.prazo) }))), "Nenhuma tarefa ligada."),
    ];
    const vinculo = n.clienteId ? `cliente:${n.clienteId}` : `lead:${n.leadId}`;
    const botoes = [
      botao("Excluir", "btn--perigo", async () => {
        fecharDetalhe();
        const ok = await U.confirmar({ titulo: "Excluir oportunidade?", texto: `${n.titulo} · ${n.empresa} sai do pipeline e dos relatórios. Esta ação não pode ser desfeita.`, rotulo: "Excluir", perigo: true });
        if (ok) { L.excluirNegocio(id); U.aviso("Oportunidade excluída."); }
      }, "trash"),
      el("span", { class: "janela__espaco" }),
      botao("Nova tarefa", "btn--linha", () => { fecharDetalhe(); formTarefa({ vinculo }); }, "list-checks"),
      n.clienteId
        ? botao("Ver cliente", "btn--linha", () => { fecharDetalhe(); NX.ir(`clientes/${n.clienteId}`); }, "building")
        : botao("Ver lead", "btn--linha", () => detalheLead(n.leadId), "user"),
      botao("Editar", "btn--primario", () => { fecharDetalhe(); formNegocio({ id }); }, "pencil"),
    ];
    abrirDetalhe({ tipo: "Oportunidade", titulo: `${n.titulo} · ${n.empresa}`, corpo, botoes });
  }

  /* ---------- Peças de página ---------- */
  function cabecalho({ id, titulo, sub, acoes = [], antes }) {
    return el("header", { class: "pagina__cabeca" },
      el("div", { class: "pagina__titulos" },
        antes || null,
        el("h1", { class: "pagina__titulo", id: `titulo-${id}`, tabindex: "-1", texto: titulo }),
        sub ? el("p", { class: "pagina__sub", texto: sub }) : null),
      acoes.length ? el("div", { class: "pagina__acoes" }, ...acoes.filter(Boolean)) : null);
  }

  // Cartão de gráfico com botão para alternar entre gráfico e tabela
  function cartaoGrafico({ titulo, sub, classe = "", acoes = [] }) {
    const area = el("div", { class: "grafico__area" });
    const tabela = el("div", { class: "grafico__tabela", hidden: true });
    const alternar = el("button", { class: "link-btn grafico__alternar", type: "button", "aria-pressed": "false" }, icone("table", 15), el("span", { texto: "Tabela" }));
    alternar.addEventListener("click", () => {
      const ver = alternar.getAttribute("aria-pressed") !== "true";
      alternar.setAttribute("aria-pressed", String(ver));
      alternar.querySelector("span").textContent = ver ? "Gráfico" : "Tabela";
      tabela.hidden = !ver;
      area.hidden = ver;
    });
    const cartao = el("article", { class: `cartao grafico ${classe}` },
      el("div", { class: "cartao__cabeca" },
        el("div", {}, el("h2", { class: "cartao__titulo", texto: titulo }), sub ? el("p", { class: "cartao__sub", texto: sub }) : null),
        el("div", { class: "cartao__acoes" }, ...acoes, alternar)),
      area, tabela);
    return { cartao, area, tabela, definirSub(t) { const p = cartao.querySelector(".cartao__sub"); if (p) p.textContent = t; } };
  }

  NX.form = { lead: formLead, cliente: formCliente, negocio: formNegocio, tarefa: formTarefa, observacao: formObservacao, contato: formContato };
  NX.detalhe = { lead: detalheLead, negocio: detalheNegocio };
  NX.acoes = { mover, excluirLead };
  NX.componentes = { avatar, pessoaComAvatar, pilulaStatusLead, pilulaEtapa, botao, cabecalho, cartaoGrafico };
})();
