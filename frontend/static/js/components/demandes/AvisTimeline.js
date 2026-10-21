/**
 * components/demandes/AvisTimeline.js
 *
 * Historique des avis d'une demande, en accordéon — balisage identique au
 * HTML généré par charger_details_commentaire() dans
 * detail_consulter_demande.html et valider_demande.html :
 *
 *   div.bg-white.ui-bordered.mb-2
 *     a.d-flex.justify-content-between.text-dark.py-3.px-4   « statut : décision »
 *     div.collapse.text-muted(.show)
 *       div.px-4.pb-3 > div.table-responsive > table.table.card-table
 *         Nom / Prénom / Banque / Entité / Décision / Date heure / Commentaire
 *       textarea.form-control (commentaire, désactivé)
 *
 * Props :
 *   avis     : Array   — lignes de GET /commentaires_demande/{id}
 *              { nom, prenom, banque, entite, decision, commentaire,
 *                event_d, statut_d, date_time }
 *   openLast : Boolean — ouvre le dernier avis au chargement (défaut true,
 *              décision du 05/10/2026, CORRECTION-08)
 *
 * Un seul panneau ouvert à la fois ; panneaux identifiés par leur position
 * (le legacy utilisait event_d : deux avis du même type s'ouvraient ensemble).
 * Bootstrap JS (data-toggle="collapse") est remplacé par Vue.
 */

import {
  defineComponent,
  ref,
  watch,
} from "https://unpkg.com/vue@3/dist/vue.esm-browser.js";

const FIELDS = [
  { key: "nom",       label: "Nom" },
  { key: "prenom",    label: "Prénom" },
  { key: "banque",    label: "Banque" },
  { key: "entite",    label: "Entité" },
  { key: "decision",  label: "Décision" },
  { key: "date_time", label: "Date heure" },
];

export default defineComponent({
  name: "AvisTimeline",

  props: {
    avis:     { type: Array,   default: () => [] },
    openLast: { type: Boolean, default: true },
  },

  setup(props) {
    /** Index du panneau ouvert (null = tous fermés) */
    const openIndex = ref(null);

    watch(
      () => props.avis,
      (list) => { openIndex.value = props.openLast && list.length ? list.length - 1 : null; },
      { immediate: true }
    );

    function toggle(i) {
      openIndex.value = openIndex.value === i ? null : i;
    }

    return { openIndex, toggle, fields: FIELDS };
  },

  template: /* html */ `
    <div v-for="(row, i) in avis" :key="i" class="bg-white ui-bordered mb-2">
        <a href="javascript:" class="d-flex justify-content-between text-dark py-3 px-4"
           :class="{ collapsed: openIndex !== i }"
           :aria-expanded="openIndex === i ? 'true' : 'false'"
           @click.prevent="toggle(i)">
            {{ row.statut_d }}                            : {{ row.decision }} <span class="collapse-icon"></span>
        </a>
        <div class="collapse text-muted" :class="{ show: openIndex === i }">
            <div class="px-4 pb-3">
                    <div class="table-responsive">
                        <table class="table card-table">
                            <thead>
                                <tr>
                                    <th></th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="f in fields" :key="f.key">
                                    <td class="align-center">
                                        <div class="media-body align-self-center ml-3">
                                            <strong>{{ f.label }}</strong>
                                        </div>
                                    </td>
                                    <td class="align-center">
                                        <div class="media-body align-self-center ml-3">
                                            <h6 class="mb-0">{{ row[f.key] }}</h6>
                                        </div>
                                    </td>
                                </tr>
                                <tr>
                                    <td class="align-center">
                                        <div class="media-body align-self-center ml-3">
                                            <strong>Commentaire</strong>
                                        </div>
                                    </td>
                                    <td class="align-center">
                                        <div class="media-body align-self-center ml-3">
                                        </div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                <textarea class="form-control media-body align-self-center ml-3" cols="100" disabled :value="row.commentaire ?? ''"></textarea>
            </div>
        </div>
    </div>
  `,
});
