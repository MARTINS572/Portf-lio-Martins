# Martins | Criação de Sites — portfólio

Portfólio com 11 demonstrações completas (6 sites e 5 sistemas), em HTML, CSS e
JavaScript puro, sem etapa de build. Publica no Netlify arrastando a pasta ou pelo GitHub.

## O que estava quebrado e por quê

- **As demos não abriam por causa da estrutura de pastas, não do código.** No repositório
  `MARTINS572/Portf-lio-Martins`, os 77 arquivos das demos foram enviados soltos na raiz,
  sem as pastas `projetos/…` e `assets/…`. Todo link do tipo `projetos/autoprime/index.html`
  dava erro 404, e o `index.html` da raiz era a loja Solado, não o portfólio.
- A estrutura completa e correta estava dentro do arquivo `Martins _ Criação de Sites (1).zip`,
  guardado no mesmo repositório. Todos os arquivos soltos são cópias idênticas de arquivos desse ZIP.
- Com as pastas restauradas, as 11 demos abrem sem erros e os fluxos principais funcionam
  (veja "Testes").

## Estrutura

```
index.html                 Portfólio (página principal)
404.html                   Página de erro (o Netlify usa automaticamente)
netlify.toml               Publicação e cabeçalhos de segurança
robots.txt, site.webmanifest, favicon.svg
assets/
  css/styles.css           Design system do portfólio (variáveis) e estilos
  fonts/                   Space Grotesk, DM Sans, JetBrains Mono (locais, licença SIL OFL)
  img/                     Imagem social, ícones e previas/ (capturas das demos nos cards)
  js/config.js             ← WhatsApp e projetos do portfólio: edite aqui
  js/main.js               Tema, menu, filtros, cards, formulário e animações
  js/theme-init.js         Aplica o tema antes de a página aparecer
  js/comum.js              Tema, menu e utilidades compartilhados pelas demos
  js/agenda-motor.js       Regras de agenda do AgendaPro
  agenda-estudio/          Agendamento e painel usados pela Black Copper e pela Violet Studio
projetos/
  autoprime/               Site de centro automotivo + política de privacidade
  black-copper/            Barbearia: site, agendamento, painel e privacidade
  violet-studio/           Estúdio de unhas: site, agendamento, painel e privacidade
  tenis/                   Solado — loja de tênis com filtros e carrinho
  moda/                    Avesso — catálogo de moda com sacola
  doces-salgados/          Ponto — cardápio com montagem de encomenda
  agendapro/               Sistema de agendamento
  nexora-crm/              CRM (leads, clientes, pipeline, tarefas, relatórios)
  nexora-stock/            Controle de estoque
  nexora-booking/          Agendamento online: painel (index) e página do cliente (reservar)
  nexora-auto/             Gestão de oficina (OS, orçamentos, peças, financeiro)
tests/                     Testes automatizados (Playwright)
tools/capturar-previas.py  Gera de novo as capturas dos cards
```

## Rodar no computador

Dentro da pasta do projeto:

```bash
python -m http.server 8080
```

Depois abra http://localhost:8080. Use um servidor local em vez de abrir o arquivo com
dois cliques: assim os links, os dados salvos e a conferência das demos funcionam como no ar.

## Publicar no Netlify

**Arrastar e soltar:** descompacte o ZIP, entre em app.netlify.com → *Add new site* →
*Deploy manually* e arraste a pasta inteira.

**Pelo GitHub:** com o repositório já corrigido (abaixo), em *Add new site* → *Import an
existing project*, escolha o repositório. Deixe *Build command* vazio e *Publish directory*
como `.` (o `netlify.toml` já define isso). Cada commit publica uma nova versão.

### Corrigir o repositório no GitHub

O site precisa das pastas. Enviar arquivos soltos pelo navegador apaga a estrutura.

Com Git no computador:

```bash
git clone https://github.com/MARTINS572/Portf-lio-Martins.git
cd Portf-lio-Martins
git rm -r --quiet .            # remove os arquivos soltos (o histórico continua guardado)
# copie para esta pasta todo o conteúdo do ZIP (index.html, assets/, projetos/, ...)
git add .
git commit -m "Restaura a estrutura de pastas do portfólio e das demos"
git push
```

Pelo navegador (github.com): apague os arquivos soltos e, em *Add file* → *Upload files*,
arraste as **pastas** `assets`, `projetos`, `tests` e `tools` junto com os arquivos da raiz.
Arrastar pastas mantém a estrutura; selecionar só os arquivos não mantém.

### Depois do primeiro deploy (com o endereço final)
Troque `SEU-DOMINIO` pelo endereço real:
1. Em `index.html`, use `https://SEU-DOMINIO/assets/img/og-image.png` em `og:image` e `twitter:image`.
2. No `<head>`, adicione `<link rel="canonical" href="https://SEU-DOMINIO/">` e
   `<meta property="og:url" content="https://SEU-DOMINIO/">`.
3. Crie `sitemap.xml` com o endereço e descomente a linha `Sitemap:` do `robots.txt`.

## Editar o portfólio (`assets/js/config.js`)

- **WhatsApp:** `number` (só números, com 55 e DDD) e `display`. Todos os botões e o formulário usam esse número.
- **Projetos:** cada item tem `links` (botões do card), `status`, `preview` (captura), textos e cores.
  - `status: "published"` mostra "Demonstração no ar" e os botões, mas só depois de conferir que a
    página da demo responde. Se ela sumir do site, o card volta sozinho para "Em preparação".
  - `status: "preparing"` esconde os botões de propósito.
  - O primeiro link é a demo principal; endereços inválidos (`javascript:` etc.) são ignorados.
  - `demo: true` mostra a etiqueta "Demonstração". Use `false` só para cliente real, com autorização.
- **Capturas dos cards:** depois de mudar uma demo, rode `python tools/capturar-previas.py`.
  As capturas atuais foram feitas sem as fontes do Google (ambiente sem acesso a elas); rodar o
  script no seu computador gera as imagens com as fontes reais.

## Dados das demonstrações

Todas as demos usam empresas e dados fictícios. Reservas, cadastros, carrinhos e movimentações
ficam salvos **só no navegador de quem testa** (localStorage): não há servidor, login real,
envio de WhatsApp ou e-mail, nem pagamento. Cada demo avisa isso na própria tela, e os sistemas
e painéis têm uma opção para restaurar os dados de exemplo. Para uso real com clientes, um sistema de agendamento
precisa de servidor e banco de dados próprios.

As demos de empresas fictícias não têm número de WhatsApp configurado de propósito: em vez de
abrir uma conversa com um número que pode existir, elas mostram a mensagem pronta para copiar.

## Segurança

O `netlify.toml` envia cabeçalhos de segurança para todo o site. A página do portfólio também
recebe uma Content-Security-Policy rígida (scripts, estilos e fontes só do próprio site).
As demos em `/projetos/` não recebem essa regra porque usam fontes do Google e estilos próprios.
Se adicionar Analytics, PostHog ou outro script externo ao portfólio, inclua o domínio na CSP.

## Testes

```bash
pip install playwright
playwright install chromium
python tests/test_site.py     # portfólio: 123 verificações
python tests/test_demos.py    # demos: 69 verificações
```

Os dois sobem um servidor local com os mesmos cabeçalhos do Netlify.

- **Portfólio:** larguras de 320 a 1920 px, console limpo, fontes locais, 11 cards no ar,
  14 botões de demo abrindo páginas reais, ida e volta entre portfólio e demo, filtros,
  WhatsApp, tema e persistência, contraste AA, menu mobile, formulário, 404 e movimento reduzido.
- **Demos:** as 17 páginas em celular e computador (sem erro, sem recurso quebrado, sem rolagem
  lateral, com aviso de demonstração e link de volta) e os fluxos principais:
  - **Agendamento:** reserva completa na Violet Studio e na Black Copper, com a reserva aparecendo
    no painel e o cancelamento pelo código. Na página do Nexora Booking, a reserva aparece no painel.
  - **Sistemas:** AgendaPro bloqueia o horário já ocupado, CRM cadastra lead com validação,
    Stock bloqueia saída maior que o saldo e Nexora Auto abre ordem de serviço.
  - **Lojas e formulários:** carrinho da Solado e sacola da Avesso com subtotal, validação da
    encomenda da Ponto e revisão do orçamento da AutoPrime.

### Checklist depois de publicar
- [ ] O portfólio abre e cada card mostra "Demonstração no ar".
- [ ] Cada botão "Abrir demonstração" abre a demo e "Voltar ao portfólio" retorna aos projetos.
- [ ] Black Copper e Violet Studio: botão do painel abre o painel.
- [ ] Nexora Booking: "Página do cliente" abre a reserva online.
- [ ] Botões de WhatsApp do portfólio abrem a conversa com +55 19 99312-8050.
- [ ] Tema claro/escuro alterna e continua igual entre portfólio e demos.
- [ ] Um endereço inexistente (ex.: `/teste`) mostra a página 404.
