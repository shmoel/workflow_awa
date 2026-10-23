/**
 * composables/useModalA11y.js
 *
 * Comportement clavier des modales (ConfirmModal, InfoModal), comme une
 * fenêtre de dialogue accessible :
 *   - à l'ouverture, le focus va sur la modale (conteneur tabindex="-1" :
 *     aucun changement visuel) ;
 *   - Échap appelle onEscape (choisi par la modale : jamais une action
 *     enregistrée par erreur) ;
 *   - Tab / Maj+Tab restent dans la modale ;
 *   - à la fermeture, le focus revient sur l'élément qui l'avait (bouton
 *     d'origine), s'il est encore dans la page.
 *
 * Usage :
 *   const root = ref(null);
 *   const { onKeydown } = useModalA11y(() => props.show, root, cancel);
 *   // template : <div ref="root" tabindex="-1" @keydown="onKeydown"> … </div>
 */

import { watch, nextTick } from "vue";

const FOCUSABLE =
  'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), ' +
  'textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * @param {() => boolean} isOpen   - getter de l'affichage de la modale
 * @param {import("vue").Ref<HTMLElement|null>} root - conteneur de la modale
 * @param {() => void} onEscape    - action de la touche Échap
 */
export function useModalA11y(isOpen, root, onEscape) {
  let previous = null;

  watch(isOpen, async (open) => {
    if (open) {
      previous = document.activeElement;
      await nextTick();
      root.value?.focus();
    } else if (previous) {
      if (document.contains(previous)) previous.focus?.();
      previous = null;
    }
  }, { immediate: true });

  /** @param {KeyboardEvent} event */
  function onKeydown(event) {
    if (event.key === "Escape") {
      event.preventDefault();
      onEscape();
      return;
    }
    if (event.key !== "Tab" || !root.value) return;

    const items = [...root.value.querySelectorAll(FOCUSABLE)];
    if (!items.length) {
      event.preventDefault();
      return;
    }
    const first = items[0];
    const last  = items[items.length - 1];
    const active = document.activeElement;
    if (event.shiftKey && (active === first || active === root.value)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return { onKeydown };
}
