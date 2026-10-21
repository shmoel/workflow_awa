/**
 * components/ui/ConfirmModal.js
 *
 * Modale de confirmation — balisage Bootstrap identique aux modales legacy
 * (#confirmationModal : modal-dialog-centered, modal-content modal-shadow,
 * boutons « btn btn-secondary » / « btn btn-primary »). Affichée par Vue au
 * lieu de Bootstrap JS.
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

    return { comment, cancel, close, confirm };
  },

  template: /* html */ `
    <template v-if="show">
      <div class="modal fade show" tabindex="-1" role="dialog" aria-modal="true"
           :aria-labelledby="'confirmationModalLabel-' + $.uid">
          <div class="modal-dialog modal-dialog-centered">
              <div class="modal-content modal-shadow">
                  <button v-if="closable"
                          style="position:absolute; top:10px; right:10px; background:none; border:none; font-size:20px; cursor:pointer; color:#333"
                          @click="close" aria-label="Fermer">×</button>
                  <div class="modal-header">
                      <h5 class="modal-title" :id="'confirmationModalLabel-' + $.uid">{{ title }}</h5>
                  </div>
                  <div class="modal-body">
                      <slot>{{ message }}</slot>
                      <template v-if="withComment">
                          <label :for="'comm-' + $.uid"><strong>Commentaire</strong></label>
                          <textarea class='form-control' :id="'comm-' + $.uid" v-model="comment"
                                    :placeholder="commentPlaceholder || null"></textarea>
                      </template>
                  </div>
                  <div class="clearfix"></div>
                  <div class="modal-footer">
                      <button type="button" class="btn btn-secondary" @click="cancel">{{ cancelLabel }}</button>
                      <button type="button" class="btn btn-primary" @click="confirm">{{ confirmLabel }}</button>
                  </div>
              </div>
          </div>
      </div>
      <div class="modal-backdrop fade show"></div>
    </template>
  `,
});
