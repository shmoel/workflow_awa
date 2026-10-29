/**
 * components/demandes/CircuitFrise.js
 *
 * Frise des 6 étapes du circuit de validation (lot G, feuille de route UI/UX,
 * point 8) : Introduction → Risque local → DG local → AWA → AIG → GGR.
 * Étapes passées cochées (vert), étape en attente d'avis en orange
 * (aria-current="step"), étape d'arrêt en rouge (demande supprimée ou
 * arrêtée par le DG local). Rien n'est affiché si le statut est inconnu.
 *
 * Props :
 *   maxEvent : Number|null — statut de la demande (MAX(id_event), domain/workflow.js)
 */

import { defineComponent, computed } from "vue";
import { CIRCUIT, positionCircuit } from "../../domain/workflow.js";

const DOT = "flex items-center justify-center shrink-0 w-7 h-7 text-[12px] font-bold rounded-full border-2";

export default defineComponent({
  name: "CircuitFrise",

  props: {
    maxEvent: { type: Number, default: null },
  },

  setup(props) {
    const position = computed(() => positionCircuit(props.maxEvent));

    /** État d'une étape : "passee" | "courante" | "arret" | "a-venir" */
    function etat(i) {
      const p = position.value;
      if (i === p.courante) return p.arret ? "arret" : "courante";
      return i < p.passees ? "passee" : "a-venir";
    }

    const STYLE = {
      "passee":   { dot: DOT + " text-white bg-[#198754] border-[#198754]", label: "text-ink" },
      "courante": { dot: DOT + " text-white bg-[#ff4a00] border-[#ff4a00]", label: "text-[#c2410c] font-bold" },
      "arret":    { dot: DOT + " text-white bg-[#d63447] border-[#d63447]", label: "text-[#a3172b] font-bold" },
      "a-venir":  { dot: DOT + " text-[#8b888e] bg-white border-[#d5d6d8]", label: "text-[#8b888e]" },
    };
    const SR = { "passee": "étape passée", "courante": "étape en cours", "arret": "étape d'arrêt", "a-venir": "étape à venir" };

    return { position, etat, STYLE, SR, etapes: CIRCUIT };
  },

  template: /* html */ `
    <div v-if="position" class="px-6 pt-6" data-frise>
        <div class="overflow-x-auto">
            <ol class="flex min-w-[516px] m-0 p-0 list-none" aria-label="Position de la demande dans le circuit de validation">
                <li v-for="(nom, i) in etapes" :key="nom" class="relative flex flex-col items-center flex-1 text-center"
                    :aria-current="etat(i) === 'courante' || etat(i) === 'arret' ? 'step' : null"
                    :data-etat="etat(i)">
                    <span v-if="i < etapes.length - 1" aria-hidden="true"
                          class="absolute top-[13px] left-[calc(50%+18px)] right-[calc(-50%+18px)] h-[2px]"
                          :class="etat(i + 1) === 'a-venir' ? 'bg-[#d5d6d8]' : 'bg-[#198754]'"></span>
                    <span :class="STYLE[etat(i)].dot" aria-hidden="true">{{ etat(i) === 'passee' ? '✓' : (etat(i) === 'arret' ? '✕' : i + 1) }}</span>
                    <span class="mt-1 text-[12px] leading-[1.3]" :class="STYLE[etat(i)].label">{{ nom }}</span>
                    <span class="sr-only">({{ SR[etat(i)] }})</span>
                </li>
            </ol>
        </div>
        <p v-if="position.arret" class="mt-2 mb-0 text-sm font-medium text-[#a3172b]">{{ position.arret }}</p>
        <p v-else-if="position.courante === null" class="mt-2 mb-0 text-sm font-medium text-[#146c43]">Circuit de validation terminé</p>
    </div>
  `,
});
