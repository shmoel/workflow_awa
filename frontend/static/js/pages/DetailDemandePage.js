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
 * Corrections par rapport au legacy (voir CHANGELOG_REFACTORING.md, CORRECTION-08) :
 *   - Popup de notification affichée (bloc HTML commenté dans le legacy,
 *     le script plantait à la détection d'une nouvelle demande)
 *   - « Aucune note jointe » si note_analyse est vide (le legacy plantait)
 *   - Nom de fichier extrait sur "\" et "/" (le legacy ne découpait que sur "\")
 *   - Message « Demande introuvable » si id_dmd est absent, invalide ou inconnu
 *   - Carte récapitulative de la demande (données déjà renvoyées par l'API,
 *     non affichées dans le legacy)
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
} from "https://unpkg.com/vue@3/dist/vue.esm-browser.js";

import { apiGet, downloadUrl }    from "../services/api.js";
import { useCurrentUser }         from "../composables/useCurrentUser.js";
import { useNotificationPolling } from "../composables/useNotificationPolling.js";

import AppSidebar       from "../components/layout/AppSidebar.js";
import AppNavbar        from "../components/layout/AppNavbar.js";
import AppFooter        from "../components/layout/AppFooter.js";
import AvisTimeline     from "../components/demandes/AvisTimeline.js";
import { formatNumber } from "../components/demandes/DemandesTable.js";

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

  components: { AppSidebar, AppNavbar, AppFooter, AvisTimeline },

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

    const noteHref = computed(() =>
      noteFilename.value ? downloadUrl(encodeURIComponent(noteFilename.value)) : null
    );

    const dateSoumission = computed(() => {
      const d = demande.value;
      if (!d?.date) return "—";
      const [y, m, j] = String(d.date).split("-");
      const date = j ? `${j}/${m}/${y}` : d.date;
      return d.heure ? `${date} ${String(d.heure).slice(0, 5)}` : date;
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

    // ---- Retour : page précédente, ou accueil si ouverte directement ----
    function goBack() {
      if (window.history.length > 1) window.history.back();
      else window.location.href = "acceuil.html";
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
      noteHref,
      dateSoumission,
      formatNumber,
      goBack,
    };
  },

  template: /* html */ `
    <div class="flex min-h-screen" style="background: var(--color-bg-page);">

      <AppSidebar active-page="" />

      <div class="flex flex-col flex-1 min-w-0">

        <AppNavbar page-title="Détails de la demande" />

        <main class="flex-1 p-5 space-y-5" role="main" aria-label="Détails de la demande">

          <!-- Retour -->
          <button
            type="button"
            @click="goBack"
            class="inline-flex items-center gap-1.5 text-sm font-semibold focus:outline-none"
            style="color: var(--color-brand);"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none"
                 viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Retour
          </button>

          <!-- Chargement -->
          <p v-if="loading" class="text-sm" style="color: var(--color-text-secondary);" role="status">
            Chargement de la demande…
          </p>

          <!-- Demande introuvable -->
          <section
            v-else-if="notFound"
            class="bg-white rounded-2xl shadow-sm border p-8 text-center"
            style="border-color: var(--color-brand-border);"
            role="alert"
          >
            <h2 class="text-lg font-bold mb-2" style="color: var(--color-brand);">Demande introuvable</h2>
            <p class="text-sm mb-4" style="color: var(--color-text-secondary);">
              L'identifiant de demande est absent, invalide ou ne correspond à aucune demande.
            </p>
            <a
              href="acceuil.html"
              class="inline-block px-5 py-2 rounded-full text-white text-sm font-semibold"
              style="background: var(--color-brand); text-decoration: none;"
            >Retour à l'accueil</a>
          </section>

          <!-- Erreur API -->
          <div
            v-else-if="error"
            class="rounded-xl border px-4 py-3 text-sm"
            style="border-color: var(--color-status-rejected); color: var(--color-status-rejected); background: #fef2f2;"
            role="alert"
          >
            Erreur lors du chargement de la demande : {{ error }}
          </div>

          <template v-else>

            <!-- Carte récapitulative -->
            <section
              class="bg-white rounded-2xl shadow-sm border p-5"
              style="border-color: var(--color-brand-border);"
              aria-labelledby="recap-title"
            >
              <div class="flex flex-wrap items-start justify-between gap-4 mb-4">
                <div>
                  <h2 id="recap-title" class="text-lg font-bold m-0">{{ demande.nom_client || '—' }}</h2>
                  <p class="text-sm m-0 mt-1" style="color: var(--color-text-secondary);">
                    {{ demande.categorie_demande || '—' }} · {{ demande.type_demande || '—' }}
                  </p>
                </div>

                <a
                  v-if="noteHref"
                  :href="noteHref"
                  target="_blank"
                  rel="noopener"
                  class="inline-flex items-center gap-2 px-4 py-2 rounded-full border-2 text-sm font-semibold"
                  style="color: var(--color-brand); border-color: var(--color-brand); text-decoration: none;"
                  :aria-label="'Télécharger la note d’analyse ' + noteFilename"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none"
                       viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round"
                          d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
                  </svg>
                  Télécharger la note d'informations
                </a>
                <span
                  v-else
                  class="inline-flex items-center px-4 py-2 rounded-full text-sm"
                  style="color: var(--color-text-secondary); background: var(--color-bg-page);"
                >Aucune note jointe</span>
              </div>

              <dl class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm m-0">
                <div>
                  <dt class="text-xs uppercase tracking-wide" style="color: var(--color-text-secondary);">Banque</dt>
                  <dd class="m-0 font-semibold">{{ demande.banque || '—' }}</dd>
                </div>
                <div>
                  <dt class="text-xs uppercase tracking-wide" style="color: var(--color-text-secondary);">Contrepartie</dt>
                  <dd class="m-0 font-semibold">{{ demande.nom_client || '—' }}</dd>
                </div>
                <div>
                  <dt class="text-xs uppercase tracking-wide" style="color: var(--color-text-secondary);">Montant</dt>
                  <dd class="m-0 font-semibold">{{ formatNumber(demande.montant) || '—' }}</dd>
                </div>
                <div>
                  <dt class="text-xs uppercase tracking-wide" style="color: var(--color-text-secondary);">Soumise le</dt>
                  <dd class="m-0 font-semibold">{{ dateSoumission }}</dd>
                </div>
              </dl>
            </section>

            <!-- Historique des avis -->
            <section aria-labelledby="avis-title">
              <h2 id="avis-title" class="text-base font-bold mb-3">Historique des avis</h2>
              <AvisTimeline :avis="avis" />
            </section>

          </template>

        </main>

        <AppFooter />
      </div>

      <!-- ================================================================
           Popup notification (polling — identique aux autres pages)
           ================================================================ -->
      <Transition name="fade">
        <div
          v-if="polling.show.value"
          class="fixed inset-0 z-50 flex items-start justify-center"
          style="background: rgba(0,0,0,0.35);"
          role="dialog"
          aria-modal="true"
          aria-labelledby="popup-title-detail"
          @click.self="polling.dismiss()"
        >
          <div
            class="bg-white rounded-2xl mt-28 mx-4 w-full max-w-lg border-2 p-8 shadow-2xl"
            style="border-color: var(--color-brand);"
          >
            <h2
              id="popup-title-detail"
              class="text-xl font-bold text-center mb-4"
              style="color: var(--color-brand);"
            >
              Nouvelle demande à valider&nbsp;!
            </h2>
            <div class="overflow-x-auto mb-5">
              <table class="w-full text-sm border-collapse">
                <thead>
                  <tr style="background: var(--color-brand); color: #fff;">
                    <th class="px-3 py-2 text-left font-semibold">Banque</th>
                    <th class="px-3 py-2 text-left font-semibold">Entité</th>
                    <th class="px-3 py-2 text-left font-semibold">Contrepartie</th>
                    <th class="px-3 py-2 text-left font-semibold">Date</th>
                    <th class="px-3 py-2 text-left font-semibold">Heure</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="d in polling.newDemandes.value"
                    :key="d.id_avis"
                    class="border-b"
                    style="border-color: var(--color-brand-border);"
                  >
                    <td class="px-3 py-2">{{ d.banque || '—' }}</td>
                    <td class="px-3 py-2">{{ d.categorie_demande || '—' }}</td>
                    <td class="px-3 py-2">{{ d.nom_client || '—' }}</td>
                    <td class="px-3 py-2 whitespace-nowrap">{{ d.date_avis || '—' }}</td>
                    <td class="px-3 py-2 whitespace-nowrap">{{ d.heure_avis || '—' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div class="text-center">
              <button
                @click="polling.dismiss()"
                class="px-8 py-2 rounded-full text-white font-bold"
                style="background: var(--color-brand);"
                onmouseover="this.style.background='var(--color-brand-dark)';"
                onmouseout="this.style.background='var(--color-brand)';"
                autofocus
              >OK</button>
            </div>
          </div>
        </div>
      </Transition>

    </div>
  `,
});
