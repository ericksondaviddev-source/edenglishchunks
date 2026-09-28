/* Inglés con Chunks · selector de tema Sistema / Solar Light / Solar Dark.
   Se carga en <head> para fijar data-theme antes del primer render (sin parpadeo). */
(function () {
  var KEY = "ed-theme";
  var ORDER = ["system", "solar-light", "solar-dark"];
  var LABELS = { system: "\u2600\uFE0E Sistema", "solar-light": "\u2600\uFE0E Solar", "solar-dark": "\u263E Solar" };

  var saved = null;
  try { saved = window.localStorage.getItem(KEY); } catch (err) { saved = null; }
  var current = ORDER.indexOf(saved) >= 0 ? saved : "solar-light";

  function apply(theme) {
    current = theme;
    document.documentElement.setAttribute("data-theme", theme);
    try { window.localStorage.setItem(KEY, theme); } catch (err) { /* modo privado: se ignora */ }
    var button = document.getElementById("themeCycleBtn");
    if (button) {
      button.textContent = LABELS[theme];
      button.setAttribute("aria-label", "Tema actual: " + theme + ". Pulsa para cambiar.");
    }
  }

  apply(current);

  function init() {
    apply(current);
    var button = document.getElementById("themeCycleBtn");
    if (!button) return;
    button.addEventListener("click", function () {
      apply(ORDER[(ORDER.indexOf(current) + 1) % ORDER.length]);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
