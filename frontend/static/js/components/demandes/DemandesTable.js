/**
 * components/demandes/DemandesTable.js
 *
 * Tableau de demandes (Tailwind) — reprend les tableaux legacy :
 *
 *   table
 *     thead > tr > th (en gras)
 *     tbody > tr > td > (wrapper de la colonne) > valeur
 *
 * L'apparence dépend de la page (prop `theme`, voir components/ui/classes.js,
 * TABLE) : « dashboard » = en-tête orange de l'accueil et de l'historique,
 * « demandes » = tableau simple des autres pages.
 *
 * Les lignes legacy étaient générées en JavaScript (fillTable_*, generate*Rows)
 * avec un wrapper différent selon la page et la colonne : chaque colonne
 * déclare donc le sien (prop `columns`, champ `wrap`).
 *
 * Props :
 *   rows          : Array — lignes (déjà filtrées par la page)
 *   columns       : Array<ColumnDef>
 *   actionHeaders : Number — nombre de <th> vides ajoutés pour les colonnes
 *                   de boutons (le legacy en avait un par bouton)
 *   error         : String|null — message affiché dans une ligne du tableau
 *   loading       : Boolean — liste en cours de chargement : ligne « Chargement… »
 *   emptyText     : String — ligne affichée quand la liste chargée est vide
 *                   (défaut « Aucune demande »). Ordre : erreur, chargement,
 *                   liste vide (lot F, feuille de route UI/UX)
 *   theme         : String — clé de TABLE (défaut « dashboard »)
 *
 * ColumnDef :
 *   key     : champ de la ligne
 *   label   : en-tête
 *   format? : fn(value, row) → texte
 *   wrap?   : "cc-label" | "label" | "cc" | "media" | "self" | "inline" (défaut)
 *     cc-label → <label (CELL.cc)>v<br></label>   (ex-custom-control : retrait de 43 px)
 *     label    → <label (CELL.label)>v<br></label>
 *     cc       → <div><div (CELL.cc)>v</div></div>
 *     media    → <div><div (CELL.media)>v</div></div>
 *     self     → <div><div (CELL.self)>v</div></div>
 *     inline   → <div><div (CELL.inline)>v</div></div>
 *   button? : fn(row) → { cls, label, disabled? } — la cellule contient un
 *             bouton (ex. « Arrêté » / « Terme ») au lieu d'un texte
 *   pill?   : fn(row) → classes — la valeur est affichée en pastille de
 *             statut (PILL, lot G)
 *   sort?   : fn(row) → nombre ou texte — colonne triable : clic sur
 *             l'en-tête = tri croissant, puis décroissant (lot G) ; voir
 *             SORT_MONTANT, sortDate()
 *
 * Slots :
 *   badge   — après la valeur de la 1re colonne (badge « Nouveau »). Props : { row }
 *   actions — cellules de boutons de la ligne (des <ActionCell>, qui reçoivent
 *             les classes de cellule du thème par provide/inject). Props : { row }
 *
 * Exporte aussi formatNumber() (formatNumber() legacy) et les clés de tri
 * communes SORT_MONTANT et sortDate().
 */

import { defineComponent, provide, ref, computed } from "vue";
import { TABLE, CELL } from "../ui/classes.js";

/**
 * Formate un nombre en locale française (ex : 1 500 000), comme formatNumber() legacy.
 * @param {number|string} n
 * @returns {string}
 */
export function formatNumber(n) {
  const num = Number(n);
  return isNaN(num)
    ? String(n ?? "")
    : num.toLocaleString("fr-FR", { minimumFractionDigits: 0 });
}

/** Clé de tri du montant */
export const SORT_MONTANT = (row) => Number(row.montant) || 0;

/**
 * Clé de tri d'une date (texte « AAAA-MM-JJ HH:MM:SS », ordre chronologique).
 * @param {...string} fields - champs concaténés (ex. "date_avis", "heure_avis")
 */
export function sortDate(...fields) {
  return (row) => fields.map((f) => row[f] ?? "").join(" ");
}

export default defineComponent({
  name: "DemandesTable",

  props: {
    rows:          { type: Array,  default: () => [] },
    columns:       { type: Array,  required: true },
    actionHeaders: { type: Number, default: 0 },
    error:         { type: String, default: null },
    loading:       { type: Boolean, default: false },
    emptyText:     { type: String, default: "Aucune demande" },
    theme:        { type: String, default: "dashboard" },
  },

  setup(props) {
    const t = TABLE[props.theme];
    provide("tdClass", t.td);

    function value(col, row) {
      return col.format ? col.format(row[col.key], row) : (row[col.key] ?? "");
    }
    function innerClass(col) {
      return CELL[col.wrap] ?? CELL.inline;
    }
    function isLabel(col) {
      return col.wrap === "cc-label" || col.wrap === "label";
    }

    // ---- Tri (colonnes déclarant `sort`) ----
    const sortKey = ref(null);
    const sortDir = ref("asc");

    function toggleSort(col) {
      if (sortKey.value === col.key) {
        sortDir.value = sortDir.value === "asc" ? "desc" : "asc";
      } else {
        sortKey.value = col.key;
        sortDir.value = "asc";
      }
    }

    function ariaSort(col) {
      if (!col.sort) return null;
      if (sortKey.value !== col.key) return "none";
      return sortDir.value === "asc" ? "ascending" : "descending";
    }

    const sortedRows = computed(() => {
      const col = props.columns.find((c) => c.key === sortKey.value);
      if (!col?.sort) return props.rows;
      const sens = sortDir.value === "asc" ? 1 : -1;
      return [...props.rows].sort((a, b) => {
        const va = col.sort(a), vb = col.sort(b);
        return (va < vb ? -1 : va > vb ? 1 : 0) * sens;
      });
    });

    return { t, value, innerClass, isLabel, sortKey, sortDir, toggleSort, ariaSort, sortedRows, CELL };
  },

  template: /* html */ `
    <table :class="t.table">
        <thead>
            <tr :class="t.headRow">
                <th v-for="col in columns" :key="col.key" :class="t.th" :aria-sort="ariaSort(col)">
                    <button v-if="col.sort" type="button" class="inline-flex items-center gap-1 font-bold" @click="toggleSort(col)">
                        {{ col.label }}
                        <span aria-hidden="true" :class="sortKey === col.key ? '' : 'opacity-40'">{{ sortKey !== col.key ? '⇅' : (sortDir === 'asc' ? '▲' : '▼') }}</span>
                    </button>
                    <template v-else>{{ col.label }}</template>
                </th>
                <th v-for="n in actionHeaders" :key="'a' + n" :class="t.th"> </th>
            </tr>
        </thead>
        <tbody>
            <tr v-if="error" data-message="erreur">
                <td :colspan="columns.length + actionHeaders" :class="t.td + ' text-danger'">
                    Impossible de charger les données : {{ error }}
                </td>
            </tr>
            <tr v-else-if="loading" data-message="chargement">
                <td :colspan="columns.length + actionHeaders" :class="t.td + ' text-muted'">Chargement…</td>
            </tr>
            <tr v-else-if="!rows.length" data-message="vide">
                <td :colspan="columns.length + actionHeaders" :class="t.td + ' text-muted'">{{ emptyText }}</td>
            </tr>
            <tr v-for="(row, i) in sortedRows" :key="row.id_demande ?? i" :class="t.row">
                <td v-for="(col, c) in columns" :key="col.key" :class="t.td">
                    <label v-if="isLabel(col)" :class="col.wrap === 'cc-label' ? CELL.cc : CELL.label">
                        {{ value(col, row) }} <slot v-if="c === 0" name="badge" :row="row" /><br>
                    </label>
                    <div v-else>
                        <div :class="innerClass(col)">
                            <button v-if="col.button" type="button" :class="col.button(row).cls" :disabled="col.button(row).disabled || null">{{ col.button(row).label }}</button>
                            <span v-else-if="col.pill" :class="col.pill(row)">{{ value(col, row) }}</span>
                            <template v-else>{{ value(col, row) }} <slot v-if="c === 0" name="badge" :row="row" /></template>
                        </div>
                    </div>
                </td>
                <slot name="actions" :row="row" />
            </tr>
        </tbody>
    </table>
  `,
});
