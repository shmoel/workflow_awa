/**
 * components/layout/NotificationPopup.js
 *
 * Popup « Nouvelle demande à valider ! » — balisage et styles inline
 * identiques au legacy (#popup-nouvelle-demande, tableau généré par
 * showPopupDemandesList()). Styles en classes Tailwind (ex-CSS legacy de #popup-nouvelle-demande).
 *
 * Props :
 *   polling : objet renvoyé par useNotificationPolling() { show, newDemandes, dismiss }
 */

import { defineComponent } from "vue";

export default defineComponent({
  name: "NotificationPopup",

  props: {
    polling: { type: Object, required: true },
  },

  setup(props) {
    // refs rangées dans un objet ordinaire : exposées directement pour que
    // le template les déballe
    return {
      show:        props.polling.show,
      newDemandes: props.polling.newDemandes,
      dismiss:     props.polling.dismiss,
    };
  },

  template: /* html */ `
    <div v-if="show" id="popup-nouvelle-demande" class="fixed inset-0 z-popup bg-[rgba(0,0,0,0.35)]">
        <div class="max-w-[400px] mx-auto my-[120px] pt-8 px-6 pb-6 text-center bg-white border-2 border-brand rounded-[18px] shadow-[0_8px_32px_#ea580c33]">
            <div class="mb-3 text-[1.4rem] font-bold text-brand">Nouvelle demande à valider !</div>
            <div id="popup-demande-details" style="margin-bottom:10px;">
                <table style="width:100%;border-collapse:collapse;text-align:left;">
                    <thead>
                        <tr style="background:#ea580c;color:#fff;">
                            <th style="padding:6px 8px;">Banque</th>
                            <th style="padding:6px 8px;">Entité</th>
                            <th style="padding:6px 8px;">Contrepartie</th>
                            <th style="padding:6px 8px;">Date</th>
                            <th style="padding:6px 8px;">Heure</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="d in newDemandes" :key="d.id_avis" style="border-bottom:1px solid #f3e7de;">
                            <td style="padding:6px 8px;">{{ d.banque || '' }}</td>
                            <td style="padding:6px 8px;">{{ d.categorie_demande || '' }}</td>
                            <td style="padding:6px 8px;">{{ d.nom_client || '' }}</td>
                            <td style="padding:6px 8px;">{{ d.date_avis || '' }}</td>
                            <td style="padding:6px 8px;">{{ d.heure_avis || '' }}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <button class="mt-[18px] px-7 py-2 text-[1.1rem] font-semibold text-white bg-brand rounded-[20px] shadow-[0_2px_8px_#ea580c22] cursor-pointer hover:bg-brand-hover" @click="dismiss()">OK</button>
        </div>
    </div>
  `,
});
