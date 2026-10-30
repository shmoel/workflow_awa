/**
 * pages/DetailDemandePage.js
 *
 * Composant "page" pour detail_consulter_demande.html — détail d'une demande
 * en lecture seule. Paramètre d'URL : ?id_dmd={id}
 *
 * Endpoints :
 *   GET /demande_particulier/{id}  → carte récapitulative + note d'analyse
 *   GET /commentaires_demande/{id} → historique des avis (AvisTimeline)
 *   GET /event_statuts/            → codes des statuts, pour placer la demande
 *                                    dans la frise du circuit (CircuitFrise)
 *
 * Frise du circuit (lot G, feuille de route UI/UX, point 8) : les routes de
 * la demande ne renvoient pas son statut chiffré ; il est retrouvé à partir
 * des avis (libellé event_d → id de /event_statuts/, le plus grand). Si ces
 * données manquent, la frise n'est pas affichée.
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

import { apiGet }                 from "../services/api.js";
import { useNoteDownload }        from "../composables/useNoteDownload.js";
import { useCurrentUser }         from "../composables/useCurrentUser.js";
import { useNotificationPolling } from "../composables/useNotificationPolling.js";
import { readDemandeId }         from "../utils/url.js";

import AppLayout from "../components/layout/AppLayout.js";
import BackArrow from "../components/ui/BackArrow.js";
import Breadcrumb from "../components/ui/Breadcrumb.js";
import AvisTimeline     from "../components/demandes/AvisTimeline.js";
import CircuitFrise from "../components/demandes/CircuitFrise.js";
import { BTN, ALERT_DANGER, LINK } from "../components/ui/classes.js";

export default defineComponent({
  name: "DetailDemandePage",

  components: { AppLayout, AvisTimeline, BackArrow, Breadcrumb, CircuitFrise },

  setup() {
    const user    = useCurrentUser();
    const polling = useNotificationPolling();

    const demande  = ref(null);
    const avis     = ref([]);
    const loading  = ref(true);
    const error    = ref(null);
    const notFound = ref(false);
    const statuts  = ref([]);   // /event_statuts/ : { id, libelle, description }

    /** Statut de la demande = plus grand id_event de ses avis (null si inconnu) */
    const maxEvent = computed(() => {
      const ids = avis.value
        .map((a) => statuts.value.find((s) => s.libelle === a.event_d)?.id)
        .filter((id) => id != null);
      return ids.length ? Math.max(...ids) : null;
    });

    // ---- Note d'analyse ----
    // Le backend stocke le nom de fichier seul ; d'anciennes lignes peuvent
    // contenir un chemin complet (séparateur "\" ou "/").
    const { noteError, openNote } = useNoteDownload();

    const noteFilename = computed(() => {
      const raw = demande.value?.note_analyse;
      if (!raw) return null;
      return String(raw).split(/[\\/]/).pop() || null;
    });


    // ---- Chargement ----
    async function loadDemande(id) {
      loading.value = true;
      error.value   = null;
      try {
        const [dmdData, avisData, statutsData] = await Promise.all([
          apiGet(`/demande_particulier/${id}`),
          apiGet(`/commentaires_demande/${id}`),
          apiGet("/event_statuts/").catch(() => []),   // frise seulement : pas bloquant
        ]);
        statuts.value = Array.isArray(statutsData) ? statutsData : [];
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

    // ---- Breadcrumb ----
    const breadcrumbItems = computed(() => {
      const items = [
        { label: 'Accueil', href: 'acceuil.html' },
      ];
      
      if (demande.value) {
        const demandeId = readDemandeId();
        items.push({ label: `Détails de la demande #${demandeId}`, active: true });
      }
      
      return items;
    });

    return {
      user,
      polling,
      demande,
      avis,
      loading,
      error,
      notFound,
      noteFilename,
      noteError,
      openNote,
      maxEvent,
      breadcrumbItems,
      BTN, ALERT_DANGER, LINK,
    };
  },

  template: /* html */ `
    <AppLayout :polling="polling">
        <div class="flex flex-wrap -mx-3">
            <div class="relative w-full px-3">
                <div class="flex flex-wrap h-full overflow-hidden">
                    <div class="w-full px-8">
                        <BackArrow fallback="acceuil.html" />
                        
                        <!-- Breadcrumb -->
                        <Breadcrumb :items="breadcrumbItems" />

                        <div v-if="notFound" :class="ALERT_DANGER" role="alert">
                            Demande introuvable : l'identifiant est absent, invalide ou ne correspond à aucune demande.
                            <a href="acceuil.html" :class="LINK">Retour à l'accueil</a>
                        </div>

                        <div v-else-if="error" :class="ALERT_DANGER" role="alert">
                            Erreur lors du chargement de la demande : {{ error }}
                        </div>

                        <template v-else-if="demande">

                            <!-- Position dans le circuit -->
                            <CircuitFrise :max-event="maxEvent" />

                            <!-- 3. Historique des avis -->
                            <div class="px-6 pb-6">
                                <h6 class="mb-3 font-medium leading-[1.1]">Historique des avis</h6>
                                <div id="detail_commentaire" class="relative">
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
