/* ==========================================================================
   AUTOPRIME — config.js
   CONFIGURAÇÃO DA EMPRESA. Contatos, endereço, horário, redes sociais e
   fotos ficam SÓ AQUI: o site lê estes dados e monta a área de contato,
   o rodapé, o botão de WhatsApp e o mapa.

   A AutoPrime é uma marca fictícia, então os contatos estão vazios de
   propósito. Campo vazio = o site mostra "a configurar" e não cria
   link nenhum (nada de número ou endereço inventado).

   Textos dos serviços, perguntas e títulos: no index.html.
   Título e descrição para o Google e para o WhatsApp: no <head> do index.html.
   ========================================================================== */

window.AUTOPRIME_CONFIG = {
  empresa: {
    nome: "AutoPrime Centro Automotivo",
    nomeCurto: "AutoPrime",

    // WhatsApp comercial: 55 + DDD + número, só dígitos. Ex.: "5511912345678"
    // Vazio: o formulário mostra a mensagem pronta, mas avisa que não há
    // número e NÃO abre o WhatsApp.
    whatsapp: "",

    // Telefone como deve aparecer no site. Ex.: "(11) 3456-7890"
    telefone: "",

    // E-mail de atendimento. Ex.: "contato@suaoficina.com.br"
    email: "",

    endereco: {
      logradouro: "",   // Ex.: "Rua das Oficinas"
      numero: "",
      complemento: "",
      bairro: "",
      cidade: "",
      uf: "",           // Ex.: "SP"
      cep: "",
    },
    // Só mude para true depois de conferir o endereço com o dono da empresa.
    // É isso que libera o mapa, o botão "Como chegar" e os dados para o Google.
    enderecoConfirmado: false,

    // Uma linha por grupo de dias. Ex.:
    // horarios: [
    //   { dias: "Segunda a sexta", horas: "8h às 18h" },
    //   { dias: "Sábado", horas: "8h às 12h" },
    // ],
    horarios: [],

    // Endereços completos (começando com https://). Vazio = não aparece.
    redes: {
      instagram: "",
      facebook: "",
      youtube: "",
    },
  },

  // Endereço público definitivo do site (opcional). Usado nos dados
  // estruturados para o Google, que só são gerados com endereço confirmado.
  urlPublica: "",

  // Mensagens do WhatsApp. {nome} vira o nome curto da empresa.
  mensagens: {
    orcamento: "Olá, {nome}! Vim pelo site e gostaria de um orçamento.",
    duvida: "Olá, {nome}! Vim pelo site e gostaria de tirar uma dúvida.",
  },

  // Fotos reais: coloque os arquivos na pasta abaixo, com estes nomes, e
  // mude "usar" para true. Se um arquivo não existir, a ilustração continua
  // no lugar (e o Console do navegador avisa qual arquivo faltou).
  fotos: {
    usar: false,
    pasta: "../../assets/images/autoprime/",
    arquivos: {
      "hero": "hero.webp",
      "servico-preventiva": "servico-preventiva.webp",
      "servico-diagnostico": "servico-diagnostico.webp",
      "servico-freios": "servico-freios.webp",
      "servico-oleo": "servico-oleo.webp",
      "servico-arrefecimento": "servico-arrefecimento.webp",
      "servico-mecanica": "servico-mecanica.webp",
      "sobre": "sobre.webp",
      "galeria-1": "galeria-1.webp",
      "galeria-2": "galeria-2.webp",
      "galeria-3": "galeria-3.webp",
      "galeria-4": "galeria-4.webp",
      "galeria-5": "galeria-5.webp",
      "galeria-6": "galeria-6.webp",
      "galeria-7": "galeria-7.webp",
    },
  },
};
