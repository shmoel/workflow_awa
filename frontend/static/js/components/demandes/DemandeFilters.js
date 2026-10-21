/**
 * components/demandes/DemandeFilters.js
 *
 * Champs de filtre en temps réel — balisage identique au legacy (en-tête de
 * carte de acceuil.html / historique.html) :
 *
 *   div.navbar-nav.align-items-lg-center > div.row >
 *     label.nav-item.navbar-text.navbar-search-box.p-0.active
 *       i.feather.icon-search.navbar-icon.align-middle
 *       span.navbar-search-input.pl-2 > input.form-control.navbar-text.mx-2
 *
 * Props :
 *   fields     : Array<{ key, placeholder }> — champs, dans l'ordre d'affichage
 *   modelValue : Object — valeurs des filtres (v-model)
 *
 * Événement : update:modelValue — nouvel objet de filtres à chaque frappe
 */

import { defineComponent } from "https://unpkg.com/vue@3/dist/vue.esm-browser.js";

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
    <div class="navbar-nav align-items-lg-center ">
        <div class="row">
            <label v-for="field in fields" :key="field.key" class="nav-item navbar-text navbar-search-box p-0 active">
                <i class="feather icon-search navbar-icon align-middle"></i>
                <span class="navbar-search-input pl-2">
                <input type="text" class="form-control navbar-text mx-2"
                       :placeholder="field.placeholder"
                       :value="modelValue[field.key] ?? ''"
                       @input="update(field.key, $event.target.value)">
                </span>
            </label>
        </div>
    </div>
  `,
});
