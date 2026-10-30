/**
 * components/demandes/DemandesCard.js
 *
 * Carte « filtres + onglet + tableau » de l'accueil et de l'historique
 * (Tailwind) — reprend la carte legacy :
 *
 *   en-tête  : champs de filtre (DemandeFilters) + un onglet actif souligné
 *   corps    : zone de 330 px de haut qui défile (ex-PerfectScrollbar
 *              #tab-table-1), contenant le tableau passé dans le slot
 *   pied     : bande vide (lien legacy sans texte, devenu un simple bloc :
 *              il recevait le focus clavier)
 *
 * Accessibilité (lot F) : onglet unique en <button role="tab"> (sélectionné),
 * zone du tableau role="tabpanel".
 *
 * Props :
 *   tabLabel   : String — libellé de l'onglet (« Introduites », « Demandes Clôturées »)
 *   fields     : Array  — champs de filtre (voir DemandeFilters)
 *   modelValue : Object — valeurs des filtres (v-model)
 *
 * Slot par défaut : le tableau (DemandesTable).
 */

import { defineComponent } from "vue";
import DemandeFilters from "./DemandeFilters.js";

export default defineComponent({
  name: "DemandesCard",

  components: { DemandeFilters },

  props: {
    tabLabel:   { type: String, required: true },
    fields:     { type: Array,  required: true },
    modelValue: { type: Object, required: true },
  },

  emits: ["update:modelValue"],

  template: /* html */ `
    <div class="relative w-full px-3">
        <div class="relative flex flex-col mb-6 bg-white rounded-[2px] shadow-[0_0_0_1px_rgba(24,28,33,0.08)]">

            <div class="flex flex-wrap items-center px-6 pt-[10.4px] pb-0 leading-[22.0282px] border-b border-line rounded-t-[2px]">
                <DemandeFilters :fields="fields" :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)" />
                <div class="flex items-center ml-auto p-0 gap-2">
                    <slot name="actions" />
                    <ul class="flex m-0 p-0 list-none" role="tablist">
                        <li id="dmd-intro" role="presentation">
                            <button type="button" role="tab" id="demande-intro-tab" aria-controls="demande-intro" aria-selected="true" class="block mr-[2px] px-[17px] py-3 text-btn font-medium uppercase rounded-t-[2px] bg-[linear-gradient(#ff4a00,#ff4a00)] bg-no-repeat bg-[length:100%_2px] bg-[position:50%_100%] transition-[background] duration-300 ease-out"
                            >{{ tabLabel }}</button>
                        </li>
                    </ul>
                </div>
            </div>

            <div class="flex flex-col">
                <div class="bg-white rounded-b-[2px]">
                    <div id="demande-intro" role="tabpanel" aria-labelledby="demande-intro-tab">
                        <div class="h-[330px] overflow-auto [scrollbar-width:thin] [scrollbar-color:transparent_transparent] hover:[scrollbar-color:#aaa_transparent]" id="tab-table-1">
                            <slot />
                        </div>
                        <div class="block px-6 py-[20.8px] text-sm font-medium text-center text-ink border-t border-line rounded-b-[2px]"></div>
                    </div>
                </div>
            </div>
        </div>
    </div>
  `,
});
