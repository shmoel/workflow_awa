/**
 * pages/ChatPage.js
 *
 * Composant "page" pour chat.html — échanges de messages sur une demande.
 * Paramètre d'URL : ?id_dmd={id}
 *
 * Endpoints :
 *   GET  /demandes/{id}       → en-tête (banque, client, type, montant, statut, date)
 *   GET  /messages_chat/{id}  → messages, ordre chronologique
 *   POST /commenter/          → envoi d'un message (multipart)
 *
 * Comportement legacy conservé :
 *   - En-tête « Chat Demandes Bancaires ###DEM-{catégorie}-{id} »
 *   - Messages de l'utilisateur à droite (« Vous »), des autres à gauche (username)
 *   - Envoi par le bouton ou la touche Entrée
 *   - Popup de notification (polling)
 *
 * Corrections (voir docs/CHANGELOG_REFACTORING.md, CORRECTION-11) :
 *   - Le message n'est affiché qu'après la réponse OK de /commenter/ (le
 *     legacy l'affichait même en cas d'erreur HTTP)
 *   - Badge « Nouveau » de l'accueil : le dernier message est marqué vu au
 *     chargement et après chaque envoi (son propre message déclenchait le badge)
 *   - Popup de notification affichée (bloc HTML commenté dans le legacy)
 *   - « Demande introuvable » si id_dmd est absent, invalide ou inconnu
 *   - Code mort non repris : getBotResponse() (réponses simulées « BanqueBot »,
 *     jamais affichées, 1 s d'attente à chaque envoi)
 *
 * AvisTimeline n'est pas réutilisé : la page affiche des messages
 * (table commentaires), pas l'historique des avis.
 */

import {
  defineComponent,
  ref,
  nextTick,
  onMounted,
  onUnmounted,
} from "vue";

import { apiGet, apiPostForm }      from "../services/api.js";
import { markMessagesSeen }         from "../services/chatSeen.js";
import { useCurrentUser }           from "../composables/useCurrentUser.js";
import { useNotificationPolling }   from "../composables/useNotificationPolling.js";

import AppLayout from "../components/layout/AppLayout.js";
import BackArrow from "../components/ui/BackArrow.js";
import { ALERT_DANGER, LINK } from "../components/ui/classes.js";

// En-tête du chat : libellé gris en capitales, valeur en gras (ex-.info-label / .info-value)
const INFO_LABEL = "text-[0.75rem] font-medium uppercase tracking-[0.05em] text-[#64748b]";
const INFO_VALUE = "text-[0.875rem] font-semibold text-[#1e293b]";

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
  name: "ChatPage",

  components: { AppLayout, BackArrow },

  setup() {
    const user      = useCurrentUser();
    const polling   = useNotificationPolling();
    const demandeId = readDemandeId();

    const demande   = ref(null);
    const messages  = ref([]);
    const loading   = ref(true);
    const notFound  = ref(false);
    const error     = ref(null);
    const draft     = ref("");
    const sending   = ref(false);
    const sendError = ref(null);
    const listEl    = ref(null);

    function isMine(msg) {
      return String(msg.id_user) === String(user.user_id.value);
    }

    async function scrollToBottom() {
      await nextTick();
      // Le Play CDN Tailwind génère le CSS des nouveaux éléments après leur
      // insertion : on attend deux images pour que la zone ait sa hauteur
      // fixe (300 px) avant de défiler jusqu'au dernier message.
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      if (listEl.value) listEl.value.scrollTop = listEl.value.scrollHeight;
    }

    async function loadMessages() {
      const data = await apiGet(`/messages_chat/${demandeId}`);
      messages.value = data.results ?? [];
      markMessagesSeen(demandeId, messages.value);
      await scrollToBottom();
    }

    async function load() {
      try {
        const dmd = await apiGet(`/demandes/${demandeId}`).catch(() => null);
        if (!dmd?.results) {
          notFound.value = true;
          return;
        }
        demande.value = dmd.results;
        await loadMessages();
      } catch (e) {
        error.value = e.message;
      } finally {
        loading.value = false;
      }
    }

    async function send() {
      const text = draft.value.trim();
      if (!text || sending.value || !user.user_id.value) return;

      sending.value   = true;
      sendError.value = null;
      try {
        const fd = new FormData();
        fd.append("id_user", user.user_id.value);
        fd.append("commentaire", text);
        fd.append("demande_id", demandeId);
        await apiPostForm("/commenter/", fd);
        draft.value = "";
        await loadMessages();
      } catch (e) {
        sendError.value = e.message;
      } finally {
        sending.value = false;
      }
    }

    onMounted(async () => {
      await user.fetchUser();
      polling.start();
      if (!demandeId) {
        notFound.value = true;
        loading.value  = false;
        return;
      }
      await load();
    });

    onUnmounted(() => polling.stop());

    return {
      user,
      polling,
      demande,
      messages,
      loading,
      notFound,
      error,
      draft,
      sending,
      sendError,
      listEl,
      isMine,
      send,
      ALERT_DANGER, LINK, INFO_LABEL, INFO_VALUE,
    };
  },

  template: /* html */ `
    <AppLayout :polling="polling" menu-label="Actions">
            <div class="flex flex-wrap -mx-3 min-h-px">

            </div>
            <div class="flex flex-wrap -mx-3 min-h-px">

            </div>
            <div class="flex flex-wrap -mx-3 min-h-px">
                <div class="relative w-full xl:w-1/6 px-3"></div>
                <div class="relative w-full xl:w-2/3 px-3">
                    <BackArrow fallback="acceuil.html" />

                    <div v-if="notFound" :class="ALERT_DANGER" role="alert">
                        Demande introuvable : l'identifiant est absent, invalide ou ne correspond à aucune demande.
                        <a href="acceuil.html" :class="LINK">Retour à l'accueil</a>
                    </div>

                    <div v-else-if="error" :class="ALERT_DANGER" role="alert">
                        Erreur lors du chargement de la conversation : {{ error }}
                    </div>

                    <div v-else-if="demande">
                        <div class="flex items-center justify-between p-4 text-white bg-[#ea580c] shadow-[0_2px_4px_rgba(0,0,0,0.1)]">
                            <h1 class="mb-4 text-[1.25rem] font-semibold leading-[1.1]">🏦 Chat Demandes Bancaires <span class="text-[0.875rem] text-[#1e293b]">###DEM-{{ demande.categorie_demande }}-{{ demande.id_demande }}</span></h1>
                        </div>

                        <div class="p-4 bg-[#f8fafc] border-b border-[#e2e8f0]">
                            <div class="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4 mb-2">
                                <div class="flex flex-col gap-1">
                                    <span :class="INFO_LABEL">Banque</span>
                                    <span :class="INFO_VALUE">{{ demande.banque_user }}</span>
                                </div>
                                <div class="flex flex-col gap-1">
                                    <span :class="INFO_LABEL">Client</span>
                                    <span :class="INFO_VALUE">{{ demande.nom_client }}</span>
                                </div>
                                <div class="flex flex-col gap-1">
                                    <span :class="INFO_LABEL">Type de demande</span>
                                    <span :class="INFO_VALUE">{{ demande.type_demande }}</span>
                                </div>
                                <div class="flex flex-col gap-1">
                                    <span :class="INFO_LABEL">Montant</span>
                                    <span :class="INFO_VALUE">{{ demande.montant }} XOF</span>
                                </div>
                                <div class="flex flex-col gap-1">
                                    <span :class="INFO_LABEL">Statut</span>
                                    <span class="px-3 py-1 text-[0.75rem] font-medium uppercase text-[#1e40af] bg-[#dbeafe] rounded-full">{{ demande.description }}</span>
                                </div>
                                <div class="flex flex-col gap-1">
                                    <span :class="INFO_LABEL">Date d'introduction</span>
                                    <span :class="INFO_VALUE">{{ demande.date_creation }}</span>
                                </div>
                            </div>
                        </div>

                        <div class="h-[300px] p-4 overflow-auto bg-[#f1f5f9]" ref="listEl">
                            <div v-if="!messages.length" class="mt-8 text-center italic text-[#64748b]"></div>
                            <div v-for="(msg, i) in messages" :key="i"
                                 class="relative max-w-[80%] mb-[15px] px-[15px] py-3 rounded-[8px]"
                                 :class="isMine(msg) ? 'ml-auto text-white bg-[#ea580c] rounded-br-none'
                                                    : 'mr-auto text-[#333] bg-white border border-[#ddd] rounded-bl-none'">
                                <span class="flex items-center justify-center shrink-0 w-8 h-8 text-[0.875rem] font-semibold text-white bg-[#ea580c] rounded-full">{{ isMine(msg) ? 'V' : (msg.username || 'B').charAt(0) }}</span>
                                <div class="mb-[5px] text-[0.9em] font-bold text-[#333]">{{ isMine(msg) ? 'Vous' : (msg.username || 'BanqueBot') }}</div>
                                <div>{{ msg.commentaire }}</div>
                                <div>{{ msg.date_creation }} {{ msg.heure_creation }}</div>
                            </div>
                        </div>

                        <div class="flex items-center gap-3 p-4 bg-white border-t border-[#e2e8f0]">
                            <input
                                type="text"
                                class="flex-1 px-4 py-3 text-[0.875rem] text-black bg-white border border-[#e2e8f0] rounded-[1.5rem] outline-none transition-[border-color] duration-200 placeholder:text-[#757575] focus:border-[#ea580c]"
                                v-model="draft"
                                placeholder="Répondre ..."
                                @keydown.enter.prevent="send"
                            >
                            <button class="px-6 py-3 text-[0.875rem] font-medium text-white bg-[#ea580c] rounded-[1.5rem] cursor-pointer transition-[background-color] duration-200 hover:bg-[#c2410c] disabled:bg-[#9ca3af] disabled:cursor-not-allowed"
                                    :disabled="sending" @click="send">{{ sending ? 'Envoi...' : 'Envoyer' }}</button>
                        </div>
                        <div v-if="sendError" :class="ALERT_DANGER + ' mx-4'" role="alert">
                            Erreur lors de l'envoi du message : {{ sendError }}
                        </div>
                    </div>

                </div>
                <div class="relative w-full xl:w-1/6 px-3"></div>

            </div>
            <div class="flex flex-wrap -mx-3 min-h-px"></div>
    </AppLayout>
  `,
});
