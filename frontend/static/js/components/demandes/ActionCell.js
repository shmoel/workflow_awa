/**
 * components/demandes/ActionCell.js
 *
 * Cellule de bouton d'une ligne de DemandesTable (Tailwind) :
 *   <td><div><div class="inline-block align-middle">
 *     <button type="button" class="…">Libellé</button>
 *   </div></div></td>
 * Les classes de la cellule viennent du thème du tableau (inject "tdClass").
 *
 * Props :
 *   btnClass : String — classes du bouton (voir components/ui/classes.js, BTN)
 *   label    : String — libellé (« Détails », « CHAT », « Modifier »…)
 *
 * Événement : click
 */

import { defineComponent, inject } from "vue";

export default defineComponent({
  name: "ActionCell",

  props: {
    btnClass: { type: String, required: true },
    label:    { type: String, required: true },
  },

  emits: ["click"],

  setup() {
    return { tdClass: inject("tdClass", "") };
  },

  template: /* html */ `
    <td :class="tdClass">
        <div>
            <div class="inline-block align-middle">
                <button type="button" :class="btnClass" @click="$emit('click')">{{ label }}</button>
            </div>
        </div>
    </td>
  `,
});
