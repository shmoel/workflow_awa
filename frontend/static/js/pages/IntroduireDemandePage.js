/**
 * pages/IntroduireDemandePage.js
 *
 * Composant "page" pour introduire_demandes.html — saisie d'une nouvelle demande.
 *
 * Endpoints :
 *   GET  /banques/                  → liste des banques
 *   GET  /types_demandes/{entite}/  → types de demande de l'entité de l'utilisateur
 *   POST /demandes/                 → création (multipart, note d'analyse PDF)
 *   POST /avis/                     → premier avis (id_event = 1, id_decision = 1)
 *
 * Comportement legacy conservé :
 *   - Confirmation « Voulez-vous vraiment soumettre le formulaire ? »
 *   - Création de la demande puis de l'avis initial, en deux appels
 *   - Modale « Demande Bien enregistrée ! », OK recharge la page
 *   - Pas de polling de notification (absent du legacy)
 *
 * Corrections (voir CHANGELOG_REFACTORING.md, CORRECTION-09) :
 *   - Erreur de chargement des listes ou d'envoi affichée dans un bandeau
 *     (le legacy levait des exceptions non interceptées : rien ne s'affichait)
 *   - Bouton désactivé pendant l'envoi (double soumission possible)
 *   - Code mort non repris : confirmerEnvoi() (appelait demande_register(),
 *     inexistante), showConfirmation_validation()
 */

import {
  defineComponent,
  ref,
  onMounted,
} from "https://unpkg.com/vue@3/dist/vue.esm-browser.js";

import { apiGet, apiPost, apiPostForm } from "../services/api.js";
import { useCurrentUser }              from "../composables/useCurrentUser.js";

import AppSidebar   from "../components/layout/AppSidebar.js";
import AppNavbar    from "../components/layout/AppNavbar.js";
import AppFooter    from "../components/layout/AppFooter.js";
import DemandeForm  from "../components/demandes/DemandeForm.js";
import ConfirmModal from "../components/ui/ConfirmModal.js";
import InfoModal    from "../components/ui/InfoModal.js";

export default defineComponent({
  name: "IntroduireDemandePage",

  components: { AppSidebar, AppNavbar, AppFooter, DemandeForm, ConfirmModal, InfoModal },

  setup() {
    const user = useCurrentUser();

    const banques     = ref([]);
    const types       = ref([]);
    const loadError   = ref(null);
    const submitError = ref(null);
    const submitting  = ref(false);
    const showConfirm = ref(false);
    const showSuccess = ref(false);

    /** Valeurs saisies, en attente de confirmation */
    let pending = null;

    async function loadListes() {
      loadError.value = null;
      try {
        const entite = user.entite.value;
        const [banquesData, typesData] = await Promise.all([
          apiGet("/banques/"),
          apiGet(`/types_demandes/${encodeURIComponent(entite)}/`),
        ]);
        banques.value = banquesData ?? [];
        types.value   = typesData.results ?? [];
      } catch (e) {
        loadError.value = e.message;
      }
    }

    function askConfirm(values) {
      pending = values;
      submitError.value = null;
      showConfirm.value = true;
    }

    async function submit() {
      if (!pending) return;
      const profil = user.raw.value;
      if (!profil?.user_id) {
        submitError.value = "Utilisateur non trouvé.";
        return;
      }

      submitting.value = true;
      submitError.value = null;
      try {
        const fd = new FormData();
        fd.append("id_user", profil.user_id);
        fd.append("banque", pending.banque);
        fd.append("nom_client", pending.client);
        fd.append("montant", pending.montant);
        fd.append("commentaire_intro", pending.comm || "");
        fd.append("id_typedemande", pending.type);
        fd.append("note_analyse", pending.file);

        const demande = await apiPostForm("/demandes/", fd);

        // Avis initial : le niveau de validation correspond au type
        // d'institution de la banque de l'utilisateur (legacy)
        await apiPost("/avis/", {
          commentaire:         demande.commentaire_intro,
          date:                demande.date,
          heure:               demande.heure,
          id_demande:          demande.id,
          id_event:            1,
          id_valideur:         profil.user_id,
          id_decision:         1,
          id_niveauValidation: profil.id_type_instit,
        });

        showSuccess.value = true;
      } catch (e) {
        submitError.value = e.message;
      } finally {
        submitting.value = false;
      }
    }

    function onSuccessOk() {
      window.location.reload();
    }

    onMounted(async () => {
      await user.fetchUser();
      if (user.raw.value) await loadListes();
    });

    return {
      user,
      banques,
      types,
      loadError,
      submitError,
      submitting,
      showConfirm,
      showSuccess,
      askConfirm,
      submit,
      onSuccessOk,
    };
  },

  template: /* html */ `
    <div class="flex min-h-screen" style="background: var(--color-bg-page);">

      <AppSidebar active-page="intro_dmd" />

      <div class="flex flex-col flex-1 min-w-0">

        <AppNavbar page-title="Introduire une demande" />

        <main class="flex-1 p-5" role="main" aria-label="Introduire une demande">
          <section
            class="bg-white rounded-2xl shadow-sm border p-6 max-w-2xl mx-auto"
            style="border-color: var(--color-brand-border);"
            aria-labelledby="intro-title"
          >
            <h2 id="intro-title" class="text-lg font-bold mb-4">INTRODUIRE UNE DEMANDE</h2>

            <div
              v-if="loadError || user.error.value"
              class="rounded-xl border px-4 py-3 text-sm mb-4"
              style="border-color: var(--color-status-rejected); color: var(--color-status-rejected); background: #fef2f2;"
              role="alert"
            >
              Impossible de charger les données du formulaire. Veuillez réessayer.
              ({{ loadError || user.error.value }})
            </div>

            <div
              v-if="submitError"
              class="rounded-xl border px-4 py-3 text-sm mb-4"
              style="border-color: var(--color-status-rejected); color: var(--color-status-rejected); background: #fef2f2;"
              role="alert"
            >
              Erreur lors de l'enregistrement de la demande : {{ submitError }}
            </div>

            <DemandeForm
              :banques="banques"
              :types="types"
              :note-required="true"
              submit-label="Soumettre"
              :submitting="submitting"
              @submit="askConfirm"
            />
          </section>
        </main>

        <AppFooter />
      </div>

      <ConfirmModal
        v-model:show="showConfirm"
        title="Confirmation"
        message="Voulez-vous vraiment soumettre le formulaire ?"
        @confirm="submit"
      />

      <InfoModal
        :show="showSuccess"
        title="Validation"
        message="Demande Bien enregistrée !"
        @ok="onSuccessOk"
      />
    </div>
  `,
});
