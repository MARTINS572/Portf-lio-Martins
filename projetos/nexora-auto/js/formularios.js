/* ==========================================================================
   NEXORA AUTO — formularios.js
   Todas as janelas de cadastro e de ação (abrir OS, itens, orçamento,
   aprovação, recebimento, estoque, agenda...). Cada uma só monta os campos
   e chama a regra correspondente em loja.js ou oficina.js; os erros que a
   regra devolve aparecem embaixo do campo certo.
   ========================================================================== */
window.NX = window.NX || {};

(function () {
  "use strict";
  const U = NX.util;
  const L = NX.loja;
  const O = NX.oficina;
  const C = () => NX.componentes;
  const { el, icone, $ } = U;
  const ok = (r, msg) => { if (r.ok && msg) U.aviso(msg); return r; };
  const negado = (acao) => { if (O.pode(acao)) return false; U.aviso(O.negar(acao).erro, "erro"); return true; };
  const mostrarCampo = (form, nome, ver) => { const c = form.querySelector(`[data-campo="${nome}"]`); if (c) c.hidden = !ver; };
  const tokenNovo = () => L.novoId("k");

  /* ======================================================================
     CLIENTES E VEÍCULOS
     ====================================================================== */
  function cliente(id, { depois } = {}) {
    if (negado("cadastros")) return;
    const c = id ? L.cliente(id) : null;
    U.formulario({
      titulo: c ? "Editar cliente" : "Novo cliente",
      descricao: c ? null : "Telefone e documento não podem se repetir: assim o mesmo cliente não é cadastrado duas vezes.",
      campos: [
        { nome: "nome", rotulo: "Nome completo ou razão social", obrigatorio: true, valor: c ? c.nome : "", largura: "inteira", max: 100, autocomplete: "name" },
        { nome: "tipo", rotulo: "Tipo", tipo: "select", obrigatorio: true, valor: c ? c.tipo : "pf", opcoes: [{ valor: "pf", rotulo: "Pessoa física" }, { valor: "pj", rotulo: "Empresa" }] },
        { nome: "telefone", rotulo: "Telefone / WhatsApp", tipo: "tel", obrigatorio: true, valor: c ? U.mascaraTelefone(c.telefone) : "", placeholder: "(19) 91234-5678" },
        { nome: "email", rotulo: "E-mail", tipo: "email", valor: c ? c.email : "", max: 120 },
        { nome: "documento", rotulo: "CPF ou CNPJ", valor: c && c.documento ? L.mostrarDocumento(c.documento) : "", ajuda: "Opcional. Só números ou com pontuação.", max: 18 },
        { nome: "endereco", rotulo: "Endereço", valor: c ? c.endereco : "", largura: "inteira", max: 140 },
        { nome: "observacoes", rotulo: "Observações", tipo: "textarea", valor: c ? c.observacoes : "", largura: "inteira", max: 500 },
      ],
      rotuloSalvar: c ? "Salvar alterações" : "Cadastrar cliente",
      aoSalvar: (v) => {
        const r = L.salvarCliente(v, id);
        if (r.ok) { U.aviso(c ? "Cliente atualizado." : "Cliente cadastrado."); if (depois) setTimeout(() => depois(r.id), 30); else if (!c) NX.ir(`clientes/${r.id}`); }
        return r;
      },
    });
  }

  function veiculo(id, { clienteId, depois } = {}) {
    if (negado("cadastros")) return;
    const v = id ? L.veiculo(id) : null;
    if (!L.dados.clientes.length) { U.aviso("Cadastre um cliente antes do veículo.", "erro"); return; }
    const anoAtual = Number(U.hoje().slice(0, 4));
    const f = U.formulario({
      titulo: v ? `Editar veículo ${L.mostrarPlaca(v.placa)}` : "Novo veículo",
      descricao: el("span", {}, "A placa identifica o veículo, mas ", el("b", { texto: "não comprova quem é o dono" }), ". Se o carro mudar de dono, troque o cliente: a troca fica registrada no histórico."),
      campos: [
        { nome: "placa", rotulo: "Placa", obrigatorio: true, valor: v ? L.mostrarPlaca(v.placa) : "", maiusculas: true, placeholder: "ABC1D23 ou ABC-1234", max: 8 },
        { nome: "clienteId", rotulo: "Cliente responsável", tipo: "select", obrigatorio: true, valor: v ? v.clienteId : clienteId || "", vazio: "Escolha…", opcoes: C().opcoesClientes() },
        { nome: "marca", rotulo: "Marca", obrigatorio: true, valor: v ? v.marca : "", max: 30 },
        { nome: "modelo", rotulo: "Modelo", obrigatorio: true, valor: v ? v.modelo : "", max: 50, placeholder: "Ex.: Onix 1.0" },
        { nome: "tipo", rotulo: "Tipo de veículo", tipo: "select", obrigatorio: true, valor: v ? v.tipo || "" : "", vazio: "Escolha…", opcoes: NX.TIPOS_VEICULO },
        { nome: "anoFab", rotulo: "Ano de fabricação", tipo: "inteiro", obrigatorio: true, valor: v ? v.anoFab : "", placeholder: String(anoAtual - 3) },
        { nome: "anoModelo", rotulo: "Ano-modelo", tipo: "inteiro", valor: v ? v.anoModelo : "", ajuda: "Igual ao de fabricação ou o ano seguinte." },
        { nome: "cor", rotulo: "Cor", valor: v ? v.cor : "", max: 20 },
        { nome: "combustivel", rotulo: "Combustível", tipo: "select", obrigatorio: true, valor: v ? v.combustivel : "Flex", opcoes: NX.COMBUSTIVEIS },
        { nome: "km", rotulo: "Quilometragem atual", tipo: "inteiro", obrigatorio: true, valor: v ? v.km : "", ajuda: v ? `Última registrada: ${U.numero(v.km)} km.` : "Como está no painel do carro." },
        { nome: "justificativaKm", rotulo: "Motivo da quilometragem menor", tipo: "textarea", linhas: 2, valor: "", largura: "inteira", ajuda: "Só se a quilometragem for menor que a última (ex.: painel trocado). Fica marcado no histórico.", max: 200 },
        { nome: "observacoes", rotulo: "Observações", tipo: "textarea", valor: v ? v.observacoes : "", largura: "inteira", max: 400 },
      ],
      rotuloSalvar: v ? "Salvar alterações" : "Cadastrar veículo",
      aoSalvar: (val) => {
        const r = L.salvarVeiculo(val, id, { justificativaKm: val.justificativaKm });
        if (r.ok) { U.aviso(v ? "Veículo atualizado." : "Veículo cadastrado."); if (depois) setTimeout(() => depois(r.id), 30); else if (!v) NX.ir(`veiculos/${r.id}`); }
        return r;
      },
    });
    const kmCampo = f.form.elements.km;
    const atualizarJust = () => mostrarCampo(f.form, "justificativaKm", !!v && U.lerInteiro(kmCampo.value) < v.km);
    kmCampo.addEventListener("input", atualizarJust);
    atualizarJust();
  }

  /* ---------- Exclusão (só sem histórico) ----------
     Primeiro mostra o que impede a exclusão; sem vínculos, pede confirmação.
     A regra (loja.js) confere de novo na hora de excluir. */
  function explicarBloqueio({ titulo, vinculos, texto, acao }) {
    C().janela({
      tipo: "Exclusão não permitida", titulo,
      corpo: el("div", {},
        el("p", { class: "nota-alerta" }, icone("link", 15), el("span", { texto: "Este cadastro tem histórico na oficina:" })),
        el("ul", { class: "lista-vinculos" }, ...vinculos.map((x) => el("li", { texto: x }))),
        el("p", { class: "campo__ajuda", texto })),
      botoes: [acao, C().botao("Entendi", "btn--primario", () => U.$("#dlg-detalhe").close())].filter(Boolean),
    });
  }
  async function excluirCliente(id) {
    if (negado("cadastros")) return;
    const c = L.cliente(id);
    if (!c) return;
    const vinculos = L.vinculosCliente(id);
    if (vinculos.length) {
      explicarBloqueio({ titulo: `Não é possível excluir ${c.nome}`, vinculos,
        texto: "Ordens, orçamentos e agenda ficam ligados ao cliente para manter o histórico. Se um veículo foi vendido, edite o veículo e escolha o novo responsável: a troca fica registrada." });
      return;
    }
    const sim = await U.confirmar({ titulo: `Excluir ${c.nome}?`, texto: "O cadastro não tem veículos, ordens, orçamentos nem agenda. A exclusão não pode ser desfeita.", rotulo: "Excluir cliente", perigo: true });
    if (!sim) return;
    const r = L.excluirCliente(id);
    if (r.ok) { U.aviso("Cliente excluído."); NX.ir("clientes"); return; }
    if (r.codigo === "vinculado") explicarBloqueio({ titulo: `Não é possível excluir ${c.nome}`, vinculos: r.vinculos, texto: "Um vínculo foi criado agora há pouco (talvez em outra aba). Nada foi excluído." });
    else U.aviso(r.erro || "Não foi possível excluir.", "erro");
  }
  async function excluirVeiculo(id) {
    if (negado("cadastros")) return;
    const v = L.veiculo(id);
    if (!v) return;
    const placa = L.mostrarPlaca(v.placa);
    const vinculos = L.vinculosVeiculo(id);
    if (vinculos.length) {
      explicarBloqueio({ titulo: `Não é possível excluir ${placa}`, vinculos,
        texto: "O histórico de manutenção fica guardado no veículo. Se ele foi vendido, edite o cadastro e troque o cliente responsável: a troca fica registrada no histórico.",
        acao: C().botao("Trocar responsável", "btn--linha", () => { U.$("#dlg-detalhe").close(); setTimeout(() => veiculo(id), 30); }, "user-round-pen") });
      return;
    }
    const sim = await U.confirmar({ titulo: `Excluir o veículo ${placa}?`, texto: `${v.marca} ${v.modelo} não tem ordens, orçamentos nem agenda. A exclusão não pode ser desfeita.`, rotulo: "Excluir veículo", perigo: true });
    if (!sim) return;
    const r = L.excluirVeiculo(id);
    if (r.ok) { U.aviso("Veículo excluído."); NX.ir("veiculos"); return; }
    if (r.codigo === "vinculado") explicarBloqueio({ titulo: `Não é possível excluir ${placa}`, vinculos: r.vinculos, texto: "Um vínculo foi criado agora há pouco (talvez em outra aba). Nada foi excluído." });
    else U.aviso(r.erro || "Não foi possível excluir.", "erro");
  }

  /* ======================================================================
     ORDEM DE SERVIÇO
     ====================================================================== */
  function novaOS({ clienteId, veiculoId, orcamentoId } = {}) {
    if (negado("os_abrir")) return;
    if (!L.dados.clientes.length) { cliente(null); return; }
    const orc = orcamentoId ? L.orcamento(orcamentoId) : null;
    const vIni = orc ? L.veiculo(orc.veiculoId) : veiculoId ? L.veiculo(veiculoId) : null;
    const cIni = orc ? orc.clienteId : vIni ? vIni.clienteId : clienteId || "";
    const opcoesVeic = (cid) => (cid ? C().opcoesVeiculos(cid) : []);
    const agora = U.agora();
    const extra = el("div", { class: "form-atalhos" },
      O.pode("cadastros") ? el("button", { class: "link-btn", type: "button", onclick: () => cliente(null, { depois: (id) => novaOS({ clienteId: id }) }) }, icone("user-plus", 15), "Cliente novo") : null,
      O.pode("cadastros") ? el("button", { class: "link-btn", type: "button", id: "atalho-veiculo", onclick: () => veiculo(null, { clienteId: $("#f-clienteId").value, depois: (id) => novaOS({ veiculoId: id }) }) }, icone("car", 15), "Veículo novo") : null,
      el("p", { class: "campo__ajuda", texto: "A ordem começa em \"Aguardando avaliação\". Diagnóstico, itens e orçamento vêm depois, na própria ordem." }));
    const f = U.formulario({
      titulo: orc ? `Nova OS a partir de ${O.rotuloOrc(orc)}` : "Nova ordem de serviço",
      descricao: orc ? `O orçamento já aprovado (${U.moeda(O.totaisOrc(orc).total)}) vira os itens da ordem e as peças são reservadas.` : null,
      largura: "larga",
      campos: [
        { nome: "clienteId", rotulo: "Cliente", tipo: "select", obrigatorio: true, valor: cIni, vazio: "Escolha o cliente…", opcoes: C().opcoesClientes(), largura: "inteira",
          aoMudar: (cid, form) => {
            const s = form.elements.veiculoId;
            U.trocar(s, el("option", { value: "", texto: cid ? "Escolha o veículo…" : "Escolha o cliente primeiro" }), ...opcoesVeic(cid).map((o) => el("option", { value: o.valor, texto: o.rotulo })));
            if (opcoesVeic(cid).length === 1) s.value = opcoesVeic(cid)[0].valor;
            s.dispatchEvent(new Event("change"));
          } },
        { nome: "veiculoId", rotulo: "Veículo", tipo: "select", obrigatorio: true, valor: vIni ? vIni.id : "", vazio: cIni ? "Escolha o veículo…" : "Escolha o cliente primeiro", opcoes: opcoesVeic(cIni), largura: "inteira",
          aoMudar: (vid, form) => {
            const v = L.veiculo(vid);
            const aberta = v ? O.osAbertaDoVeiculo(v.id) : null;
            if (v) form.elements.kmEntrada.value = String(v.km);
            f.ajuda("veiculoId", aberta ? el("span", { class: "alerta-texto" }, icone("triangle-alert", 14), `Já existe a ${aberta.numero} aberta para este veículo (${O.nomeStatus(aberta.status)}).`) : v ? `Última quilometragem: ${U.numero(v.km)} km.` : "");
          } },
        { nome: "kmEntrada", rotulo: "Quilometragem de entrada", tipo: "inteiro", obrigatorio: true, valor: vIni ? vIni.km : "" },
        { nome: "previsao", rotulo: "Previsão de conclusão", tipo: "datetime-local", valor: "", min: agora, ajuda: "Opcional. Aparece na agenda como previsão (não ocupa técnico nem box)." },
        { nome: "justificativaKm", rotulo: "Motivo da quilometragem menor", tipo: "textarea", linhas: 2, largura: "inteira", ajuda: "Só se a quilometragem for menor que a última registrada.", max: 200 },
        { nome: "relato", rotulo: "O que o cliente relatou", tipo: "textarea", obrigatorio: true, valor: orc ? `Serviço do orçamento ${O.rotuloOrc(orc)}${orc.observacoes ? `: ${orc.observacoes}` : ""}` : "", largura: "inteira", placeholder: "Ex.: barulho ao frear em velocidade baixa.", max: 600 },
        { nome: "tecnicoId", rotulo: "Técnico responsável", tipo: "select", valor: "", vazio: "Definir depois", opcoes: C().opcoesTecnicos() },
        { nome: "observacoes", rotulo: "Observações internas", tipo: "text", valor: "", max: 400 },
      ],
      extra,
      rotuloSalvar: "Abrir ordem",
      aoSalvar: (v) => {
        const r = O.abrirOS({ ...v, orcamentoId: orc ? orc.id : "" });
        if (r.ok) { U.aviso(`${r.os.numero} aberta.`); setTimeout(() => NX.ir(`ordens/${r.os.id}`), 30); }
        return r;
      },
    });
    const km = f.form.elements.kmEntrada;
    const justificar = () => { const v = L.veiculo(f.form.elements.veiculoId.value); mostrarCampo(f.form, "justificativaKm", !!v && U.lerInteiro(km.value) < v.km); };
    km.addEventListener("input", justificar);
    f.form.elements.veiculoId.addEventListener("change", justificar);
    if (orc) { f.form.elements.clienteId.disabled = true; f.form.elements.veiculoId.disabled = true; f.form.elements.clienteId.value = orc.clienteId; }
    if (vIni) f.form.elements.veiculoId.dispatchEvent(new Event("change"));
    justificar();
  }

  function editarOS(os, { foco } = {}) {
    if (negado("os_editar")) return;
    const travado = ["aguardando_retirada", "concluida"].includes(os.status);
    const f = U.formulario({
      titulo: `Editar ${os.numero}`,
      descricao: travado ? "O serviço já foi finalizado: diagnóstico e técnico ficam travados. Cada mudança fica registrada no histórico." : "Cada mudança fica registrada no histórico da ordem.",
      largura: "larga",
      campos: [
        { nome: "relato", rotulo: "O que o cliente relatou", tipo: "textarea", obrigatorio: true, valor: os.relato, largura: "inteira", max: 600 },
        { nome: "diagnostico", rotulo: "Diagnóstico técnico", tipo: "textarea", linhas: 4, valor: os.diagnostico, largura: "inteira", max: 1500, somenteLeitura: travado, ajuda: "Necessário para gerar o orçamento e para finalizar o serviço (mínimo de 10 letras)." },
        { nome: "tecnicoId", rotulo: "Técnico responsável", tipo: "select", valor: os.tecnicoId || "", vazio: "Sem técnico", opcoes: C().opcoesTecnicos().concat(os.tecnicoId && !C().opcoesTecnicos().some((o) => o.valor === os.tecnicoId) ? [{ valor: os.tecnicoId, rotulo: `${C().nomeDoTecnico(os.tecnicoId)} (inativo)` }] : []) },
        { nome: "previsao", rotulo: "Previsão de conclusão", tipo: "datetime-local", valor: os.previsao || "", min: U.agora() },
        { nome: "observacoes", rotulo: "Observações internas", tipo: "textarea", linhas: 2, valor: os.observacoes, largura: "inteira", max: 600 },
      ],
      rotuloSalvar: "Salvar",
      aoSalvar: (v) => {
        const mud = { relato: v.relato, observacoes: v.observacoes, previsao: v.previsao || null };
        if (!travado) Object.assign(mud, { diagnostico: v.diagnostico, tecnicoId: v.tecnicoId || null });
        if ((v.previsao || null) === os.previsao) delete mud.previsao;
        const r = O.editarOS(os.id, mud);
        if (r.ok) U.aviso(r.nada ? "Nada mudou." : "Ordem atualizada.");
        return r;
      },
    });
    if (travado) f.form.elements.tecnicoId.disabled = true;
    if (foco && f.form.elements[foco]) f.form.elements[foco].focus();
  }

  function item(os) {
    if (negado("os_itens")) return;
    if (!O.itensEditaveis(os)) { U.aviso(os.orcamentoId ? "Os itens já foram aprovados. Para incluir algo, crie uma revisão do orçamento." : "Nesta etapa os itens não podem mais ser alterados.", "erro"); return; }
    const podePreco = O.pode("precos");
    const f = U.formulario({
      titulo: `Incluir item na ${os.numero}`,
      descricao: "Serviços e peças usam o preço do cadastro. Colocar uma peça aqui não mexe no estoque: ela só é reservada quando o cliente aprovar.",
      campos: [
        { nome: "tipo", rotulo: "Tipo", tipo: "select", obrigatorio: true, valor: "servico", opcoes: [{ valor: "servico", rotulo: "Serviço do catálogo" }, { valor: "peca", rotulo: "Peça ou produto" }, { valor: "mao", rotulo: "Mão de obra avulsa (por hora)" }], largura: "inteira",
          aoMudar: (t, form) => ajustarTipo(t, form) },
        { nome: "servicoId", rotulo: "Serviço", tipo: "select", valor: "", vazio: "Escolha…", opcoes: C().opcoesServicos(), largura: "inteira" },
        { nome: "pecaId", rotulo: "Peça", tipo: "select", valor: "", vazio: "Escolha…", opcoes: C().opcoesPecas(), largura: "inteira" },
        { nome: "descricao", rotulo: "Descrição da mão de obra", valor: "", largura: "inteira", placeholder: "Ex.: Troca da bomba d'água", max: 80 },
        { nome: "quantidade", rotulo: "Quantidade", tipo: "dinheiro", obrigatorio: true, valor: "1" },
        { nome: "unitario", rotulo: "Valor unitário", tipo: "dinheiro", valor: "", ajuda: podePreco ? "Em branco = preço do cadastro." : "Seu perfil usa o preço do cadastro.", somenteLeitura: !podePreco },
      ],
      rotuloSalvar: "Incluir item",
      aoSalvar: (v) => {
        const dadosItem = { tipo: v.tipo, refId: v.tipo === "servico" ? v.servicoId : v.tipo === "peca" ? v.pecaId : null, descricao: v.descricao, quantidade: v.quantidade, unitario: v.unitario };
        const r = O.adicionarItem(os.id, dadosItem);
        if (!r.ok && r.erros && r.erros.refId) r.erros[v.tipo === "servico" ? "servicoId" : "pecaId"] = r.erros.refId;
        return ok(r, "Item incluído.");
      },
    });
    function ajustarTipo(t, form) {
      mostrarCampo(form, "servicoId", t === "servico");
      mostrarCampo(form, "pecaId", t === "peca");
      mostrarCampo(form, "descricao", t === "mao");
      $("label[for='f-quantidade']", form).firstChild.textContent = t === "mao" ? "Horas (múltiplos de 0,25)" : "Quantidade";
      f.ajuda("unitario", t === "mao" ? `Valor da hora: ${U.moeda(L.dados.oficina.orcamento.valorHora)} (Configurações).` : podePreco ? "Em branco = preço do cadastro." : "Seu perfil usa o preço do cadastro.");
      form.elements.quantidade.value = t === "mao" ? "1" : form.elements.quantidade.value || "1";
    }
    f.form.elements.pecaId.addEventListener("change", () => {
      const p = L.peca(f.form.elements.pecaId.value);
      f.ajuda("pecaId", p ? `Saldo ${O.saldo(p.id)} · reservado ${O.reservado(p.id)} · disponível ${O.disponivel(p.id)}${O.disponivel(p.id) <= 0 ? " — se o cliente aprovar, a ordem aguarda a peça." : ""}` : "");
    });
    ajustarTipo("servico", f.form);
  }

  function gerarOrcamento(os) {
    if (negado("orc_criar")) return;
    const cfg = L.dados.oficina.orcamento;
    const t = O.totaisOS(os);
    U.formulario({
      titulo: `Gerar orçamento da ${os.numero}`,
      descricao: el("span", {}, `Subtotal: ${U.moeda(t.subtotal)} (${os.itens.length} itens). Desconto até ${cfg.descontoMax}% (${U.moeda(t.subtotal * cfg.descontoMax / 100)})${O.papel() === "admin" ? "; acima disso fica registrado como autorizado por você" : "; acima disso só o administrador"}.`),
      campos: [
        { nome: "desconto", rotulo: "Desconto (R$)", tipo: "dinheiro", valor: "", placeholder: "0,00" },
        { nome: "validadeDias", rotulo: "Validade (dias)", tipo: "inteiro", valor: String(cfg.validadeDias), ajuda: "Padrão definido em Configurações." },
        { nome: "observacoes", rotulo: "Observações para o cliente", tipo: "textarea", linhas: 2, valor: "", largura: "inteira", max: 400 },
        { nome: "enviar", rotulo: "Enviar agora para aprovação do cliente", tipo: "checkbox", valor: true, largura: "inteira", ajuda: "Desmarcado, fica como rascunho." },
      ],
      rotuloSalvar: "Gerar orçamento",
      aoSalvar: (v) => {
        const r = O.gerarOrcamento(os.id, v);
        if (r.ok) U.aviso(`${O.rotuloOrc(r.orcamento)} ${r.orcamento.status === "rascunho" ? "salvo como rascunho" : "enviado para aprovação"}.`);
        return r;
      },
    });
  }

  async function mudarStatus(os, novo) {
    if (novo === "cancelada") return cancelarOS(os);
    if (novo === "entregue") return entregar(os);
    const textos = {
      aguardando_retirada: ["Finalizar o serviço?", `As peças reservadas saem do estoque agora (uma única vez) e a ${os.numero} fica aguardando retirada.`],
      concluida: ["Encerrar e faturar a ordem?", `O valor de ${U.moeda(O.totaisOS(os).total)} passa a constar como faturado (a receber). Isso NÃO marca como pago: o recebimento é registrado à parte.`],
    };
    if (textos[novo]) {
      const confirmado = await U.confirmar({ titulo: textos[novo][0], texto: textos[novo][1], rotulo: "Confirmar" });
      if (!confirmado) return null;
    }
    const r = O.mudarStatus(os.id, novo);
    if (r.ok) U.aviso(`${os.numero}: ${O.nomeStatus(novo)}.`);
    else U.aviso(r.erro || "Não foi possível mudar o status.", "erro");
    return r;
  }

  function cancelarOS(os) {
    if (negado("os_cancelar")) return;
    U.formulario({
      titulo: `Cancelar a ${os.numero}?`,
      descricao: "Peças reservadas voltam a ficar disponíveis e orçamentos pendentes desta ordem são cancelados. O cancelamento fica no histórico e não pode ser desfeito.",
      campos: [{ nome: "motivo", rotulo: "Motivo do cancelamento", tipo: "textarea", obrigatorio: true, largura: "inteira", max: 300 }],
      rotuloSalvar: "Cancelar ordem",
      aoSalvar: (v) => ok(O.mudarStatus(os.id, "cancelada", v), `${os.numero} cancelada.`),
    });
    $("#form-salvar").className = "btn btn--perigo-cheio";
  }

  function entregar(os) {
    if (negado("os_entregar")) return;
    const c = L.cliente(os.clienteId);
    U.formulario({
      titulo: `Entregar o veículo da ${os.numero}`,
      descricao: O.situacaoFinanceira(os) !== "pago" ? el("span", { class: "alerta-texto" }, icone("triangle-alert", 14), `Atenção: ainda há ${U.moeda(O.aReceber(os))} a receber desta ordem. A entrega pode ser registrada mesmo assim.`) : "Ordem quitada.",
      campos: [
        { nome: "retiradoPor", rotulo: "Quem retirou o veículo", obrigatorio: true, valor: c && c.tipo === "pf" ? c.nome : "", max: 60 },
        { nome: "kmSaida", rotulo: "Quilometragem na saída", tipo: "inteiro", valor: "", ajuda: `Opcional. Entrada: ${U.numero(os.kmEntrada)} km.` },
      ],
      rotuloSalvar: "Registrar entrega",
      aoSalvar: (v) => ok(O.mudarStatus(os.id, "entregue", v), "Entrega registrada."),
    });
  }

  function recebimento(os) {
    if (negado("recebimento")) return;
    const token = tokenNovo();
    const falta = O.aReceber(os);
    U.formulario({
      titulo: `Registrar recebimento · ${os.numero}`,
      descricao: el("span", {}, "Registra um pagamento que ", el("b", { texto: "já aconteceu" }), ` (nada é cobrado pelo sistema). Faturado: ${U.moeda(os.faturamento.valor)} · recebido: ${U.moeda(O.recebido(os))} · em aberto: ${U.moeda(falta)}.`),
      campos: [
        { nome: "valor", rotulo: "Valor recebido", tipo: "dinheiro", obrigatorio: true, valor: U.decimal(falta) },
        { nome: "forma", rotulo: "Forma de pagamento", tipo: "select", obrigatorio: true, valor: "Pix", opcoes: NX.FORMAS_PAGAMENTO },
        { nome: "data", rotulo: "Data do pagamento", tipo: "date", obrigatorio: true, valor: U.hoje(), max: U.hoje() },
        { nome: "observacao", rotulo: "Observação", valor: "", max: 120 },
      ],
      rotuloSalvar: "Registrar recebimento",
      aoSalvar: (v) => ok(O.registrarRecebimento(os.id, { ...v, token }), "Recebimento registrado."),
    });
  }
  function estornar(os, rec) {
    if (negado("recebimento")) return;
    U.formulario({
      titulo: "Desfazer recebimento?",
      descricao: `${U.moeda(rec.valor)} em ${U.dataCompleta(rec.data)} (${rec.forma}). O registro continua no histórico, marcado como desfeito.`,
      campos: [{ nome: "motivo", rotulo: "Motivo", tipo: "textarea", obrigatorio: true, largura: "inteira", max: 200 }],
      rotuloSalvar: "Desfazer",
      aoSalvar: (v) => ok(O.estornarRecebimento(os.id, rec.id, v.motivo), "Recebimento desfeito."),
    });
    $("#form-salvar").className = "btn btn--perigo-cheio";
  }

  /* ======================================================================
     ORÇAMENTOS
     ====================================================================== */
  function aprovar(o) {
    if (negado("orc_aprovar")) return;
    const c = L.cliente(o.clienteId);
    U.formulario({
      titulo: `Registrar aprovação · ${O.rotuloOrc(o)}`,
      descricao: el("span", {}, `Total: ${U.moeda(O.totaisOrc(o).total)}. `, el("b", { texto: "Registro interno" }), " de quem aprovou, como e quando — não é assinatura digital nem tem validade jurídica. ", o.osId ? "Na aprovação, as peças são reservadas no estoque." : "Depois, abra a ordem de serviço a partir deste orçamento."),
      campos: [
        { nome: "por", rotulo: "Quem aprovou", obrigatorio: true, valor: c && c.tipo === "pf" ? c.nome : "", max: 60 },
        { nome: "canal", rotulo: "Como aprovou", tipo: "select", obrigatorio: true, valor: "", vazio: "Escolha…", opcoes: NX.CANAIS_APROVACAO },
        { nome: "observacao", rotulo: "Observação", valor: "", largura: "inteira", max: 200 },
      ],
      rotuloSalvar: "Registrar aprovação",
      aoSalvar: (v) => {
        const r = O.aprovarOrcamento(o.id, v);
        if (r.ok) U.aviso(r.os && r.os.status === "aguardando_pecas" ? `Aprovado. Faltam peças: a ${r.os.numero} aguarda a entrada no estoque.` : "Aprovação registrada.");
        return r;
      },
    });
  }
  function recusar(o) {
    if (negado("orc_aprovar")) return;
    U.formulario({
      titulo: `Registrar recusa · ${O.rotuloOrc(o)}`,
      campos: [{ nome: "motivo", rotulo: "Motivo informado pelo cliente", tipo: "textarea", obrigatorio: true, largura: "inteira", max: 200 }],
      rotuloSalvar: "Registrar recusa",
      aoSalvar: (v) => ok(O.recusarOrcamento(o.id, v), "Recusa registrada."),
    });
  }
  function cancelarOrc(o) {
    if (negado("orc_criar")) return;
    U.formulario({
      titulo: `Cancelar ${O.rotuloOrc(o)}?`,
      campos: [{ nome: "motivo", rotulo: "Motivo", tipo: "textarea", obrigatorio: true, largura: "inteira", max: 200 }],
      rotuloSalvar: "Cancelar orçamento",
      aoSalvar: (v) => ok(O.cancelarOrcamento(o.id, v), "Orçamento cancelado."),
    });
    $("#form-salvar").className = "btn btn--perigo-cheio";
  }

  // Editor de orçamento avulso (sem OS) ou de rascunho/revisão
  function editorOrcamento(id, { clienteId, veiculoId } = {}) {
    if (negado("orc_criar")) return;
    const atual = id ? L.orcamento(id) : null;
    if (atual && atual.status !== "rascunho") { U.aviso("Só rascunhos podem ser editados. Crie uma revisão.", "erro"); return; }
    let itens = atual ? atual.itens.map((i) => ({ tipo: i.tipo, refId: i.refId, descricao: i.descricao, quantidade: i.quantidade, unitario: i.unitario })) : [];
    const cfg = L.dados.oficina.orcamento;
    const lista = el("div", { class: "editor-itens" });
    const totais = el("div", { class: "editor-totais" });
    const erroItens = el("p", { class: "campo__erro", role: "alert" });
    const tipo = C().seletor([{ valor: "servico", rotulo: "Serviço" }, { valor: "peca", rotulo: "Peça" }, { valor: "mao", rotulo: "Mão de obra (h)" }], "servico", () => trocarTipo(), { rotulo: "Tipo do item" });
    const ref = el("select", { class: "seletor", "aria-label": "Item do catálogo" });
    const desc = el("input", { class: "campo-texto", type: "text", placeholder: "Descrição da mão de obra", "aria-label": "Descrição da mão de obra", maxlength: 80, hidden: true });
    const qtd = el("input", { class: "campo-texto campo-texto--qtd", type: "text", inputmode: "decimal", value: "1", "aria-label": "Quantidade ou horas" });
    function trocarTipo() {
      const t = tipo.value;
      const opcoes = t === "servico" ? C().opcoesServicos() : t === "peca" ? C().opcoesPecas() : [];
      U.trocar(ref, el("option", { value: "", texto: "Escolha…" }), ...opcoes.map((o) => el("option", { value: o.valor, texto: o.rotulo })));
      ref.hidden = t === "mao";
      desc.hidden = t !== "mao";
      qtd.value = "1";
    }
    const adicionar = el("button", { class: "btn btn--linha", type: "button", onclick: () => {
      erroItens.textContent = "";
      const t = tipo.value;
      if (t !== "mao" && !ref.value) { erroItens.textContent = "Escolha o item do catálogo."; ref.focus(); return; }
      if (t === "mao" && desc.value.trim().length < 3) { erroItens.textContent = "Descreva a mão de obra."; desc.focus(); return; }
      const q = U.lerValor(qtd.value);
      if (!(q > 0) || (t !== "mao" && !Number.isInteger(q)) || (t === "mao" && Math.round(q * 4) !== q * 4)) { erroItens.textContent = t === "mao" ? "Horas em múltiplos de 0,25." : "Quantidade inteira maior que zero."; qtd.focus(); return; }
      if (t === "servico") { const s = L.servico(ref.value); itens.push({ tipo: t, refId: s.id, descricao: `${s.codigo} · ${s.nome}`, quantidade: q, unitario: s.preco }); }
      else if (t === "peca") { const p = L.peca(ref.value); itens.push({ tipo: t, refId: p.id, descricao: `${p.sku} · ${p.nome}`, quantidade: q, unitario: p.preco }); }
      else itens.push({ tipo: "mao", refId: null, descricao: desc.value.trim(), quantidade: q, unitario: cfg.valorHora });
      desc.value = "";
      ref.value = "";
      desenharItens();
      tipo.focus();
    } }, icone("plus", 15), "Incluir");
    function desenharItens() {
      U.trocar(lista, ...(itens.length ? itens.map((i, k) => el("div", { class: "editor-item" },
        el("span", { class: "editor-item__texto" }, el("b", { texto: i.descricao }), el("small", { texto: `${i.tipo === "mao" ? `${U.decimal(i.quantidade)} h` : `${i.quantidade} un.`} × ${U.moeda(i.unitario)}` })),
        el("span", { class: "editor-item__valor", texto: U.moeda(i.quantidade * i.unitario) }),
        el("button", { class: "icone-btn icone-btn--sutil icone-btn--perigo icone-btn--p", type: "button", "aria-label": `Remover ${i.descricao}`, onclick: () => { itens.splice(k, 1); desenharItens(); } }, icone("trash", 15)))) : [el("p", { class: "vazio-pequeno", texto: "Nenhum item ainda. Inclua serviços, peças ou mão de obra." })]));
      const t = O.totais(itens);
      U.trocar(totais, el("span", {}, "Serviços e mão de obra ", el("b", { texto: U.moeda(t.maoDeObra) })), el("span", {}, "Peças ", el("b", { texto: U.moeda(t.pecas) })), el("span", {}, "Subtotal ", el("b", { texto: U.moeda(t.subtotal) })));
    }
    const extra = el("div", { class: "editor-orcamento" },
      el("h3", { class: "subtitulo-form", texto: "Itens" }),
      el("div", { class: "editor-adicionar" }, tipo, ref, desc, qtd, adicionar),
      erroItens, lista, totais,
      el("p", { class: "campo__ajuda", texto: "Montar o orçamento não mexe no estoque. Os valores vêm do catálogo; o total é calculado automaticamente." }));
    const f = U.formulario({
      titulo: atual ? `Editar rascunho ${O.rotuloOrc(atual)}` : "Novo orçamento",
      descricao: atual ? null : "Orçamento avulso (sem ordem de serviço), por exemplo pedido por telefone. Se o cliente aprovar, a OS pode ser aberta a partir dele.",
      largura: "larga",
      campos: [
        { nome: "clienteId", rotulo: "Cliente", tipo: "select", obrigatorio: !atual, valor: atual ? atual.clienteId : clienteId || "", vazio: "Escolha…", opcoes: C().opcoesClientes(),
          aoMudar: (cid, form) => { const s = form.elements.veiculoId; U.trocar(s, el("option", { value: "", texto: "Escolha…" }), ...C().opcoesVeiculos(cid).map((o) => el("option", { value: o.valor, texto: o.rotulo }))); if (C().opcoesVeiculos(cid).length === 1) s.value = C().opcoesVeiculos(cid)[0].valor; } },
        { nome: "veiculoId", rotulo: "Veículo", tipo: "select", obrigatorio: !atual, valor: atual ? atual.veiculoId : veiculoId || "", vazio: "Escolha…", opcoes: C().opcoesVeiculos(atual ? atual.clienteId : clienteId) },
        { nome: "desconto", rotulo: "Desconto (R$)", tipo: "dinheiro", valor: atual && atual.desconto ? U.decimal(atual.desconto) : "", ajuda: `Até ${cfg.descontoMax}% sem autorização do administrador.` },
        { nome: "validadeDias", rotulo: "Validade (dias)", tipo: "inteiro", valor: atual ? String(U.diasEntre(atual.emitidoEm, atual.validade)) : String(cfg.validadeDias) },
        { nome: "observacoes", rotulo: "Observações para o cliente", tipo: "textarea", linhas: 2, valor: atual ? atual.observacoes : "", largura: "inteira", max: 400 },
        { nome: "enviar", rotulo: "Enviar agora para aprovação do cliente", tipo: "checkbox", valor: false, largura: "inteira", ajuda: "Desmarcado, fica como rascunho." },
      ],
      extra,
      rotuloSalvar: atual ? "Salvar rascunho" : "Criar orçamento",
      aoSalvar: (v) => {
        const r = O.salvarOrcamento({ ...v, itens }, id);
        if (!r.ok && r.erros && r.erros.itens) erroItens.textContent = r.erros.itens;
        if (r.ok) { U.aviso(r.orcamento.status === "rascunho" ? "Rascunho salvo." : "Orçamento enviado para aprovação."); if (!atual) setTimeout(() => NX.ir(`orcamentos/${r.orcamento.id}`), 30); }
        return r;
      },
    });
    if (atual) { f.form.elements.clienteId.disabled = true; f.form.elements.veiculoId.disabled = true; }
    trocarTipo();
    desenharItens();
  }

  /* ======================================================================
     CATÁLOGO, ESTOQUE, FORNECEDORES E EQUIPE
     ====================================================================== */
  function servico(id) {
    if (negado("catalogo")) return;
    const s = id ? L.servico(id) : null;
    U.formulario({
      titulo: s ? `Editar ${s.codigo}` : "Novo serviço",
      descricao: s ? "Mudar o preço vale para os próximos orçamentos; os já emitidos mantêm o valor da época." : null,
      campos: [
        { nome: "nome", rotulo: "Nome do serviço", obrigatorio: true, valor: s ? s.nome : "", largura: "inteira", max: 60 },
        { nome: "categoria", rotulo: "Categoria", tipo: "select", obrigatorio: true, valor: s ? s.categoria : "", vazio: "Escolha…", opcoes: L.dados.oficina.categoriasServico },
        { nome: "preco", rotulo: "Preço de referência (R$)", tipo: "dinheiro", obrigatorio: true, valor: s ? U.decimal(s.preco) : "" },
        { nome: "tempo", rotulo: "Tempo estimado (minutos)", tipo: "inteiro", obrigatorio: true, valor: s ? s.tempo : "" },
        { nome: "descricao", rotulo: "Descrição", tipo: "textarea", linhas: 2, valor: s ? s.descricao : "", largura: "inteira", max: 300 },
      ],
      rotuloSalvar: s ? "Salvar" : "Cadastrar serviço",
      aoSalvar: (v) => ok(L.salvarServico(v, id), s ? "Serviço atualizado." : "Serviço cadastrado."),
    });
  }

  function peca(id) {
    if (negado("catalogo")) return;
    const p = id ? L.peca(id) : null;
    const f = U.formulario({
      titulo: p ? `Editar ${p.sku}` : "Nova peça ou produto",
      descricao: p ? "O saldo não é editado aqui: ele vem das movimentações (entrada, saída, ajuste). Mudanças de custo, preço e mínimo ficam no histórico da peça." : "O saldo inicial (opcional) entra como a primeira movimentação de estoque.",
      largura: "larga",
      campos: [
        { nome: "nome", rotulo: "Nome", obrigatorio: true, valor: p ? p.nome : "", largura: "inteira", max: 80 },
        { nome: "sku", rotulo: "Código (SKU)", obrigatorio: true, valor: p ? p.sku : "", maiusculas: true, placeholder: "FRE-1001", max: 20 },
        { nome: "categoria", rotulo: "Categoria", tipo: "select", obrigatorio: true, valor: p ? p.categoria : "", vazio: "Escolha…", opcoes: L.dados.oficina.categoriasPeca },
        { nome: "fabricante", rotulo: "Fabricante", valor: p ? p.fabricante : "", max: 40 },
        { nome: "fornecedorId", rotulo: "Fornecedor principal", tipo: "select", valor: p ? p.fornecedorId || "" : "", vazio: "Nenhum", opcoes: L.dados.fornecedores.filter((x) => x.status === "ativo" || (p && x.id === p.fornecedorId)).map((x) => ({ valor: x.id, rotulo: x.nome })) },
        { nome: "local", rotulo: "Localização no estoque", valor: p ? p.local : "", placeholder: "Prateleira B2", max: 30 },
        { nome: "minimo", rotulo: "Estoque mínimo", tipo: "inteiro", obrigatorio: true, valor: p ? p.minimo : String(L.dados.oficina.estoque.minimoPadrao), ajuda: p ? null : "Padrão definido em Configurações." },
        { nome: "custo", rotulo: "Custo unitário (R$)", tipo: "dinheiro", obrigatorio: true, valor: p ? U.decimal(p.custo) : "" },
        { nome: "preco", rotulo: "Preço de venda (R$)", tipo: "dinheiro", obrigatorio: true, valor: p ? U.decimal(p.preco) : "" },
        ...(p ? [] : [{ nome: "inicial", rotulo: "Saldo inicial", tipo: "inteiro", valor: "", ajuda: "Quantidade contada agora (opcional)." }]),
      ],
      rotuloSalvar: p ? "Salvar" : "Cadastrar peça",
      aoSalvar: (v) => ok(L.salvarPeca(v, id), p ? "Peça atualizada." : "Peça cadastrada."),
    });
    const margem = () => {
      const c = U.lerValor(f.form.elements.custo.value);
      const pr = U.lerValor(f.form.elements.preco.value);
      f.ajuda("preco", c > 0 && pr > 0 ? el("span", { class: pr < c ? "dica-margem negativa" : "dica-margem" }, `Margem: ${U.percentual((pr - c) / pr)} (${U.moeda(pr - c)} por unidade)`) : "");
    };
    f.form.elements.custo.addEventListener("input", margem);
    f.form.elements.preco.addEventListener("input", margem);
    margem();
  }

  function fornecedor(id) {
    if (negado("catalogo")) return;
    const x = id ? L.fornecedor(id) : null;
    U.formulario({
      titulo: x ? "Editar fornecedor" : "Novo fornecedor",
      campos: [
        { nome: "nome", rotulo: "Nome empresarial", obrigatorio: true, valor: x ? x.nome : "", largura: "inteira", max: 80 },
        { nome: "contato", rotulo: "Pessoa de contato", obrigatorio: true, valor: x ? x.contato : "", max: 60 },
        { nome: "telefone", rotulo: "Telefone", tipo: "tel", obrigatorio: true, valor: x ? U.mascaraTelefone(x.telefone) : "" },
        { nome: "email", rotulo: "E-mail", tipo: "email", valor: x ? x.email : "", max: 120 },
        { nome: "cnpj", rotulo: "CNPJ", valor: x && x.cnpj ? U.mascaraCnpj(x.cnpj) : "", mascara: "cnpj", max: 18 },
        { nome: "endereco", rotulo: "Endereço", valor: x ? x.endereco : "", largura: "inteira", max: 140 },
        { nome: "produtos", rotulo: "Produtos fornecidos", valor: x ? x.produtos : "", largura: "inteira", max: 200 },
        { nome: "observacoes", rotulo: "Observações", tipo: "textarea", linhas: 2, valor: x ? x.observacoes : "", largura: "inteira", max: 400 },
      ],
      rotuloSalvar: x ? "Salvar" : "Cadastrar fornecedor",
      aoSalvar: (v) => ok(L.salvarFornecedor(v, id), x ? "Fornecedor atualizado." : "Fornecedor cadastrado."),
    });
  }

  function membro(id) {
    if (negado("equipe")) return;
    const m = id ? L.membro(id) : null;
    const marcadas = new Set(m ? m.categorias : []);
    const caixa = el("fieldset", { class: "opcoes" }, el("legend", { texto: "Tipos de serviço que realiza (técnicos)" }),
      el("div", { class: "marcar-grade" }, ...L.dados.oficina.categoriasServico.map((cat) => el("label", { class: "caixa-marcar" }, el("input", { type: "checkbox", value: cat, checked: marcadas.has(cat) || null }), el("span", { texto: cat })))));
    const erroCat = el("p", { class: "form-secao-erro", role: "alert" });
    U.formulario({
      titulo: m ? `Editar ${m.nome}` : "Nova pessoa na equipe",
      descricao: "Os números mostrados na equipe vêm só das ordens registradas no sistema (nada é estimado).",
      campos: [
        { nome: "nome", rotulo: "Nome", obrigatorio: true, valor: m ? m.nome : "", largura: "inteira", max: 60 },
        { nome: "funcao", rotulo: "Função", tipo: "select", obrigatorio: true, valor: m ? m.funcao : "mecanico", opcoes: NX.FUNCOES.map((x) => ({ valor: x.id, rotulo: x.nome })) },
        { nome: "contato", rotulo: "Telefone profissional", tipo: "tel", valor: m && m.contato ? U.mascaraTelefone(m.contato) : "" },
        { nome: "especialidade", rotulo: "Especialidade", obrigatorio: true, valor: m ? m.especialidade : "", largura: "inteira", placeholder: "Ex.: Freios e suspensão", max: 80 },
      ],
      extra: el("div", {}, caixa, erroCat),
      rotuloSalvar: m ? "Salvar" : "Cadastrar",
      aoSalvar: (v) => {
        const categorias = [...caixa.querySelectorAll("input:checked")].map((i) => i.value);
        const r = L.salvarMembro({ ...v, categorias }, id);
        erroCat.textContent = (r.erros && r.erros.categorias) || "";
        return ok(r, m ? "Cadastro atualizado." : "Pessoa cadastrada.");
      },
    });
  }

  function movimento(tipo, pecaId) {
    if (negado(tipo === "ajuste" ? "estoque_ajuste" : "estoque_mov")) return;
    const p = pecaId ? L.peca(pecaId) : null;
    const opcoes = L.dados.pecas.filter((x) => x.status === "ativo").map((x) => ({ valor: x.id, rotulo: `${x.sku} · ${x.nome} (saldo ${O.saldo(x.id)})`, grupo: x.categoria }));
    const comum = { nome: "pecaId", rotulo: "Peça", tipo: "select", obrigatorio: true, valor: p ? p.id : "", vazio: "Escolha…", opcoes, largura: "inteira",
      aoMudar: (pid) => info(pid) };
    let f;
    const info = (pid) => {
      const x = L.peca(pid);
      if (f) f.ajuda("pecaId", x ? `Saldo ${O.saldo(x.id)} · reservado para OS ${O.reservado(x.id)} · disponível ${O.disponivel(x.id)} · mínimo ${x.minimo}` : "");
    };
    if (tipo === "entrada") {
      f = U.formulario({
        titulo: "Entrada de peças",
        descricao: "Compra ou outra entrada. Ordens que aguardam esta peça recebem a reserva automaticamente.",
        campos: [
          comum,
          { nome: "quantidade", rotulo: "Quantidade", tipo: "inteiro", obrigatorio: true, valor: "" },
          { nome: "custoUnitario", rotulo: "Custo unitário (R$)", tipo: "dinheiro", valor: "", ajuda: "Em branco = custo do cadastro." },
          { nome: "fornecedorId", rotulo: "Fornecedor", tipo: "select", valor: p && p.fornecedorId ? p.fornecedorId : "", vazio: "Sem fornecedor (outra origem)", opcoes: L.dados.fornecedores.filter((x) => x.status === "ativo").map((x) => ({ valor: x.id, rotulo: x.nome })) },
          { nome: "documento", rotulo: "Nota ou documento", valor: "", max: 40, placeholder: "NF-e 000123" },
          { nome: "observacao", rotulo: "Observação", valor: "", largura: "inteira", max: 200, ajuda: "Obrigatória quando não há fornecedor (ex.: devolução de cliente)." },
          ...(O.pode("despesas") ? [{ nome: "lancarDespesa", rotulo: "Lançar a compra como despesa a pagar", tipo: "checkbox", valor: true, largura: "inteira" }] : []),
        ],
        rotuloSalvar: "Registrar entrada",
        aoSalvar: (v) => {
          const r = O.registrarEntrada(v);
          if (r.ok) U.aviso(r.liberadas && r.liberadas.length ? `Entrada registrada. Peças reservadas para: ${r.liberadas.join(", ")}.` : "Entrada registrada.");
          return r;
        },
      });
    } else if (tipo === "saida") {
      f = U.formulario({
        titulo: "Saída avulsa",
        descricao: "Para usos fora de ordem de serviço (as peças de OS saem sozinhas na finalização do serviço). Não é possível tirar peça reservada nem deixar o saldo negativo.",
        campos: [
          comum,
          { nome: "quantidade", rotulo: "Quantidade", tipo: "inteiro", obrigatorio: true, valor: "" },
          { nome: "motivo", rotulo: "Motivo", tipo: "select", obrigatorio: true, valor: "", vazio: "Escolha…", opcoes: NX.MOTIVOS_SAIDA },
          { nome: "documento", rotulo: "Documento", valor: "", max: 40 },
          { nome: "observacao", rotulo: "Explicação", tipo: "textarea", linhas: 2, obrigatorio: true, valor: "", largura: "inteira", max: 200 },
        ],
        rotuloSalvar: "Registrar saída",
        aoSalvar: (v) => ok(O.registrarSaida(v), "Saída registrada."),
      });
    } else {
      f = U.formulario({
        titulo: "Ajuste de inventário",
        descricao: "Informe a quantidade contada na prateleira. O sistema lança a diferença (para mais ou para menos) e guarda o motivo.",
        campos: [
          comum,
          { nome: "contada", rotulo: "Quantidade contada", tipo: "inteiro", obrigatorio: true, valor: "" },
          { nome: "motivo", rotulo: "Motivo", tipo: "select", obrigatorio: true, valor: "Inventário (contagem)", opcoes: NX.MOTIVOS_AJUSTE },
          { nome: "observacao", rotulo: "Descrição da contagem", tipo: "textarea", linhas: 2, obrigatorio: true, valor: "", largura: "inteira", max: 200 },
        ],
        rotuloSalvar: "Registrar ajuste",
        aoSalvar: (v) => {
          const r = O.registrarAjuste(v);
          if (r.ok) U.aviso(r.aviso || "Ajuste registrado.", r.aviso ? "info" : "ok");
          return r;
        },
      });
    }
    info(p ? p.id : "");
  }

  function despesa(id) {
    if (negado("despesas")) return;
    const x = id ? L.despesa(id) : null;
    const f = U.formulario({
      titulo: x ? "Editar despesa" : "Nova despesa",
      descricao: "Registro manual. Nenhum pagamento é feito pelo sistema.",
      campos: [
        { nome: "descricao", rotulo: "Descrição", obrigatorio: true, valor: x ? x.descricao : "", largura: "inteira", max: 80 },
        { nome: "categoria", rotulo: "Categoria", tipo: "select", obrigatorio: true, valor: x ? x.categoria : "", vazio: "Escolha…", opcoes: NX.CATEGORIAS_DESPESA },
        { nome: "valor", rotulo: "Valor (R$)", tipo: "dinheiro", obrigatorio: true, valor: x ? U.decimal(x.valor) : "" },
        { nome: "data", rotulo: "Data (vencimento ou competência)", tipo: "date", obrigatorio: true, valor: x ? x.data : U.hoje() },
        { nome: "fornecedorId", rotulo: "Fornecedor", tipo: "select", valor: x ? x.fornecedorId || "" : "", vazio: "Nenhum", opcoes: L.dados.fornecedores.map((y) => ({ valor: y.id, rotulo: y.nome })) },
        { nome: "pago", rotulo: "Já foi paga", tipo: "checkbox", valor: x ? x.status === "pago" : false, aoMudar: (v, form) => mostrarCampo(form, "pagoEm", v) },
        { nome: "pagoEm", rotulo: "Data do pagamento", tipo: "date", valor: x && x.pagoEm ? x.pagoEm : U.hoje(), max: U.hoje() },
        { nome: "observacao", rotulo: "Observação", valor: x ? x.observacao : "", largura: "inteira", max: 200 },
      ],
      rotuloSalvar: x ? "Salvar" : "Lançar despesa",
      aoSalvar: (v) => ok(O.salvarDespesa(v, id), x ? "Despesa atualizada." : "Despesa lançada."),
    });
    mostrarCampo(f.form, "pagoEm", f.form.elements.pago.checked);
  }
  function pagarDespesa(x) {
    if (negado("despesas")) return;
    U.formulario({
      titulo: "Marcar despesa como paga",
      descricao: `${x.descricao} · ${U.moeda(x.valor)}`,
      campos: [{ nome: "data", rotulo: "Data do pagamento", tipo: "date", obrigatorio: true, valor: U.hoje(), max: U.hoje() }],
      rotuloSalvar: "Marcar como paga",
      aoSalvar: (v) => ok(O.pagarDespesa(x.id, v.data), "Despesa marcada como paga."),
    });
  }
  function cancelarDespesa(x) {
    if (negado("despesas")) return;
    U.formulario({
      titulo: "Cancelar despesa?",
      descricao: `${x.descricao} · ${U.moeda(x.valor)}. Ela continua na lista, marcada como cancelada.`,
      campos: [{ nome: "motivo", rotulo: "Motivo", tipo: "textarea", obrigatorio: true, largura: "inteira", max: 200 }],
      rotuloSalvar: "Cancelar despesa",
      aoSalvar: (v) => ok(O.cancelarDespesa(x.id, v.motivo), "Despesa cancelada."),
    });
    $("#form-salvar").className = "btn btn--perigo-cheio";
  }

  /* ======================================================================
     AGENDA
     ====================================================================== */
  function compromisso(id, preset = {}) {
    if (negado("agenda")) return;
    const c = id ? L.compromisso(id) : null;
    const base = c || preset;
    const os = base.osId ? L.ordem(base.osId) : null;
    const boxes = Array.from({ length: L.dados.oficina.boxes }, (_, i) => ({ valor: String(i + 1), rotulo: `Box ${i + 1}` }));
    const cid = base.clienteId || (os ? os.clienteId : "");
    const f = U.formulario({
      titulo: c ? "Editar compromisso" : "Novo compromisso",
      descricao: "Técnicos e boxes não podem estar ocupados duas vezes no mesmo horário. Previsões de conclusão das ordens aparecem na agenda, mas não ocupam técnico nem box.",
      largura: "larga",
      campos: [
        { nome: "tipo", rotulo: "Tipo", tipo: "select", obrigatorio: true, valor: base.tipo || "recepcao", opcoes: NX.TIPOS_AGENDA.map((t) => ({ valor: t.id, rotulo: t.nome })), aoMudar: (t, form) => ajustar(t, form) },
        { nome: "data", rotulo: "Data", tipo: "date", obrigatorio: true, valor: base.data || U.hoje(), min: c ? null : U.hoje() },
        { nome: "inicio", rotulo: "Início", tipo: "time", obrigatorio: true, valor: base.inicio || "", passo: 900 },
        { nome: "fim", rotulo: "Fim", tipo: "time", obrigatorio: true, valor: base.fim || "", passo: 900 },
        { nome: "tecnicoId", rotulo: "Técnico", tipo: "select", valor: base.tecnicoId || "", vazio: "Nenhum", opcoes: C().opcoesTecnicos() },
        { nome: "box", rotulo: "Box", tipo: "select", valor: base.box ? String(base.box) : "", vazio: "Nenhum", opcoes: boxes },
        { nome: "clienteId", rotulo: "Cliente", tipo: "select", valor: cid, vazio: "Nenhum", opcoes: C().opcoesClientes(),
          aoMudar: (v, form) => { const s = form.elements.veiculoId; U.trocar(s, el("option", { value: "", texto: "Nenhum" }), ...C().opcoesVeiculos(v).map((o) => el("option", { value: o.valor, texto: o.rotulo }))); } },
        { nome: "veiculoId", rotulo: "Veículo", tipo: "select", valor: base.veiculoId || (os ? os.veiculoId : ""), vazio: "Nenhum", opcoes: cid ? C().opcoesVeiculos(cid) : [] },
        { nome: "osId", rotulo: "Ordem de serviço", tipo: "select", valor: base.osId || "", vazio: "Nenhuma", opcoes: L.dados.ordens.filter((x) => O.ABERTAS.includes(x.status) || x.id === base.osId).map((x) => ({ valor: x.id, rotulo: `${x.numero} · ${C().textoVeiculo(x.veiculoId)}` })), largura: "inteira" },
        { nome: "observacoes", rotulo: "Observações", valor: base.observacoes || "", largura: "inteira", max: 200 },
      ],
      rotuloSalvar: c ? "Salvar" : "Agendar",
      aoSalvar: (v) => ok(O.salvarCompromisso(v, id), c ? "Compromisso atualizado." : "Compromisso agendado."),
    });
    function ajustar(t, form) {
      const tipo = NX.TIPOS_AGENDA.find((x) => x.id === t);
      f.ajuda("tecnicoId", tipo.recurso === "tecnico" ? "Obrigatório: quem ficará indisponível." : tipo.recurso === "obrigatorio" ? "Escolha o técnico, o box ou os dois." : "Opcional para este tipo.");
      mostrarCampo(form, "box", tipo.recurso !== "tecnico");
      ["clienteId", "veiculoId", "osId"].forEach((n) => mostrarCampo(form, n, tipo.recurso !== "tecnico"));
    }
    ajustar(base.tipo || "recepcao", f.form);
    const horario = L.dados.oficina.horarios;
    const dataCampo = f.form.elements.data;
    const mostrarHorario = () => { const h = U.dataValida(dataCampo.value) ? horario[U.diaDaSemana(dataCampo.value)] : null; f.ajuda("data", U.dataValida(dataCampo.value) ? (h ? `${NX.DIAS[U.diaDaSemana(dataCampo.value)]}: aberto das ${h.abre} às ${h.fecha}.` : `${NX.DIAS[U.diaDaSemana(dataCampo.value)]}: a oficina não abre.`) : ""); };
    dataCampo.addEventListener("change", mostrarHorario);
    mostrarHorario();
  }

  NX.form = {
    cliente, veiculo, excluirCliente, excluirVeiculo, novaOS, editarOS, item, gerarOrcamento, mudarStatus, cancelarOS, entregar, recebimento, estornar,
    aprovar, recusar, cancelarOrc, editorOrcamento, servico, peca, fornecedor, membro, movimento, despesa, pagarDespesa, cancelarDespesa, compromisso,
  };
})();
