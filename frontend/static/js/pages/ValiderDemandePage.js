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
 *   process_ongoing = PROCESS.POURSUIVRE (1) dans tous les cas sauf DG-NON
 *   (PROCESS.ARRETER = 0)
 *
 * ── Logique modale DG ──────────────────────────────────────────────────────
 *   Si banque ≠ "AIG" ET banque ≠ "AWA" ET entite === "DG"
 *      ET décision choisie ≠ "Avis favorable"
 *   → Modale "Malgré votre avis non favorable, … poursuive le circuit ?"
 *      « Poursuivre le circuit » → dgContinue() → PROCESS.POURSUIVRE
 *      « Arrêter la demande »    → dgStop()     → PROCESS.ARRETER (statut EVENT.ARRETEE_DG)
 *      ×                         → dgClose()    → retour demandes_validation sans soumettre
 *   Sinon → confirmationModal standard → process_ongoing = 1
 *
 * ── Lot G (feuille de route UI/UX, point 7) ────────────────────────────────
 *   Aucune décision présélectionnée (option « Choisir une décision », champ
 *   obligatoire) ; la confirmation rappelle la décision et la demande ;
 *   boutons du DG explicites au lieu de « OUI / NON » ; plus d'attente de 2 s
 *   après l'enregistrement ; bouton « Valider » désactivé pendant l'envoi.
 *
 * ── Redirection après succès ───────────────────────────────────────────────
 *   AIG + GGR → ggrg_demandes_validation.html
 *   Autres    → demandes_validation.html
 *
 * ── Note d'analyse ─────────────────────────────────────────────────────────
 *   noteFilename() extrait le nom du fichier (le backend stocke parfois un
 *   chemin complet) ; téléchargement authentifié par downloadNote().
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

import { apiGet, apiPostForm } from "../services/api.js";
import { useNoteDownload }   from "../composables/useNoteDownload.js";
import { noteFilename } from "../components/demandes/DemandeForm.js";
import { formatNumber } from "../components/demandes/DemandesTable.js";
import { useCurrentUser }               from "../composables/useCurrentUser.js";
import { useNotificationPolling }       from "../composables/useNotificationPolling.js";
import { useTimedAlert }                from "../composables/useTimedAlert.js";
import { readDemandeId }                from "../utils/url.js";
import { PROCESS }                      from "../domain/workflow.js";

import AppLayout from "../components/layout/AppLayout.js";
import BackArrow from "../components/ui/BackArrow.js";
import InfoModal from "../components/ui/InfoModal.js";
import AvisTimeline from "../components/demandes/AvisTimeline.js";
import ConfirmModal from "../components/ui/ConfirmModal.js";
import { BTN, CARD, FORM, TEXTAREA, SHEET, LINK, ALERT_DANGER_FORM, ALERT_SUCCESS_FORM } from "../components/ui/classes.js";

// ---------------------------------------------------------------------------
// Composant page
// ---------------------------------------------------------------------------

export default defineComponent({
  name: "ValiderDemandePage",

  components: { AppLayout, ConfirmModal, AvisTimeline, InfoModal, BackArrow },

  setup() {
    const user    = useCurrentUser();
    const polling = useNotificationPolling();

    const demandeId = readDemandeId();

    // ---- Données de la demande ----
    const demande     = ref(null);
    const decisions   = ref([]);
    const commentaires = ref([]);
    const loadingDemande = ref(true);
    const errorDemande   = ref(null);

    // ---- Formulaire avis ----
    const selectedDecision = ref("");   // vide : l'utilisateur doit choisir
    const commentaire      = ref("");
    const submitting       = ref(false);

    // ---- Alerte inline ----
    const { alert, showAlert } = useTimedAlert();
    const { noteError, openNote } = useNoteDownload();

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
        { label: "Montant (XOF)",   value: formatNumber(d?.montant) },
      ];
    });

    // ---- Récapitulatif affiché dans la fenêtre de confirmation ----
    const decisionLabel = computed(() =>
      decisions.value.find((d) => String(d.id) === selectedDecision.value)?.libelle ?? ""
    );
    const recap = computed(() => {
      const d = demande.value;
      return [
        { label: "Décision",     value: decisionLabel.value },
        { label: "Référence",    value: d ? `DEM-${d.categorie_demande}-${d.id_demande}` : "" },
        { label: "Contrepartie", value: d?.nom_client ?? "" },
        { label: "Montant",      value: d ? `${formatNumber(d.montant)} XOF` : "" },
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
      } catch (e) {
        errorDemande.value = e.message;
      } finally {
        loadingDemande.value = false;
      }
    }

    // ---- Logique modale DG ----
    // Condition : banque ≠ AIG ET banque ≠ AWA ET entite = DG ET décision ≠ "Avis favorable"
    function isDgCase() {
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
      if (isDgCase()) {
        showDGModal.value = true;
      } else {
        showConfirmModal.value = true;
      }
    }

    // ---- Soumission générique ----
    async function submitAvis(processOngoing) {
      if (submitting.value) return;
      submitting.value = true;
      const fd = new FormData();
      fd.append("id_decision", selectedDecision.value);
      fd.append("commentaire", commentaire.value);

      try {
        const response = await apiPostForm(
          `/valider_avis/${demandeId}/process_ongoing/${processOngoing}`,
          fd
        );
        // CORRECTION-04 : succès affiché uniquement après vérification response.ok
        // (apiPostForm lance une erreur si !response.ok, donc on est ici = succès)
        showSuccessModal.value = true;
      } catch (e) {
        // e.message : message de l'API destiné à l'utilisateur (ApiError)
        showAlert("danger", `Erreur lors de la soumission du formulaire : ${e.message}`);
      } finally {
        submitting.value = false;
      }
    }

    // Modale standard → Confirmer
    async function confirmSubmission() {
      showConfirmModal.value = false;
      await submitAvis(PROCESS.POURSUIVRE);
    }

    // Modale DG → OUI : la demande poursuit le circuit
    async function dgContinue() {
      showDGModal.value = false;
      await submitAvis(PROCESS.POURSUIVRE);
    }

    // Modale DG → NON : le DG arrête la demande
    async function dgStop() {
      showDGModal.value = false;
      await submitAvis(PROCESS.ARRETER);
    }

    // Bouton × de la modale DG → retour liste sans soumettre
    function dgClose() {
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
      submitting,
      recap,
      alert,
      noteName,
      noteError,
      openNote,
      infos,
      showConfirmModal,
      showDGModal,
      showSuccessModal,
      handleFormSubmit,
      confirmSubmission,
      dgContinue,
      dgStop,
      dgClose,
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
                                        {{ alert.text }}
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
                                                        <template v-if="noteName">
                                                            <button type="button" :class="LINK" @click="openNote(noteName)">Télécharger</button>
                                                            <small v-if="noteError" class="block mt-1 text-sm text-danger" role="alert">{{ noteError }}</small>
                                                        </template>
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
                                            <option value="" disabled>Choisir une décision</option>
                                            <option v-for="d in decisions" :key="d.id" :value="String(d.id)">{{ d.libelle }}</option>
                                        </select>
                                    </div>
                                    <div :class="FORM.group">
                                        <label class="inline-block mb-2" for="comm"><strong class="font-black">Commentaire</strong></label>
                                        <textarea :class="TEXTAREA" id='comm' v-model="commentaire"></textarea>
                                    </div>
                                    <div class="text-center"> <button id="valider_avis" type="submit" :class="BTN.primary" :disabled="submitting">{{ submitting ? 'Envoi…' : 'Valider' }}</button></div>
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
                @confirm="confirmSubmission"
            >
                <p class="mb-3">Voulez-vous vraiment enregistrer cet avis ?</p>
                <dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 m-0" data-recap>
                    <template v-for="r in recap" :key="r.label">
                        <dt class="font-bold">{{ r.label }}</dt>
                        <dd class="m-0">{{ r.value }}</dd>
                    </template>
                </dl>
            </ConfirmModal>
            <ConfirmModal
                v-model:show="showDGModal"
                title="Confirmation"
                message="Malgré votre avis non favorable, voulez-vous que la demande poursuive le circuit de validation ?"
                confirm-label="Poursuivre le circuit"
                cancel-label="Arrêter la demande"
                :closable="true"
                @confirm="dgContinue"
                @cancel="dgStop"
                @close="dgClose"
            />
            <InfoModal
                :show="showSuccessModal"
                title="Confirmation"
                message="Votre avis a bien été enregistré !"
                @ok="handleSuccess"
            />
        </template>
    </AppLayout>
  `,
});
