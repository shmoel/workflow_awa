/**
 * components/demandes/ActionCell.js
 *
 * Cellule de bouton d'une ligne de DemandesTable — balisage legacy :
 *   <td class="align-middle"><div><div class="d-inline-block align-middle">
 *     <button type="button" class="…">Libellé</button>
 *   </div></div></td>
 *
 * Props :
 *   btnClass : String — classes du bouton (ex. "btn btn-glow-info btn-info")
 *   label    : String — libellé (« Détails », « CHAT », « Modifier »…)
 *
 * Événement : click
 */

import { defineComponent } from "https://unpkg.com/vue@3/dist/vue.esm-browser.js";

export default defineComponent({
  name: "ActionCell",

  props: {
    btnClass: { type: String, required: true },
    label:    { type: String, required: true },
  },

  emits: ["click"],

  template: /* html */ `
    <td class="align-middle">
        <div>
            <div class="d-inline-block align-middle">
                <button type="button" :class="btnClass" @click="$emit('click')">{{ label }}</button>
            </div>
        </div>
    </td>
  `,
});
