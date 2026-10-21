/**
 * components/ui/InfoModal.js
 *
 * Modale d'information à un bouton OK (Tailwind) — reprend les modales legacy
 * « successModal » (« Demande Bien enregistrée ! »,
 * « Demande modifiée avec succès », « Demande supprimée ! »,
 * « Demande cloturée ! », « Votre avis bien été enregistré ! »).
 *
 * Props :
 *   show    : Boolean — affichage
 *   title   : String  — titre (h5.modal-title)
 *   message : String  — corps
 *   variant : "material" (défaut) | "design" — voir ConfirmModal
 *
 * Événements :
 *   ok — clic OK (la page décide de la suite : rechargement, redirection)
 */

import { defineComponent } from "vue";
import { BTN, MODAL } from "./classes.js";

export default defineComponent({
  name: "InfoModal",

  props: {
    show:    { type: Boolean, default: false },
    title:   { type: String,  default: "Validation" },
    message: { type: String,  default: "" },
    variant: { type: String,  default: "material" },
  },

  emits: ["ok"],

  setup() {
    return { BTN, MODAL };
  },

  template: /* html */ `
    <template v-if="show">
      <div :class="MODAL.wrap" tabindex="-1" role="dialog" aria-modal="true"
           :aria-labelledby="'successModalLabel-' + $.uid">
          <div :class="MODAL.dialog">
              <div :class="MODAL.content[variant]">
                  <div :class="MODAL.header">
                      <h5 :class="MODAL.title" :id="'successModalLabel-' + $.uid">{{ title }}</h5>
                  </div>
                  <div :class="MODAL.body">
                      {{ message }}
                  </div>
                  <div :class="MODAL.footer">
                      <button type="button" :class="BTN.primary + ' ' + MODAL.footBtn" @click="$emit('ok')">OK</button>
                  </div>
              </div>
          </div>
      </div>
      <div :class="MODAL.backdrop"></div>
    </template>
  `,
});
