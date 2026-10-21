/**
 * components/demandes/StatCard.js
 *
 * Carte compteur de l'accueil — balisage identique au legacy :
 *
 *   div.col-md-4.col-lg-4.mb-4 > div.card.card-hover > div.card-body
 *     h5.card-title   {{ titre }}
 *     p.compteur-demandes.text-success   {{ nombre }}
 *
 * Chargement autonome : GET /nombre_demandes/{niveau}. Comme le legacy :
 * « … » pendant le chargement, « Err » en cas d'erreur, nombre formaté fr-FR.
 *
 * Props :
 *   title  : String — titre de la carte
 *   niveau : Number — 1 = GGR Local, 2 = DG Local, 3 = AWA, 4 = FO Group,
 *                     5 = GGR Group, 6 = Clôturées
 */

import { defineComponent, ref, onMounted } from "https://unpkg.com/vue@3/dist/vue.esm-browser.js";
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
    <div class="col-md-4 col-lg-4 mb-4">
        <div class="card card-hover">
            <div class="card-body">
                <h5 class="card-title">{{ title }}</h5>
                <p class="compteur-demandes text-success" :title="errorTitle">{{ text }}</p>
            </div>
        </div>
    </div>
  `,
});
