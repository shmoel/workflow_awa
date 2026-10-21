/**
 * components/ui/InfoModal.js
 *
 * Modale d'information à un bouton OK — balisage Bootstrap identique aux
 * modales legacy « successModal » (« Demande Bien enregistrée ! »,
 * « Demande modifiée avec succès », « Demande supprimée ! »,
 * « Demande cloturée ! », « Votre avis bien été enregistré ! »).
 *
 * Props :
 *   show    : Boolean — affichage
 *   title   : String  — titre (h5.modal-title)
 *   message : String  — corps
 *
 * Événements :
 *   ok — clic OK (la page décide de la suite : rechargement, redirection)
 */

import { defineComponent } from "vue";

export default defineComponent({
  name: "InfoModal",

  props: {
    show:    { type: Boolean, default: false },
    title:   { type: String,  default: "Validation" },
    message: { type: String,  default: "" },
  },

  emits: ["ok"],

  template: /* html */ `
    <template v-if="show">
      <div class="modal fade show" tabindex="-1" role="dialog" aria-modal="true"
           :aria-labelledby="'successModalLabel-' + $.uid">
          <div class="modal-dialog modal-dialog-centered">
              <div class="modal-content modal-shadow">
                  <div class="modal-header">
                      <h5 class="modal-title" :id="'successModalLabel-' + $.uid">{{ title }}</h5>
                  </div>
                  <div class="modal-body">
                      {{ message }}
                  </div>
                  <div class="modal-footer">
                      <button type="button" class="btn btn-primary" @click="$emit('ok')">OK</button>
                  </div>
              </div>
          </div>
      </div>
      <div class="modal-backdrop fade show"></div>
    </template>
  `,
});
