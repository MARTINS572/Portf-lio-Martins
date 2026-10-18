/* ==========================================================================
   NEXORA AUTO — loja.js
   Guarda os dados e os CADASTROS (clientes, veículos, serviços, peças,
   fornecedores, equipe e configurações). As regras de ordem de serviço,
   orçamento, estoque e financeiro ficam em oficina.js.

   DEMONSTRAÇÃO LOCAL: tudo fica no localStorage deste navegador. Não há
   servidor, banco de dados, login nem sincronização entre aparelhos. Os
   registros já levam o id da oficina ("of1") para que, no futuro, cada
   empresa tenha os seus dados separados no servidor.
   ========================================================================== */
window.NX = window.NX || {};

(function () {
  "use strict";
  const U = NX.util;
  const CHAVE = "nexora-auto:dados";
  const VERSAO = 1;
  const ouvintes = new Set();
  let dados = null;
  let persistente = true;
  let versao = 0;
  let gerando = false;   // true enquanto o gerador dos exemplos monta um conjunto novo

  /* ---------- Carregar, salvar, sincronizar ---------- */
  function lerArmazenado() {
    try {
      const texto = localStorage.getItem(CHAVE);
      const lido = texto ? JSON.parse(texto) : null;
      return lido && lido.versao === VERSAO && Array.isArray(lido.ordens) && lido.oficina ? lido : null;
    } catch (e) { persistente = false; return null; }
  }
  // Dados gravados por uma versão anterior podiam ter itens de orçamento/OS sem
  // identificador (vindos do editor de orçamento). Aqui cada item recebe o seu,
  // e a baixa de estoque daquele item passa a apontar para ele.
  function repararIds(base) {
    let mudou = false;
    (base.orcamentos || []).forEach((o) => (o.itens || []).forEach((i) => { if (!i.id) { i.id = novoId("i"); mudou = true; } }));
    (base.ordens || []).forEach((os) => (os.itens || []).forEach((i) => {
      if (i.id) return;
      i.id = novoId("i");
      mudou = true;
      const mov = i.movimentoId ? (base.movimentos || []).find((m) => m.id === i.movimentoId) : null;
      if (mov) mov.osItemId = i.id;
    }));
    return mudou;
  }
  // Dados gravados antes do campo "tipo de veículo": os veículos de exemplo recebem o
  // tipo conhecido; os cadastrados à mão ficam "não informado" até a próxima edição.
  function completarTipos(base) {
    let mudou = false;
    (base.veiculos || []).forEach((v) => {
      if (v.tipo !== undefined) return;
      v.tipo = (v.ficticio && NX.TIPOS_VEICULO_EXEMPLO && NX.TIPOS_VEICULO_EXEMPLO[v.id]) || "";
      mudou = true;
    });
    return mudou;
  }
  function carregar() {
    U.definirFuso("America/Sao_Paulo");
    const lido = lerArmazenado();
    if (lido) { dados = lido; versao += 1; const a = repararIds(dados); const b = completarTipos(dados); if (a || b) gravar(); return; }
    dados = NX.criarDadosDemo();
    versao += 1;
    gravar();
  }
  function gravar() {
    try { localStorage.setItem(CHAVE, JSON.stringify(dados)); persistente = true; return true; } catch (e) { persistente = false; return false; }
  }
  function salvar(avisar = true) {
    versao += 1;
    if (gerando) return true;
    dados.revisao = (dados.revisao || 0) + 1;
    const ok = gravar();
    if (avisar) ouvintes.forEach((fn) => fn());
    return ok;
  }
  // Relê o armazenamento: se outra aba gravou algo mais novo, passa a usar esses dados
  function sincronizar() {
    if (gerando) return false;
    const lido = lerArmazenado();
    if (lido && (lido.revisao || 0) > (dados.revisao || 0)) { repararIds(lido); completarTipos(lido); dados = lido; versao += 1; return true; }
    return false;
  }
  function restaurar() {
    const rev = dados ? dados.revisao || 0 : 0;
    dados = NX.criarDadosDemo();
    dados.revisao = rev;
    salvar();
  }
  // Usado só pelo gerador de exemplos: as regras passam a trabalhar sobre "novo",
  // sem gravar nada, e no fim tudo volta como estava.
  function comDados(novo, fn) {
    const antes = dados;
    const antesGerando = gerando;
    dados = novo;
    gerando = true;
    versao += 1;
    try { fn(); } finally { dados = antes; gerando = antesGerando; versao += 1; }
    return novo;
  }
  if (typeof window.addEventListener === "function") {
    window.addEventListener("storage", (e) => {
      if (e.key !== CHAVE || !e.newValue) return;
      try { const novo = JSON.parse(e.newValue); repararIds(novo); completarTipos(novo); dados = novo; versao += 1; ouvintes.forEach((fn) => fn()); } catch (erro) { /* ignora */ }
    });
  }
  const tamanhoSalvo = () => { try { return (localStorage.getItem(CHAVE) || "").length; } catch (e) { return 0; } };
  // Hora + contador + sorteio: o contador garante ids diferentes mesmo quando
  // muitos registros nascem no mesmo milissegundo (como ao montar os exemplos).
  let contadorId = 0;
  const novoId = (p) => { contadorId += 1; return `${p}${Date.now().toString(36)}${contadorId.toString(36)}${Math.random().toString(36).slice(2, 6).padEnd(4, "0")}`; };
  const quem = () => (dados.perfil ? dados.perfil.nome : "Usuário");

  /* ---------- Consultas ---------- */
  const achar = (lista, id) => dados[lista].find((x) => x.id === id) || null;
  const cliente = (id) => achar("clientes", id);
  const veiculo = (id) => achar("veiculos", id);
  const servico = (id) => achar("servicos", id);
  const peca = (id) => achar("pecas", id);
  const fornecedor = (id) => achar("fornecedores", id);
  const membro = (id) => achar("equipe", id);
  const ordem = (id) => achar("ordens", id);
  const orcamento = (id) => achar("orcamentos", id);
  const compromisso = (id) => achar("agenda", id);
  const despesa = (id) => achar("despesas", id);
  const movimento = (id) => achar("movimentos", id);
  const igual = (a, b) => U.semAcento(a).replace(/\s+/g, " ").trim() === U.semAcento(b).replace(/\s+/g, " ").trim();
  const texto = (v, max) => String(v || "").trim().replace(/\s+/g, " ").slice(0, max);
  const veiculosDoCliente = (cid) => dados.veiculos.filter((v) => v.clienteId === cid);
  const tecnicos = ({ todos } = {}) => dados.equipe.filter((m) => m.tecnico && (todos || m.status === "ativo"));

  /* ---------- Placa, documentos e números ---------- */
  // Placa antiga (ABC1234) ou Mercosul (ABC1D23). Guardada sem traço, em maiúsculas.
  const limparPlaca = (p) => String(p || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  const placaValida = (p) => /^[A-Z]{3}\d{4}$/.test(p) || /^[A-Z]{3}\d[A-Z]\d{2}$/.test(p);
  const mostrarPlaca = (p) => (/^[A-Z]{3}\d{4}$/.test(p) ? `${p.slice(0, 3)}-${p.slice(3)}` : p);
  function cpfValido(v) {
    const n = U.digitos(v);
    if (n.length !== 11 || /^(\d)\1+$/.test(n)) return false;
    const dv = (base) => { const s = base.split("").reduce((t, x, i) => t + Number(x) * (base.length + 1 - i), 0) % 11; return s < 2 ? 0 : 11 - s; };
    const d1 = dv(n.slice(0, 9));
    return n.endsWith(`${d1}${dv(n.slice(0, 9) + d1)}`);
  }
  const documentoValido = (v) => { const n = U.digitos(v); return n.length === 11 ? cpfValido(n) : n.length === 14 ? U.cnpjValido(n) : false; };
  function mostrarDocumento(v) {
    const n = U.digitos(v);
    if (n.length === 11) return `${n.slice(0, 3)}.${n.slice(3, 6)}.${n.slice(6, 9)}-${n.slice(9)}`;
    if (n.length === 14) return U.mascaraCnpj(n);
    return v || "";
  }
  const dinheiro = (v, erros, campo, { obrigatorio = true, rotulo = "o valor" } = {}) => {
    const t = String(v ?? "").trim();
    if (!t) { if (obrigatorio) erros[campo] = `Informe ${rotulo}.`; return null; }
    const n = U.lerValor(t);
    if (!Number.isFinite(n) || n < 0) { erros[campo] = "Digite um valor válido, como 120,00."; return null; }
    if (n > 1000000) { erros[campo] = "Valor alto demais para esta demonstração."; return null; }
    return U.arredondar(n);
  };
  const inteiro = (v, erros, campo, { min = 0, max = 1e7, rotulo = "o número", obrigatorio = true } = {}) => {
    const t = String(v ?? "").trim();
    if (!t) { if (obrigatorio) erros[campo] = `Informe ${rotulo}.`; return null; }
    const n = U.lerInteiro(t);
    if (!Number.isFinite(n)) { erros[campo] = "Use um número inteiro, sem vírgula."; return null; }
    if (n < min || n > max) { erros[campo] = `Use um valor entre ${U.numero(min)} e ${U.numero(max)}.`; return null; }
    return n;
  };

  // Perfis: a regra fica aqui também (não só nos botões). É simulação no navegador, não segurança.
  const permitir = (acao) => (NX.oficina && !NX.oficina.pode(acao) ? NX.oficina.negar(acao) : null);

  /* ---------- Clientes ---------- */
  function validarCliente(v, id) {
    const erros = {};
    const nome = texto(v.nome, 100);
    if (nome.length < 3) erros.nome = "Informe o nome completo ou o nome da empresa.";
    const tel = U.digitos(v.telefone);
    if (!U.telefoneValido(tel)) erros.telefone = "Informe o telefone com DDD, como (19) 91234-5678.";
    else { const outro = dados.clientes.find((c) => c.id !== id && c.telefone === tel); if (outro) erros.telefone = `Este telefone já está no cadastro de ${outro.nome}.`; }
    const email = String(v.email || "").trim().toLowerCase();
    if (email && !U.emailValido(email)) erros.email = "Digite um e-mail válido ou deixe em branco.";
    const doc = U.digitos(v.documento);
    if (doc) {
      if (!documentoValido(doc)) erros.documento = "CPF ou CNPJ inválido (confira os números) ou deixe em branco.";
      else { const outro = dados.clientes.find((c) => c.id !== id && c.documento === doc); if (outro) erros.documento = `Este documento já está no cadastro de ${outro.nome}.`; }
    }
    if (String(v.observacoes || "").length > 500) erros.observacoes = "Use no máximo 500 caracteres.";
    return { erros, limpo: { nome, tipo: doc.length === 14 ? "pj" : v.tipo === "pj" ? "pj" : "pf", telefone: tel, email, documento: doc, endereco: texto(v.endereco, 140), observacoes: String(v.observacoes || "").trim().slice(0, 500) } };
  }
  function salvarCliente(v, id) {
    const negado = permitir("cadastros");
    if (negado) return negado;
    if (!gerando) sincronizar();
    if (id && !cliente(id)) return { ok: false, codigo: "nao_encontrado", erro: "Este cliente não existe mais: ele foi excluído em outra aba ou aparelho." };
    const { erros, limpo } = validarCliente(v, id);
    if (Object.keys(erros).length) return { ok: false, erros };
    if (id) { Object.assign(cliente(id), limpo, { atualizadoEm: U.agora() }); salvar(); return { ok: true, id }; }
    const novo = { id: novoId("c"), ...limpo, criadoEm: U.agora(), atualizadoEm: U.agora(), ficticio: false, oficinaId: dados.oficina.id };
    dados.clientes.push(novo);
    salvar();
    return { ok: true, id: novo.id };
  }

  /* ---------- Veículos ---------- */
  function validarVeiculo(v, id) {
    const erros = {};
    const placa = limparPlaca(v.placa);
    if (!placaValida(placa)) erros.placa = "Placa inválida. Use o padrão antigo (ABC-1234) ou Mercosul (ABC1D23).";
    else { const outro = dados.veiculos.find((x) => x.id !== id && x.placa === placa); if (outro) erros.placa = `Esta placa já está cadastrada (${outro.marca} ${outro.modelo}).`; }
    const marca = texto(v.marca, 30);
    const modelo = texto(v.modelo, 50);
    if (marca.length < 2) erros.marca = "Informe a marca.";
    if (modelo.length < 1) erros.modelo = "Informe o modelo.";
    const anoMax = Number(U.hoje().slice(0, 4)) + 1;
    const anoFab = inteiro(v.anoFab, erros, "anoFab", { min: 1950, max: anoMax, rotulo: "o ano de fabricação" });
    const anoModelo = inteiro(v.anoModelo, erros, "anoModelo", { min: 1950, max: anoMax + 1, rotulo: "o ano-modelo", obrigatorio: false });
    if (anoFab && anoModelo && (anoModelo < anoFab || anoModelo > anoFab + 1)) erros.anoModelo = "O ano-modelo é o mesmo do ano de fabricação ou o seguinte.";
    if (!NX.COMBUSTIVEIS.includes(v.combustivel)) erros.combustivel = "Escolha o combustível.";
    if (!NX.TIPOS_VEICULO.includes(v.tipo)) erros.tipo = "Escolha o tipo de veículo.";
    const km = inteiro(v.km, erros, "km", { min: 0, max: 2000000, rotulo: "a quilometragem" });
    if (!cliente(v.clienteId)) erros.clienteId = "Escolha o cliente responsável.";
    return { erros, limpo: { placa, marca, modelo, tipo: v.tipo, anoFab, anoModelo: anoModelo || anoFab, cor: texto(v.cor, 20), combustivel: v.combustivel, km, clienteId: v.clienteId, observacoes: String(v.observacoes || "").trim().slice(0, 400) } };
  }
  // A placa identifica o carro, mas não prova quem é o dono: trocar o cliente fica registrado no histórico.
  function salvarVeiculo(v, id, { justificativaKm } = {}) {
    const negado = permitir("cadastros");
    if (negado) return negado;
    if (!gerando) sincronizar();
    if (id && !veiculo(id)) return { ok: false, codigo: "nao_encontrado", erro: "Este veículo não existe mais: ele foi excluído em outra aba ou aparelho." };
    const { erros, limpo } = validarVeiculo(v, id);
    const atual = id ? veiculo(id) : null;
    if (atual && limpo.km != null && limpo.km < atual.km && String(justificativaKm || "").trim().length < 5) erros.km = `A quilometragem informada é menor que a última registrada (${U.numero(atual.km)} km). Explique o motivo para continuar.`;
    if (Object.keys(erros).length) return { ok: false, erros };
    const agora = U.agora();
    if (atual) {
      if (limpo.km !== atual.km) atual.historicoKm.push({ em: agora, km: limpo.km, origem: "Edição do cadastro", por: quem(), inconsistente: limpo.km < atual.km, nota: limpo.km < atual.km ? String(justificativaKm).trim() : "" });
      if (limpo.clienteId !== atual.clienteId) {
        const ult = atual.historicoDono[atual.historicoDono.length - 1];
        if (ult) ult.ate = U.hoje();
        atual.historicoDono.push({ clienteId: limpo.clienteId, de: U.hoje(), ate: null, por: quem() });
      }
      Object.assign(atual, limpo, { atualizadoEm: agora });
      salvar();
      return { ok: true, id };
    }
    const novo = {
      id: novoId("v"), ...limpo, criadoEm: agora, atualizadoEm: agora, ficticio: false, oficinaId: dados.oficina.id,
      historicoKm: [{ em: agora, km: limpo.km, origem: "Cadastro", por: quem(), inconsistente: false, nota: "" }],
      historicoDono: [{ clienteId: limpo.clienteId, de: U.hoje(), ate: null, por: quem() }],
    };
    dados.veiculos.push(novo);
    salvar();
    return { ok: true, id: novo.id };
  }
  // Registra uma leitura de quilometragem (cadastro, entrada de OS, entrega). Menor que a anterior exige justificativa.
  function registrarKm(veiculoId, km, { origem, justificativa, salvarAgora = true } = {}) {
    const v = veiculo(veiculoId);
    if (!v) return { ok: false, erro: "Veículo não encontrado." };
    if (!Number.isFinite(km) || km < 0) return { ok: false, erro: "Quilometragem inválida." };
    const menor = km < v.km;
    if (menor && String(justificativa || "").trim().length < 5) return { ok: false, codigo: "km_menor", erro: `A quilometragem (${U.numero(km)} km) é menor que a última registrada (${U.numero(v.km)} km). Confira o painel do carro ou explique o motivo.` };
    if (km !== v.km || origem) v.historicoKm.push({ em: U.agora(), km, origem: origem || "Atualização", por: quem(), inconsistente: menor, nota: menor ? String(justificativa).trim() : "" });
    v.km = km;
    v.atualizadoEm = U.agora();
    if (salvarAgora) salvar();
    return { ok: true, inconsistente: menor };
  }

  /* ---------- Exclusão de clientes e veículos ----------
     Só é possível excluir o que não tem histórico: ordens, orçamentos e
     compromissos da agenda (inclusive cancelados) guardam o cliente e o
     veículo, e apagar um deles deixaria esse histórico sem dono. */
  const qtd = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;
  function vinculosVeiculo(id) {
    const lista = [];
    const ordens = dados.ordens.filter((os) => os.veiculoId === id).length;
    const orcs = dados.orcamentos.filter((o) => o.veiculoId === id).length;
    const ag = dados.agenda.filter((c) => c.veiculoId === id).length;
    if (ordens) lista.push(qtd(ordens, "ordem de serviço", "ordens de serviço"));
    if (orcs) lista.push(qtd(orcs, "orçamento", "orçamentos"));
    if (ag) lista.push(qtd(ag, "compromisso na agenda", "compromissos na agenda"));
    return lista;
  }
  function vinculosCliente(id) {
    const lista = [];
    const atuais = dados.veiculos.filter((v) => v.clienteId === id).length;
    const antigos = dados.veiculos.filter((v) => v.clienteId !== id && (v.historicoDono || []).some((h) => h.clienteId === id)).length;
    const ordens = dados.ordens.filter((os) => os.clienteId === id).length;
    const orcs = dados.orcamentos.filter((o) => o.clienteId === id).length;
    const ag = dados.agenda.filter((c) => c.clienteId === id).length;
    if (atuais) lista.push(qtd(atuais, "veículo cadastrado no nome dele", "veículos cadastrados no nome dele"));
    if (antigos) lista.push(`registro como antigo responsável de ${qtd(antigos, "veículo", "veículos")}`);
    if (ordens) lista.push(qtd(ordens, "ordem de serviço", "ordens de serviço"));
    if (orcs) lista.push(qtd(orcs, "orçamento", "orçamentos"));
    if (ag) lista.push(qtd(ag, "compromisso na agenda", "compromissos na agenda"));
    return lista;
  }
  function excluirVeiculo(id) {
    const negado = permitir("cadastros");
    if (negado) return negado;
    sincronizar();   // outra aba pode ter aberto uma OS para ele agora há pouco
    const v = veiculo(id);
    if (!v) return { ok: false, codigo: "nao_encontrado", erro: "Este veículo não existe mais (talvez já tenha sido excluído)." };
    const vinculos = vinculosVeiculo(id);
    if (vinculos.length) return { ok: false, codigo: "vinculado", vinculos, erro: `O veículo ${mostrarPlaca(v.placa)} tem ${vinculos.join(", ")}. Esse histórico precisa ser mantido, por isso ele não pode ser excluído.` };
    dados.veiculos = dados.veiculos.filter((x) => x.id !== id);
    salvar();
    return { ok: true };
  }
  function excluirCliente(id) {
    const negado = permitir("cadastros");
    if (negado) return negado;
    sincronizar();
    const c = cliente(id);
    if (!c) return { ok: false, codigo: "nao_encontrado", erro: "Este cliente não existe mais (talvez já tenha sido excluído)." };
    const vinculos = vinculosCliente(id);
    if (vinculos.length) return { ok: false, codigo: "vinculado", vinculos, erro: `${c.nome} tem ${vinculos.join(", ")}. Esse histórico precisa ser mantido, por isso o cadastro não pode ser excluído.` };
    dados.clientes = dados.clientes.filter((x) => x.id !== id);
    salvar();
    return { ok: true };
  }

  /* ---------- Serviços ---------- */
  function salvarServico(v, id) {
    const negado = permitir("catalogo");
    if (negado) return negado;
    const erros = {};
    const nome = texto(v.nome, 60);
    if (nome.length < 3) erros.nome = "Informe o nome do serviço.";
    else if (dados.servicos.some((s) => s.id !== id && igual(s.nome, nome))) erros.nome = "Já existe um serviço com este nome.";
    if (!dados.oficina.categoriasServico.includes(v.categoria)) erros.categoria = "Escolha a categoria.";
    const preco = dinheiro(v.preco, erros, "preco", { rotulo: "o preço de referência" });
    const tempo = inteiro(v.tempo, erros, "tempo", { min: 5, max: 2880, rotulo: "o tempo estimado em minutos" });
    if (String(v.descricao || "").length > 300) erros.descricao = "Use no máximo 300 caracteres.";
    if (Object.keys(erros).length) return { ok: false, erros };
    const limpo = { nome, categoria: v.categoria, preco, tempo, descricao: String(v.descricao || "").trim().slice(0, 300), atualizadoEm: U.agora() };
    if (id) { Object.assign(servico(id), limpo); salvar(); return { ok: true, id }; }
    dados.sequencias.servico = (dados.sequencias.servico || 0) + 1;
    const novo = { id: novoId("s"), codigo: `S-${String(dados.sequencias.servico).padStart(2, "0")}`, ...limpo, status: "ativo", criadoEm: U.agora() };
    dados.servicos.push(novo);
    salvar();
    return { ok: true, id: novo.id };
  }
  function alternarServico(id) {
    const negado = permitir("catalogo");
    if (negado) return negado;
    const s = servico(id);
    if (!s) return { ok: false, erro: "Serviço não encontrado." };
    s.status = s.status === "ativo" ? "inativo" : "ativo";
    s.atualizadoEm = U.agora();
    salvar();
    return { ok: true, status: s.status };
  }

  /* ---------- Peças (cadastro; o saldo vem das movimentações) ---------- */
  function salvarPeca(v, id) {
    const negado = permitir("catalogo");
    if (negado) return negado;
    const erros = {};
    const nome = texto(v.nome, 80);
    if (nome.length < 3) erros.nome = "Informe o nome da peça.";
    const sku = String(v.sku || "").trim().toUpperCase().replace(/\s+/g, "");
    if (!/^[A-Z0-9-]{3,20}$/.test(sku)) erros.sku = "Use de 3 a 20 letras, números ou traço (ex.: FRE-1001).";
    else if (dados.pecas.some((p) => p.id !== id && p.sku === sku)) erros.sku = "Este código já está em outra peça.";
    if (!dados.oficina.categoriasPeca.includes(v.categoria)) erros.categoria = "Escolha a categoria.";
    const fabricante = texto(v.fabricante, 40);
    if (v.fornecedorId && !fornecedor(v.fornecedorId)) erros.fornecedorId = "Fornecedor não encontrado.";
    const minimo = inteiro(v.minimo, erros, "minimo", { min: 0, max: 100000, rotulo: "o estoque mínimo" });
    const custo = dinheiro(v.custo, erros, "custo", { rotulo: "o custo unitário" });
    const preco = dinheiro(v.preco, erros, "preco", { rotulo: "o preço de venda" });
    if (custo != null && preco != null && preco < custo) erros.preco = "O preço de venda está abaixo do custo. Confira os valores.";
    let inicial = 0;
    if (!id && String(v.inicial ?? "").trim() !== "") inicial = inteiro(v.inicial, erros, "inicial", { min: 0, max: 100000, rotulo: "a quantidade inicial" }) || 0;
    if (Object.keys(erros).length) return { ok: false, erros };
    const limpo = { nome, sku, categoria: v.categoria, fabricante, fornecedorId: v.fornecedorId || null, minimo, custo, preco, local: texto(v.local, 30), atualizadoEm: U.agora() };
    if (id) {
      const p = peca(id);
      const mudancas = ["custo", "preco", "minimo"].filter((k) => p[k] !== limpo[k]).map((k) => `${{ custo: "custo", preco: "preço", minimo: "mínimo" }[k]}: ${k === "minimo" ? p[k] : U.moeda(p[k])} → ${k === "minimo" ? limpo[k] : U.moeda(limpo[k])}`);
      if (mudancas.length) p.historico.push({ em: U.agora(), texto: `Cadastro alterado (${mudancas.join("; ")})`, por: quem() });
      Object.assign(p, limpo);
      salvar();
      return { ok: true, id };
    }
    const nova = { id: novoId("p"), ...limpo, status: "ativo", criadoEm: U.agora(), historico: [{ em: U.agora(), texto: "Peça cadastrada", por: quem() }], oficinaId: dados.oficina.id };
    dados.pecas.push(nova);
    if (inicial > 0) NX.oficina.lancarMovimento({ pecaId: nova.id, tipo: "entrada", quantidade: inicial, motivo: "Saldo inicial", observacao: "Quantidade informada no cadastro", custoUnitario: custo });
    salvar();
    return { ok: true, id: nova.id };
  }
  function alternarPeca(id) {
    const negado = permitir("catalogo");
    if (negado) return negado;
    const p = peca(id);
    if (!p) return { ok: false, erro: "Peça não encontrada." };
    p.status = p.status === "ativo" ? "inativo" : "ativo";
    p.historico.push({ em: U.agora(), texto: p.status === "ativo" ? "Peça reativada" : "Peça desativada", por: quem() });
    salvar();
    return { ok: true, status: p.status };
  }

  /* ---------- Fornecedores ---------- */
  function salvarFornecedor(v, id) {
    const negado = permitir("catalogo");
    if (negado) return negado;
    const erros = {};
    const nome = texto(v.nome, 80);
    if (nome.length < 3) erros.nome = "Informe o nome empresarial.";
    else if (dados.fornecedores.some((f) => f.id !== id && igual(f.nome, nome))) erros.nome = "Já existe um fornecedor com este nome.";
    const contato = texto(v.contato, 60);
    if (contato.length < 2) erros.contato = "Informe o nome do contato.";
    if (!U.telefoneValido(v.telefone)) erros.telefone = "Telefone com DDD, como (19) 3333-4444.";
    const email = String(v.email || "").trim().toLowerCase();
    if (email && !U.emailValido(email)) erros.email = "Digite um e-mail válido ou deixe em branco.";
    const cnpj = U.digitos(v.cnpj);
    if (cnpj && !U.cnpjValido(cnpj)) erros.cnpj = "CNPJ inválido (confira os números) ou deixe em branco.";
    if (Object.keys(erros).length) return { ok: false, erros };
    const limpo = { nome, contato, telefone: U.digitos(v.telefone), email, cnpj, endereco: texto(v.endereco, 140), produtos: texto(v.produtos, 200), observacoes: String(v.observacoes || "").trim().slice(0, 400) };
    if (id) { Object.assign(fornecedor(id), limpo); salvar(); return { ok: true, id }; }
    const novo = { id: novoId("f"), ...limpo, status: "ativo", criadoEm: U.agora(), ficticio: false, oficinaId: dados.oficina.id };
    dados.fornecedores.push(novo);
    salvar();
    return { ok: true, id: novo.id };
  }
  function alternarFornecedor(id) {
    const negado = permitir("catalogo");
    if (negado) return negado;
    const f = fornecedor(id);
    if (!f) return { ok: false, erro: "Fornecedor não encontrado." };
    f.status = f.status === "ativo" ? "inativo" : "ativo";
    salvar();
    return { ok: true, status: f.status };
  }

  /* ---------- Equipe ---------- */
  function salvarMembro(v, id) {
    const negado = permitir("equipe");
    if (negado) return negado;
    const erros = {};
    const nome = texto(v.nome, 60);
    if (nome.length < 3) erros.nome = "Informe o nome.";
    else if (dados.equipe.some((m) => m.id !== id && igual(m.nome, nome))) erros.nome = "Já existe alguém com este nome na equipe.";
    if (!NX.FUNCOES.some((f) => f.id === v.funcao)) erros.funcao = "Escolha a função.";
    const especialidade = texto(v.especialidade, 80);
    if (especialidade.length < 3) erros.especialidade = "Informe a especialidade (ex.: Freios e suspensão).";
    if (v.contato && !U.telefoneValido(v.contato)) erros.contato = "Telefone profissional com DDD, ou deixe em branco.";
    const categorias = (v.categorias || []).filter((c) => dados.oficina.categoriasServico.includes(c));
    const tecnico = (NX.FUNCOES.find((f) => f.id === v.funcao) || {}).tecnico;
    if (tecnico && !categorias.length) erros.categorias = "Marque os tipos de serviço que esta pessoa realiza.";
    if (Object.keys(erros).length) return { ok: false, erros };
    const limpo = { nome, funcao: v.funcao, tecnico: !!tecnico, especialidade, contato: U.digitos(v.contato), categorias };
    if (id) { Object.assign(membro(id), limpo); salvar(); return { ok: true, id }; }
    const usadas = dados.equipe.map((m) => m.cor);
    let cor = 0;
    while (usadas.includes(cor) && cor < 5) cor += 1;
    const novo = { id: novoId("t"), ...limpo, cor, status: "ativo", criadoEm: U.agora(), ficticio: false };
    dados.equipe.push(novo);
    salvar();
    return { ok: true, id: novo.id };
  }
  function alternarMembro(id) {
    const negado = permitir("equipe");
    if (negado) return negado;
    const m = membro(id);
    if (!m) return { ok: false, erro: "Pessoa não encontrada." };
    m.status = m.status === "ativo" ? "inativo" : "ativo";
    salvar();
    return { ok: true, status: m.status };
  }

  /* ---------- Configurações ---------- */
  function salvarOficina(v) {
    const negado = permitir("config");
    if (negado) return negado;
    const erros = {};
    const o = dados.oficina;
    const nome = texto(v.nome, 60);
    if (nome.length < 2) erros.nome = "Informe o nome da oficina.";
    if (v.telefone && !U.telefoneValido(v.telefone)) erros.telefone = "Telefone com DDD, ou deixe em branco.";
    const zap = U.digitos(v.whatsapp);
    if (zap && !/^55\d{10,11}$/.test(zap)) erros.whatsapp = "Use 55 + DDD + número, só números (ex.: 5519912345678), ou deixe em branco.";
    const cnpj = U.digitos(v.cnpj);
    if (cnpj && !U.cnpjValido(cnpj)) erros.cnpj = "CNPJ inválido (confira os números) ou deixe em branco.";
    if (Object.keys(erros).length) return { ok: false, erros };
    const telefone = v.telefone ? U.mascaraTelefone(v.telefone) : "";
    if (telefone !== o.telefone) o.telefoneFicticio = false;
    Object.assign(o, { nome, razaoSocial: texto(v.razaoSocial, 80), cnpj, telefone, whatsapp: zap, endereco: texto(v.endereco, 140), horarioTexto: texto(v.horarioTexto, 80) });
    if (v.logo !== undefined) o.logo = v.logo;
    salvar();
    return { ok: true };
  }
  function salvarPreferencias(grupo, v) {
    const negado = permitir("config");
    if (negado) return negado;
    const erros = {};
    const o = dados.oficina;
    if (grupo === "orcamento") {
      const validade = inteiro(v.validadeDias, erros, "validadeDias", { min: 1, max: 90, rotulo: "a validade em dias" });
      const hora = dinheiro(v.valorHora, erros, "valorHora", { rotulo: "o valor da hora" });
      const desc = inteiro(v.descontoMax, erros, "descontoMax", { min: 0, max: 50, rotulo: "o desconto máximo" });
      if (String(v.garantia || "").length > 300) erros.garantia = "Use no máximo 300 caracteres.";
      if (Object.keys(erros).length) return { ok: false, erros };
      Object.assign(o.orcamento, { validadeDias: validade, valorHora: hora, descontoMax: desc, garantia: String(v.garantia || "").trim() });
    } else if (grupo === "estoque") {
      const min = inteiro(v.minimoPadrao, erros, "minimoPadrao", { min: 0, max: 1000, rotulo: "o mínimo padrão" });
      if (Object.keys(erros).length) return { ok: false, erros };
      Object.assign(o.estoque, { minimoPadrao: min });
    } else if (grupo === "documentos") {
      if (String(v.rodape || "").length > 200) erros.rodape = "Use no máximo 200 caracteres.";
      if (Object.keys(erros).length) return { ok: false, erros };
      Object.assign(o.documentos, { mostrarCnpj: !!v.mostrarCnpj, mostrarEndereco: !!v.mostrarEndereco, mostrarGarantia: !!v.mostrarGarantia, rodape: String(v.rodape || "").trim() });
    } else if (grupo === "agenda") {
      const boxes = inteiro(v.boxes, erros, "boxes", { min: 1, max: 20, rotulo: "o número de boxes" });
      if (Object.keys(erros).length) return { ok: false, erros };
      o.boxes = boxes;
    }
    salvar();
    return { ok: true };
  }
  function salvarHorarios(horarios) {
    const negado = permitir("config");
    if (negado) return negado;
    const erros = {};
    const limpo = {};
    let aberto = false;
    for (let dow = 0; dow < 7; dow += 1) {
      const h = horarios[dow] || {};
      if (!h.aberto) { limpo[dow] = null; continue; }
      aberto = true;
      if (!U.horaValida(h.abre) || !U.horaValida(h.fecha) || h.abre >= h.fecha) { erros[`dia${dow}`] = `${NX.DIAS[dow]}: a abertura precisa ser antes do fechamento.`; continue; }
      limpo[dow] = { abre: h.abre, fecha: h.fecha };
    }
    if (!aberto) erros.geral = "Deixe pelo menos um dia aberto.";
    if (Object.keys(erros).length) return { ok: false, erros };
    dados.oficina.horarios = limpo;
    salvar();
    return { ok: true };
  }
  function adicionarCategoria(tipo, nome) {
    const negado = permitir("config");
    if (negado) return negado;
    const lista = tipo === "servico" ? dados.oficina.categoriasServico : dados.oficina.categoriasPeca;
    const t = texto(nome, 30);
    if (t.length < 3) return { ok: false, erro: "Informe o nome da categoria." };
    if (lista.some((c) => igual(c, t))) return { ok: false, erro: "Esta categoria já existe." };
    lista.push(t);
    lista.sort((a, b) => a.localeCompare(b, "pt-BR"));
    salvar();
    return { ok: true };
  }
  function removerCategoria(tipo, nome) {
    const negado = permitir("config");
    if (negado) return negado;
    const usada = tipo === "servico" ? dados.servicos.some((s) => s.categoria === nome) : dados.pecas.some((p) => p.categoria === nome);
    if (usada) return { ok: false, erro: `A categoria "${nome}" está em uso e não pode ser removida.` };
    const chave = tipo === "servico" ? "categoriasServico" : "categoriasPeca";
    dados.oficina[chave] = dados.oficina[chave].filter((c) => c !== nome);
    salvar();
    return { ok: true };
  }
  function trocarPerfil(papel) {
    const p = NX.PERFIS.find((x) => x.id === papel);
    if (!p) return { ok: false, erro: "Perfil não encontrado." };
    dados.perfil = { papel: p.id, nome: p.usuario, cargo: p.cargo };
    salvar();
    return { ok: true };
  }

  NX.loja = {
    carregar, salvar, sincronizar, restaurar, comDados, tamanhoSalvo, novoId, quem,
    aoMudar: (fn) => ouvintes.add(fn),
    get dados() { return dados; },
    get persistente() { return persistente; },
    versao: () => versao,
    cliente, veiculo, servico, peca, fornecedor, membro, ordem, orcamento, compromisso, despesa, movimento, veiculosDoCliente, tecnicos,
    limparPlaca, placaValida, mostrarPlaca, documentoValido, mostrarDocumento, dinheiro, inteiro, texto,
    validarCliente, salvarCliente, validarVeiculo, salvarVeiculo, registrarKm, salvarServico, alternarServico,
    vinculosCliente, vinculosVeiculo, excluirCliente, excluirVeiculo,
    salvarPeca, alternarPeca, salvarFornecedor, alternarFornecedor, salvarMembro, alternarMembro,
    salvarOficina, salvarPreferencias, salvarHorarios, adicionarCategoria, removerCategoria, trocarPerfil,
  };
})();
