/**
 * components/demandes/DemandeForm.js
 *
 * Formulaire de saisie d'une demande, partagé par :
 *   - introduire_demandes.html (création)
 *   - modifier_demande.html    (modification)
 *
 * Remplace le <form id="intro_demande"> dupliqué dans les deux fichiers legacy
 * (banque, type, client, montant, note d'analyse, commentaire).
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
} from "https://unpkg.com/vue@3/dist/vue.esm-browser.js";

import { downloadUrl } from "../../services/api.js";

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

    return { form, fileInput, fileError, existingNoteHref, onFileChange, onSubmit };
  },

  template: /* html */ `
    <form class="space-y-4" @submit.prevent="onSubmit">

      <div>
        <label for="df-banque" class="block text-sm font-bold mb-1">Banque</label>
        <select id="df-banque" v-model="form.banque" required
                class="w-full rounded-lg border px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-300"
                style="border-color: var(--color-brand-border);">
          <option v-for="b in banques" :key="b.id" :value="String(b.id)">{{ b.sigle }} - {{ b.nom }}</option>
        </select>
      </div>

      <div>
        <label for="df-type" class="block text-sm font-bold mb-1">Type</label>
        <select id="df-type" v-model="form.type" required
                class="w-full rounded-lg border px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-300"
                style="border-color: var(--color-brand-border);">
          <option v-for="t in types" :key="t.demande_id" :value="String(t.demande_id)">{{ t.nom_demande }}</option>
        </select>
      </div>

      <div>
        <label for="df-client" class="block text-sm font-bold mb-1">Client</label>
        <input id="df-client" v-model="form.client" type="text" required
               placeholder="Le nom du client svp"
               class="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
               style="border-color: var(--color-brand-border);" />
      </div>

      <div>
        <label for="df-montant" class="block text-sm font-bold mb-1">Montant</label>
        <div class="flex">
          <span class="inline-flex items-center px-3 rounded-l-lg border border-r-0 text-sm"
                style="border-color: var(--color-brand-border); background: var(--color-bg-page);">XOF</span>
          <input id="df-montant" v-model="form.montant" type="number" step="any" required
                 placeholder="Spécifiez le montant svp"
                 class="w-full rounded-r-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                 style="border-color: var(--color-brand-border);" />
        </div>
      </div>

      <div>
        <label for="df-note" class="block text-sm font-bold mb-1">Note d'analyse</label>
        <p v-if="existingNoteHref" class="text-sm mb-2">
          <a :href="existingNoteHref" target="_blank" rel="noopener" style="color: var(--color-brand);">
            Consulter la note préalablement enregistrée
          </a>
        </p>
        <input id="df-note" ref="fileInput" type="file" @change="onFileChange"
               :required="noteRequired"
               :accept="noteRequired ? 'application/pdf' : null"
               class="w-full text-sm" />
        <p v-if="noteRequired" class="text-xs mt-1" style="color: var(--color-text-secondary);">
          Joindre le fichier (PDF uniquement).
        </p>
        <p v-if="fileError" class="text-sm mt-1" style="color: var(--color-status-rejected);" role="alert">
          {{ fileError }}
        </p>
      </div>

      <div>
        <label for="df-comm" class="block text-sm font-bold mb-1">Commentaire</label>
        <textarea id="df-comm" v-model="form.comm" rows="3"
                  class="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                  style="border-color: var(--color-brand-border);"></textarea>
      </div>

      <div class="text-center pt-2">
        <button type="submit" :disabled="submitting"
                class="px-8 py-2 rounded-full text-white text-sm font-bold disabled:opacity-60"
                style="background: var(--color-brand);">
          {{ submitting ? 'Envoi…' : submitLabel }}
        </button>
      </div>
    </form>
  `,
});
