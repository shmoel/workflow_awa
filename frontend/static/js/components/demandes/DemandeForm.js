/**
 * components/demandes/DemandeForm.js
 *
 * Formulaire de saisie d'une demande, partagé par :
 *   - introduire_demandes.html (création)
 *   - modifier_demande.html    (modification)
 *
 * Remplace le <form id="intro_demande"> dupliqué dans les deux fichiers legacy
 * (banque, type, client, montant, note d'analyse, commentaire), avec le même
 * balisage Bootstrap (form-group, form-control, input-group « XOF »).
 *
 * Props :
 *   banques      : Array   — lignes de GET /banques/ { id, sigle, nom }
 *   types        : Array   — lignes de GET /types_demandes/{entite}/ { demande_id, nom_demande }
 *   initial      : Object  — valeurs initiales { banque, type, client, montant, comm }
 *                            (modification : valeurs de la demande ; création : vide)
 *   noteRequired : Boolean — création : note obligatoire, PDF uniquement (legacy) ;
 *                            modification : note facultative, sans contrôle de type
 *   existingNote : String  — note_analyse déjà enregistrée (lien « Consulter la note… »)
 *   submitLabel  : String  — libellé du bouton (« Soumettre » / « Modifier »)
 *   submitting   : Boolean — désactive le bouton pendant l'envoi
 *
 * Événements :
 *   submit — émis après validation, avec
 *            { banque, type, client, montant, comm, file }  (file = File | null)
 *
 * Le composant ne fait aucun appel réseau : la page gère la confirmation,
 * l'envoi et les messages.
 */

import {
  defineComponent,
  ref,
  computed,
  watch,
} from "vue";

import { downloadUrl } from "../../services/api.js";
import { BTN, FORM, TEXTAREA, LINK } from "../ui/classes.js";

const EMPTY = { banque: "", type: "", client: "", montant: "", comm: "" };

/**
 * Nom de fichier d'une note d'analyse. Le backend stocke le nom seul à la
 * création, mais un chemin complet ("\" ou "/") après une modification.
 * @param {string|null} raw
 * @returns {string|null}
 */
export function noteFilename(raw) {
  if (!raw) return null;
  return String(raw).split(/[\\/]/).pop() || null;
}

/**
 * Vrai si le fichier est un PDF (type MIME ou extension), comme le legacy.
 * @param {File} file
 * @returns {boolean}
 */
function isPdf(file) {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

export default defineComponent({
  name: "DemandeForm",

  props: {
    banques:      { type: Array,   default: () => [] },
    types:        { type: Array,   default: () => [] },
    initial:      { type: Object,  default: () => ({}) },
    noteRequired: { type: Boolean, default: true },
    existingNote: { type: String,  default: null },
    submitLabel:  { type: String,  default: "Soumettre" },
    submitting:   { type: Boolean, default: false },
  },

  emits: ["submit"],

  setup(props, { emit }) {
    const form      = ref({ ...EMPTY });
    const file      = ref(null);
    const fileInput = ref(null);
    const fileError = ref("");

    // Valeurs initiales (demande chargée en modification)
    watch(
      () => props.initial,
      (v) => { form.value = { ...EMPTY, ...v }; },
      { immediate: true, deep: true }
    );

    // Première option sélectionnée par défaut quand les listes arrivent
    // (legacy : selectedIndex = 0), sauf si une valeur est déjà choisie
    watch(
      () => props.banques,
      (list) => {
        if (!form.value.banque && list.length) form.value.banque = String(list[0].id);
      },
      { immediate: true }
    );
    watch(
      () => props.types,
      (list) => {
        if (!form.value.type && list.length) form.value.type = String(list[0].demande_id);
      },
      { immediate: true }
    );

    const existingNoteHref = computed(() => {
      const name = noteFilename(props.existingNote);
      return name ? downloadUrl(encodeURIComponent(name)) : null;
    });

    function onFileChange(event) {
      fileError.value = "";
      file.value = event.target.files[0] ?? null;
    }

    function onSubmit() {
      fileError.value = "";
      if (props.noteRequired) {
        if (!file.value) {
          fileError.value = "Veuillez sélectionner un fichier pour la note d'analyse.";
          return;
        }
        if (!isPdf(file.value)) {
          fileError.value = "Veuillez sélectionner un fichier PDF uniquement.";
          file.value = null;
          if (fileInput.value) fileInput.value.value = "";
          return;
        }
      }
      emit("submit", { ...form.value, file: file.value });
    }

    return { form, fileInput, fileError, existingNoteHref, onFileChange, onSubmit, BTN, FORM, TEXTAREA, LINK };
  },

  template: /* html */ `
    <form @submit.prevent="onSubmit">
        <div :class="FORM.group">
            <label :class="FORM.labelS" for="df-banque">Banque </label>
            <select :class="FORM.select" id="df-banque" v-model="form.banque" required>
                <option v-for="b in banques" :key="b.id" :value="String(b.id)">{{ b.sigle }} - {{ b.nom }}</option>
            </select>
        </div>
        <div :class="FORM.group">
            <label :class="FORM.labelS" for="df-type">Type</label>
            <select :class="FORM.select" id="df-type" v-model="form.type" required>
                <option v-for="t in types" :key="t.demande_id" :value="String(t.demande_id)">{{ t.nom_demande }}</option>
            </select>
        </div>
        <div :class="FORM.group">
            <label :class="FORM.label" for="df-client">Client</label>
            <input :class="FORM.input" type='text' id='df-client' v-model="form.client" placeholder='Le nom du client svp' required>
        </div>
        <div :class="FORM.group">
            <label :class="FORM.label" for="df-montant">Montant :</label>
                <div :class="FORM.inputGroup">
                    <div class="flex"></div>
                    <span :class="FORM.addon">XOF</span>
                        <input :class="FORM.groupInput" type='number' step="any" id='df-montant' v-model="form.montant" placeholder='Spécifiez le montant svp' required>
                </div>
        </div>
        <p v-if="existingNoteHref" class="mb-4">
            <a :href="existingNoteHref" target="_blank" rel="noopener" :class="LINK">Consulter la note préalablement enregistrée</a>
        </p>
        <div :class="FORM.group">
            <label :class="FORM.labelS + ' w-full'" for="df-note">Note d'analyse</label>
            <input :class="FORM.file" type='file' id='df-note' ref="fileInput" @change="onFileChange"
                   :required="noteRequired" :accept="noteRequired ? 'application/pdf' : null">
            <small v-if="noteRequired" :class="FORM.help + ' text-muted'">Joindre le fichier (PDF uniquement).</small>
            <small v-if="fileError" :class="FORM.help + ' text-danger'" role="alert">{{ fileError }}</small>
        </div>
        <div :class="FORM.group">
            <label :class="FORM.label" for="df-comm">Commentaire</label>

            <textarea :class="TEXTAREA" id='df-comm' v-model="form.comm"></textarea>

        </div>
        <div class="text-center"> <button type="submit" :class="BTN.primary" :disabled="submitting">{{ submitting ? 'Envoi…' : submitLabel }}</button></div>
    </form>
  `,
});
