/**
 * pages/DetailDemandePage.js
 *
 * Composant "page" pour detail_consulter_demande.html — détail d'une demande
 * en lecture seule. Paramètre d'URL : ?id_dmd={id}
 *
 * Endpoints :
 *   GET /demande_particulier/{id}  → carte récapitulative + note d'analyse
 *   GET /commentaires_demande/{id} → historique des avis (AvisTimeline)
 *
 * Corrections par rapport au legacy (voir docs/CHANGELOG_REFACTORING.md, CORRECTION-08) :
 *   - Popup de notification affichée (bloc HTML commenté dans le legacy,
 *     le script plantait à la détection d'une nouvelle demande)
 *   - « Aucune note jointe » si note_analyse est vide (le legacy plantait)
 *   - Nom de fichier extrait sur "\" et "/" (le legacy ne découpait que sur "\")
 *   - Message « Demande introuvable » si id_dmd est absent, invalide ou inconnu
 *   - Tableau récapitulatif de la demande (données déjà renvoyées par l'API,
 *     non affichées dans le legacy), au format du tableau legacy de valider_demande
 *
 * Code mort du legacy non repris : showConfirmation(), confirmSubmission()
 * (POST /valider_avis/...), confirmerEnvoi() — aucun élément ne les déclenchait.
 */

import {
  defineComponent,
  ref,
  computed,
  onMounted,
  onUnmounted,
} from "vue";

import { apiGet, downloadNote }   from "../services/api.js";
import { useCurrentUser }         from "../composables/useCurrentUser.js";
import { useNotificationPolling } from "../composables/useNotificationPolling.js";

import AppLayout from "../components/layout/AppLayout.js";
import BackArrow from "../components/ui/BackArrow.js";
import AvisTimeline     from "../components/demandes/AvisTimeline.js";
import { formatNumber } from "../components/demandes/DemandesTable.js";
import { BTN, SHEET, ALERT_DANGER, LINK } from "../components/ui/classes.js";

/**
 * Lit ?id_dmd dans l'URL. Retourne null s'il est absent ou n'est pas
 * un entier positif.
 * @returns {string|null}
 */
function readDemandeId() {
  const id = new URLSearchParams(window.location.search).get("id_dmd");
  return id && /^[1-9]\d*$/.test(id) ? id : null;
}

export default defineComponent({
  name: "DetailDemandePage",

  components: { AppLayout, AvisTimeline, BackArrow },

  setup() {
    const user    = useCurrentUser();
    const polling = useNotificationPolling();

    const demande  = ref(null);
    const avis     = ref([]);
    const loading  = ref(true);
    const error    = ref(null);
    const notFound = ref(false);

    // ---- Note d'analyse ----
    // Le backend stocke le nom de fichier seul ; d'anciennes lignes peuvent
    // contenir un chemin complet (séparateur "\" ou "/").
    const noteFilename = computed(() => {
      const raw = demande.value?.note_analyse;
      if (!raw) return null;
      return String(raw).split(/[\\/]/).pop() || null;
    });


    const dateSoumission = computed(() => {
      const d = demande.value;
      if (!d?.date) return "—";
      const [y, m, j] = String(d.date).split("-");
      const date = j ? `${j}/${m}/${y}` : d.date;
      return d.heure ? `${date} ${String(d.heure).slice(0, 5)}` : date;
    });

    // ---- Tableau récapitulatif (même présentation que « Informations de la
    //      demande » de valider_demande legacy) ----
    const infos = computed(() => {
      const d = demande.value;
      if (!d) return [];
      return [
        { label: "Type de demande", value: d.type_demande || "—" },
        { label: "Banque",          value: d.banque || "—" },
        { label: "Entité",          value: d.categorie_demande || "—" },
        { label: "Contrepartie",    value: d.nom_client || "—" },
        { label: "Montant (XOF)",   value: formatNumber(d.montant) || "—" },
        { label: "Date/heure",      value: dateSoumission.value },
      ];
    });

    // ---- Chargement ----
    async function loadDemande(id) {
      loading.value = true;
      error.value   = null;
      try {
        const [dmdData, avisData] = await Promise.all([
          apiGet(`/demande_particulier/${id}`),
          apiGet(`/commentaires_demande/${id}`),
        ]);
        const row = dmdData.results?.[0];
        if (!row) {
          notFound.value = true;
          return;
        }
        demande.value = row;
        avis.value    = avisData.results ?? [];
      } catch (e) {
        error.value = e.message;
      } finally {
        loading.value = false;
      }
    }

    // ---- Cycle de vie ----
    onMounted(async () => {
      await user.fetchUser();
      polling.start();

      const id = readDemandeId();
      if (!id) {
        notFound.value = true;
        loading.value  = false;
        return;
      }
      await loadDemande(id);
    });

    onUnmounted(() => polling.stop());

    return {
      user,
      polling,
      demande,
      avis,
      loading,
      error,
      notFound,
      noteFilename,
      downloadNote,
      dateSoumission,
      infos,
      BTN, SHEET, ALERT_DANGER, LINK,
    };
  },

  template: /* html */ `
    <AppLayout :polling="polling">
        <div class="flex flex-wrap -mx-3">
            <div class="relative w-full px-3">
                <div class="flex flex-wrap h-full overflow-hidden">
                    <div class="w-full px-8">
                        <BackArrow fallback="acceuil.html" />

                        <div v-if="notFound" :class="ALERT_DANGER" role="alert">
                            Demande introuvable : l'identifiant est absent, invalide ou ne correspond à aucune demande.
                            <a href="acceuil.html" :class="LINK">Retour à l'accueil</a>
                        </div>

                        <div v-else-if="error" :class="ALERT_DANGER" role="alert">
                            Erreur lors du chargement de la demande : {{ error }}
                        </div>

                        <template v-else-if="demande">
                            <button v-if="noteFilename" type="button" :class="BTN.outlinePrimary"><a href="javascript:" :class="LINK" @click.prevent="downloadNote(noteFilename)">Télécharger la note d'informations</a></button>
                            <button v-else type="button" :class="BTN.outlinePrimary" disabled>Aucune note jointe</button>

                            <div class="p-6">
                                <table :class="SHEET.table">
                                    <thead>
                                        <tr>
                                            <th :class="SHEET.th"></th>
                                            <th :class="SHEET.th"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr v-for="info in infos" :key="info.label">
                                            <td :class="SHEET.td">
                                                <div :class="SHEET.cell">
                                                <strong :class="SHEET.label"> {{ info.label }} </strong>
                                                </div>
                                            </td>
                                            <td :class="SHEET.td">
                                                <div :class="SHEET.cell">
                                                <h6 :class="SHEET.value"> {{ info.value }} </h6>
                                                </div>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                                <div id="detail_commentaire" class="relative px-3">
                                    <AvisTimeline :avis="avis" />
                                </div>
                            </div>
                        </template>

                    </div>
                </div>
            </div>
        </div>
    </AppLayout>
  `,
});
