/**
 * composables/useKeyboardShortcuts.js
 *
 * Raccourcis clavier globaux :
 *   /   → met le focus sur l'input de recherche globale
 *   Esc → vide la recherche globale (si elle est active)
 *
 * Usage dans les pages avec recherche globale :
 *   useKeyboardShortcuts(searchInputRef);
 *
 * @param {import("vue").Ref<HTMLInputElement|null>} searchRef
 */

import { onMounted, onUnmounted } from "vue";

export function useKeyboardShortcuts(searchRef) {
  function onKeydown(e) {
    const tag = document.activeElement?.tagName ?? "";
    const editable = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT"
      || document.activeElement?.isContentEditable;

    if (e.key === "/" && !editable && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      searchRef?.value?.focus();
      return;
    }

    if (e.key === "Escape" && searchRef?.value === document.activeElement) {
      searchRef.value.blur();
    }
  }

  onMounted(() => document.addEventListener("keydown", onKeydown));
  onUnmounted(() => document.removeEventListener("keydown", onKeydown));
}
