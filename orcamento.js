/* ==========================================================================
   AUTOPRIME — orcamento.js
   Regras do pedido de orçamento, sem nada de tela: limpeza dos campos,
   validação, telefone, montagem da mensagem e dos links.
   A tela (js/site.js) usa estas funções; os testes também.
   ========================================================================== */

(function (raiz) {
  "use strict";

  const LIMITES = { nome: 80, email: 120, marca: 40, modelo: 60, descricao: 600, descricaoMin: 10, anoMin: 1950 };

  const CONTROLE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u200B-\u200F\uFEFF]/g;

  /* Campo de uma linha: tira caracteres de controle, junta espaços e corta no limite */
  function linha(texto, max) {
    return String(texto == null ? "" : texto).replace(CONTROLE, "").replace(/\s+/g, " ").trim().slice(0, max);
  }

  /* Texto com várias linhas: no máximo uma linha em branco seguida */
  function paragrafo(texto, max) {
    return String(texto == null ? "" : texto)
      .replace(/\r\n?|[\u2028\u2029]/g, "\n")
      .replace(CONTROLE, "")
      .split("\n").map((l) => l.replace(/[ \t]+/g, " ").trim()).join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim()
      .slice(0, max);
  }

  function soDigitos(texto) {
    return String(texto == null ? "" : texto).replace(/\D/g, "");
  }

  /* Telefone brasileiro com DDD. Aceita +55, 0 na frente, espaços, traços e parênteses. */
  function analisarTelefone(texto) {
    let d = soDigitos(texto);
    if (!d) return { ok: false, motivo: "vazio" };
    if ((d.length === 12 || d.length === 13) && d.startsWith("55")) d = d.slice(2);
    if ((d.length === 11 || d.length === 12) && d.startsWith("0")) d = d.slice(1);
    if (d.length !== 10 && d.length !== 11) return { ok: false, motivo: "tamanho" };
    const ddd = d.slice(0, 2);
    const numero = d.slice(2);
    if (!/^[1-9]{2}$/.test(ddd)) return { ok: false, motivo: "ddd" };
    if (d.length === 11 && numero[0] !== "9") return { ok: false, motivo: "celular" };
    if (d.length === 10 && !/[2-5]/.test(numero[0])) return { ok: false, motivo: "fixo" };
    if (/^(\d)\1+$/.test(numero.slice(1))) return { ok: false, motivo: "repetido" };
    const formatado = d.length === 11
      ? `(${ddd}) ${numero.slice(0, 5)}-${numero.slice(5)}`
      : `(${ddd}) ${numero.slice(0, 4)}-${numero.slice(4)}`;
    return { ok: true, digitos: d, formatado };
  }

  const MSG_TELEFONE = {
    vazio: "Informe um telefone com DDD para a equipe retornar.",
    tamanho: "Confira o número: com DDD, celular tem 11 dígitos e fixo tem 10.",
    ddd: "Confira o DDD: são dois dígitos, de 11 a 99.",
    celular: "Celular com DDD tem 11 dígitos e começa com 9 depois do DDD.",
    fixo: "Telefone fixo com DDD tem 10 dígitos e começa com 2, 3, 4 ou 5 depois do DDD.",
    repetido: "Confira o número informado.",
  };

  function emailValido(email) {
    if (!/^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(email)) return false;
    const final = email.split(".").pop();
    return /^[a-z]{2,}$/i.test(final);
  }

  /* Valida o pedido.
     dados: valores crus do formulário
     opcoes: { anoAtual, servicos: { codigo: "Nome do serviço" } }
     Devolve { ok, erros: { campo: mensagem }, valores: dados limpos } */
  function validar(dados, opcoes) {
    const anoAtual = (opcoes && opcoes.anoAtual) || new Date().getFullYear();
    const servicos = (opcoes && opcoes.servicos) || {};
    const erros = {};
    const v = {
      nome: linha(dados.nome, LIMITES.nome),
      telefone: linha(dados.telefone, 30),
      email: linha(dados.email, LIMITES.email).toLowerCase(),
      marca: linha(dados.marca, LIMITES.marca),
      modelo: linha(dados.modelo, LIMITES.modelo),
      ano: linha(dados.ano, 4),
      servico: linha(dados.servico, 60),
      periodo: linha(dados.periodo, 40),
      descricao: paragrafo(dados.descricao, LIMITES.descricao),
      consentimento: dados.consentimento === true || dados.consentimento === "on",
    };

    if (!v.nome) erros.nome = "Escreva seu nome.";
    else if ((v.nome.match(/\p{L}/gu) || []).length < 2) erros.nome = "Escreva seu nome com pelo menos 2 letras.";

    const tel = analisarTelefone(v.telefone);
    if (!tel.ok) erros.telefone = MSG_TELEFONE[tel.motivo];
    else { v.telefone = tel.formatado; v.telefoneDigitos = tel.digitos; }

    if (v.email && !emailValido(v.email)) erros.email = "Confira o e-mail. Ex.: nome@provedor.com.br";

    if (!v.marca) erros.marca = "Informe a marca do veículo.";
    else if (!/\p{L}/u.test(v.marca)) erros.marca = "Confira a marca do veículo.";

    if (!v.modelo) erros.modelo = "Informe o modelo do veículo.";

    if (v.ano) {
      const n = Number(v.ano);
      if (!/^\d{4}$/.test(v.ano) || n < LIMITES.anoMin || n > anoAtual + 1) {
        erros.ano = `Informe o ano com 4 dígitos, entre ${LIMITES.anoMin} e ${anoAtual + 1}, ou deixe em branco.`;
      }
    }

    if (!v.servico || !Object.prototype.hasOwnProperty.call(servicos, v.servico)) {
      erros.servico = "Escolha um serviço. Se não souber qual, escolha “Não sei, preciso de uma avaliação”.";
    } else {
      v.servicoNome = servicos[v.servico];
    }

    if (!v.descricao) erros.descricao = "Conte em poucas palavras o que o carro precisa.";
    else if (v.descricao.replace(/\s/g, "").length < LIMITES.descricaoMin) erros.descricao = `Escreva um pouco mais: pelo menos ${LIMITES.descricaoMin} caracteres.`;

    if (!v.consentimento) erros.consentimento = "Para enviar o pedido, é preciso autorizar o uso dos dados para a resposta.";

    return { ok: Object.keys(erros).length === 0, erros, valores: v };
  }

  function preencherModelo(modelo, empresa) {
    return String(modelo || "").replace(/\{nome\}/g, empresa.nomeCurto || empresa.nome || "");
  }

  /* Texto que vai para o WhatsApp (os asteriscos viram negrito lá) */
  function montarMensagem(v, empresa, modeloSaudacao) {
    const veiculo = [v.marca, v.modelo, v.ano].filter(Boolean).join(" ");
    const linhas = [
      preencherModelo(modeloSaudacao || "Olá, {nome}! Vim pelo site e gostaria de um orçamento.", empresa),
      "",
      `*Nome:* ${v.nome}`,
      `*Telefone:* ${v.telefone}`,
    ];
    if (v.email) linhas.push(`*E-mail:* ${v.email}`);
    linhas.push(`*Veículo:* ${veiculo}`, `*Serviço:* ${v.servicoNome}`);
    if (v.periodo) linhas.push(`*Melhor período para contato:* ${v.periodo}`);
    linhas.push("", "*O que o carro precisa:*", v.descricao);
    return linhas.join("\n");
  }

  /* Número de WhatsApp aceito na configuração: 55 + DDD + 8 ou 9 dígitos */
  function whatsappValido(numero) {
    return /^55[1-9]{2}\d{8,9}$/.test(String(numero || ""));
  }

  function linkWhatsapp(numero, texto) {
    return `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`;
  }

  function linkEmail(email, assunto, corpo) {
    return `mailto:${email}?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(corpo.replace(/\*/g, ""))}`;
  }

  /* Impressão digital curta de um texto (para reconhecer o mesmo pedido aberto duas vezes) */
  function assinatura(texto) {
    let h = 5381;
    for (let i = 0; i < texto.length; i += 1) h = ((h << 5) + h + texto.charCodeAt(i)) >>> 0;
    return `${texto.length}:${h.toString(36)}`;
  }

  const api = { LIMITES, linha, paragrafo, analisarTelefone, emailValido, validar, montarMensagem, preencherModelo, whatsappValido, linkWhatsapp, linkEmail, assinatura };
  raiz.APOrcamento = api;
  if (typeof module === "object" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
