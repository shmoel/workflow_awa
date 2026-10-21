/**
 * components/demandes/StatCard.js
 *
 * Carte compteur de l'accueil (Tailwind) — reprend la carte legacy
 * (col-md-4 > card.card-hover > card-body : titre orange, compteur vert,
 * pastille ronde en haut à gauche, légère élévation au survol).
 *
 * Chargement autonome : GET /nombre_demandes/{niveau}. Comme le legacy :
 * « … » pendant le chargement, « Err » en cas d'erreur, nombre formaté fr-FR.
 *
 * Props :
 *   title  : String — titre de la carte
 *   niveau : Number — 1 = GGR Local, 2 = DG Local, 3 = AWA, 4 = FO Group,
 *                     5 = GGR Group, 6 = Clôturées
 */

import { defineComponent, ref, onMounted } from "vue";
import { apiGet } from "../../services/api.js";

/** Le nombre peut arriver sous plusieurs clés selon l'endpoint (legacy) */
function extractCount(data) {
  return Number(
    data?.nombre_dmd ??
    data?.count ??
    data?.nb_demandes ??
    data?.nombre ??
    data?.nb ??
    (typeof data === "number" ? data : 0)
  ) || 0;
}

export default defineComponent({
  name: "StatCard",

  props: {
    title:  { type: String, required: true },
    niveau: { type: Number, required: true },
  },

  setup(props) {
    const text = ref("…");
    const errorTitle = ref(null);

    onMounted(async () => {
      try {
        const data = await apiGet(`/nombre_demandes/${props.niveau}`);
        text.value = extractCount(data).toLocaleString("fr-FR");
      } catch (e) {
        text.value = "Err";
        errorTitle.value = e.message;
      }
    });

    return { text, errorTitle };
  },

  template: /* html */ `
    <div class="relative w-full md:w-1/3 px-3 mb-6">
        <div class="group relative flex flex-col max-[900px]:mb-[18px] bg-white border-[1.5px] border-brand-line rounded-[18px] shadow-[0_2px_12px_rgba(234,88,12,0.10)] transition-[box-shadow,transform] duration-200 hover:shadow-[0_8px_32px_rgba(234,88,12,0.16)] hover:-translate-y-0.5 hover:scale-[1.01]">
            <span class="absolute -top-[18px] left-[18px] w-[38px] h-[38px] rounded-full bg-brand-soft shadow-[0_2px_8px_#ea580c22]"></span>
            <div class="p-6">
                <h5 class="mb-2 text-h5 max-[600px]:text-[1.1rem] font-bold tracking-[0.5px] text-brand">{{ title }}</h5>
                <p class="inline-block min-w-[90px] my-2 px-4 py-2 font-system text-[2rem] leading-[1.2] font-bold text-center text-success bg-[rgba(25,135,84,0.08)] border border-[rgba(25,135,84,0.25)] rounded-[0.75rem] shadow-[0_2px_6px_rgba(0,0,0,0.08)] transition-all duration-[250ms]"
                   :title="errorTitle">{{ text }}</p>
            </div>
        </div>
    </div>
  `,
});
