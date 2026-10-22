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
} from "vue";

import { apiGet, apiPostForm, downloadNote } from "../services/api.js";
import { noteFilename } from "../components/demandes/DemandeForm.js";
import { useCurrentUser }               from "../composables/useCurrentUser.js";
import { useNotificationPolling }       from "../composables/useNotificationPolling.js";

import AppLayout from "../components/layout/AppLayout.js";
import BackArrow from "../components/ui/BackArrow.js";
import InfoModal from "../components/ui/InfoModal.js";
import AvisTimeline from "../components/demandes/AvisTimeline.js";
import ConfirmModal from "../components/ui/ConfirmModal.js";
import { BTN, CARD, FORM, TEXTAREA, SHEET, LINK, ALERT_DANGER_FORM, ALERT_SUCCESS_FORM } from "../components/ui/classes.js";

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

  components: { AppLayout, ConfirmModal, AvisTimeline, InfoModal, BackArrow },

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
    // Nom du fichier de la note d'analyse (téléchargement authentifié)
    const noteName = computed(() => noteFilename(demande.value?.note_analyse));

    // ---- Tableau « Informations de la demande » (valeurs brutes, comme le legacy) ----
    const infos = computed(() => {
      const d = demande.value;
      return [
        { label: "Type de demande", value: d?.type_demande ?? "" },
        { label: "Banque",          value: d?.banque ?? "" },
        { label: "Entité",          value: d?.categorie_demande ?? "" },
        { label: "Contrepartie",    value: d?.nom_client ?? "" },
        { label: "Montant (XOF)",   value: d?.montant ?? "" },
      ];
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
      noteName,
      downloadNote,
      infos,
      showConfirmModal,
      showDGModal,
      showSuccessModal,
      handleFormSubmit,
      confirmSubmission,
      confirmSubmission_DG,
      cancelSubmission_DG,
      DG_cancelBox,
      handleSuccess,
      BTN, CARD, FORM, TEXTAREA, SHEET, LINK, ALERT_DANGER_FORM, ALERT_SUCCESS_FORM,
    };
  },

  template: /* html */ `
    <AppLayout :polling="polling">
        <div class="flex flex-wrap -mx-3">
            <div class="relative w-full px-3">
                <BackArrow fallback="demandes_validation.html" class="pl-6" />
                <div :class="CARD.card + ' w-full mb-6'">
                    <div class="flex flex-wrap h-full overflow-hidden">
                        <div class="relative flex items-center w-full md:w-1/2 pt-px">
                            <span class="absolute left-0 right-0 top-full border-t border-line"></span>
                            <span class="absolute top-0 -left-px h-full border-l border-line"></span>
                            <div class="flex-auto p-6">
                                <h6 class="mb-4 font-medium leading-[1.1]">Informations de la demande</h6>
                                <div id="alert-container">
                                    <div v-if="alert" :class="alert.type === 'success' ? ALERT_SUCCESS_FORM : ALERT_DANGER_FORM">
                                        <i :class="'bi bi-' + (alert.type === 'success' ? 'check-circle' : 'exclamation-triangle')"></i>
                                        {{ alert.message }}
                                    </div>
                                    <div v-if="errorDemande" :class="ALERT_DANGER_FORM">
                                        <i class="bi bi-exclamation-triangle"></i>
                                        Erreur lors du chargement de la demande : {{ errorDemande }}
                                    </div>
                                </div>
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
                                            <tr>
                                                <td :class="SHEET.td">
                                                    <div :class="SHEET.cell">
                                                    <strong :class="SHEET.label"> Note d'analyse </strong>
                                                    </div>
                                                </td>
                                                <td :class="SHEET.td">
                                                    <div :class="SHEET.cell">
                                                    <h6 :class="SHEET.value">
                                                        <a v-if="noteName" href="javascript:" :class="LINK" @click.prevent="downloadNote(noteName)">Télécharger</a>
                                                        <span v-else>Aucune note jointe</span>
                                                    </h6>
                                                    </div>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td :class="SHEET.td">
                                                    <div :class="SHEET.cell">
                                                    <strong :class="SHEET.label"> Date/heure </strong>
                                                    </div>
                                                </td>
                                                <td :class="SHEET.td">
                                                    <div :class="SHEET.cell">
                                                    <h6 :class="SHEET.value"> {{ demande?.date_time }} </h6>
                                                    </div>
                                                </td>
                                            </tr>
                                    </tbody>
                                </table>
                                <hr class="my-4 border-line">
                                <form @submit="handleFormSubmit">
                                    <div :class="FORM.group">
                                        <label class="inline-block text-[13.3px] leading-[1.47] font-medium" for="decision"><strong class="font-black">Décision </strong></label>
                                        <select :class="FORM.select" id="decision" v-model="selectedDecision" required>
                                            <option v-for="d in decisions" :key="d.id" :value="String(d.id)">{{ d.libelle }}</option>
                                        </select>
                                    </div>
                                    <div :class="FORM.group">
                                        <label class="inline-block mb-2" for="comm"><strong class="font-black">Commentaire</strong></label>
                                        <textarea :class="TEXTAREA" id='comm' v-model="commentaire"></textarea>
                                    </div>
                                    <div class="text-center"> <button id="valider_avis" type="submit" :class="BTN.primary">Valider</button></div>
                                </form>
                            </div>
                        </div>
                        <div class="relative flex items-center w-full md:w-1/2 pt-px">
                            <span class="absolute left-0 right-0 top-full border-t border-line"></span>
                            <span class="absolute top-0 -left-px h-full border-l border-line"></span>
                            <div class="w-full px-8">
                                    <div class="p-6">
                                        <div id="detail_commentaire" class="relative px-3">
                                            <AvisTimeline :avis="commentaires" :open-last="false" />
                                        </div>
                                    </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <template #modals>
            <ConfirmModal
                v-model:show="showConfirmModal"
                title="Confirmation"
                message="Voulez-vous vraiment soumettre le formulaire ?"
                @confirm="confirmSubmission"
            />
            <ConfirmModal
                v-model:show="showDGModal"
                title="Confirmation"
                message="Malgré votre avis Non favorable, voulez-vous que la demande poursuive le processus OUI/NON ?"
                confirm-label="OUI"
                cancel-label="NON"
                :closable="true"
                @confirm="confirmSubmission_DG"
                @cancel="cancelSubmission_DG"
                @close="DG_cancelBox"
            />
            <InfoModal
                :show="showSuccessModal"
                title="Confirmation"
                message="Votre avis bien été enregistré !"
                @ok="handleSuccess"
            />
        </template>
    </AppLayout>
  `,
});
