/* Aplica o tema antes da pintura da página para evitar "flash" de cor.
   Ordem: escolha salva pelo visitante > tema já definido na página (ex.: visualizador
   que embute o site) > preferência do sistema > escuro. */
(function () {
  var root = document.documentElement;
  var theme = null;
  try {
    var saved = window.localStorage.getItem("martins-tema");
    if (saved === "light" || saved === "dark") theme = saved;
  } catch (e) { /* armazenamento indisponível: segue sem persistência */ }
  if (!theme) {
    var preset = root.getAttribute("data-theme");
    if (preset === "light" || preset === "dark") theme = preset;
  }
  if (!theme) {
    var prefersLight = window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches;
    theme = prefersLight ? "light" : "dark";
  }
  root.setAttribute("data-theme", theme);
  root.classList.add("js");
  var meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", theme === "light" ? "#FAFAF8" : "#0B0B0E");
})();
