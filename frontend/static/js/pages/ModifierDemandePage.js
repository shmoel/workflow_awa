/**
 * pages/ModifierDemandePage.js
 *
 * Composant "page" pour modifier_demande.html — modification d'une demande.
 * Paramètre d'URL : ?id_dmd={id}
 *
 * Endpoints :
 *   GET  /banques/                    → liste des banques
 *   GET  /types_demandes/{entite}/    → types de demande de l'entité de l'utilisateur
 *   GET  /demandes/{id}               → valeurs actuelles de la demande
 *   POST /update_demandes/{id}        → modification (multipart, note facultative)
 *
 * Comportement legacy conservé :
 *   - Formulaire identique à l'introduction (DemandeForm), note facultative
 *   - Lien « Consulter la note préalablement enregistrée »
 *   - Confirmation « Voulez-vous vraiment modifier cette demande ? »
 *   - Modale « Demande modifiée avec succès », OK redirige vers consulter_demandes.html
 *
 * Corrections (voir CHANGELOG_REFACTORING.md, CORRECTION-10) :
 *   - Banque présélectionnée par son id (le legacy utilisait
 *     selectedIndex = id_banque - 1 : mauvaise banque si les id ne se suivent pas)
 *   - Lien de la note : nom de fichier extrait du chemin complet stocké par
 *     /update_demandes/ (le legacy produisait un lien cassé après une modification)
 *   - Validation des champs obligatoires avant la confirmation (le legacy
 *     ouvrait la modale au clic, avant la validation du formulaire)
 *   - « Demande introuvable » si id_dmd est absent, invalide ou inconnu
 *   - Erreurs affichées dans un bandeau (exceptions non interceptées dans le legacy)
 */

import {
  defineComponent,
  ref,
  onMounted,
} from "https://unpkg.com/vue@3/dist/vue.esm-browser.js";

import { apiGet, apiPostForm } from "../services/api.js";
import { useCurrentUser }      from "../composables/useCurrentUser.js";

import AppSidebar   from "../components/layout/AppSidebar.js";
import AppNavbar    from "../components/layout/AppNavbar.js";
import AppFooter    from "../components/layout/AppFooter.js";
import DemandeForm  from "../components/demandes/DemandeForm.js";
import ConfirmModal from "../components/ui/ConfirmModal.js";
import InfoModal    from "../components/ui/InfoModal.js";

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
  name: "ModifierDemandePage",

  components: { AppSidebar, AppNavbar, AppFooter, DemandeForm, ConfirmModal, InfoModal },

  setup() {
    const user = useCurrentUser();
    const demandeId = readDemandeId();

    const banques      = ref([]);
    const types        = ref([]);
    const initial      = ref({});
    const existingNote = ref(null);
    const loading      = ref(true);
    const notFound     = ref(false);
    const loadError    = ref(null);
    const submitError  = ref(null);
    const submitting   = ref(false);
    const showConfirm  = ref(false);
    const showSuccess  = ref(false);

    let pending = null;

    async function load() {
      loadError.value = null;
      try {
        const entite = user.entite.value;
        const [banquesData, typesData, demandeData] = await Promise.all([
          apiGet("/banques/"),
          apiGet(`/types_demandes/${encodeURIComponent(entite)}/`),
          apiGet(`/demandes/${demandeId}`).catch(() => null),
        ]);
        const d = demandeData?.results;
        if (!d) {
          notFound.value = true;
          return;
        }
        banques.value = banquesData ?? [];
        types.value   = typesData.results ?? [];
        initial.value = {
          banque:  String(d.id_banque),
          type:    String(d.id_type_demande),
          client:  d.nom_client ?? "",
          montant: d.montant ?? "",
          comm:    d.commentaire_intro ?? "",
        };
        existingNote.value = d.note_analyse || null;
      } catch (e) {
        loadError.value = e.message;
      } finally {
        loading.value = false;
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
        if (pending.file) fd.append("note_analyse", pending.file);

        await apiPostForm(`/update_demandes/${demandeId}`, fd);
        showSuccess.value = true;
      } catch (e) {
        submitError.value = e.message;
      } finally {
        submitting.value = false;
      }
    }

    function onSuccessOk() {
      window.location.replace("consulter_demandes.html");
    }

    onMounted(async () => {
      await user.fetchUser();
      if (!demandeId) {
        notFound.value = true;
        loading.value  = false;
        return;
      }
      if (user.raw.value) await load();
      else loading.value = false;
    });

    return {
      user,
      banques,
      types,
      initial,
      existingNote,
      loading,
      notFound,
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

      <AppSidebar active-page="consult_dmd" />

      <div class="flex flex-col flex-1 min-w-0">

        <AppNavbar page-title="Modifier la demande" />

        <main class="flex-1 p-5" role="main" aria-label="Modifier la demande">

          <p v-if="loading" class="text-sm" style="color: var(--color-text-secondary);" role="status">
            Chargement de la demande…
          </p>

          <section
            v-else-if="notFound"
            class="bg-white rounded-2xl shadow-sm border p-8 text-center max-w-2xl mx-auto"
            style="border-color: var(--color-brand-border);"
            role="alert"
          >
            <h2 class="text-lg font-bold mb-2" style="color: var(--color-brand);">Demande introuvable</h2>
            <p class="text-sm mb-4" style="color: var(--color-text-secondary);">
              L'identifiant de demande est absent, invalide ou ne correspond à aucune demande.
            </p>
            <a
              href="consulter_demandes.html"
              class="inline-block px-5 py-2 rounded-full text-white text-sm font-semibold"
              style="background: var(--color-brand); text-decoration: none;"
            >Retour à mes demandes</a>
          </section>

          <section
            v-else
            class="bg-white rounded-2xl shadow-sm border p-6 max-w-2xl mx-auto"
            style="border-color: var(--color-brand-border);"
            aria-labelledby="modif-title"
          >
            <h2 id="modif-title" class="text-lg font-bold mb-4">MODIFIER LA DEMANDE</h2>

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
              Erreur lors de la modification : {{ submitError }}
            </div>

            <DemandeForm
              :banques="banques"
              :types="types"
              :initial="initial"
              :note-required="false"
              :existing-note="existingNote"
              submit-label="Modifier"
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
        message="Voulez-vous vraiment modifier cette demande ?"
        @confirm="submit"
      />

      <InfoModal
        :show="showSuccess"
        title="Validation"
        message="Demande modifiée avec succès"
        @ok="onSuccessOk"
      />
    </div>
  `,
});
