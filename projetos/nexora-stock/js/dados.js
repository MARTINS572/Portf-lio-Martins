/* ==========================================================================
   NEXORA STOCK — dados.js
   Listas fixas do sistema e os dados de DEMONSTRAÇÃO (tudo fictício).

   A loja, os fornecedores, os produtos, os preços e as pessoas são
   inventados. E-mails usam o domínio ".exemplo" (não existe na internet) e
   os códigos de barras usam o prefixo 2, reservado para uso interno de lojas.
   Os fornecedores não têm CNPJ: um número inventado poderia ser de uma
   empresa real.

   O histórico é SIMULADO dia a dia (vendas, compras, recebimentos, ajustes),
   a partir de 120 dias antes da data em que o sistema é aberto. Assim os
   saldos, os gráficos e os pedidos sempre fecham entre si.
   ========================================================================== */
window.NX = window.NX || {};

(function () {
  "use strict";
  const U = NX.util;

  /* ---------- Listas fixas ---------- */
  NX.MOTIVOS_SAIDA = ["Venda", "Uso interno", "Avaria", "Perda", "Ajuste autorizado"];
  NX.MOTIVOS_AJUSTE = ["Contagem de inventário", "Correção de lançamento", "Avaria identificada", "Extravio", "Outro"];
  NX.TIPOS_MOV = [
    { id: "entrada", nome: "Entrada", icone: "arrow-down-to-line" },
    { id: "saida", nome: "Saída", icone: "arrow-up-from-line" },
    { id: "ajuste", nome: "Ajuste", icone: "sliders-horizontal" },
    { id: "estorno", nome: "Estorno", icone: "undo-2" },
  ];
  NX.STATUS_PEDIDO = [
    { id: "rascunho", nome: "Rascunho", icone: "circle-dashed" },
    { id: "pendente", nome: "Pendente de envio", icone: "hourglass" },
    { id: "enviado", nome: "Pedido enviado", icone: "send" },
    { id: "parcial", nome: "Parcialmente recebido", icone: "package-open" },
    { id: "recebido", nome: "Recebido", icone: "package-check" },
    { id: "cancelado", nome: "Cancelado", icone: "ban" },
  ];
  NX.SITUACOES = [
    { id: "normal", nome: "Estoque normal", icone: "circle-check" },
    { id: "baixo", nome: "Estoque baixo", icone: "triangle-alert" },
    { id: "zerado", nome: "Sem estoque", icone: "package-x" },
    { id: "arquivado", nome: "Arquivado", icone: "archive" },
  ];

  /* ---------- Gerador de números previsível (os dados saem sempre iguais) ---------- */
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

  /* ---------- Cadastros fictícios ---------- */
  const EQUIPE = [
    { id: "u1", nome: "Larissa Campos", cargo: "Gerente da loja" },
    { id: "u2", nome: "Diego Ramos", cargo: "Estoquista" },
    { id: "u3", nome: "Paula Siqueira", cargo: "Compras" },
    { id: "u4", nome: "Mateus Alves", cargo: "Vendas" },
  ];

  const CATEGORIAS = [
    ["c1", "Ferramentas", "FER", "Ferramentas manuais e elétricas."],
    ["c2", "Elétrica", "ELE", "Fios, tomadas, disjuntores e iluminação."],
    ["c3", "Hidráulica", "HID", "Tubos, conexões, registros e torneiras."],
    ["c4", "Pintura", "PIN", "Tintas, massas, rolos, pincéis e lixas."],
    ["c5", "Fixação e ferragens", "FIX", "Parafusos, buchas, dobradiças e cadeados."],
    ["c6", "Jardim e utilidades", "JAR", "Jardinagem, organização e itens para casa."],
  ];

  // [id, nome, contato, telefone, cidade, prazo de entrega (dias), observação]
  const FORNECEDORES = [
    ["f1", "Paralelo Ferramentas Distribuidora", "Renato Lima", "(11) 95555-0141", "Guarulhos, SP", 4, "Pedido mínimo de R$ 400,00. Entrega às terças e sextas."],
    ["f2", "Fio Norte Materiais Elétricos", "Juliana Prado", "(19) 95555-0182", "Campinas, SP", 3, "Aceita pedido por e-mail até as 15h para entrega no dia seguinte útil."],
    ["f3", "Hidrocorr Conexões", "Marcos Teixeira", "(11) 95555-0127", "São Bernardo do Campo, SP", 5, ""],
    ["f4", "Cromalar Tintas", "Fernanda Okada", "(19) 95555-0163", "Sumaré, SP", 4, "Tintas de 18 L só em múltiplos de 2."],
    ["f5", "Fixar Parafusos e Fixadores", "Paulo Henrique Souza", "(11) 95555-0195", "", 3, ""],
    ["f6", "Verde Vale Jardinagem", "Simone Araújo", "(15) 95555-0118", "Sorocaba, SP", 6, "Entrega quinzenal na região."],
    ["f7", "Casa Útil Atacado", "Eduardo Nunes", "(11) 95555-0176", "São Paulo, SP", 5, ""],
    ["f8", "Luz & Cia Iluminação", "Patrícia Gomes", "(19) 95555-0150", "", 4, "Encerrou o atendimento na nossa região."],
  ];

  // [categoria, fornecedor, nome, custo, preço, mínimo, localização, venda/dia, múltiplo de compra, opções]
  // opções.foco: papel no roteiro da demonstração (estoque baixo, zerado, pedidos em andamento)
  const PRODUTOS = [
    ["c1", "f1", "Furadeira de impacto 650 W", 189.9, 299.9, 4, "Corredor A · Prateleira 1", 0.35, 2],
    ["c1", "f1", "Parafusadeira a bateria 12 V", 239, 379.9, 3, "Corredor A · Prateleira 1", 0.25, 2, { criadoDia: -45 }],
    ["c1", "f1", "Jogo de chaves combinadas 8 peças", 54.5, 89.9, 6, "Corredor A · Prateleira 2", 0.5, 4],
    ["c1", "f1", "Martelo unha 27 mm cabo de fibra", 28.9, 49.9, 8, "Corredor A · Prateleira 2", 0.6, 6],
    ["c1", "f1", "Trena 5 m com trava", 12.4, 24.9, 12, "Corredor A · Prateleira 3", 1.2, 12, { foco: "baixo-parcial" }],
    ["c1", "f1", "Alicate universal 8\"", 22.8, 39.9, 8, "Corredor A · Prateleira 3", 0.7, 6],
    ["c1", "f1", "Nível de alumínio 40 cm", 24, 42.9, 5, "Corredor A · Prateleira 3", 0.3, 6, { foco: "parcial" }],
    ["c2", "f2", "Fita isolante 19 mm x 20 m", 4.1, 8.9, 30, "Corredor B · Prateleira 1", 4, 20, { foco: "baixo-atrasado" }],
    ["c2", "f8", "Lâmpada LED bulbo 9 W bivolt", 6.2, 12.9, 40, "Corredor B · Prateleira 2", 5, 50, { foco: "baixo-fornecedor-inativo" }],
    ["c2", "f2", "Tomada 10 A 2P+T branca", 5.3, 11.9, 25, "Corredor B · Prateleira 3", 3, 20],
    ["c2", "f2", "Interruptor simples 10 A", 4.9, 10.9, 20, "Corredor B · Prateleira 3", 2.5, 20],
    ["c2", "f2", "Disjuntor monopolar 20 A", 11.7, 22.9, 15, "Corredor B · Prateleira 4", 1.5, 10, { foco: "zerado-atrasado" }],
    ["c2", "f2", "Cabo flexível 2,5 mm² rolo 100 m", 189, 289.9, 4, "Depósito · Palete 3", 0.3, 2],
    ["c2", "f2", "Extensão elétrica 5 m 3 tomadas", 19.9, 36.9, 10, "Corredor B · Prateleira 4", 0.8, 6],
    ["c3", "f3", "Registro de gaveta 3/4\"", 31.5, 54.9, 6, "Corredor C · Prateleira 1", 0.8, 6, { foco: "baixo-no-prazo" }],
    ["c3", "f3", "Torneira de parede para tanque", 24.9, 44.9, 6, "Corredor C · Prateleira 1", 0.6, 6],
    ["c3", "f3", "Fita veda-rosca 18 mm x 25 m", 2.6, 6.5, 40, "Corredor C · Prateleira 2", 4, 40],
    ["c3", "f3", "Tubo PVC soldável 25 mm barra 6 m", 17.8, 29.9, 20, "Área externa · Rack de tubos", 2.5, 10],
    ["c3", "f3", "Joelho PVC 90° 25 mm", 0.85, 2.2, 100, "Corredor C · Gaveteiro 4", 10, 100],
    ["c3", "f3", "Sifão sanfonado universal", 7.4, 14.9, 12, "Corredor C · Prateleira 2", 1, 12, { foco: "no-prazo" }],
    ["c4", "f4", "Tinta acrílica fosca branca 18 L", 219, 339.9, 5, "Depósito · Palete 1", 0.5, 2],
    ["c4", "f4", "Tinta acrílica fosca branca 3,6 L", 58, 94.9, 8, "Corredor D · Prateleira 1", 0.9, 6],
    ["c4", "f4", "Rolo de lã 23 cm com cabo", 19.5, 34.9, 10, "Corredor D · Prateleira 2", 1, 6, { foco: "pendente" }],
    ["c4", "f4", "Pincel trincha 2\"", 6.8, 13.9, 15, "Corredor D · Prateleira 2", 1.5, 12],
    ["c4", "f4", "Lixa d'água grão 220", 1.1, 2.9, 60, "Corredor D · Gaveteiro 1", 6, 50],
    ["c4", "f4", "Massa corrida PVA 25 kg", 54, 89.9, 4, "Depósito · Palete 1", 0.4, 4, { foco: "zerado-pendente" }],
    ["c5", "f5", "Parafuso Phillips 4,0 x 40 mm (caixa 100)", 9.4, 18.9, 15, "Corredor E · Gaveteiro 2", 1.5, 10],
    ["c5", "f5", "Bucha de nylon nº 6 (caixa 100)", 5.2, 10.9, 15, "Corredor E · Gaveteiro 2", 1.5, 10],
    ["c5", "f5", "Dobradiça 3\" zincada (par)", 8.6, 16.9, 10, "Corredor E · Prateleira 1", 1, 12],
    ["c5", "f5", "Cadeado de latão 30 mm", 21, 38.9, 6, "Corredor E · Prateleira 1", 0.6, 6, { foco: "baixo-sem-pedido" }],
    ["c5", "f5", "Abraçadeira de nylon 200 mm (pacote 100)", 7.9, 15.9, 10, "Corredor E · Gaveteiro 3", 1, 10, { criadoDia: -20 }],
    ["c6", "f6", "Mangueira de jardim 20 m com engate", 49.9, 84.9, 5, "Área externa · Expositor", 0.5, 4, { foco: "rascunho" }],
    ["c6", "f6", "Tesoura de poda profissional", 32, 56.9, 4, "Corredor F · Prateleira 1", 0.3, 4, { foco: "zerado-sem-pedido" }],
    ["c6", "f6", "Regador plástico 5 L", 11.2, 21.9, 6, "Área externa · Expositor", 0.6, 6, { foco: "rascunho" }],
    ["c6", "f7", "Organizador plástico 20 L com tampa", 18.4, 34.9, 8, "Corredor F · Prateleira 2", 0.8, 6],
    ["c6", "f7", "Escada doméstica de alumínio 5 degraus", 139, 229.9, 3, "Depósito · Parede 2", 0.2, 2],
    ["c6", "f7", "Luva de proteção multiuso (par)", 4.3, 9.9, 25, "Corredor F · Prateleira 3", 2.5, 24],
    ["c2", "f8", "Lâmpada fluorescente compacta 15 W", 9.8, 17.9, 0, "Corredor B · Prateleira 2", 0.6, 10, { foco: "arquivado" }],
  ];

  // Itens fixos dos pedidos em andamento (para a demonstração ter todos os estados)
  const PRODUTO = (nome) => `p${PRODUTOS.findIndex((p) => p[2] === nome) + 1}`;

  NX.criarDadosDemo = function criarDadosDemo() {
    const r = mulberry32(20261011);
    const entre = (a, b) => a + Math.floor(r() * (b - a + 1));
    const sorteio = (lista) => lista[Math.floor(r() * lista.length)];
    const HOJE = U.hoje();
    const AGORA = U.agora();
    const INICIO = -120;
    const dia = (n) => U.somarDias(HOJE, n);
    const ehDomingo = (n) => U.diaDaSemana(dia(n)) === 0;
    const ehSabado = (n) => U.diaDaSemana(dia(n)) === 6;
    const utilAntes = (n) => (ehDomingo(n) ? n - 1 : n);           // domingo → sábado
    const momento = (n, h, m) => `${dia(n)}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    const jaAconteceu = (m) => m < AGORA;
    const ceilA = (v, multiplo) => Math.max(multiplo, Math.ceil(v / multiplo) * multiplo);
    const nf = () => `NF ${String(entre(10000, 99999))}`;

    const categorias = CATEGORIAS.map(([id, nome, codigo, descricao]) => ({ id, nome, codigo, descricao, status: "ativa", criadaEm: dia(INICIO - 30) }));
    const fornecedores = FORNECEDORES.map(([id, nome, contato, telefone, endereco, prazo, observacoes]) => {
      const dominio = U.semAcento(nome.split(" ")[0] + nome.split(" ")[1]).replace(/[^a-z0-9]/g, "");
      return {
        id, nome, contato, cnpj: "", telefone, email: `${id === "f2" ? "pedidos" : "vendas"}@${dominio}.exemplo`, endereco,
        observacoes, prazoEntrega: prazo, status: id === "f8" ? "inativo" : "ativo", criadoEm: dia(INICIO - 30 + entre(0, 20)),
      };
    });
    const categoria = (id) => categorias.find((c) => c.id === id);

    const contagemSku = {};
    const produtos = PRODUTOS.map(([cat, forn, nome, custo, preco, minimo, local, vendaDia, multiplo, op = {}], i) => {
      const cod = categoria(cat).codigo;
      contagemSku[cod] = (contagemSku[cod] || 0) + 1;
      const sku = `${cod}-${1000 + contagemSku[cod] * 10 + (i % 7)}`;
      const n = i + 1;
      // Códigos de barras internos (prefixo 2) com dígito verificador correto
      let codigoBarras = "";
      if (n % 3 !== 0) {
        const base = `2${String(7300 + n).padStart(5, "0")}${String(1000 + n * 37).slice(-4)}00`.slice(0, 12);
        const soma = base.split("").reverse().reduce((t, d, k) => t + Number(d) * (k % 2 === 0 ? 3 : 1), 0);
        codigoBarras = base + ((10 - (soma % 10)) % 10);
      }
      return {
        id: `p${n}`, nome, sku, codigoBarras, categoriaId: cat, fornecedorId: forn, descricao: "",
        custo, preco, minimo, localizacao: local, criadoEm: dia(op.criadoDia || INICIO - 1), status: "ativo", imagem: null,
        _venda: vendaDia, _multiplo: multiplo, _foco: op.foco || "", _criadoDia: op.criadoDia || INICIO - 1,
      };
    });
    const produto = (id) => produtos.find((p) => p.id === id);
    const descricoes = {
      "Furadeira de impacto 650 W": "Mandril de 13 mm, velocidade variável e reversível. 127 V.",
      "Parafusadeira a bateria 12 V": "Acompanha 2 baterias, carregador e maleta.",
      "Tinta acrílica fosca branca 18 L": "Rendimento aproximado de 380 m² por demão.",
      "Cabo flexível 2,5 mm² rolo 100 m": "Cor azul. Vendido somente em rolo fechado.",
      "Escada doméstica de alumínio 5 degraus": "Suporta até 120 kg. Vendida montada.",
    };
    produtos.forEach((p) => { p.descricao = descricoes[p.nome] || ""; });

    /* ---------- Simulação ---------- */
    const saldo = {};
    const movs = [];
    const pedidos = [];
    let seqMov = 0;
    const mov = (m) => { movs.push({ seq: seqMov++, ...m }); saldo[m.produtoId] = (saldo[m.produtoId] || 0) + m.quantidade; };
    const emAberto = (pid) => pedidos.some((pc) => ["enviado", "parcial", "pendente", "rascunho"].includes(pc.status) && pc.itens.some((it) => it.produtoId === pid && it.recebido < it.quantidade));
    // Produtos do roteiro param de ser comprados automaticamente perto do fim, para chegarem aos estados da demonstração
    const compraAtiva = (p, n) => p._foco !== "arquivado" && (!p._foco || n < -32) && !(p._foco === "baixo-fornecedor-inativo" && n >= -52);
    const somarMinutos = (m, k) => { const d = new Date(Number(m.slice(0, 4)), Number(m.slice(5, 7)) - 1, Number(m.slice(8, 10)), Number(m.slice(11, 13)), Number(m.slice(14, 16)) + k); return `${U.chave(d)}T${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; };
    let seqPedido = 0;
    const novoPedido = (forn, n, itens, extra = {}) => {
      const pc = {
        id: `pc${++seqPedido}`, numero: "", fornecedorId: forn, status: "enviado", criadoEm: momento(n, 14, entre(0, 50)), enviadoEm: momento(n, 16, entre(0, 50)),
        previsao: dia(n + (fornecedores.find((f) => f.id === forn).prazoEntrega)), observacoes: "", responsavelId: "u3",
        itens: itens.map((it) => ({ produtoId: it.produtoId, quantidade: it.quantidade, custo: produto(it.produtoId).custo, recebido: 0 })),
        recebimentos: [], _chegada: null, ...extra,
      };
      pedidos.push(pc);
      return pc;
    };
    const receber = (pc, n, quantidades, h = 9) => {
      const quando = momento(n, h, entre(5, 55));
      if (!jaAconteceu(quando)) return false;
      const rec = { id: `rc${pc.id}${pc.recebimentos.length + 1}`, data: quando, documento: nf(), responsavelId: "u2", itens: [], movimentos: [] };
      pc.itens.forEach((it) => {
        const q = Math.min(quantidades[it.produtoId] ?? (it.quantidade - it.recebido), it.quantidade - it.recebido);
        if (q <= 0) return;
        it.recebido += q;
        rec.itens.push({ produtoId: it.produtoId, quantidade: q });
        const idMov = `m${seqMov}`;
        rec.movimentos.push(idMov);
        mov({
          id: idMov, data: quando, produtoId: it.produtoId, tipo: "entrada", quantidade: q, custoUnitario: it.custo, fornecedorId: pc.fornecedorId,
          motivo: "Recebimento de pedido de compra", documento: rec.documento, observacao: "", responsavelId: "u2", origem: "pedido", pedidoId: pc.id, recebimentoId: rec.id,
        });
      });
      pc.recebimentos.push(rec);
      pc.status = pc.itens.every((it) => it.recebido >= it.quantidade) ? "recebido" : "parcial";
      if (pc.status === "recebido") pc.concluidoEm = quando;
      return true;
    };

    // Saldo inicial (implantação do sistema ou cadastro posterior)
    produtos.forEach((p) => {
      const inicial = p._foco === "arquivado" ? 14 : Math.round(p.minimo + p._venda * 22);
      mov({
        id: `m${seqMov}`, data: momento(p._criadoDia, 8, 10 + (Number(p.id.slice(1)) % 40)), produtoId: p.id, tipo: "entrada", quantidade: inicial,
        custoUnitario: p.custo, fornecedorId: null, motivo: p._criadoDia <= INICIO - 1 ? "Saldo inicial (implantação do sistema)" : "Saldo inicial do cadastro",
        documento: p._criadoDia <= INICIO - 1 ? "Inventário de implantação" : "", observacao: "", responsavelId: "u2", origem: "cadastro",
      });
    });

    // Ações fixas do roteiro (pedidos em todos os estados)
    const roteiro = [
      [utilAntes(-50), (n) => {
        const pc = novoPedido("f8", n, [{ produtoId: PRODUTO("Lâmpada LED bulbo 9 W bivolt"), quantidade: 150 }]);
        pc.status = "cancelado"; pc.canceladoEm = momento(n + 2, 10, 20);
        pc.motivoCancelamento = "Fornecedor avisou que encerrou o atendimento na região. Comprar de outro fornecedor.";
      }],
      [utilAntes(-8), (n) => {
        // Pedido enviado e ATRASADO (previsão já passou)
        const pc = novoPedido("f2", n, [{ produtoId: PRODUTO("Disjuntor monopolar 20 A"), quantidade: 40 }, { produtoId: PRODUTO("Fita isolante 19 mm x 20 m"), quantidade: 80 }]);
        pc.previsao = dia(-3);
        pc.observacoes = "Confirmado por telefone com Juliana.";
        pc._fixo = true;
      }],
      [utilAntes(-9), (n) => {
        // Pedido PARCIALMENTE recebido (parte chegou, o resto continua pendente)
        const pc = novoPedido("f1", n, [{ produtoId: PRODUTO("Trena 5 m com trava"), quantidade: 36 }, { produtoId: PRODUTO("Nível de alumínio 40 cm"), quantidade: 6 }]);
        pc.previsao = dia(2);
        pc.observacoes = "Fornecedor avisou que a trena chega em duas remessas; o restante está previsto para a data de entrega.";
        pc._fixo = true; pc._parcialEm = utilAntes(-4);
      }],
      [utilAntes(-2), (n) => {
        // Pedido ENVIADO dentro do prazo
        const pc = novoPedido("f3", n, [{ produtoId: PRODUTO("Registro de gaveta 3/4\""), quantidade: 12 }, { produtoId: PRODUTO("Sifão sanfonado universal"), quantidade: 24 }]);
        pc.previsao = dia(3);
        pc._fixo = true;
      }],
      [utilAntes(-1), (n) => {
        // PENDENTE DE ENVIO e RASCUNHO (ainda não saíram da loja)
        const pend = novoPedido("f4", n, [{ produtoId: PRODUTO("Massa corrida PVA 25 kg"), quantidade: 12 }, { produtoId: PRODUTO("Rolo de lã 23 cm com cabo"), quantidade: 12 }]);
        pend.status = "pendente"; pend.enviadoEm = null; pend.previsao = dia(5); pend._fixo = true;
        pend.observacoes = "Enviar junto com a cotação de tintas.";
        const rasc = novoPedido("f6", n, [{ produtoId: PRODUTO("Mangueira de jardim 20 m com engate"), quantidade: 8 }, { produtoId: PRODUTO("Regador plástico 5 L"), quantidade: 12 }]);
        rasc.status = "rascunho"; rasc.enviadoEm = null; rasc.previsao = dia(10); rasc.responsavelId = "u1"; rasc._fixo = true;
        rasc.observacoes = "Conferir preço da mangueira antes de enviar.";
        rasc.criadoEm = momento(n, 11, 40);
        pend.criadoEm = momento(n, 15, 10);
      }],
    ];

    const ajustesDias = [utilAntes(-91), utilAntes(-61), utilAntes(-31), utilAntes(-10)];
    const extras = [];
    for (let k = 0; k < 12; k += 1) {
      extras.push({ n: utilAntes(entre(-110, -3)), motivo: sorteio(["Avaria", "Avaria", "Uso interno", "Perda", "Avaria"]), produto: `p${entre(1, 37)}` });
    }

    for (let n = INICIO; n <= 0; n += 1) {
      const domingo = ehDomingo(n);

      // 1. Contagem de inventário (cíclica, algumas vezes por mês)
      if (ajustesDias.includes(n)) {
        const escolhidos = new Set();
        while (escolhidos.size < 3) escolhidos.add(`p${entre(1, 37)}`);
        escolhidos.forEach((pid) => {
          const p = produto(pid);
          if (p._foco || n < p._criadoDia) return;
          const delta = sorteio([-2, -1, -1, 1, -3]);
          if ((saldo[pid] || 0) + delta < 0) return;
          const quando = momento(n, 8, entre(5, 50));
          if (!jaAconteceu(quando)) return;
          mov({
            id: `m${seqMov}`, data: quando, produtoId: pid, tipo: "ajuste", quantidade: delta, contada: (saldo[pid] || 0) + delta, custoUnitario: null, fornecedorId: null,
            motivo: "Contagem de inventário", documento: `Inventário ${dia(n).slice(5, 7)}/${dia(n).slice(0, 4)}`,
            observacao: delta < 0 ? "Contagem cíclica: diferença conferida duas vezes, sem localizar as peças." : "Contagem cíclica: unidade encontrada fora do lugar.",
            responsavelId: sorteio(["u1", "u2"]), origem: "manual",
          });
        });
      }

      // 2. Recebimentos que chegam hoje
      pedidos.filter((pc) => pc.status === "enviado" && pc._chegada === n).forEach((pc) => {
        const parcial = pc._parcial;
        if (parcial) {
          const it = pc.itens[0];
          receber(pc, n, { [it.produtoId]: Math.max(1, Math.round(it.quantidade * 0.6)) });
          pc._chegada = utilAntes(n + 3) === n ? n + 4 : utilAntes(n + 3);
          pc._parcial = false;
        } else receber(pc, n, {});
      });
      pedidos.filter((pc) => pc.status === "parcial" && pc._chegada === n && !pc._fixo).forEach((pc) => receber(pc, n, {}));
      const fixoParcial = pedidos.find((pc) => pc._parcialEm === n);
      if (fixoParcial) receber(fixoParcial, n, { [fixoParcial.itens[0].produtoId]: 12, [fixoParcial.itens[1].produtoId]: 6 }, 10);

      // 3. Roteiro fixo
      roteiro.filter(([quando]) => quando === n).forEach(([, acao]) => acao(n));

      // 4. Devolução de cliente (entrada sem fornecedor)
      if (n === utilAntes(-27) || n === utilAntes(-6)) {
        const pid = n === utilAntes(-27) ? PRODUTO("Extensão elétrica 5 m 3 tomadas") : PRODUTO("Martelo unha 27 mm cabo de fibra");
        const quando = momento(n, 15, 12);
        if (jaAconteceu(quando)) {
          mov({
            id: `m${seqMov}`, data: quando, produtoId: pid, tipo: "entrada", quantidade: 1, custoUnitario: produto(pid).custo, fornecedorId: null,
            motivo: "Devolução de cliente", documento: `Troca ${entre(100, 999)}`, observacao: "Cliente devolveu na embalagem original, sem uso. Voltou para a venda.", responsavelId: "u4", origem: "manual",
          });
        }
      }

      // 5. Saídas avulsas (avaria, uso interno, perda)
      extras.filter((x) => x.n === n).forEach((x) => {
        const p = produto(x.produto);
        if (p._foco === "arquivado" || n < p._criadoDia || (saldo[p.id] || 0) < 2) return;
        const quando = momento(n, entre(11, 16), entre(0, 59));
        if (!jaAconteceu(quando)) return;
        const obs = { Avaria: "Embalagem danificada no manuseio; peça sem condição de venda.", "Uso interno": "Usado na manutenção da própria loja.", Perda: "Não localizado após conferência do setor." }[x.motivo];
        mov({ id: `m${seqMov}`, data: quando, produtoId: p.id, tipo: "saida", quantidade: -1, custoUnitario: null, fornecedorId: null, motivo: x.motivo, documento: "", observacao: obs, responsavelId: sorteio(["u1", "u2"]), origem: "manual" });
      });

      // 6. Vendas do dia (fechamento do caixa; domingo a loja fecha)
      if (!domingo) {
        const fechamento = ehSabado(n) ? [13, 10] : [18, 20];
        produtos.forEach((p) => {
          if (n < p._criadoDia || p.status === "arquivado") return;
          const fator = ehSabado(n) ? 0.6 : 1;
          const q = Math.min(0.62, 0.16 + p._venda / 12);
          if (r() > q) return;
          let qtd = Math.max(1, Math.round((p._venda * fator / q) * (0.45 + r() * 1.1)));
          qtd = Math.min(qtd, saldo[p.id] || 0);
          if (qtd <= 0) return;
          const quando = momento(n, fechamento[0], fechamento[1] + entre(0, 30));
          if (!jaAconteceu(quando)) return;
          mov({ id: `m${seqMov}`, data: quando, produtoId: p.id, tipo: "saida", quantidade: -qtd, custoUnitario: null, fornecedorId: null, motivo: "Venda", documento: `Caixa ${dia(n).slice(8, 10)}/${dia(n).slice(5, 7)}`, observacao: "", responsavelId: "u4", origem: "manual" });
        });
      }

      // 7. Lançamento errado e estorno (exemplo de correção rastreável)
      if (n === utilAntes(-12)) {
        const pid = PRODUTO("Furadeira de impacto 650 W");
        const quando = momento(n, 18, 52);
        if ((saldo[pid] || 0) >= 2 && jaAconteceu(momento(n, 19, 5))) {
          const idErrado = `m${seqMov}`;
          mov({ id: idErrado, data: quando, produtoId: pid, tipo: "saida", quantidade: -2, custoUnitario: null, fornecedorId: null, motivo: "Venda", documento: `Caixa ${dia(n).slice(8, 10)}/${dia(n).slice(5, 7)}`, observacao: "", responsavelId: "u4", origem: "manual" });
          mov({ id: `m${seqMov}`, data: momento(n, 19, 5), produtoId: pid, tipo: "estorno", tipoOriginal: "saida", quantidade: 2, custoUnitario: null, fornecedorId: null, motivo: "Venda lançada em duplicidade no fechamento do caixa.", documento: "", observacao: "", responsavelId: "u1", origem: "estorno", estornoDe: idErrado });
          movs.find((m) => m.id === idErrado).estornadoPor = `m${seqMov - 1}`;
        }
      }

      // 8. Arquivamento do produto descontinuado
      const desc = produtos.find((p) => p._foco === "arquivado");
      if (n === utilAntes(-80) && desc.status === "ativo") {
        if ((saldo[desc.id] || 0) > 0) {
          mov({ id: `m${seqMov}`, data: momento(n, 11, 0), produtoId: desc.id, tipo: "saida", quantidade: -saldo[desc.id], custoUnitario: null, fornecedorId: null, motivo: "Venda", documento: "Liquidação", observacao: "Últimas unidades vendidas com desconto antes de descontinuar.", responsavelId: "u4", origem: "manual" });
        }
        desc.status = "arquivado";
        desc.arquivadoEm = momento(n, 11, 30);
      }

      // 9. Compras automáticas (segunda, quarta e sexta, ou quando algo zerou)
      if (!domingo && n < 0) {
        const precisa = produtos.filter((p) => p.status === "ativo" && compraAtiva(p, n) && n >= p._criadoDia && (saldo[p.id] || 0) <= p.minimo && !emAberto(p.id));
        const dow = U.diaDaSemana(dia(n));
        const porFornecedor = {};
        precisa.forEach((p) => { (porFornecedor[p.fornecedorId] = porFornecedor[p.fornecedorId] || []).push(p); });
        Object.entries(porFornecedor).forEach(([forn, lista]) => {
          if (![1, 3, 5].includes(dow) && !lista.some((p) => (saldo[p.id] || 0) === 0)) return;
          const prazo = fornecedores.find((f) => f.id === forn).prazoEntrega;
          const itens = lista.map((p) => ({ produtoId: p.id, quantidade: ceilA(p.minimo * 1.6 + p._venda * (prazo + 16) - (saldo[p.id] || 0), p._multiplo) }));
          const pc = novoPedido(forn, n, itens);
          pc._chegada = utilAntes(n + prazo + sorteio([-1, 0, 0, 0, 1, 2]));
          if (pc._chegada <= n) pc._chegada = n + 1;
          pc._parcial = itens.length > 1 && r() < 0.12;
        });
      }
    }

    /* ---------- Ajustes finais do roteiro (saldo de cada produto em foco) ---------- */
    const ultimoDiaAberto = ehDomingo(0) ? -1 : (jaAconteceu(momento(0, 18, 55)) ? 0 : -1);
    const diaFinal = ehDomingo(ultimoDiaAberto) ? ultimoDiaAberto - 1 : ultimoDiaAberto;
    const reduzirVendas = (pid, quanto) => {
      // devolve unidades ao saldo diminuindo as últimas vendas (nunca deixa saldo negativo no caminho)
      const vendas = movs.filter((m) => m.produtoId === pid && m.tipo === "saida" && m.motivo === "Venda" && !m.estornadoPor).sort((a, b) => b.data.localeCompare(a.data) || b.seq - a.seq);
      for (const v of vendas) {
        if (quanto <= 0) break;
        const tira = Math.min(quanto, -v.quantidade - 1);
        if (tira <= 0) continue;
        v.quantidade += tira; saldo[pid] += tira; quanto -= tira;
      }
    };
    const vendaFinal = (pid, qtd, obs) => {
      if (qtd <= 0) return;
      // Sempre depois da última movimentação do produto (e antes de agora)
      let quando = momento(diaFinal, ehSabado(diaFinal) ? 12 : 17, entre(10, 40));
      const ultima = movs.filter((m) => m.produtoId === pid).reduce((u, m) => (m.data > u ? m.data : u), "");
      if (quando <= ultima) quando = somarMinutos(ultima, 7);
      if (!jaAconteceu(quando)) return;
      mov({ id: `m${seqMov}`, data: quando, produtoId: pid, tipo: "saida", quantidade: -qtd, custoUnitario: null, fornecedorId: null, motivo: "Venda", documento: `Pedido de balcão ${entre(2000, 2999)}`, observacao: obs || "Venda para obra (cliente com cadastro na loja).", responsavelId: "u4", origem: "manual" });
    };
    produtos.forEach((p) => {
      const s = saldo[p.id] || 0;
      if (!p._foco || p._foco === "arquivado") return;
      if (p._foco.startsWith("zerado")) vendaFinal(p.id, s);
      else if (p._foco.startsWith("baixo")) {
        const alvo = Math.max(1, Math.round(p.minimo * 0.45));
        if (s > alvo) vendaFinal(p.id, s - alvo);
        else if (s < alvo) reduzirVendas(p.id, alvo - s);
      } else if (s <= p.minimo) reduzirVendas(p.id, p.minimo + Math.ceil(p._multiplo / 2) - s);
    });

    /* ---------- Pedidos: numeração e datas ---------- */
    pedidos.forEach((pc) => {
      delete pc._chegada; delete pc._parcial; delete pc._fixo; delete pc._parcialEm;
    });
    pedidos.sort((a, b) => a.criadoEm.localeCompare(b.criadoEm));
    pedidos.forEach((pc, i) => { pc.numero = `PC-${String(i + 101).padStart(4, "0")}`; });

    /* ---------- Movimentações: ordem, número e saldo após cada uma ---------- */
    movs.sort((a, b) => a.data.localeCompare(b.data) || a.seq - b.seq);
    const corrente = {};
    const movimentos = movs.map((m, i) => {
      const anterior = corrente[m.produtoId] || 0;
      const depois = anterior + m.quantidade;
      if (depois < 0) throw new Error(`Saldo negativo na simulação: ${m.produtoId} em ${m.data}`);
      corrente[m.produtoId] = depois;
      const limpo = { ...m, numero: i + 1, saldoAnterior: anterior, saldoApos: depois, registradoEm: m.data };
      delete limpo.seq;
      return limpo;
    });
    // Recebimentos guardam os ids definitivos das movimentações (já são os mesmos)
    produtos.forEach((p) => { delete p._venda; delete p._multiplo; delete p._foco; delete p._criadoDia; });

    return {
      versao: 1,
      empresa: "Prumo Ferragens & Utilidades",
      perfil: { id: "u1", nome: "Larissa Campos", cargo: "Gerente da loja", email: "larissa@prumoferragens.exemplo" },
      equipe: EQUIPE.map((u) => ({ ...u })),
      categorias, fornecedores, produtos, movimentos, pedidos,
      alertasVistos: [],
      sequencias: { movimento: movimentos.length, pedido: pedidos.length + 100 },
      criadoEm: AGORA,
    };
  };
})();
