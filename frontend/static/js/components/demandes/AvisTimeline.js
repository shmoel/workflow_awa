/**
 * components/demandes/AvisTimeline.js
 *
 * Historique des avis d'une demande, en accordéon (Tailwind) — reprend le
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
 * Bootstrap JS (data-toggle="collapse") est remplacé par Vue. En-tête de
 * panneau : <button aria-expanded> au lieu du lien legacy
 * href="javascript:" (lot F, accessibilité).
 */

import {
  defineComponent,
  ref,
  watch,
} from "vue";
import { SHEET } from "../ui/classes.js";

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

    return { openIndex, toggle, fields: FIELDS, SHEET };
  },

  template: /* html */ `
    <div v-if="!avis.length" class="py-6 text-center text-sm italic text-muted">Aucun avis pour cette demande.</div>
    <div v-for="(row, i) in avis" :key="i" class="mb-2 bg-white border border-line">
        <button type="button" class="flex justify-between w-full px-6 py-4 text-left text-ink hover:text-[#85bdf7]"
           :aria-expanded="openIndex === i ? 'true' : 'false'"
           @click="toggle(i)">
            {{ row.statut_d }}                            : {{ row.decision }} <span class="relative block w-[14px] h-[14px]"><span
                class="absolute top-[7px] left-[7px] -ml-1 w-2 h-2 border-l border-b border-[rgba(24,28,33,0.3)] transition-transform duration-300"
                :class="openIndex === i ? 'rotate-[135deg]' : '-rotate-45'"></span></span>
        </button>
        <div v-show="openIndex === i" class="text-muted">
            <div class="px-6 pb-4">
                    <div class="block overflow-auto">
                        <table :class="SHEET.table">
                            <thead>
                                <tr>
                                    <th :class="SHEET.th"></th>
                                    <th :class="SHEET.th"></th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="f in fields" :key="f.key">
                                    <td :class="SHEET.td">
                                        <div :class="SHEET.cell">
                                            <strong :class="SHEET.label">{{ f.label }}</strong>
                                        </div>
                                    </td>
                                    <td :class="SHEET.td">
                                        <div :class="SHEET.cell">
                                            <h6 :class="SHEET.value">{{ row[f.key] }}</h6>
                                        </div>
                                    </td>
                                </tr>
                                <tr>
                                    <td :class="SHEET.td">
                                        <div :class="SHEET.cell">
                                            <strong :class="SHEET.label">Commentaire</strong>
                                        </div>
                                    </td>
                                    <td :class="SHEET.td">
                                        <div :class="SHEET.cell">
                                            <h6 :class="SHEET.value" style="white-space:pre-wrap">{{ row.commentaire || '—' }}</h6>
                                        </div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
            </div>
        </div>
    </div>
  `,
});
