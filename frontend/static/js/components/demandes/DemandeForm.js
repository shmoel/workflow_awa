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
 *   userBanque   : String  — sigle de la banque de l'utilisateur : le champ
 *                            « Banque » est fixé sur elle, non modifiable
 *                            (conventions API v2 §3, CORRECTION-17)
 *   types        : Array   — lignes de GET /types_demandes/{entite}/ { demande_id, nom_demande }
 *   initial      : Object  — valeurs initiales { banque, type, client, montant, comm }
 *                            (modification : valeurs de la demande ; création : vide)
 *   noteRequired : Boolean — création : note obligatoire ; modification : facultative.
 *                            Fichier joint contrôlé dans les deux cas : PDF, JPG ou PNG,
 *                            5 Mo au maximum (conventions API v2 §8, comme le backend)
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

import { checkAttachment } from "../../services/api.js";
import { useNoteDownload } from "../../composables/useNoteDownload.js";
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

export default defineComponent({
  name: "DemandeForm",

  props: {
    banques:      { type: Array,   default: () => [] },
    userBanque:   { type: String,  default: "" },
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
    const banqueError = ref("");

    // Valeurs initiales (demande chargée en modification)
    watch(
      () => props.initial,
      (v) => { form.value = { ...EMPTY, ...v }; },
      { immediate: true, deep: true }
    );

    // Banque fixée sur celle de l'utilisateur, en création comme en
    // modification (legacy : première option, AWA, présélectionnée et
    // modifiable → demandes envoyées à une autre banque que la sienne)
    watch(
      () => [props.banques, props.userBanque, props.initial],
      () => {
        if (!props.userBanque || !props.banques.length) return;
        const b = props.banques.find((x) => x.sigle === props.userBanque);
        form.value.banque = b ? String(b.id) : "";
        banqueError.value = b ? "" : "Votre banque est introuvable dans la liste des banques.";
      },
      { immediate: true }
    );
    // Première option du type sélectionnée par défaut (legacy : selectedIndex = 0)
    watch(
      () => props.types,
      (list) => {
        if (!form.value.type && list.length) form.value.type = String(list[0].demande_id);
      },
      { immediate: true }
    );

    // Nom du fichier de la note déjà enregistrée (lien « Consulter la note… »)
    const existingNoteName = computed(() => noteFilename(props.existingNote));
    const { noteError, openNote } = useNoteDownload();

    function onFileChange(event) {
      fileError.value = "";
      file.value = event.target.files[0] ?? null;
    }

    function onSubmit() {
      fileError.value = "";
      if (!form.value.banque) {
        banqueError.value = banqueError.value || "Banque non définie.";
        return;
      }
      if (props.noteRequired && !file.value) {
        fileError.value = "Veuillez sélectionner un fichier pour la note d'analyse.";
        return;
      }
      const error = file.value ? checkAttachment(file.value) : "";
      if (error) {
        fileError.value = error;
        file.value = null;
        if (fileInput.value) fileInput.value.value = "";
        return;
      }
      emit("submit", { ...form.value, file: file.value });
    }

    return { form, fileInput, fileError, banqueError, existingNoteName, noteError, openNote, onFileChange, onSubmit, BTN, FORM, TEXTAREA, LINK };
  },

  template: /* html */ `
    <form @submit.prevent="onSubmit">
        <div :class="FORM.group">
            <label :class="FORM.labelS" for="df-banque">Banque </label>
            <select :class="FORM.select + ' disabled:opacity-100 disabled:cursor-default'" id="df-banque" v-model="form.banque" disabled>
                <option v-for="b in banques" :key="b.id" :value="String(b.id)">{{ b.sigle }} - {{ b.nom }}</option>
            </select>
            <small v-if="banqueError" :class="FORM.help + ' text-danger'" role="alert">{{ banqueError }}</small>
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
        <p v-if="existingNoteName" class="mb-4">
            <button type="button" :class="LINK" @click="openNote(existingNoteName)">Consulter la note préalablement enregistrée</button>
            <small v-if="noteError" :class="FORM.help + ' text-danger'" role="alert">{{ noteError }}</small>
        </p>
        <div :class="FORM.group">
            <label :class="FORM.labelS + ' w-full'" for="df-note">Note d'analyse</label>
            <input :class="FORM.file" type='file' id='df-note' ref="fileInput" @change="onFileChange"
                   :required="noteRequired" accept=".pdf,.jpg,.jpeg,.png">
            <small v-if="noteRequired" :class="FORM.help + ' text-muted'">Joindre le fichier (PDF, JPG ou PNG, 5 Mo maximum).</small>
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
