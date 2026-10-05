/**
 * components/ui/InfoModal.js
 *
 * Modale d'information à un seul bouton (OK) — composant Vue 3.
 *
 * Remplace les modales Bootstrap « successModal » du legacy :
 *   - introduire_demandes.html : "Demande Bien enregistrée !"
 *   - modifier_demande.html    : "Demande modifiée avec succès"
 *
 * Props :
 *   show    : Boolean — contrôle l'affichage
 *   title   : String  — titre de la modale
 *   message : String  — texte du corps
 *
 * Événements :
 *   ok — émis au clic OK (la page décide de la suite : rechargement, redirection)
 */

import { defineComponent } from "https://unpkg.com/vue@3/dist/vue.esm-browser.js";

export default defineComponent({
  name: "InfoModal",

  props: {
    show:    { type: Boolean, default: false },
    title:   { type: String,  default: "Information" },
    message: { type: String,  default: "" },
  },

  emits: ["ok"],

  template: /* html */ `
    <Transition name="modal-fade">
      <div
        v-if="show"
        class="fixed inset-0 z-50 flex items-center justify-center"
        style="background: rgba(0,0,0,0.4);"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="'info-title-' + $.uid"
      >
        <div
          class="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 border-2 overflow-hidden"
          style="border-color: var(--color-brand-border); font-family: var(--font-family-base);"
        >
          <div class="px-6 py-4 border-b" style="border-color: var(--color-brand-border);">
            <h5 :id="'info-title-' + $.uid" class="text-base font-bold m-0">{{ title }}</h5>
          </div>
          <div class="px-6 py-4">
            <p class="text-sm m-0" style="color: var(--color-text-secondary);">{{ message }}</p>
          </div>
          <div class="px-6 py-4 flex justify-end border-t" style="border-color: var(--color-brand-border);">
            <button
              type="button"
              @click="$emit('ok')"
              class="px-6 py-2 rounded-full text-sm font-semibold text-white"
              style="background: var(--color-brand);"
              autofocus
            >OK</button>
          </div>
        </div>
      </div>
    </Transition>
  `,
});
