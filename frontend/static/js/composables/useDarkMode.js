/**
 * composables/useDarkMode.js
 *
 * Bascule entre le thème clair et sombre.
 * Stocke le choix dans localStorage (clé "awa_dark_mode").
 * Applique la classe "dark" sur <html> (requis par Tailwind darkMode: 'class').
 *
 * Usage :
 *   const { isDark, toggleDark } = useDarkMode();
 */

import { ref } from "vue";

const isDark = ref(false);
let initialized = false;

function apply(dark) {
  if (dark) {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
}

function init() {
  if (initialized) return;
  initialized = true;
  try {
    const stored = localStorage.getItem("awa_dark_mode");
    const dark = stored === "1"
      || (stored === null && window.matchMedia?.("(prefers-color-scheme: dark)").matches);
    isDark.value = dark;
    apply(dark);
  } catch {
    isDark.value = false;
  }
}

export function useDarkMode() {
  init();

  function toggleDark() {
    isDark.value = !isDark.value;
    apply(isDark.value);
    try {
      localStorage.setItem("awa_dark_mode", isDark.value ? "1" : "0");
    } catch { /* stockage indisponible */ }
  }

  return { isDark, toggleDark };
}
