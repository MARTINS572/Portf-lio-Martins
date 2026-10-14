/* ==========================================================================
   VIOLET STUDIO — dados.js
   O PONTO DE PARTIDA DA DEMONSTRAÇÃO. Tudo o que é da marca fica aqui:
   nome, contatos, horários, serviços, preços, equipe, regras de reserva,
   depoimentos e a galeria.

   Depois do primeiro acesso, os dados passam a ser editados pelo painel
   (painel.html) e ficam salvos no navegador. Para voltar a estes valores,
   use "Restaurar dados de exemplo" em Configurações, no painel.

   PARA ADAPTAR A UMA CLIENTE REAL: troque os valores abaixo (ou edite pelo
   painel), substitua as ilustrações por fotos autorizadas e apague os
   depoimentos fictícios.
   ========================================================================== */
window.VIOLET = (function () {
  "use strict";

  const CHAVE = "violet-studio:dados";

  // Clientes de exemplo: nomes inventados e telefones no padrão 95555 (fictícios)
  const CLIENTES_EXEMPLO = [
    ["Helena Duarte", "11955550101"], ["Marina Teixeira", "11955550102"], ["Júlia Andrade", "11955550103"],
    ["Beatriz Lins", "11955550104"], ["Rafaela Campos", "11955550105"], ["Ana Clara Moura", "11955550106"],
    ["Patrícia Gouveia", "11955550107"], ["Luana Freitas", "11955550108"], ["Sofia Carvalho", "11955550109"],
    ["Tatiane Rezende", "11955550110"], ["Débora Lacerda", "11955550111"], ["Natália Pires", "11955550112"],
    ["Priscila Amaral", "11955550113"], ["Carolina Vidal", "11955550114"],
  ].map(([nome, telefone]) => ({ nome, telefone }));

  function semente() {
    const U = AE.util;
    const hj = U.hoje();
    // próxima data (a partir de "dias" à frente) que caia no dia da semana pedido
    const proximo = (dias, dow) => { let k = U.somarDias(hj, dias); while (U.diaDaSemana(k) !== dow) k = U.somarDias(k, 1); return k; };
    const d = {
      negocio: {
        nome: "VIOLET STUDIO",
        nomeCurto: "Violet",
        complemento: "Nails & Beauty",
        telefone: "", whatsapp: "", email: "", instagram: "",
        endereco: { rua: "", numero: "", complemento: "", bairro: "", cidade: "", uf: "", cep: "" },
        enderecoConfirmado: false,
        fuso: "America/Sao_Paulo",
        razaoSocial: "", cnpj: "", logo: "", temaPadrao: "sistema",
      },
      regras: {
        antecedenciaMin: 120, diasFuturos: 45, intervaloEntre: 10, passo: 15,
        cancelamentoHoras: 12, aprovacao: "manual",
        politicaCancelamento: "Se precisar desmarcar, cancele pelo site com antecedência ou avise o estúdio. Assim o horário volta para a agenda e outra cliente pode usar.",
      },
      // 0 = domingo … 6 = sábado
      horarios: { 0: [], 1: [], 2: [["09:00", "19:00"]], 3: [["09:00", "19:00"]], 4: [["09:00", "19:00"]], 5: [["09:00", "19:00"]], 6: [["09:00", "16:00"]] },
      categorias: ["Manicure", "Pedicure", "Especiais"],
      servicos: [
        { id: "s1", nome: "Manicure tradicional", categoria: "Manicure", preco: 35, duracao: 45, arte: "tradicional", profissionais: ["p1", "p3"], ativo: true,
          descricao: "Cutilagem, lixamento no formato que você escolher e esmaltação comum.", regras: "" },
        { id: "s2", nome: "Esmaltação", categoria: "Manicure", preco: 25, duracao: 30, arte: "esmalte", profissionais: ["p1", "p2", "p3"], ativo: true,
          descricao: "Só a troca de cor, para quem já está com as unhas feitas.", regras: "" },
        { id: "s3", nome: "Esmaltação em gel", categoria: "Manicure", preco: 80, duracao: 75, arte: "gel", profissionais: ["p1", "p2"], ativo: true,
          descricao: "Gel curado em cabine de LED, com brilho que dura mais que o esmalte comum.", regras: "" },
        { id: "s4", nome: "Nail art", categoria: "Manicure", preco: 60, duracao: 60, arte: "arte", profissionais: ["p1"], ativo: true,
          descricao: "Desenho à mão livre em algumas unhas ou em todas. Traga referências, se quiser.", regras: "O valor pode mudar conforme o detalhe do desenho, sempre combinado antes de começar." },
        { id: "s5", nome: "Francesinha", categoria: "Manicure", preco: 45, duracao: 50, arte: "francesinha", profissionais: ["p1", "p3"], ativo: true,
          descricao: "Ponta fina ou larga, branca ou colorida, sobre base nude ou transparente.", regras: "" },
        { id: "s6", nome: "Manutenção do gel", categoria: "Manicure", preco: 70, duracao: 60, arte: "gel", profissionais: ["p1", "p2"], ativo: true,
          descricao: "Remoção do crescimento, nivelamento e nova camada de gel.", regras: "Para gel aplicado há até 21 dias." },
        { id: "s7", nome: "Pedicure tradicional", categoria: "Pedicure", preco: 40, duracao: 50, arte: "pes", profissionais: ["p3"], ativo: true,
          descricao: "Cutilagem, lixamento e esmaltação comum nos pés.", regras: "" },
        { id: "s8", nome: "Esmaltação dos pés", categoria: "Pedicure", preco: 25, duracao: 30, arte: "pes", profissionais: ["p3", "p2"], ativo: true,
          descricao: "Troca de cor nos pés, sem cutilagem.", regras: "" },
        { id: "s9", nome: "Manicure e pedicure", categoria: "Pedicure", preco: 70, duracao: 90, arte: "combo", profissionais: ["p3"], ativo: true,
          descricao: "Mãos e pés no mesmo horário, com esmaltação comum.", regras: "" },
        { id: "s10", nome: "Alongamento em fibra", categoria: "Especiais", preco: 180, duracao: 150, arte: "alongamento", profissionais: ["p2"], ativo: true,
          descricao: "Alongamento com fibra de vidro e gel, no formato e no comprimento combinados com você.", regras: "Primeira aplicação. A manutenção é outro serviço." },
        { id: "s11", nome: "Manutenção do alongamento", categoria: "Especiais", preco: 120, duracao: 120, arte: "alongamento", profissionais: ["p2"], ativo: true,
          descricao: "Preenchimento do crescimento e reforço da estrutura do alongamento.", regras: "Para alongamento feito há até 21 dias." },
        { id: "s12", nome: "Remoção de gel ou alongamento", categoria: "Especiais", preco: 40, duracao: 40, arte: "remocao", profissionais: ["p1", "p2"], ativo: true,
          descricao: "Retirada cuidadosa do produto, sem lixar a unha natural além do necessário.", regras: "" },
        { id: "s13", nome: "Decoração personalizada", categoria: "Especiais", preco: 30, duracao: 30, arte: "decoracao", profissionais: ["p1"], ativo: true,
          descricao: "Pedrarias, cromado ou adesivos aplicados sobre a esmaltação que você já fez aqui.", regras: "" },
        { id: "s14", nome: "Spa dos pés", categoria: "Pedicure", preco: 65, duracao: 60, arte: "pes", profissionais: ["p3"], ativo: false,
          descricao: "Esfoliação e hidratação dos pés. Serviço pausado no momento.", regras: "" },
      ],
      profissionais: [
        { id: "p1", nome: "Lívia Moreau", especialidades: "Nail art e gel", arte: "a", ativo: true, folgas: [],
          descricao: "Cuida das composições de nail art e dos acabamentos em gel. Gosta de traços finos e de combinar texturas.",
          jornada: { 0: [], 1: [], 2: [["09:00", "18:00"]], 3: [["09:00", "18:00"]], 4: [["09:00", "18:00"]], 5: [["09:00", "18:00"]], 6: [["09:00", "16:00"]] },
          pausas: [{ dias: [2, 3, 4, 5], inicio: "12:30", fim: "13:30" }] },
        { id: "p2", nome: "Camila Rocha", especialidades: "Alongamento e manutenção", arte: "b", ativo: true,
          folgas: [{ id: "f1", data: proximo(5, 4), motivo: "Folga" }],
          descricao: "Responsável pelos alongamentos e pelas manutenções. Atende com hora marcada para os serviços mais longos.",
          jornada: { 0: [], 1: [], 2: [["10:00", "19:00"]], 3: [["10:00", "19:00"]], 4: [["10:00", "19:00"]], 5: [["10:00", "19:00"]], 6: [["09:00", "16:00"]] },
          pausas: [{ dias: [2, 3, 4, 5], inicio: "14:00", fim: "15:00" }] },
        { id: "p3", nome: "Iara Nunes", especialidades: "Manicure e pedicure", arte: "c", ativo: true, folgas: [],
          descricao: "Atende manicure, pedicure e francesinha. Prefere esmaltações limpas e cores sóbrias.",
          jornada: { 0: [], 1: [], 2: [], 3: [["09:00", "17:00"]], 4: [["09:00", "17:00"]], 5: [["09:00", "17:00"]], 6: [["09:00", "16:00"]] },
          pausas: [{ dias: [3, 4, 5], inicio: "12:00", fim: "13:00" }] },
      ],
      bloqueios: [
        { id: "b1", profissionalId: "", data: proximo(3, 3), inicio: "09:00", fim: "10:00", motivo: "Reunião da equipe", criadoEm: `${hj}T12:00:00.000Z`, por: "Estúdio" },
      ],
      depoimentos: [
        { id: "d1", ficticio: true, autorizado: false, ativo: true, autor: "Cliente A.", contexto: "Esmaltação em gel",
          texto: "Cheguei com uma foto de referência e saí com a cor exata. Ela explicou quanto tempo o gel costuma durar e como cuidar em casa." },
        { id: "d2", ficticio: true, autorizado: false, ativo: true, autor: "Cliente B.", contexto: "Nail art",
          texto: "Gostei de poder escolher a profissional pelo site e ver os horários livres na hora, sem ficar trocando mensagem." },
        { id: "d3", ficticio: true, autorizado: false, ativo: true, autor: "Cliente C.", contexto: "Manicure e pedicure",
          texto: "Atendimento no horário marcado, material separado na minha frente e uma francesinha bem fininha, do jeito que pedi." },
      ],
      clientes: [],
      reservas: [],
    };
    return AE.exemplos.gerar(d, { semente: 2026, clientes: CLIENTES_EXEMPLO, intensidade: 0.55 });
  }

  /* ---------- Galeria (ilustrações; cada item pode ganhar uma foto real) ----------
     "foto": nome do arquivo em assets/images/violet-studio/ (só aparece se
     usarFotos estiver ligado em site.js e o arquivo existir). */
  const GALERIA = [
    { id: "g1", categoria: "Minimalistas", titulo: "Linha única", legenda: "Base nude com um traço fino em grafite, unha amendoada.", arte: "linha", foto: "galeria-1.jpg", tamanho: "alta" },
    { id: "g2", categoria: "Francesinhas", titulo: "Francesinha invertida", legenda: "Meia-lua na base, em roxo, sobre base leitosa.", arte: "francesa-invertida", foto: "galeria-2.jpg", destaqueCelular: true },
    { id: "g3", categoria: "Nail art", titulo: "Constelação", legenda: "Pontos prateados sobre preto brilho, à mão livre.", arte: "constelacao", foto: "galeria-3.jpg", tamanho: "larga" },
    { id: "g4", categoria: "Gel", titulo: "Violeta profundo", legenda: "Gel em roxo escuro com acabamento espelhado.", arte: "violeta", foto: "galeria-4.jpg" },
    { id: "g5", categoria: "Formatos", titulo: "Quatro formatos", legenda: "Quadrado, oval, amendoado e bailarina, lado a lado.", arte: "formatos", foto: "galeria-5.jpg", tamanho: "larga" },
    { id: "g6", categoria: "Nail art", titulo: "Geométrico", legenda: "Blocos de cor em preto, branco e lilás, divididos por linhas finas.", arte: "geometrico", foto: "galeria-6.jpg" },
    { id: "g7", categoria: "Francesinhas", titulo: "Francesinha clássica", legenda: "Ponta branca fina sobre base leitosa.", arte: "francesa", foto: "galeria-7.jpg", tamanho: "alta" },
    { id: "g8", categoria: "Gel", titulo: "Cromado lilás", legenda: "Pó cromado sobre gel claro, em unha curta.", arte: "cromado", foto: "galeria-8.jpg" },
    { id: "g9", categoria: "Minimalistas", titulo: "Ponto e espaço", legenda: "Um ponto preto na base de cada unha, sobre branco gelo.", arte: "ponto", foto: "galeria-9.jpg" },
    { id: "g10", categoria: "Decorações", titulo: "Detalhe em pedraria", legenda: "Uma pedra pequena na base, sobre esmaltação em gel lilás.", arte: "pedraria", foto: "galeria-10.jpg", tamanho: "larga" },
  ];

  return { CHAVE, semente, GALERIA };
})();
