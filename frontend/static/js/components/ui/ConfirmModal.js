/**
 * components/ui/ConfirmModal.js
 *
 * Modale de confirmation (Tailwind) — reprend les modales legacy
 * (#confirmationModal : centrée, 560 px, boutons gris « Annuler » et orange
 * « Confirmer »). Affichée par Vue au lieu de Bootstrap JS.
 *
 * Utilisée par :
 *   - introduire_demandes / modifier_demande : « Voulez-vous vraiment… ? »
 *   - consulter_demandes : « Pourquoi voulez-vous supprimer votre demande ? »
 *                          + commentaire
 *   - ggrg_demandes_validation : « Voulez-vous vraiment cloturer… ? » + commentaire
 *   - valider_demande : confirmation, et modale DG (OUI / NON + bouton ×)
 *
 * Props :
 *   show               : Boolean — affichage (v-model:show)
 *   title              : String  — titre (h5.modal-title)
 *   message            : String  — corps (si pas de slot)
 *   confirmLabel       : String  — défaut « Confirmer »
 *   cancelLabel        : String  — défaut « Annuler »
 *   withComment        : Boolean — textarea « Commentaire »
 *   commentPlaceholder : String  — placeholder du textarea
 *   closable           : Boolean — bouton × en haut à droite (modale DG legacy)
 *   variant            : "material" (défaut) | "design" — ombre et coins
 *                        arrondis des pages legacy qui chargeaient design.css
 *
 * Événements :
 *   update:show — false à la fermeture
 *   confirm     — { comment }
 *   cancel      — bouton d'annulation
 *   close       — bouton × (closable)
 */

import {
  defineComponent,
  ref,
  watch,
} from "vue";
import { BTN, MODAL, TEXTAREA } from "./classes.js";

export default defineComponent({
  name: "ConfirmModal",

  props: {
    show:               { type: Boolean, default: false },
    title:              { type: String,  default: "Confirmation" },
    message:            { type: String,  default: "" },
    confirmLabel:       { type: String,  default: "Confirmer" },
    cancelLabel:        { type: String,  default: "Annuler" },
    withComment:        { type: Boolean, default: false },
    commentPlaceholder: { type: String,  default: "" },
    closable:           { type: Boolean, default: false },
    variant:            { type: String,  default: "material" },
  },

  emits: ["update:show", "confirm", "cancel", "close"],

  setup(props, { emit }) {
    const comment = ref("");

    // Réinitialise le commentaire à chaque ouverture
    watch(() => props.show, (val) => { if (val) comment.value = ""; });

    function cancel() {
      emit("update:show", false);
      emit("cancel");
    }

    function close() {
      emit("update:show", false);
      emit("close");
    }

    function confirm() {
      emit("confirm", { comment: comment.value });
      emit("update:show", false);
    }

    return { comment, cancel, close, confirm, BTN, MODAL, TEXTAREA };
  },

  template: /* html */ `
    <template v-if="show">
      <div :class="MODAL.wrap" tabindex="-1" role="dialog" aria-modal="true"
           :aria-labelledby="'confirmationModalLabel-' + $.uid">
          <div :class="MODAL.dialog">
              <div :class="MODAL.content[variant]">
                  <button v-if="closable"
                          style="position:absolute; z-index:1; top:10px; right:10px; background:none; border:none; font-size:20px; cursor:pointer; color:#333"
                          @click="close" aria-label="Fermer">×</button>
                  <div :class="MODAL.header">
                      <h5 :class="MODAL.title" :id="'confirmationModalLabel-' + $.uid">{{ title }}</h5>
                  </div>
                  <div :class="MODAL.body">
                      <slot>{{ message }}</slot>
                      <template v-if="withComment">
                          <label class="inline-block mb-2" :for="'comm-' + $.uid"><strong class="font-black">Commentaire</strong></label>
                          <textarea :class="TEXTAREA" :id="'comm-' + $.uid" v-model="comment"
                                    :placeholder="commentPlaceholder || null"></textarea>
                      </template>
                  </div>
                  <div :class="MODAL.footer">
                      <button type="button" :class="BTN.secondary + ' ' + MODAL.footBtn" @click="cancel">{{ cancelLabel }}</button>
                      <button type="button" :class="BTN.primary + ' ' + MODAL.footBtn" @click="confirm">{{ confirmLabel }}</button>
                  </div>
              </div>
          </div>
      </div>
      <div :class="MODAL.backdrop"></div>
    </template>
  `,
});
