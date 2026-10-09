/**
 * components/demandes/DemandeFilters.js
 *
 * Barre de filtres réutilisable pour tous les tableaux de demandes.
 *
 * Conçu pour servir sur :
 *   - consulter_demandes.html  (Entité / Type / Contrepartie / Montant / Date)
 *   - demandes_validation.html (Banque / Entité / Type / Contrepartie / Date)
 *   - ggrg_demandes_validation.html (mêmes filtres)
 *   - acceuil.html             (Banque / Entité / Type / Contrepartie / Date)
 *
 * Principe :
 *   La page parente déclare la liste des champs de filtre souhaités via la
 *   prop `fields`. Le composant émet un événement `update:modelValue` à chaque
 *   frappe (v-model compatible) avec l'objet `{ [fieldKey]: valeur, ... }`.
 *   La page filtre ses données localement — ce composant ne fait aucun appel API.
 *
 * Props :
 *   fields      : Array<{ key: string, placeholder: string }> — champs à afficher
 *   modelValue  : Object — valeurs courantes des filtres (liaison v-model)
 *
 * Événements :
 *   update:modelValue  — émis à chaque changement, avec le nouvel objet de filtres
 *
 * Exemple d'utilisation :
 *
 *   // Dans la page parente :
 *   const filters = ref({ entite: '', type: '', contrepartie: '', montant: '', date: '' });
 *   const FIELDS = [
 *     { key: 'entite',       placeholder: 'Filtrer par Entité' },
 *     { key: 'type',         placeholder: 'Filtrer par Type' },
 *     { key: 'contrepartie', placeholder: 'Filtrer par Contrepartie' },
 *     { key: 'montant',      placeholder: 'Filtrer par Montant' },
 *     { key: 'date',         placeholder: 'Filtrer par Date' },
 *   ];
 *
 *   // Dans le template :
 *   <DemandeFilters :fields="FIELDS" v-model="filters" />
 */

import { defineComponent } from "https://unpkg.com/vue@3/dist/vue.esm-browser.js";

export default defineComponent({
  name: "DemandeFilters",

  props: {
    /**
     * Liste ordonnée des champs de filtre à afficher.
     * @type {Array<{ key: string, placeholder: string }>}
     */
    fields: {
      type: Array,
      required: true,
      validator: (v) => v.every((f) => f.key && f.placeholder),
    },

    /**
     * Objet de valeurs courantes, indexé par field.key.
     * Utilisé en v-model depuis la page parente.
     * @type {Object.<string, string>}
     */
    modelValue: {
      type: Object,
      required: true,
    },
  },

  emits: ["update:modelValue"],

  setup(props, { emit }) {
    /**
     * Appelé à chaque frappe sur un champ de filtre.
     * Émet une copie de l'objet avec la nouvelle valeur pour le champ modifié.
     * Immutable : ne mute jamais props.modelValue directement.
     *
     * @param {string} key   - clé du champ modifié
     * @param {string} value - nouvelle valeur saisie
     */
    function onInput(key, value) {
      emit("update:modelValue", { ...props.modelValue, [key]: value });
    }

    return { onInput };
  },

  template: /* html */ `
    <div
      class="flex flex-wrap gap-2"
      role="search"
      aria-label="Filtres du tableau"
    >
      <div
        v-for="field in fields"
        :key="field.key"
        class="relative"
      >
        <!-- Icône loupe -->
        <span
          class="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
          style="color: var(--color-text-muted);"
          aria-hidden="true"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none"
               viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
        </span>

        <input
          type="text"
          :value="modelValue[field.key] ?? ''"
          @input="onInput(field.key, $event.target.value)"
          :placeholder="field.placeholder"
          :aria-label="field.placeholder"
          class="pl-7 pr-3 py-1.5 text-sm rounded-lg border bg-white
                 focus:outline-none focus:ring-2 focus:ring-orange-300
                 transition-shadow"
          style="
            border-color: var(--color-brand-border);
            color: var(--color-text-primary);
            font-family: var(--font-family-base);
            min-width: 140px;
          "
        />
      </div>
    </div>
  `,
});
