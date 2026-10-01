/**
 * components/demandes/DemandesTable.js  (v2 — réutilisable)
 *
 * Tableau générique de demandes.
 *
 * Conçu pour servir sur :
 *   - acceuil.html                   (colonnes dashboard + badge chat)
 *   - consulter_demandes.html        (3 onglets distincts)
 *   - demandes_validation.html       (colonnes validateur AWA)
 *   - ggrg_demandes_validation.html  (colonnes validateur GGR Group)
 *
 * Responsabilités du composant :
 *   - Afficher un tableau structuré à partir d'un tableau de lignes déjà chargées
 *   - Gérer les états loading / error / vide
 *   - Rendre les colonnes déclarées via la prop `columns`
 *   - Exposer une slot `actions` par ligne pour les boutons (Détails, CHAT,
 *     Modifier, Supprimer, Evaluer, Clôturer…)
 *   - Exposer un slot `badge` par ligne (badge "Nouveau" dans la colonne banque)
 *
 * Ce composant NE fait PAS :
 *   - d'appels API (délégué à la page parente)
 *   - de filtrage (délégué à DemandeFilters.js + computed de la page)
 *   - de gestion d'onglets (délégué à la page parente)
 *
 * Props :
 *   rows        : Array   — liste des lignes à afficher (déjà filtrées)
 *   columns     : Array<ColumnDef> — déclaration des colonnes
 *   loading     : Boolean — affiche le spinner si true
 *   error       : String|null — message d'erreur à afficher si non null
 *   ariaLabel   : String — label ARIA de la section (accessibilité)
 *
 * ColumnDef :
 *   {
 *     key      : string,   // champ de la ligne à afficher (ex: "banque")
 *     label    : string,   // en-tête de colonne
 *     format?  : Function, // fn(value, row) → string transformée (ex: formatNumber)
 *     slot?    : string,   // si défini, utilise le slot nommé au lieu d'afficher key
 *   }
 *
 * Slots :
 *   actions   — boutons d'action par ligne. Props de slot : { row }
 *   badge     — contenu optionnel après la valeur de la première colonne. Props : { row }
 *
 * Exemple minimal (acceuil) :
 *
 *   const COLS = [
 *     { key: 'banque',            label: 'Banque' },
 *     { key: 'categorie_demande', label: 'Entité' },
 *     { key: 'type_demande',      label: 'Type de demande' },
 *     { key: 'nom_client',        label: 'Contrepartie' },
 *     { key: 'date_avis',         label: 'Date / Heure' },
 *     { key: 'description',       label: 'Niveau validation' },
 *   ];
 *
 *   <DemandesTable :rows="filteredRows" :columns="COLS" :loading="loading">
 *     <template #badge="{ row }">
 *       <span v-if="newMsgMap[row.id_demande]">Nouveau</span>
 *     </template>
 *     <template #actions="{ row }">
 *       <BtnAction @click="goToDetail(row.id_demande)">Détails</BtnAction>
 *       <BtnAction @click="openChat(row.id_demande)">CHAT</BtnAction>
 *     </template>
 *   </DemandesTable>
 */

import { defineComponent } from "https://unpkg.com/vue@3/dist/vue.esm-browser.js";

// ---------------------------------------------------------------------------
// Utilitaire escapeHtml — centralisé ici, partagé via export
// ---------------------------------------------------------------------------

/**
 * Sanitise une chaîne pour l'affichage HTML sécurisé.
 * Utilisé par les pages parentes pour préparer les données.
 * @param {any} str
 * @returns {string}
 */
export function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  const div = document.createElement("div");
  div.textContent = String(str);
  return div.innerHTML;
}

/**
 * Formate un nombre en locale française (ex: 1 500 000).
 * Correspond à formatNumber() du legacy.
 * @param {number|string} n
 * @returns {string}
 */
export function formatNumber(n) {
  const num = Number(n);
  return isNaN(num)
    ? String(n ?? "")
    : num.toLocaleString("fr-FR", { minimumFractionDigits: 0 });
}

// ---------------------------------------------------------------------------
// Composant
// ---------------------------------------------------------------------------

export default defineComponent({
  name: "DemandesTable",

  props: {
    /** Lignes du tableau (déjà filtrées par la page parente) */
    rows: {
      type: Array,
      default: () => [],
    },

    /**
     * Définition des colonnes.
     * @type {Array<{ key: string, label: string, format?: Function, slot?: string }>}
     */
    columns: {
      type: Array,
      required: true,
    },

    /** Affiche le spinner de chargement */
    loading: {
      type: Boolean,
      default: false,
    },

    /** Message d'erreur à afficher (null = pas d'erreur) */
    error: {
      type: String,
      default: null,
    },

    /** Label ARIA pour la section */
    ariaLabel: {
      type: String,
      default: "Tableau des demandes",
    },
  },

  template: /* html */ `
    <div
      class="overflow-x-auto w-full"
      :aria-label="ariaLabel"
    >

      <!-- ---- État : chargement ---- -->
      <div
        v-if="loading"
        class="flex items-center justify-center py-12 text-sm"
        style="color: var(--color-text-secondary);"
        aria-live="polite"
      >
        <svg class="animate-spin h-5 w-5 mr-2 flex-shrink-0"
             style="color: var(--color-brand);"
             xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
             aria-hidden="true">
          <circle class="opacity-25" cx="12" cy="12" r="10"
                  stroke="currentColor" stroke-width="4"/>
          <path class="opacity-75" fill="currentColor"
                d="M4 12a8 8 0 018-8v8z"/>
        </svg>
        Chargement des demandes…
      </div>

      <!-- ---- État : erreur ---- -->
      <div
        v-else-if="error"
        class="flex items-center justify-center py-10 text-sm gap-2"
        style="color: var(--color-status-rejected);"
        role="alert"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 flex-shrink-0" fill="none"
             viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round"
                d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
        </svg>
        Impossible de charger les données. Réessayez plus tard.
      </div>

      <!-- ---- État : tableau vide ---- -->
      <div
        v-else-if="rows.length === 0"
        class="flex flex-col items-center justify-center py-12 text-sm"
        style="color: var(--color-text-muted);"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10 mb-3 opacity-30" fill="none"
             viewBox="0 0 24 24" stroke="currentColor" stroke-width="1" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round"
                d="M9 12h6m-6 4h6m2 4H7a2 2 0 01-2-2V6a2 2 0 012-2h5l5 5v11a2 2 0 01-2 2z"/>
        </svg>
        Aucune demande trouvée.
      </div>

      <!-- ---- Tableau ---- -->
      <table
        v-else
        class="w-full text-sm border-collapse"
        role="grid"
      >
        <thead>
          <tr style="background: var(--color-brand); color: #fff;">
            <th
              v-for="col in columns"
              :key="col.key"
              class="px-4 py-3 text-left font-bold whitespace-nowrap"
              scope="col"
            >
              {{ col.label }}
            </th>
            <!-- Colonne actions si le slot est utilisé -->
            <th
              v-if="$slots.actions"
              class="px-4 py-3"
              scope="col"
            >
              <span class="sr-only">Actions</span>
            </th>
          </tr>
        </thead>

        <tbody>
          <tr
            v-for="(row, index) in rows"
            :key="row.id_demande ?? index"
            :class="index % 2 === 1 ? 'bg-orange-50' : 'bg-white'"
            class="border-b transition-colors"
            style="border-color: var(--color-brand-border);"
            onmouseover="this.style.background='#ffedd5';"
            onmouseout="this.style.background='';"
          >
            <!-- Cellules de données -->
            <td
              v-for="(col, colIndex) in columns"
              :key="col.key"
              class="px-4 py-3 align-middle"
            >
              <!-- Première colonne : slot badge optionnel après la valeur -->
              <template v-if="colIndex === 0">
                {{ col.format ? col.format(row[col.key], row) : (row[col.key] ?? '—') }}
                <slot name="badge" :row="row" />
              </template>

              <!-- Colonnes suivantes -->
              <template v-else>
                {{ col.format ? col.format(row[col.key], row) : (row[col.key] ?? '—') }}
              </template>
            </td>

            <!-- Cellule actions (slot) -->
            <td v-if="$slots.actions" class="px-4 py-3 align-middle">
              <div class="flex items-center gap-2 flex-wrap">
                <slot name="actions" :row="row" />
              </div>
            </td>
          </tr>
        </tbody>
      </table>

    </div>
  `,
});
