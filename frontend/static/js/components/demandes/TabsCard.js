/**
 * components/demandes/TabsCard.js
 *
 * Carte à onglets des pages « Mes demandes » et de validation (Tailwind) —
 * reprend la carte legacy (card > card-header avec nav-tabs > tab-content) :
 *
 *   en-tête : onglets alignés à droite, l'onglet actif souligné en orange
 *   corps   : un volet par onglet ; seul le volet actif est affiché. Chaque
 *             volet a une zone de 330 px de haut qui défile (ex-PerfectScrollbar
 *             #tab-table-N) et une bande vide en pied (lien legacy sans texte)
 *
 * Props :
 *   tabs       : Array<{ key, label, paneId }> — onglets, dans l'ordre
 *   modelValue : String — clé de l'onglet actif (v-model)
 *
 * Slots : un slot par onglet, nommé d'après sa clé (le tableau du volet).
 */

import { defineComponent } from "vue";
import { TAB } from "../ui/classes.js";

export default defineComponent({
  name: "TabsCard",

  props: {
    tabs:       { type: Array,  required: true },
    modelValue: { type: String, required: true },
  },

  emits: ["update:modelValue"],

  setup() {
    return { TAB };
  },

  template: /* html */ `
    <div class="relative w-full px-3">
        <div class="relative flex flex-col mb-6 bg-white rounded-[2px] shadow-[0_0_0_1px_rgba(24,28,33,0.08)]">
            <div class="flex flex-wrap items-center px-6 pt-[10.4px] pb-0 leading-[22.0282px] border-b border-line rounded-t-[2px]">
                <h6 class="mb-0 py-[10.4px] font-medium leading-[1.1]"></h6>
                <div class="flex items-center ml-auto p-0">
                    <ul class="flex m-0 p-0 list-none">
                        <li v-for="tab in tabs" :key="tab.key">
                            <a :class="modelValue === tab.key ? TAB.active : TAB.inactive" href="javascript:"
                               @click="$emit('update:modelValue', tab.key)">{{ tab.label }}</a>
                        </li>
                    </ul>
                </div>
            </div>

            <div class="flex flex-col">
                <div class="bg-white rounded-b-[2px]">
                    <div v-for="(tab, n) in tabs" :key="tab.key" v-show="modelValue === tab.key" :id="tab.paneId">
                        <div class="h-[330px] overflow-auto [scrollbar-width:thin] [scrollbar-color:transparent_transparent] hover:[scrollbar-color:#aaa_transparent]"
                             :id="'tab-table-' + (n + 1)">
                            <slot :name="tab.key" />
                        </div>
                        <a href="javascript:" class="block px-6 py-[20.8px] text-sm font-medium text-center text-ink border-t border-line rounded-b-[2px]"></a>
                    </div>
                </div>
            </div>
        </div>
    </div>
  `,
});
