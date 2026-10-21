/**
 * components/demandes/DemandeFilters.js
 *
 * Champs de filtre en temps réel (Tailwind) — reprend les champs de recherche
 * legacy de l'en-tête de carte (acceuil.html / historique.html) : loupe
 * feather, champ sans bordure qui prend un contour orange au focus.
 *
 * Props :
 *   fields     : Array<{ key, placeholder }> — champs, dans l'ordre d'affichage
 *   modelValue : Object — valeurs des filtres (v-model)
 *
 * Événement : update:modelValue — nouvel objet de filtres à chaque frappe
 */

import { defineComponent } from "vue";

export default defineComponent({
  name: "DemandeFilters",

  props: {
    fields:     { type: Array,  required: true },
    modelValue: { type: Object, required: true },
  },

  emits: ["update:modelValue"],

  setup(props, { emit }) {
    function update(key, value) {
      emit("update:modelValue", { ...props.modelValue, [key]: value });
    }
    return { update };
  },

  template: /* html */ `
    <div class="flex flex-col items-center">
        <div class="flex flex-wrap -mx-3">
            <label v-for="field in fields" :key="field.key" class="flex items-center w-[200px] p-0">
                <i class="feather icon-search block text-[18.5952px] leading-[18.5952px] align-middle"></i>
                <span class="flex flex-1 items-center pl-2 overflow-hidden transition-[max-width] duration-300 ease-in-out">
                <input type="text"
                       class="block w-[166px] h-[35px] min-h-[35px] mx-2 px-0 py-[7px] text-[13px] leading-[1.33] font-semibold text-ink bg-white border-0 rounded-none shadow-[0_1px_4px_#ea580c11] outline-none transition-[border,box-shadow] duration-200 placeholder:text-[#babbbc] placeholder:font-semibold max-[600px]:w-[191px] max-[600px]:text-[0.95rem] max-[600px]:pt-[6px] focus:border-[2.5px] focus:border-brand focus:bg-brand-soft focus:shadow-[0_4px_16px_#ea580c22]"
                       :placeholder="field.placeholder"
                       :value="modelValue[field.key] ?? ''"
                       @input="update(field.key, $event.target.value)">
                </span>
            </label>
        </div>
    </div>
  `,
});
