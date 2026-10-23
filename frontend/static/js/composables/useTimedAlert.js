/**
 * composables/useTimedAlert.js
 *
 * Message d'alerte affiché dans la page, qui disparaît après 5 s
 * (comportement du showAlert() legacy).
 *
 * Usage :
 *   const { alert, showAlert, clearAlert } = useTimedAlert();
 *   showAlert("danger", "Message");
 *   // template : <div v-if="alert">{{ alert.text }}</div>  (alert.type : "success" | "danger")
 *
 * Pour un message permanent, affecter directement alert.value.
 */

import { ref, onUnmounted } from "vue";

const DURATION_MS = 5000;

export function useTimedAlert() {
  /** @type {import("vue").Ref<{ type: "success" | "danger", text: string } | null>} */
  const alert = ref(null);
  let timer = null;

  function clearAlert() {
    clearTimeout(timer);
    alert.value = null;
  }

  /**
   * @param {"success" | "danger"} type
   * @param {string} text
   */
  function showAlert(type, text) {
    clearTimeout(timer);
    alert.value = { type, text };
    timer = setTimeout(() => { alert.value = null; }, DURATION_MS);
  }

  onUnmounted(() => clearTimeout(timer));

  return { alert, showAlert, clearAlert };
}
