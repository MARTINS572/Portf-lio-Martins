/* ==========================================================================
   NEXORA STOCK — pedidos-form.js
   Janelas do pedido de compra: montar o pedido (itens, quantidades, custo,
   subtotal e total calculados na hora), registrar recebimento (total ou
   parcial, protegido contra lançamento duplicado) e cancelar.
   ========================================================================== */
window.NX = window.NX || {};

(function () {
  "use strict";
  const U = NX.util;
  const L = NX.loja;
  const E = NX.estoque;
  const { el, icone, $ } = U;
  const C = () => NX.componentes;

  /* ---------- Montar / editar pedido ---------- */
  // itensIniciais: [{ produtoId, quantidade }] (ex.: vindo da lista de reposição)
  function formPedido({ id, fornecedorId, itensIniciais } = {}) {
    const pc = id ? L.pedido(id) : null;
    if (pc && !["rascunho", "pendente"].includes(pc.status)) { U.aviso("Só pedidos em rascunho ou pendentes de envio podem ser editados.", "erro"); return; }
    const dlg = $("#dlg-pedido");
    const form = $("#form-pedido");
    const corpo = $("#pedido-corpo");
    const erroGeral = $("#pedido-erro");
    erroGeral.textContent = "";
    $("#pedido-numero").textContent = pc ? `${pc.numero} · ${E.statusPedido(pc.status).nome}` : "Novo pedido";
    $("#pedido-titulo").textContent = pc ? "Editar pedido de compra" : "Criar pedido de compra";

    const fornIni = pc ? pc.fornecedorId : (fornecedorId && L.fornecedor(fornecedorId)?.status === "ativo" ? fornecedorId : "");
    const prazo = (fid) => { const f = L.fornecedor(fid); return f && f.prazoEntrega != null ? f.prazoEntrega : 5; };
    const fornSel = el("select", { id: "pc-fornecedor", name: "fornecedorId", "aria-describedby": "pc-fornecedor-erro" },
      el("option", { value: "", texto: "Escolha o fornecedor…" }),
      ...L.dados.fornecedores.filter((f) => f.status === "ativo").sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")).map((f) => el("option", { value: f.id, texto: f.nome })));
    fornSel.value = fornIni;
    const previsao = el("input", { type: "date", id: "pc-previsao", name: "previsao", min: U.hoje(), value: pc ? pc.previsao : U.somarDias(U.hoje(), prazo(fornIni)), "aria-describedby": "pc-previsao-erro pc-previsao-ajuda" });
    const ajudaPrevisao = el("p", { class: "campo__ajuda", id: "pc-previsao-ajuda" });
    const obs = el("textarea", { id: "pc-obs", name: "observacoes", rows: 2, maxlength: 500, placeholder: "Ex.: Entregar no portão lateral." });
    obs.value = pc ? pc.observacoes : "";
    const erroCampo = (idc) => el("p", { class: "campo__erro", id: `${idc}-erro` });
    const avisoInativo = fornecedorId && !fornIni ? el("p", { class: "nota-info" }, icone("info", 16), el("span", { texto: `O fornecedor principal (${L.nomeFornecedor(fornecedorId)}) está inativo. Escolha outro fornecedor para este pedido.` })) : null;

    const lista = el("div", { class: "itens-pedido__lista" });
    const total = el("b", { texto: U.moeda(0) });
    let linhas = [];

    function opcoesProduto(fid) {
      const ativos = L.dados.produtos.filter((p) => p.status === "ativo").sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
      const deste = ativos.filter((p) => p.fornecedorId === fid);
      const outros = ativos.filter((p) => p.fornecedorId !== fid);
      const op = (p) => {
        const s = E.situacao(p);
        return el("option", { value: p.id, texto: `${p.nome} · ${p.sku} · saldo ${U.numero(E.saldo(p.id))}${s === "zerado" ? " (sem estoque)" : s === "baixo" ? " (baixo)" : ""}` });
      };
      return [el("option", { value: "", texto: "Escolha o produto…" }),
        deste.length ? el("optgroup", { label: "Deste fornecedor" }, ...deste.map(op)) : null,
        el("optgroup", { label: deste.length ? "Outros produtos" : "Produtos" }, ...outros.map(op))].filter(Boolean);
    }
    function sugestaoQtd(p) {
      const falta = Math.max(0, p.minimo * 2 - E.saldo(p.id));
      return String(Math.max(1, falta || p.minimo || 1));
    }
    function recalcular() {
      let soma = 0;
      linhas.forEach((l) => {
        const q = U.lerInteiro(l.qtd.value);
        const c = U.lerValor(l.custo.value);
        const sub = Number.isFinite(q) && Number.isFinite(c) ? q * c : 0;
        soma += sub;
        l.sub.textContent = U.moeda(sub);
      });
      total.textContent = U.moeda(soma);
    }
    function novaLinha(item = {}) {
      const n = linhas.length;
      const prod = el("select", { "aria-label": `Produto do item ${n + 1}`, class: "pc-produto" }, ...opcoesProduto(fornSel.value));
      prod.value = item.produtoId || "";
      const qtd = el("input", { type: "text", inputmode: "numeric", maxlength: 7, "aria-label": `Quantidade do item ${n + 1}`, class: "pc-qtd", value: item.quantidade != null ? String(item.quantidade) : "" });
      const custo = el("input", { type: "text", inputmode: "decimal", maxlength: 12, "aria-label": `Custo unitário do item ${n + 1}`, class: "pc-custo", value: item.custo != null ? U.decimal(item.custo) : "" });
      const sub = el("span", { class: "item-pedido__subtotal", "aria-live": "off" });
      const erro = el("p", { class: "item-pedido__erro", role: "alert" });
      const remover = el("button", { class: "icone-btn icone-btn--sutil icone-btn--perigo item-pedido__remover", type: "button", "aria-label": `Remover item ${n + 1}` }, icone("trash", 16));
      const linha = { prod, qtd, custo, sub, erro, raiz: null };
      linha.raiz = el("div", { class: "item-pedido" },
        el("div", { class: "item-pedido__produto" }, el("span", { class: "item-pedido__rotulo", texto: "Produto" }), prod),
        el("div", {}, el("span", { class: "item-pedido__rotulo", texto: "Quantidade" }), qtd),
        el("div", {}, el("span", { class: "item-pedido__rotulo", texto: "Custo unit. (R$)" }), custo),
        sub, remover, erro);
      prod.addEventListener("change", () => {
        const p = L.produto(prod.value);
        if (p) {
          if (!custo.value) custo.value = U.decimal(p.custo);
          if (!qtd.value) qtd.value = sugestaoQtd(p);
        }
        recalcular();
      });
      qtd.addEventListener("input", recalcular);
      custo.addEventListener("input", recalcular);
      remover.addEventListener("click", () => {
        linhas = linhas.filter((l) => l !== linha);
        linha.raiz.remove();
        if (!linhas.length) novaLinha();
        recalcular();
        (linhas[linhas.length - 1] || {}).prod?.focus();
      });
      linhas.push(linha);
      lista.append(linha.raiz);
      recalcular();
      return linha;
    }
    fornSel.addEventListener("change", () => {
      linhas.forEach((l) => { const v = l.prod.value; l.prod.replaceChildren(...opcoesProduto(fornSel.value)); l.prod.value = v; });
      if (!pc) previsao.value = U.somarDias(U.hoje(), prazo(fornSel.value));
      const f = L.fornecedor(fornSel.value);
      ajudaPrevisao.textContent = f && f.prazoEntrega != null ? `Prazo de entrega informado: ${U.plural(f.prazoEntrega, "dia", "dias")}.` : "";
    });

    const adicionar = el("button", { class: "btn btn--linha btn--pequeno", type: "button", onclick: () => novaLinha().prod.focus() }, icone("plus", 15), "Adicionar item");
    corpo.replaceChildren(
      avisoInativo || "",
      el("div", { class: "campos" },
        el("div", { class: "campo" }, el("label", { for: "pc-fornecedor" }, "Fornecedor", el("span", { class: "campo__obrig", "aria-hidden": "true", texto: " *" })), fornSel, erroCampo("pc-fornecedor")),
        el("div", { class: "campo" }, el("label", { for: "pc-previsao" }, "Previsão de entrega", el("span", { class: "campo__obrig", "aria-hidden": "true", texto: " *" })), previsao, ajudaPrevisao, erroCampo("pc-previsao")),
        el("div", { class: "campo campo--inteira" }, el("label", { for: "pc-obs" }, "Observações", el("span", { class: "campo__opc", texto: " (opcional)" })), obs, erroCampo("pc-obs"))),
      el("div", { class: "itens-pedido", role: "group", "aria-label": "Itens do pedido" },
        el("div", { class: "itens-pedido__cabeca", "aria-hidden": "true" }, el("span", { texto: "Produto" }), el("span", { texto: "Quantidade" }), el("span", { texto: "Custo unit." }), el("span", { texto: "Subtotal" }), el("span")),
        lista,
        el("div", { class: "itens-pedido__rodape" }, adicionar, el("p", { class: "total-pedido" }, "Total do pedido", total))),
    );
    (pc ? pc.itens : (itensIniciais && itensIniciais.length ? itensIniciais.map((it) => ({ ...it, custo: L.produto(it.produtoId)?.custo })) : [{}])).forEach((it) => novaLinha(it));
    fornSel.dispatchEvent(new Event("change"));
    if (pc) previsao.value = pc.previsao;

    // Botões conforme o estado
    const salvar = (status) => {
      const v = {
        fornecedorId: fornSel.value, previsao: previsao.value, observacoes: obs.value,
        itens: linhas.map((l) => ({ produtoId: l.prod.value, quantidade: l.qtd.value, custo: l.custo.value })),
      };
      const r = E.salvarPedido(v, id, status);
      const msg = (campo) => (r.erros || {})[campo] || "";
      [["pc-fornecedor", "fornecedorId", fornSel], ["pc-previsao", "previsao", previsao], ["pc-obs", "observacoes", obs]].forEach(([idc, campo, ctrl]) => {
        $(`#${idc}-erro`).textContent = msg(campo);
        ctrl.setAttribute("aria-invalid", String(!!msg(campo)));
      });
      linhas.forEach((l, i) => {
        const e = (r.itensErros || [])[i] || {};
        l.erro.textContent = [e.produtoId, e.quantidade, e.custo].filter(Boolean).join(" ");
        l.prod.setAttribute("aria-invalid", String(!!e.produtoId));
        l.qtd.setAttribute("aria-invalid", String(!!e.quantidade));
        l.custo.setAttribute("aria-invalid", String(!!e.custo));
      });
      erroGeral.textContent = r.ok ? "" : (r.erro || "Confira os campos destacados.");
      if (!r.ok) {
        const alvo = form.querySelector('[aria-invalid="true"]');
        if (alvo) alvo.focus();
        return;
      }
      dlg.close();
      U.aviso(pc ? "Pedido atualizado." : `Pedido ${r.numero} criado como ${status === "pendente" ? "pendente de envio" : "rascunho"}.`);
      NX.ir(`pedidos/${r.id}`);
    };
    const botoes = [C().botao("Cancelar", "btn--linha", () => dlg.close())];
    if (!pc || pc.status === "rascunho") botoes.push(C().botao(pc ? "Salvar rascunho" : "Salvar como rascunho", "btn--linha", () => salvar("rascunho"), "circle-dashed"));
    botoes.push(C().botao(pc && pc.status === "pendente" ? "Salvar alterações" : "Pronto para enviar", "btn--primario", () => salvar("pendente"), "check"));
    $("#pedido-botoes").replaceChildren(...botoes);
    form.onsubmit = (e) => { e.preventDefault(); salvar(pc ? pc.status : "pendente"); };
    dlg.showModal();
    (fornSel.value ? linhas[0].prod : fornSel).focus();
  }

  /* ---------- Recebimento ---------- */
  function formRecebimento(id) {
    const pc = L.pedido(id);
    if (!pc || !["enviado", "parcial"].includes(pc.status)) { U.aviso("Só pedidos enviados ou parcialmente recebidos podem ser recebidos.", "erro"); return; }
    const dlg = $("#dlg-receber");
    const form = $("#form-receber");
    const confirmarBtn = $("#receber-confirmar");
    const token = E.novoTokenRecebimento();         // identifica ESTE recebimento (impede lançar duas vezes)
    let processado = false;
    $("#receber-numero").textContent = `${pc.numero} · ${L.nomeFornecedor(pc.fornecedorId)}`;
    $("#receber-erro").textContent = "";
    confirmarBtn.disabled = false;
    confirmarBtn.textContent = "Confirmar recebimento";

    const pendentes = pc.itens.filter((it) => it.recebido < it.quantidade);
    const entradas = new Map();
    const corpoTabela = el("tbody", {}, ...pendentes.map((it) => {
      const p = L.produto(it.produtoId);
      const falta = it.quantidade - it.recebido;
      const inp = el("input", { type: "text", inputmode: "numeric", maxlength: 7, value: String(falta), "aria-label": `Quantidade recebida agora de ${p.nome}`, "data-produto": p.id });
      const erro = el("span", { class: "erro-celula", role: "alert" });
      entradas.set(p.id, { inp, erro });
      return el("tr", {},
        C().td("Produto", C().nomeProduto(p, { link: false }), "principal-celula"),
        C().td("Pedido", U.numero(it.quantidade), "num"),
        C().td("Já recebido", U.numero(it.recebido), "num"),
        C().td("Pendente", el("b", { texto: U.numero(falta) }), "num"),
        C().td("Recebendo agora", el("span", {}, inp, erro), "num"));
    }));
    const data = el("input", { type: "datetime-local", id: "rc-data", value: U.agora(), max: U.agora(), "aria-describedby": "rc-data-erro" });
    const doc = el("input", { type: "text", id: "rc-doc", maxlength: 40, placeholder: "Ex.: NF 48213", "aria-describedby": "rc-doc-erro" });
    const resp = el("select", { id: "rc-resp", "aria-describedby": "rc-resp-erro" }, ...L.dados.equipe.map((u) => el("option", { value: u.id, texto: `${u.nome} · ${u.cargo}` })));
    resp.value = L.dados.perfil.id;
    const campo = (rotulo, idc, controle, obrig) => el("div", { class: "campo" }, el("label", { for: idc }, rotulo, obrig ? el("span", { class: "campo__obrig", "aria-hidden": "true", texto: " *" }) : el("span", { class: "campo__opc", texto: " (opcional)" })), controle, el("p", { class: "campo__erro", id: `${idc}-erro` }));
    $("#receber-corpo").replaceChildren(
      el("p", { class: "janela__descricao", texto: "Confira o que chegou e informe a quantidade de cada item. Se veio só uma parte, o restante continua pendente no pedido. Só o que for confirmado aqui entra no estoque." }),
      el("div", { class: "tabela-rolagem" }, el("table", { class: "tabela tabela--cartoes receber-tabela" },
        el("thead", {}, el("tr", {}, ...["Produto", "Pedido", "Já recebido", "Pendente", "Recebendo agora"].map((t, i) => el("th", { scope: "col", class: i ? "num" : "", texto: t })))),
        corpoTabela)),
      el("div", { class: "campos", style: { marginTop: "16px" } }, campo("Data e hora", "rc-data", data, true), campo("Nota fiscal / documento", "rc-doc", doc), campo("Conferido por", "rc-resp", resp, true)),
    );

    form.onsubmit = (e) => {
      e.preventDefault();
      if (processado) return;                       // segundo clique enquanto processa: ignora
      confirmarBtn.disabled = true;
      confirmarBtn.textContent = "Registrando…";
      const quantidades = {};
      entradas.forEach(({ inp }, pid) => { quantidades[pid] = inp.value; });
      const r = E.registrarRecebimento(id, { token, quantidades, data: data.value, documento: doc.value, responsavelId: resp.value });
      entradas.forEach(({ inp, erro }, pid) => {
        const msg = (r.itensErros || {})[pid] || "";
        erro.textContent = msg;
        inp.setAttribute("aria-invalid", String(!!msg));
      });
      [["rc-data", "data", data], ["rc-doc", "documento", doc], ["rc-resp", "responsavelId", resp]].forEach(([idc, c, ctrl]) => {
        const msg = (r.erros || {})[c] || "";
        $(`#${idc}-erro`).textContent = msg;
        ctrl.setAttribute("aria-invalid", String(!!msg));
      });
      if (!r.ok) {
        $("#receber-erro").textContent = r.erro || "Confira os campos destacados.";
        if (r.duplicado) { processado = true; confirmarBtn.textContent = "Já registrado"; return; }
        confirmarBtn.disabled = false;
        confirmarBtn.textContent = "Confirmar recebimento";
        const alvo = form.querySelector('[aria-invalid="true"]');
        if (alvo) alvo.focus();
        return;
      }
      processado = true;
      dlg.close();
      U.aviso(r.status === "recebido" ? `Pedido ${pc.numero} recebido por completo: ${U.unidades(r.unidades)} no estoque.` : `Recebimento parcial registrado (${U.unidades(r.unidades)}). O restante continua pendente.`);
    };
    dlg.showModal();
    const primeiro = entradas.values().next().value;
    if (primeiro) primeiro.inp.select();
  }

  /* ---------- Ações do pedido ---------- */
  function cancelarPedido(id) {
    const pc = L.pedido(id);
    const parcial = pc.status === "parcial";
    U.formulario({
      titulo: `Cancelar ${pc.numero}?`,
      descricao: parcial ? "O que já foi recebido continua no estoque. Só o saldo pendente deixa de ser esperado." : "O pedido fica no histórico como cancelado. Nada muda no estoque.",
      campos: [{ nome: "motivo", rotulo: "Motivo do cancelamento", tipo: "textarea", obrigatorio: true, largura: "inteira", linhas: 2, max: 300, placeholder: "Ex.: Fornecedor sem prazo de entrega." }],
      rotuloSalvar: parcial ? "Cancelar saldo pendente" : "Cancelar pedido",
      aoSalvar: (v) => {
        const r = E.cancelarPedido(id, v.motivo);
        if (r.ok) U.aviso(`Pedido ${pc.numero} cancelado.`);
        return r.ok ? r : { ok: false, erros: r.erros || {}, erro: r.erro };
      },
    });
  }
  async function excluirRascunho(id) {
    const pc = L.pedido(id);
    const ok = await U.confirmar({ titulo: `Excluir o rascunho ${pc.numero}?`, texto: "Rascunhos ainda não foram enviados ao fornecedor e não mexem no estoque, por isso podem ser excluídos.", rotulo: "Excluir rascunho", perigo: true });
    if (!ok) return;
    const r = E.excluirRascunho(id);
    if (r.ok) { U.aviso("Rascunho excluído."); NX.ir("pedidos"); } else U.aviso(r.erro, "erro");
  }
  function mudarStatus(id, acao) {
    const r = acao === "concluir" ? E.concluirRascunho(id) : E.marcarEnviado(id);
    if (r.ok) U.aviso(acao === "concluir" ? "Pedido pronto para enviar (pendente de envio)." : "Pedido marcado como enviado. Agora ele pode ser recebido.");
    else U.aviso(r.erro, "erro");
  }

  // Reposição: monta pedidos a partir de produtos em estoque baixo/zerado (um fornecedor por pedido)
  function pedidoDeReposicao(produtos) {
    const lista = produtos.filter((p) => p.status === "ativo");
    if (!lista.length) return;
    const fornecedores = [...new Set(lista.map((p) => p.fornecedorId))];
    const fid = fornecedores[0];
    const doMesmo = lista.filter((p) => p.fornecedorId === fid);
    formPedido({ fornecedorId: fid, itensIniciais: doMesmo.map((p) => ({ produtoId: p.id, quantidade: Math.max(1, p.minimo * 2 - E.saldo(p.id)) })) });
    if (fornecedores.length > 1) U.aviso(`Pedido montado para ${L.nomeFornecedor(fid)}. Os outros produtos são de outros fornecedores: crie um pedido para cada um.`, "info");
  }

  NX.pedidos = { form: formPedido, receber: formRecebimento, cancelar: cancelarPedido, excluirRascunho, mudarStatus, reposicao: pedidoDeReposicao };
})();
