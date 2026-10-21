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
} from "https://unpkg.com/vue@3/dist/vue.esm-browser.js";

import { apiGet, apiPostForm }      from "../services/api.js";
import { markMessagesSeen }         from "../services/chatSeen.js";
import { useCurrentUser }           from "../composables/useCurrentUser.js";
import { useNotificationPolling }   from "../composables/useNotificationPolling.js";

import AppLayout from "../components/layout/AppLayout.js";

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

  components: { AppLayout },

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
    };
  },

  template: /* html */ `
    <AppLayout :polling="polling" menu-label="Actions">
            <div class="row">

            </div>
            <div class="row">

            </div>
            <div class="row">
                <div class="col-xl-2"></div>
                <div class="col-xl-8">

                    <div v-if="notFound" class="alert alert-danger mt-3" role="alert">
                        Demande introuvable : l'identifiant est absent, invalide ou ne correspond à aucune demande.
                        <a href="acceuil.html">Retour à l'accueil</a>
                    </div>

                    <div v-else-if="error" class="alert alert-danger mt-3" role="alert">
                        Erreur lors du chargement de la conversation : {{ error }}
                    </div>

                    <div v-else-if="demande" class="chat-container">
                        <div class="chat-header">
                            <h1>🏦 Chat Demandes Bancaires <span class="info-value">###DEM-{{ demande.categorie_demande }}-{{ demande.id_demande }}</span></h1>
                        </div>

                        <div class="request-header">
                            <div class="request-info">
                                <div class="info-item">
                                    <span class="info-label">Banque</span>
                                    <span class="info-value">{{ demande.banque_user }}</span>
                                </div>
                                <div class="info-item">
                                    <span class="info-label">Client</span>
                                    <span class="info-value">{{ demande.nom_client }}</span>
                                </div>
                                <div class="info-item">
                                    <span class="info-label">Type de demande</span>
                                    <span class="info-value">{{ demande.type_demande }}</span>
                                </div>
                                <div class="info-item">
                                    <span class="info-label">Montant</span>
                                    <span class="info-value">{{ demande.montant }} XOF</span>
                                </div>
                                <div class="info-item">
                                    <span class="info-label">Statut</span>
                                    <span class="request-status status-processing">{{ demande.description }}</span>
                                </div>
                                <div class="info-item">
                                    <span class="info-label">Date d'introduction</span>
                                    <span class="info-value">{{ demande.date_creation }}</span>
                                </div>
                            </div>
                        </div>

                        <div class="chat-messages" ref="listEl">
                            <div v-if="!messages.length" class="empty-state"></div>
                            <div v-for="(msg, i) in messages" :key="i"
                                 class="message" :class="isMine(msg) ? 'user-message' : 'bot-message'">
                                <span class="message-avatar">{{ isMine(msg) ? 'V' : (msg.username || 'B').charAt(0) }}</span>
                                <div class="sender">{{ isMine(msg) ? 'Vous' : (msg.username || 'BanqueBot') }}</div>
                                <div>{{ msg.commentaire }}</div>
                                <div class="timestamp">{{ msg.date_creation }} {{ msg.heure_creation }}</div>
                            </div>
                        </div>

                        <div class="chat-input">
                            <input
                                type="text"
                                class="message-input"
                                v-model="draft"
                                placeholder="Répondre ..."
                                @keydown.enter.prevent="send"
                            >
                            <button class="send-btn" :disabled="sending" @click="send">{{ sending ? 'Envoi...' : 'Envoyer' }}</button>
                        </div>
                        <div v-if="sendError" class="alert alert-danger m-3" role="alert">
                            Erreur lors de l'envoi du message : {{ sendError }}
                        </div>
                    </div>

                </div>
                <div class="col-xl-2"></div>

            </div>
            <div class="row"></div>
    </AppLayout>
  `,
});
