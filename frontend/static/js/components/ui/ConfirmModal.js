/**
 * components/ui/ConfirmModal.js
 *
 * Modale de confirmation générique — composant Vue 3.
 *
 * Conçu pour remplacer TOUTES les modales de confirmation du legacy :
 *   - consulter_demandes.html  : "Pourquoi voulez-vous supprimer votre demande ?"
 *                                avec textarea commentaire + bouton Confirmer
 *   - introduire_demandes.html : "Voulez-vous vraiment soumettre le formulaire ?"
 *   - valider_demande.html     : modal DG "avis défavorable, continuer quand même ?"
 *   - Toute future confirmation binaire (OK / Annuler)
 *
 * Props :
 *   show        : Boolean       — contrôle l'affichage (v-model:show)
 *   title       : String        — titre de la modale
 *   message     : String        — texte du corps (si pas de slot)
 *   confirmLabel: String        — libellé bouton de confirmation (défaut "Confirmer")
 *   cancelLabel : String        — libellé bouton d'annulation  (défaut "Annuler")
 *   confirmVariant: String      — "danger" | "primary" (défaut "primary")
 *   withComment : Boolean       — si true, affiche un textarea "Commentaire"
 *                                 (pattern consulter_demandes.html)
 *
 * Événements :
 *   update:show  — émis avec false quand on ferme la modale
 *   confirm      — émis au clic Confirmer, avec { comment } si withComment=true
 *   cancel       — émis au clic Annuler ou clic en dehors
 *
 * Exemple sans commentaire (soumission de formulaire) :
 *
 *   <ConfirmModal
 *     v-model:show="showModal"
 *     title="Confirmation"
 *     message="Voulez-vous vraiment soumettre le formulaire ?"
 *     @confirm="handleConfirm"
 *   />
 *
 * Exemple avec commentaire (suppression de demande) :
 *
 *   <ConfirmModal
 *     v-model:show="showDelete"
 *     title="Pourquoi voulez-vous supprimer votre demande ?"
 *     confirm-label="Confirmer"
 *     confirm-variant="danger"
 *     :with-comment="true"
 *     @confirm="({ comment }) => supprimerDemande(comment)"
 *   />
 */

import {
  defineComponent,
  ref,
  watch,
} from "https://unpkg.com/vue@3/dist/vue.esm-browser.js";

export default defineComponent({
  name: "ConfirmModal",

  props: {
    show: {
      type: Boolean,
      default: false,
    },
    title: {
      type: String,
      default: "Confirmation",
    },
    message: {
      type: String,
      default: "",
    },
    confirmLabel: {
      type: String,
      default: "Confirmer",
    },
    cancelLabel: {
      type: String,
      default: "Annuler",
    },
    /** "danger" = rouge (suppression), "primary" = brand orange (soumission) */
    confirmVariant: {
      type: String,
      default: "primary",
      validator: (v) => ["primary", "danger"].includes(v),
    },
    /** Affiche un textarea pour saisir un commentaire obligatoire */
    withComment: {
      type: Boolean,
      default: false,
    },
  },

  emits: ["update:show", "confirm", "cancel"],

  setup(props, { emit }) {
    const comment = ref("");

    // Réinitialise le commentaire à chaque ouverture
    watch(
      () => props.show,
      (val) => {
        if (val) comment.value = "";
      }
    );

    function close() {
      emit("update:show", false);
      emit("cancel");
    }

    function confirm() {
      emit("confirm", { comment: comment.value });
      emit("update:show", false);
    }

    return { comment, close, confirm };
  },

  computed: {
    confirmBtnStyle() {
      return this.confirmVariant === "danger"
        ? "background: var(--color-status-rejected); color: #fff; border-color: var(--color-status-rejected);"
        : "background: var(--color-brand); color: #fff; border-color: var(--color-brand);";
    },
    confirmBtnHoverStyle() {
      return this.confirmVariant === "danger"
        ? "background: #b91c1c;"
        : "background: var(--color-brand-dark);";
    },
  },

  template: /* html */ `
    <Transition name="modal-fade">
      <div
        v-if="show"
        class="fixed inset-0 z-50 flex items-center justify-center"
        style="background: rgba(0,0,0,0.4);"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="'modal-title-' + $.uid"
        @click.self="close"
      >
        <div
          class="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 border-2 overflow-hidden"
          style="border-color: var(--color-brand-border); font-family: var(--font-family-base);"
        >
          <!-- En-tête -->
          <div
            class="px-6 py-4 border-b"
            style="border-color: var(--color-brand-border);"
          >
            <h5
              :id="'modal-title-' + $.uid"
              class="text-base font-bold m-0"
              style="color: var(--color-text-primary);"
            >
              {{ title }}
            </h5>
          </div>

          <!-- Corps -->
          <div class="px-6 py-4">
            <!-- Slot ou texte simple -->
            <slot>
              <p
                v-if="message"
                class="text-sm m-0"
                style="color: var(--color-text-secondary);"
              >
                {{ message }}
              </p>
            </slot>

            <!-- Textarea commentaire (pattern suppression) -->
            <div v-if="withComment" :class="message ? 'mt-4' : ''">
              <label
                for="modal-comment"
                class="block text-sm font-semibold mb-1"
                style="color: var(--color-text-primary);"
              >
                Commentaire
              </label>
              <textarea
                id="modal-comment"
                v-model="comment"
                rows="3"
                class="w-full rounded-lg border px-3 py-2 text-sm resize-none
                       focus:outline-none focus:ring-2 focus:ring-orange-300"
                style="border-color: var(--color-brand-border);
                       color: var(--color-text-primary);
                       font-family: var(--font-family-base);"
                placeholder="Saisissez un commentaire…"
              ></textarea>
            </div>
          </div>

          <!-- Pied -->
          <div
            class="px-6 py-4 flex justify-end gap-3 border-t"
            style="border-color: var(--color-brand-border);"
          >
            <!-- Annuler -->
            <button
              @click="close"
              class="px-5 py-2 rounded-full text-sm font-semibold border-2 transition-colors"
              style="color: var(--color-text-secondary);
                     border-color: #d1d5db;
                     background: #fff;"
              onmouseover="this.style.background='#f3f4f6';"
              onmouseout="this.style.background='#fff';"
            >
              {{ cancelLabel }}
            </button>

            <!-- Confirmer -->
            <button
              @click="confirm"
              class="px-5 py-2 rounded-full text-sm font-semibold border-2 transition-colors"
              :style="confirmBtnStyle"
              @mouseover="$event.target.style.cssText = confirmBtnStyle + confirmBtnHoverStyle"
              @mouseout="$event.target.style.cssText = confirmBtnStyle"
            >
              {{ confirmLabel }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  `,
});
