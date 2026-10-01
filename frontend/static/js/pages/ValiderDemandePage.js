/**
 * pages/ValiderDemandePage.js
 *
 * Composant "page" pour valider_demande.html.
 * Page de détail d'évaluation d'une demande pour les validateurs.
 *
 * ── Structure (layout 2 colonnes) ──────────────────────────────────────────
 *   Colonne gauche : informations de la demande + formulaire d'avis
 *   Colonne droite : historique des commentaires (accordéon)
 *
 * ── Données chargées ───────────────────────────────────────────────────────
 *   GET /demande_particulier/{id}  → infos demande (type, banque, entité,
 *                                    contrepartie, montant, note_analyse, date)
 *   GET /decisions/                → liste déroulante des décisions
 *   GET /commentaires_demande/{id} → historique validations précédentes
 *
 * ── Soumission ─────────────────────────────────────────────────────────────
 *   POST /valider_avis/{id}/process_ongoing/{0|1}  (FormData)
 *   process_ongoing = 1 dans tous les cas sauf DG-NON (= 0)
 *
 * ── Logique modale DG ──────────────────────────────────────────────────────
 *   Si banque ≠ "AIG" ET banque ≠ "AWA" ET entite === "DG"
 *      ET décision choisie ≠ "Avis favorable"
 *   → Modale "Malgré votre avis Non favorable, poursuivre ? OUI/NON"
 *      OUI → confirmSubmission_DG() → process_ongoing = 1
 *      NON → cancelSubmission_DG()  → process_ongoing = 0
 *      ×   → DG_cancelBox()         → retour demandes_validation sans soumettre
 *   Sinon → confirmationModal standard → process_ongoing = 1
 *
 * ── Redirection après succès ───────────────────────────────────────────────
 *   AIG + GGR → ggrg_demandes_validation.html
 *   Autres    → demandes_validation.html
 *
 * ── Note PDF ───────────────────────────────────────────────────────────────
 *   Le lien note_analyse est construit avec .split('\\').pop() pour extraire
 *   le nom de fichier depuis le chemin Windows stocké en base.
 *   Ce comportement est intentionnel (format de stockage backend) — ne pas
 *   modifier.
 *
 * ── Corrections appliquées ─────────────────────────────────────────────────
 *   CORRECTION-04 : showAlert succès déplacé après vérification response.ok.
 */

import {
  defineComponent,
  ref,
  computed,
  onMounted,
  onUnmounted,
} from "https://unpkg.com/vue@3/dist/vue.esm-browser.js";

import { apiGet, apiPostForm } from "../services/api.js";
import { useCurrentUser }               from "../composables/useCurrentUser.js";
import { useNotificationPolling }       from "../composables/useNotificationPolling.js";

import AppSidebar  from "../components/layout/AppSidebar.js";
import AppNavbar   from "../components/layout/AppNavbar.js";
import AppFooter   from "../components/layout/AppFooter.js";
import ConfirmModal from "../components/ui/ConfirmModal.js";

// ---------------------------------------------------------------------------
// Id de la demande depuis l'URL (?id_dmd=X)
// ---------------------------------------------------------------------------
function getDemandId() {
  return new URLSearchParams(window.location.search).get("id_dmd");
}

// ---------------------------------------------------------------------------
// Composant page
// ---------------------------------------------------------------------------

export default defineComponent({
  name: "ValiderDemandePage",

  components: {
    AppSidebar,
    AppNavbar,
    AppFooter,
    ConfirmModal,
  },

  setup() {
    const user    = useCurrentUser();
    const polling = useNotificationPolling();

    const demandeId = getDemandId();

    // ---- Données de la demande ----
    const demande     = ref(null);
    const decisions   = ref([]);
    const commentaires = ref([]);
    const loadingDemande = ref(true);
    const errorDemande   = ref(null);

    // ---- Formulaire avis ----
    const selectedDecision = ref("");
    const commentaire      = ref("");

    // ---- Alerte inline ----
    const alert = ref(null);  // { message, type: 'success'|'danger' } | null

    function showAlert(message, type = "danger") {
      alert.value = { message, type };
      setTimeout(() => { alert.value = null; }, 5000);
    }

    // ---- Modales ----
    const showConfirmModal   = ref(false);
    const showDGModal        = ref(false);
    const showSuccessModal   = ref(false);

    // ---- Lien PDF (split '\\' intentionnel — format stockage backend) ----
    const pdfHref = computed(() => {
      if (!demande.value?.note_analyse) return "#";
      const filename = demande.value.note_analyse.split("\\").pop();
      return `/api/download/${filename}`;
    });

    // ---- Chargement ----
    async function loadAll() {
      loadingDemande.value = true;
      errorDemande.value = null;
      try {
        const [dData, decData, commData] = await Promise.all([
          apiGet(`/demande_particulier/${demandeId}`),
          apiGet("/decisions/"),
          apiGet(`/commentaires_demande/${demandeId}`),
        ]);
        demande.value      = dData.results?.[0] ?? null;
        decisions.value    = decData ?? [];
        commentaires.value = commData.results ?? [];

        // Pré-sélectionner la première décision
        if (decisions.value.length > 0) {
          selectedDecision.value = String(decisions.value[0].id);
        }
      } catch (e) {
        errorDemande.value = e.message;
      } finally {
        loadingDemande.value = false;
      }
    }

    // ---- Logique modale DG ----
    // Condition : banque ≠ AIG ET banque ≠ AWA ET entite = DG ET décision ≠ "Avis favorable"
    function _isDGCase() {
      const profil = user.raw.value;
      if (!profil) return false;
      if (profil.banque === "AIG" || profil.banque === "AWA") return false;
      if (profil.entite !== "DG") return false;
      const sel = decisions.value.find((d) => String(d.id) === selectedDecision.value);
      return sel?.libelle !== "Avis favorable";
    }

    // ---- onSubmit du formulaire (remplace showConfirmation) ----
    function handleFormSubmit(event) {
      event.preventDefault();
      if (_isDGCase()) {
        showDGModal.value = true;
      } else {
        showConfirmModal.value = true;
      }
    }

    // ---- Soumission générique ----
    async function _submit(processOngoing) {
      const fd = new FormData();
      fd.append("id_decision", selectedDecision.value);
      fd.append("commentaire", commentaire.value);

      try {
        const response = await apiPostForm(
          `/valider_avis/${demandeId}/process_ongoing/${processOngoing}`,
          fd
        );
        // CORRECTION-04 : alerte succès uniquement après vérification response.ok
        // (apiPostForm lance une erreur si !response.ok, donc on est ici = succès)
        showAlert("Validation en cours…", "success");
        await new Promise((r) => setTimeout(r, 2000));
        showSuccessModal.value = true;
      } catch (e) {
        console.error("[ValiderDemandePage] Erreur soumission :", e.message);
        showAlert("Erreur lors de la soumission du formulaire.", "danger");
      }
    }

    // Modale standard → Confirmer
    async function confirmSubmission() {
      showConfirmModal.value = false;
      await _submit(1);
    }

    // Modale DG → OUI (process_ongoing = 1)
    async function confirmSubmission_DG() {
      showDGModal.value = false;
      await _submit(1);
    }

    // Modale DG → NON (process_ongoing = 0)
    async function cancelSubmission_DG() {
      showDGModal.value = false;
      await _submit(0);
    }

    // Bouton × de la modale DG → retour liste sans soumettre
    function DG_cancelBox() {
      showDGModal.value = false;
      window.location.href = "demandes_validation.html";
    }

    // Après succès : redirige selon profil
    async function handleSuccess() {
      showSuccessModal.value = false;
      const profil = user.raw.value;
      if (profil?.entite === "GGR" && profil?.banque === "AIG") {
        window.location.replace("ggrg_demandes_validation.html");
      } else {
        window.location.replace("demandes_validation.html");
      }
    }

    // ---- Accordéon commentaires : état ouvert/fermé par index (vrai Vue) ----
    // Remplace buildCommentaireHTML() + v-html.
    // Chaque ligne a son propre booléen dans openStates[index].
    // Pas de Bootstrap, pas de DOM manipulation.
    const openStates = ref({});   // { [index]: boolean }

    function toggleAccordion(index) {
      openStates.value = {
        ...openStates.value,
        [index]: !openStates.value[index],
      };
    }

    function isOpen(index) {
      return !!openStates.value[index];
    }

    // ---- Cycle de vie ----
    onMounted(async () => {
      await user.fetchUser();
      polling.start();
      await loadAll();
    });

    onUnmounted(() => polling.stop());

    return {
      user,
      polling,
      demande,
      decisions,
      commentaires,
      loadingDemande,
      errorDemande,
      selectedDecision,
      commentaire,
      alert,
      pdfHref,
      showConfirmModal,
      showDGModal,
      showSuccessModal,
      handleFormSubmit,
      confirmSubmission,
      confirmSubmission_DG,
      cancelSubmission_DG,
      DG_cancelBox,
      handleSuccess,
      openStates,
      toggleAccordion,
      isOpen,
    };
  },

  template: /* html */ `
    <div class="flex min-h-screen" style="background: var(--color-bg-page);">

      <AppSidebar active-page="valid_dmd" />

      <div class="flex flex-col flex-1 min-w-0">

        <AppNavbar page-title="Validation de demandes" />

        <main class="flex-1 p-5" role="main">

          <!-- État chargement -->
          <div
            v-if="loadingDemande"
            class="flex items-center justify-center py-20 text-sm"
            style="color: var(--color-text-secondary);"
            aria-live="polite"
          >
            <svg class="animate-spin h-5 w-5 mr-2" style="color: var(--color-brand);"
                 xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
            Chargement de la demande…
          </div>

          <!-- État erreur -->
          <div
            v-else-if="errorDemande"
            class="p-6 rounded-xl text-sm text-center"
            style="color: var(--color-status-rejected); background: #fef2f2;"
            role="alert"
          >
            {{ errorDemande }}
          </div>

          <!-- Contenu principal -->
          <div v-else class="grid grid-cols-1 lg:grid-cols-2 gap-6">

            <!-- ============================================================
                 Colonne gauche : infos demande + formulaire avis
                 ============================================================ -->
            <div
              class="bg-white rounded-2xl shadow-sm border p-6"
              style="border-color: var(--color-brand-border); font-family: var(--font-family-base);"
            >
              <h6 class="font-bold text-base mb-4" style="color: var(--color-text-primary);">
                Informations de la demande
              </h6>

              <!-- Alerte inline -->
              <div
                v-if="alert"
                class="flex items-center gap-2 text-sm rounded-lg px-4 py-3 mb-4"
                :style="alert.type === 'success'
                  ? 'background:#f0fdf4; color:#16a34a; border:1px solid #bbf7d0;'
                  : 'background:#fef2f2; color:#dc2626; border:1px solid #fecaca;'"
                role="alert"
                aria-live="polite"
              >
                {{ alert.message }}
              </div>

              <!-- Tableau récapitulatif -->
              <table class="w-full text-sm mb-5 border-collapse">
                <tbody>
                  <tr v-for="field in [
                    { label: 'Type de demande', value: demande?.type_demande },
                    { label: 'Banque',           value: demande?.banque },
                    { label: 'Entité',           value: demande?.categorie_demande },
                    { label: 'Contrepartie',     value: demande?.nom_client },
                    { label: 'Montant (XOF)',    value: demande?.montant },
                    { label: 'Date / heure',     value: demande?.date_time },
                  ]" :key="field.label" class="border-b" style="border-color: var(--color-brand-border);">
                    <td class="py-2 pr-4 font-semibold w-40" style="color: var(--color-text-primary);">
                      {{ field.label }}
                    </td>
                    <td class="py-2" style="color: var(--color-text-secondary);">
                      {{ field.value || '—' }}
                    </td>
                  </tr>
                  <!-- Ligne note d'analyse avec lien téléchargement -->
                  <tr class="border-b" style="border-color: var(--color-brand-border);">
                    <td class="py-2 pr-4 font-semibold" style="color: var(--color-text-primary);">
                      Note d'analyse
                    </td>
                    <td class="py-2">
                      <a
                        :href="pdfHref"
                        target="_blank"
                        class="font-semibold underline"
                        style="color: var(--color-brand);"
                      >
                        Télécharger
                      </a>
                    </td>
                  </tr>
                </tbody>
              </table>

              <hr class="mb-5" style="border-color: var(--color-brand-border);" />

              <!-- Formulaire avis -->
              <form @submit.prevent="handleFormSubmit" id="avis_form">
                <!-- Décision -->
                <div class="mb-4">
                  <label
                    for="decision"
                    class="block text-sm font-semibold mb-1"
                    style="color: var(--color-text-primary);"
                  >
                    Décision
                  </label>
                  <select
                    id="decision"
                    v-model="selectedDecision"
                    class="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                    style="border-color: var(--color-brand-border); color: var(--color-text-primary);"
                    required
                  >
                    <option
                      v-for="d in decisions"
                      :key="d.id"
                      :value="String(d.id)"
                    >
                      {{ d.libelle }}
                    </option>
                  </select>
                </div>

                <!-- Commentaire -->
                <div class="mb-5">
                  <label
                    for="comm"
                    class="block text-sm font-semibold mb-1"
                    style="color: var(--color-text-primary);"
                  >
                    Commentaire
                  </label>
                  <textarea
                    id="comm"
                    v-model="commentaire"
                    rows="4"
                    class="w-full rounded-lg border px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-orange-300"
                    style="border-color: var(--color-brand-border); color: var(--color-text-primary);"
                  ></textarea>
                </div>

                <!-- Bouton Valider -->
                <div class="text-center">
                  <button
                    type="submit"
                    class="px-8 py-2 rounded-full text-white font-bold text-sm transition-colors"
                    style="background: var(--color-brand);"
                    onmouseover="this.style.background='var(--color-brand-dark)';"
                    onmouseout="this.style.background='var(--color-brand)';"
                  >
                    Valider
                  </button>
                </div>
              </form>
            </div>

            <!-- ============================================================
                 Colonne droite : historique des commentaires
                 ============================================================ -->
            <div
              class="bg-white rounded-2xl shadow-sm border p-6"
              style="border-color: var(--color-brand-border); font-family: var(--font-family-base);"
            >
              <h6 class="font-bold text-base mb-4" style="color: var(--color-text-primary);">
                Historique des validations
              </h6>

              <div
                v-if="commentaires.length === 0"
                class="text-sm text-center py-8"
                style="color: var(--color-text-muted);"
              >
                Aucun commentaire enregistré.
              </div>

              <!-- Accordéon Vue natif — v-for + v-show, pas de v-html ni de Bootstrap -->
              <div v-else>
                <div
                  v-for="(row, index) in commentaires"
                  :key="index"
                  class="border rounded-xl mb-3 overflow-hidden"
                  style="border-color: var(--color-brand-border);"
                >
                  <!-- En-tête cliquable -->
                  <button
                    type="button"
                    @click="toggleAccordion(index)"
                    class="w-full flex justify-between items-center px-4 py-3 text-left text-sm font-semibold
                           transition-colors focus:outline-none"
                    style="background: var(--color-brand-light);"
                    :aria-expanded="isOpen(index)"
                    :aria-controls="'accordion-body-' + index"
                  >
                    <span>{{ row.statut_d }} : {{ row.decision }}</span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      class="h-4 w-4 flex-shrink-0 transition-transform"
                      :style="isOpen(index) ? 'transform: rotate(180deg);' : ''"
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"
                      aria-hidden="true"
                    >
                      <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/>
                    </svg>
                  </button>

                  <!-- Corps (v-show = pas de re-render DOM, juste display:none) -->
                  <div
                    v-show="isOpen(index)"
                    :id="'accordion-body-' + index"
                    class="px-4 pb-4 pt-2 text-sm"
                    style="color: var(--color-text-secondary);"
                  >
                    <table class="w-full text-sm border-collapse mb-3">
                      <tbody>
                        <tr
                          v-for="field in [
                            { label: 'Nom',         value: row.nom },
                            { label: 'Prénom',      value: row.prenom },
                            { label: 'Banque',      value: row.banque },
                            { label: 'Entité',      value: row.entite },
                            { label: 'Décision',    value: row.decision },
                            { label: 'Date / heure',value: row.date_time },
                          ]"
                          :key="field.label"
                          class="border-b"
                          style="border-color: var(--color-brand-border);"
                        >
                          <td class="py-2 pr-4 font-semibold w-32"
                              style="color: var(--color-text-primary);">
                            {{ field.label }}
                          </td>
                          <td class="py-2">{{ field.value || '—' }}</td>
                        </tr>
                      </tbody>
                    </table>
                    <label
                      :for="'comm-hist-' + index"
                      class="block text-xs font-semibold mb-1"
                      style="color: var(--color-text-primary);"
                    >Commentaire</label>
                    <textarea
                      :id="'comm-hist-' + index"
                      :value="row.commentaire || ''"
                      rows="3"
                      class="w-full rounded-lg border px-3 py-2 text-sm resize-none"
                      style="border-color: var(--color-brand-border);"
                      disabled
                      readonly
                    ></textarea>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </main>

        <AppFooter />
      </div>

      <!-- ================================================================
           Popup notification (polling)
           ================================================================ -->
      <Transition name="fade">
        <div
          v-if="polling.show.value"
          class="fixed inset-0 z-50 flex items-start justify-center"
          style="background: rgba(0,0,0,0.35);"
          role="dialog"
          aria-modal="true"
          aria-labelledby="popup-notif-val-dem"
          @click.self="polling.dismiss()"
        >
          <div
            class="bg-white rounded-2xl mt-28 mx-4 w-full max-w-lg border-2 p-8 shadow-2xl"
            style="border-color: var(--color-brand);"
          >
            <h2
              id="popup-notif-val-dem"
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

      <!-- ================================================================
           Modale confirmation standard
           "Voulez-vous vraiment soumettre le formulaire ?"
           ================================================================ -->
      <ConfirmModal
        v-model:show="showConfirmModal"
        title="Confirmation"
        message="Voulez-vous vraiment soumettre le formulaire ?"
        confirm-label="Confirmer"
        cancel-label="Annuler"
        confirm-variant="primary"
        :with-comment="false"
        @confirm="confirmSubmission"
      />

      <!-- ================================================================
           Modale DG — avis défavorable
           "Malgré votre avis Non favorable, voulez-vous que la demande
            poursuive le processus OUI/NON ?"
           Bouton × → DG_cancelBox() (retour liste sans soumettre)
           ================================================================ -->
      <Transition name="modal-fade">
        <div
          v-if="showDGModal"
          class="fixed inset-0 z-50 flex items-center justify-center"
          style="background: rgba(0,0,0,0.4);"
          role="dialog"
          aria-modal="true"
          aria-labelledby="dg-modal-title"
        >
          <div
            class="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 border-2 overflow-hidden relative"
            style="border-color: var(--color-brand-border); font-family: var(--font-family-base);"
          >
            <!-- Bouton × (identique au legacy : retour sans soumettre) -->
            <button
              @click="DG_cancelBox"
              class="absolute top-3 right-3 text-xl leading-none text-slate-400
                     hover:text-slate-700 bg-transparent border-none cursor-pointer"
              aria-label="Fermer sans soumettre"
            >×</button>

            <div class="px-6 py-4 border-b" style="border-color: var(--color-brand-border);">
              <h5 id="dg-modal-title" class="font-bold text-base m-0"
                  style="color: var(--color-text-primary);">
                Confirmation
              </h5>
            </div>
            <div class="px-6 py-4 text-sm" style="color: var(--color-text-secondary);">
              Malgré votre avis Non favorable, voulez-vous que la demande poursuive le processus&nbsp;OUI/NON&nbsp;?
            </div>
            <div
              class="px-6 py-4 flex justify-end gap-3 border-t"
              style="border-color: var(--color-brand-border);"
            >
              <button
                @click="cancelSubmission_DG"
                class="px-5 py-2 rounded-full text-sm font-semibold border-2 transition-colors"
                style="color: var(--color-text-secondary); border-color: #d1d5db; background: #fff;"
                onmouseover="this.style.background='#f3f4f6';"
                onmouseout="this.style.background='#fff';"
              >NON</button>
              <button
                @click="confirmSubmission_DG"
                class="px-5 py-2 rounded-full text-sm font-semibold border-2 transition-colors text-white"
                style="background: var(--color-brand); border-color: var(--color-brand);"
                onmouseover="this.style.background='var(--color-brand-dark)';"
                onmouseout="this.style.background='var(--color-brand)';"
              >OUI</button>
            </div>
          </div>
        </div>
      </Transition>

      <!-- ================================================================
           Modale succès — "Votre avis a bien été enregistré !"
           ================================================================ -->
      <ConfirmModal
        v-model:show="showSuccessModal"
        title="Confirmation"
        message="Votre avis a bien été enregistré !"
        confirm-label="OK"
        :with-comment="false"
        @confirm="handleSuccess"
        @cancel="handleSuccess"
      />

    </div>
  `,
});
