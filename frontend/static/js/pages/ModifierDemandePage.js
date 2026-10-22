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
 * Corrections (voir docs/CHANGELOG_REFACTORING.md, CORRECTION-10) :
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
} from "vue";

import { apiGet, apiPostForm } from "../services/api.js";
import { useCurrentUser }      from "../composables/useCurrentUser.js";

import AppLayout from "../components/layout/AppLayout.js";
import BackArrow from "../components/ui/BackArrow.js";
import DemandeForm  from "../components/demandes/DemandeForm.js";
import ConfirmModal from "../components/ui/ConfirmModal.js";
import InfoModal    from "../components/ui/InfoModal.js";
import { CARD, ALERT_DANGER_FORM, LINK } from "../components/ui/classes.js";

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

  components: { AppLayout, DemandeForm, ConfirmModal, InfoModal, BackArrow },

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
      CARD, ALERT_DANGER_FORM, LINK,
    };
  },

  template: /* html */ `
    <AppLayout>
        <div class="flex-grow px-4 lg:px-8 py-6">

            <div class="w-full px-8">
              <BackArrow fallback="consulter_demandes.html" class="lg:ml-[calc(16.6667%-8px)]" />
              <div class="flex flex-wrap -mx-3">
            <div class="relative w-full lg:w-1/6 px-3"></div>
            <div :class="CARD.card + ' w-full md:w-2/3 mb-6 px-3'">
                <h4 :class="CARD.header"> MODIFIER LA DEMANDE</h4>
                <div :class="CARD.body">
                    <div v-if="notFound" :class="ALERT_DANGER_FORM" role="alert">
                        Demande introuvable : l'identifiant est absent, invalide ou ne correspond à aucune demande.
                        <a href="consulter_demandes.html" :class="LINK">Retour à mes demandes</a>
                    </div>
                    <template v-else-if="!loading">
                        <div v-if="loadError || user.error.value" :class="ALERT_DANGER_FORM" role="alert">
                            Impossible de charger les données du formulaire. Veuillez réessayer.
                            ({{ loadError || user.error.value }})
                        </div>
                        <div v-if="submitError" :class="ALERT_DANGER_FORM" role="alert">
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
                    </template>
                </div>
            </div>
            <div class="relative w-full lg:w-1/6 px-3"></div>
            </div>
            </div>
        </div>

        <template #modals>
            <ConfirmModal
                v-model:show="showConfirm"
                variant="design"
                title="Confirmation"
                message="Voulez-vous vraiment modifier cette demande ?"
                @confirm="submit"
            />
            <InfoModal
                :show="showSuccess"
                variant="design"
                title="Validation"
                message="Demande  modifiée avec succès"
                @ok="onSuccessOk"
            />
        </template>
    </AppLayout>
  `,
});
