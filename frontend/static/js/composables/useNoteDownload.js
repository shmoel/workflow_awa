/**
 * composables/useNoteDownload.js
 *
 * Téléchargement de la note d'analyse avec message d'erreur affiché dans la
 * page (au lieu d'une fenêtre alert() du navigateur).
 *
 * Usage :
 *   const { noteError, openNote } = useNoteDownload();
 *   // template : <a @click.prevent="openNote(nom)">…</a>
 *   //            <small v-if="noteError" class="text-danger">{{ noteError }}</small>
 */

import { ref } from "vue";
import { downloadNote } from "../services/api.js";

export function useNoteDownload() {
  /** Message de la dernière erreur de téléchargement ("" si aucune) */
  const noteError = ref("");

  /** @param {string} filename */
  async function openNote(filename) {
    noteError.value = "";
    try {
      await downloadNote(filename);
    } catch (e) {
      noteError.value = e.message;
    }
  }

  return { noteError, openNote };
}
