/* ==========================================================================
   BLACK COPPER — dados.js
   O PONTO DE PARTIDA DA DEMONSTRAÇÃO. Tudo o que é da marca fica aqui:
   nome, contatos, horários, serviços, preços, barbeiros, regras de reserva,
   depoimentos e a galeria.

   Depois do primeiro acesso, os dados passam a ser editados pelo painel
   (painel.html) e ficam salvos no navegador. Para voltar a estes valores,
   use "Restaurar dados de exemplo" em Configurações, no painel.
   ========================================================================== */

// Os textos do agendamento e do painel falam "o profissional" e "o cliente"
AE.termos = {
  a: "o", A: "O", s: "o", uma: "um", nenhuma: "nenhum", Nenhuma: "Nenhum", Todasas: "Todos os", cada: "cada um", Nova: "Novo", ela: "ele", dela: "dele",
  ca: "o", cA: "O", cs: "o", cdela: "dele", ccada: "cada um",
};

window.BLACKCOPPER = (function () {
  "use strict";

  const CHAVE = "black-copper:dados";

  // Clientes de exemplo: nomes inventados e telefones no padrão 95555 (fictícios)
  const CLIENTES_EXEMPLO = [
    ["Lucas Ferreira", "11955550201"], ["Gabriel Rocha", "11955550202"], ["Matheus Lima", "11955550203"],
    ["Pedro Antunes", "11955550204"], ["Bruno Teixeira", "11955550205"], ["Felipe Castro", "11955550206"],
    ["André Monteiro", "11955550207"], ["Caio Ribeiro", "11955550208"], ["Vinícius Prado", "11955550209"],
    ["Leonardo Dias", "11955550210"], ["Marcelo Nunes", "11955550211"], ["Rodrigo Pacheco", "11955550212"],
    ["Henrique Sales", "11955550213"], ["Otávio Brandão", "11955550214"], ["Samuel Couto", "11955550215"],
  ].map(([nome, telefone]) => ({ nome, telefone }));

  function semente() {
    const U = AE.util;
    const hj = U.hoje();
    const proximo = (dias, dow) => { let k = U.somarDias(hj, dias); while (U.diaDaSemana(k) !== dow) k = U.somarDias(k, 1); return k; };
    const jornada = (ini, fim, sab) => ({ 0: [], 1: [], 2: [[ini, fim]], 3: [[ini, fim]], 4: [[ini, fim]], 5: [[ini, fim]], 6: sab ? [sab] : [] });
    const d = {
      negocio: {
        nome: "BLACK COPPER",
        nomeCurto: "Black Copper",
        complemento: "Barber Studio",
        telefone: "", whatsapp: "", email: "", instagram: "",
        endereco: { rua: "", numero: "", complemento: "", bairro: "", cidade: "", uf: "", cep: "" },
        enderecoConfirmado: false,
        fuso: "America/Sao_Paulo",
        razaoSocial: "", cnpj: "", logo: "", temaPadrao: "escuro",
      },
      regras: {
        antecedenciaMin: 60, diasFuturos: 30, intervaloEntre: 5, passo: 15,
        cancelamentoHoras: 3, aprovacao: "automatica",
        politicaCancelamento: "Não vai conseguir vir? Cancele pelo site com pelo menos 3 horas de antecedência para liberar o horário. Em cima da hora, mande uma mensagem.",
      },
      horarios: { 0: [], 1: [], 2: [["09:00", "20:00"]], 3: [["09:00", "20:00"]], 4: [["09:00", "20:00"]], 5: [["09:00", "20:00"]], 6: [["08:00", "18:00"]] },
      categorias: ["Cortes", "Barba", "Combos e extras"],
      servicos: [
        { id: "s1", nome: "Corte tradicional", categoria: "Cortes", preco: 50, duracao: 40, arte: "tesoura", profissionais: ["p1", "p2", "p3"], ativo: true,
          descricao: "Máquina nas laterais e tesoura em cima, com acabamento na navalha.", regras: "" },
        { id: "s2", nome: "Degradê", categoria: "Cortes", preco: 60, duracao: 50, arte: "degrade", profissionais: ["p1", "p3"], ativo: true,
          descricao: "Transição na máquina, do zero ao comprimento que você escolher, sem marca de linha.", regras: "" },
        { id: "s3", nome: "Corte na tesoura", categoria: "Cortes", preco: 70, duracao: 60, arte: "pente", profissionais: ["p2"], ativo: true,
          descricao: "Corte inteiro na tesoura, para quem usa o cabelo mais comprido ou com volume.", regras: "" },
        { id: "s4", nome: "Barba", categoria: "Barba", preco: 45, duracao: 30, arte: "navalha", profissionais: ["p1", "p3"], ativo: true,
          descricao: "Desenho do contorno, aparo e toalha quente. Finalização com balm.", regras: "" },
        { id: "s5", nome: "Corte e barba", categoria: "Combos e extras", preco: 90, duracao: 70, arte: "ferramentas", profissionais: ["p1", "p3"], ativo: true,
          descricao: "Corte tradicional ou degradê e barba completa, no mesmo horário.", regras: "" },
        { id: "s6", nome: "Acabamento", categoria: "Cortes", preco: 25, duracao: 20, arte: "maquina", profissionais: ["p1", "p2", "p3"], ativo: true,
          descricao: "Pezinho e contorno entre um corte e outro, para manter o desenho.", regras: "Para cortes feitos aqui há até 20 dias." },
        { id: "s7", nome: "Sobrancelha", categoria: "Combos e extras", preco: 20, duracao: 15, arte: "navalha", profissionais: ["p3"], ativo: true,
          descricao: "Limpeza discreta, com navalha ou pinça, sem mudar o formato natural.", regras: "" },
        { id: "s8", nome: "Pacote premium", categoria: "Combos e extras", preco: 140, duracao: 100, arte: "pincel", profissionais: ["p1"], ativo: true,
          descricao: "Corte, barba, sobrancelha e lavagem com massagem no couro cabeludo.", regras: "" },
        { id: "s9", nome: "Pigmentação de barba", categoria: "Barba", preco: 50, duracao: 40, arte: "pincel", profissionais: ["p3"], ativo: false,
          descricao: "Preenchimento de falhas com pigmento temporário. Serviço pausado no momento.", regras: "" },
      ],
      profissionais: [
        { id: "p1", nome: "Rafael Duarte", especialidades: "Degradê e cortes curtos", arte: "a", ativo: true, folgas: [],
          descricao: "Gosta de degradês bem marcados e de cortes que se mantêm sem muito produto.",
          jornada: jornada("09:00", "18:00", ["08:00", "16:00"]), pausas: [{ dias: [2, 3, 4, 5], inicio: "12:00", fim: "13:00" }] },
        { id: "p2", nome: "Diego Moraes", especialidades: "Tesoura e cabelos longos", arte: "b", ativo: true,
          folgas: [{ id: "f1", data: proximo(4, 5), motivo: "Folga" }],
          descricao: "Atende quem usa o cabelo mais comprido e prefere corte na tesoura, com calma.",
          jornada: jornada("11:00", "20:00", ["09:00", "18:00"]), pausas: [{ dias: [2, 3, 4, 5], inicio: "15:00", fim: "16:00" }] },
        { id: "p3", nome: "Thiago Santana", especialidades: "Barba e navalha", arte: "c", ativo: true, folgas: [],
          descricao: "Cuida das barbas, do contorno na navalha e da toalha quente.",
          jornada: jornada("10:00", "19:00", ["08:00", "14:00"]), pausas: [{ dias: [2, 3, 4, 5], inicio: "13:30", fim: "14:30" }] },
      ],
      bloqueios: [
        { id: "b1", profissionalId: "", data: proximo(2, 4), inicio: "09:00", fim: "10:00", motivo: "Manutenção das máquinas", criadoEm: `${hj}T12:00:00.000Z`, por: "Estúdio" },
      ],
      depoimentos: [
        { id: "d1", ficticio: true, autorizado: false, ativo: true, autor: "Cliente A.", contexto: "Degradê",
          texto: "Marquei pelo celular em dois minutos, cheguei e fui atendido no horário. O degradê ficou limpo, sem aquela linha marcada." },
        { id: "d2", ficticio: true, autorizado: false, ativo: true, autor: "Cliente B.", contexto: "Barba",
          texto: "A toalha quente e o contorno na navalha fazem diferença. Saí com a barba alinhada do jeito que eu uso." },
        { id: "d3", ficticio: true, autorizado: false, ativo: true, autor: "Cliente C.", contexto: "Corte na tesoura",
          texto: "Uso o cabelo comprido e era difícil achar quem cortasse só na tesoura. Aqui deu para escolher o barbeiro certo." },
      ],
      clientes: [],
      reservas: [],
    };
    return AE.exemplos.gerar(d, { semente: 1977, clientes: CLIENTES_EXEMPLO, intensidade: 0.6 });
  }

  /* ---------- Galeria (ilustrações; cada item pode ganhar uma foto real) ----------
     A ordem foi pensada para a grade encaixar sem buracos (no computador e no celular). */
  const GALERIA = [
    { id: "g1", categoria: "Degradês", titulo: "Degradê baixo", legenda: "Transição curta acima da orelha, com o topo mais longo.", arte: "perfil-degrade", foto: "galeria-1.jpg", tamanho: "alta" },
    { id: "g2", categoria: "Degradês", titulo: "A escala do degradê", legenda: "Do pente zero ao três: cada faixa é uma altura da máquina.", arte: "escala", foto: "galeria-2.jpg", destaqueCelular: true },
    { id: "g3", categoria: "Ferramentas", titulo: "Navalha", legenda: "Lâmina descartável trocada a cada cliente.", arte: "navalha", foto: "galeria-3.jpg" },
    { id: "g5", categoria: "Ambiente", titulo: "Bancada", legenda: "Tesoura, pente e navalha organizados entre um atendimento e outro.", arte: "ferramentas", foto: "galeria-5.jpg", tamanho: "larga" },
    { id: "g4", categoria: "Barbas", titulo: "Barba alinhada", legenda: "Contorno marcado no pescoço e na bochecha.", arte: "perfil-barba", foto: "galeria-4.jpg", tamanho: "alta" },
    { id: "g6", categoria: "Cortes", titulo: "Corte na tesoura", legenda: "Tesoura e pente para os cortes com mais comprimento.", arte: "tesoura", foto: "galeria-6.jpg" },
    { id: "g7", categoria: "Ambiente", titulo: "A cadeira", legenda: "Cadeira reclinável para a toalha quente.", arte: "cadeira", foto: "galeria-7.jpg" },
    { id: "g9", categoria: "Ferramentas", titulo: "Máquina e pentes", legenda: "Pentes de altura que definem cada faixa do degradê.", arte: "maquina", foto: "galeria-9.jpg", tamanho: "larga" },
    { id: "g8", categoria: "Produtos", titulo: "Pomadas", legenda: "Acabamento seco ou com brilho, de marca fictícia.", arte: "pomada", foto: "galeria-8.jpg", tamanho: "larga" },
    { id: "g10", categoria: "Ambiente", titulo: "Espelho e luz", legenda: "Luz frontal para conferir o contorno.", arte: "espelho", foto: "galeria-10.jpg" },
  ];

  return { CHAVE, semente, GALERIA };
})();
