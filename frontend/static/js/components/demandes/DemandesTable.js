/**
 * components/demandes/DemandesTable.js
 *
 * Tableau de demandes — balisage identique au legacy :
 *
 *   table.table.table-hover.card-table
 *     thead > tr > th[style="font-weight: bold;"]
 *     tbody > tr > td.align-middle > (wrapper de la colonne) > valeur
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
 *
 * ColumnDef :
 *   key     : champ de la ligne
 *   label   : en-tête
 *   format? : fn(value, row) → texte
 *   wrap?   : "cc-label" | "label" | "cc" | "media" | "self" | "inline" (défaut)
 *     cc-label → <label class="custom-control custom-checkbox mb-0">v<br></label>
 *     label    → <label>v<br></label>
 *     cc       → <div><div class="custom-control custom-checkbox mb-0">v</div></div>
 *     media    → <div><div class="media-body align-self-center ml-3">v</div></div>
 *     self     → <div><div class="align-self-center ml-3">v</div></div>
 *     inline   → <div><div class="d-inline-block align-middle">v</div></div>
 *   button? : fn(row) → { cls, label, disabled? } — la cellule contient un
 *             bouton (ex. « Arrêté » / « Terme ») au lieu d'un texte
 *
 * Slots :
 *   badge   — après la valeur de la 1re colonne (badge « Nouveau »). Props : { row }
 *   actions — cellules de boutons de la ligne (des <ActionCell>). Props : { row }
 *
 * Exporte aussi formatNumber() (formatNumber() legacy).
 */

import { defineComponent } from "https://unpkg.com/vue@3/dist/vue.esm-browser.js";

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

const INNER_CLASS = {
  cc:     "custom-control custom-checkbox mb-0",
  media:  "media-body align-self-center ml-3",
  self:   "align-self-center ml-3",
  inline: "d-inline-block align-middle",
};

export default defineComponent({
  name: "DemandesTable",

  props: {
    rows:          { type: Array,  default: () => [] },
    columns:       { type: Array,  required: true },
    actionHeaders: { type: Number, default: 0 },
    error:         { type: String, default: null },
  },

  setup() {
    function value(col, row) {
      return col.format ? col.format(row[col.key], row) : (row[col.key] ?? "");
    }
    function innerClass(col) {
      return INNER_CLASS[col.wrap] ?? INNER_CLASS.inline;
    }
    function isLabel(col) {
      return col.wrap === "cc-label" || col.wrap === "label";
    }
    return { value, innerClass, isLabel };
  },

  template: /* html */ `
    <table class="table table-hover card-table">
        <thead>
            <tr>
                <th v-for="col in columns" :key="col.key" style="font-weight: bold;">{{ col.label }}</th>
                <th v-for="n in actionHeaders" :key="'a' + n" style="font-weight: bold;"> </th>
            </tr>
        </thead>
        <tbody>
            <tr v-if="error">
                <td :colspan="columns.length + actionHeaders" class="align-middle text-danger">
                    Impossible de charger les données : {{ error }}
                </td>
            </tr>
            <tr v-for="(row, i) in rows" :key="row.id_demande ?? i">
                <td v-for="(col, c) in columns" :key="col.key" class="align-middle">
                    <label v-if="isLabel(col)" :class="col.wrap === 'cc-label' ? 'custom-control custom-checkbox mb-0' : null">
                        {{ value(col, row) }} <slot v-if="c === 0" name="badge" :row="row" /><br>
                    </label>
                    <div v-else>
                        <div :class="innerClass(col)">
                            <button v-if="col.button" type="button" :class="col.button(row).cls" :disabled="col.button(row).disabled || null">{{ col.button(row).label }}</button>
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
