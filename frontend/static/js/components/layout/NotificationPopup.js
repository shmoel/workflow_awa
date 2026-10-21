/**
 * components/layout/NotificationPopup.js
 *
 * Popup « Nouvelle demande à valider ! » — balisage et styles inline
 * identiques au legacy (#popup-nouvelle-demande, tableau généré par
 * showPopupDemandesList()). CSS dans static/css/app.css.
 *
 * Props :
 *   polling : objet renvoyé par useNotificationPolling() { show, newDemandes, dismiss }
 */

import { defineComponent } from "https://unpkg.com/vue@3/dist/vue.esm-browser.js";

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
    <div v-if="show" id="popup-nouvelle-demande" style="display: block;">
        <div class="popup-content">
            <div class="popup-title">Nouvelle demande à valider !</div>
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
            <button class="popup-btn" @click="dismiss()">OK</button>
        </div>
    </div>
  `,
});
