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
 * Corrections (voir CHANGELOG_REFACTORING.md, CORRECTION-11) :
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

import AppSidebar from "../components/layout/AppSidebar.js";
import AppNavbar  from "../components/layout/AppNavbar.js";
import AppFooter  from "../components/layout/AppFooter.js";

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

  components: { AppSidebar, AppNavbar, AppFooter },

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
    <div class="flex min-h-screen" style="background: var(--color-bg-page);">

      <AppSidebar active-page="" />

      <div class="flex flex-col flex-1 min-w-0">

        <AppNavbar page-title="Chat" />

        <main class="flex-1 p-5" role="main" aria-label="Chat de la demande">

          <p v-if="loading" class="text-sm" style="color: var(--color-text-secondary);" role="status">
            Chargement de la conversation…
          </p>

          <section
            v-else-if="notFound"
            class="bg-white rounded-2xl shadow-sm border p-8 text-center max-w-3xl mx-auto"
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

          <div
            v-else-if="error"
            class="rounded-xl border px-4 py-3 text-sm max-w-3xl mx-auto"
            style="border-color: var(--color-status-rejected); color: var(--color-status-rejected); background: #fef2f2;"
            role="alert"
          >
            Erreur lors du chargement de la conversation : {{ error }}
          </div>

          <section
            v-else
            class="bg-white rounded-2xl shadow-sm border overflow-hidden max-w-3xl mx-auto flex flex-col"
            style="border-color: var(--color-brand-border);"
            aria-labelledby="chat-title"
          >
            <!-- En-tête orange -->
            <header class="px-5 py-4 text-white" style="background: var(--color-brand);">
              <h2 id="chat-title" class="text-lg font-bold m-0">
                🏦 Chat Demandes Bancaires
                <span class="font-semibold">###DEM-{{ demande.categorie_demande }}-{{ demande.id_demande }}</span>
              </h2>
            </header>

            <!-- Informations de la demande -->
            <dl
              class="grid grid-cols-2 md:grid-cols-3 gap-4 px-5 py-4 text-sm m-0 border-b"
              style="border-color: var(--color-brand-border); background: var(--color-brand-light);"
            >
              <div>
                <dt class="text-xs uppercase tracking-wide" style="color: var(--color-text-secondary);">Banque</dt>
                <dd class="m-0 font-semibold">{{ demande.banque_user || '—' }}</dd>
              </div>
              <div>
                <dt class="text-xs uppercase tracking-wide" style="color: var(--color-text-secondary);">Client</dt>
                <dd class="m-0 font-semibold">{{ demande.nom_client || '—' }}</dd>
              </div>
              <div>
                <dt class="text-xs uppercase tracking-wide" style="color: var(--color-text-secondary);">Type de demande</dt>
                <dd class="m-0 font-semibold">{{ demande.type_demande || '—' }}</dd>
              </div>
              <div>
                <dt class="text-xs uppercase tracking-wide" style="color: var(--color-text-secondary);">Montant</dt>
                <dd class="m-0 font-semibold">{{ demande.montant }} XOF</dd>
              </div>
              <div>
                <dt class="text-xs uppercase tracking-wide" style="color: var(--color-text-secondary);">Statut</dt>
                <dd class="m-0">
                  <span class="inline-block px-2 py-0.5 rounded-full text-xs font-semibold text-white"
                        style="background: var(--color-brand);">{{ demande.description || '—' }}</span>
                </dd>
              </div>
              <div>
                <dt class="text-xs uppercase tracking-wide" style="color: var(--color-text-secondary);">Date d'introduction</dt>
                <dd class="m-0 font-semibold">{{ demande.date_creation || '—' }}</dd>
              </div>
            </dl>

            <!-- Messages -->
            <ol
              ref="listEl"
              class="list-none m-0 px-5 py-4 space-y-3 overflow-y-auto"
              style="max-height: 28rem; min-height: 12rem;"
              aria-label="Messages"
              aria-live="polite"
            >
              <li v-if="!messages.length" class="text-sm text-center py-8" style="color: var(--color-text-secondary);">
                Aucun message pour cette demande.
              </li>
              <li
                v-for="(msg, i) in messages"
                :key="i"
                class="flex gap-2"
                :class="isMine(msg) ? 'flex-row-reverse' : ''"
              >
                <span
                  class="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white"
                  :style="{ background: isMine(msg) ? 'var(--color-brand)' : 'var(--color-sidebar-bg)' }"
                  aria-hidden="true"
                >{{ isMine(msg) ? 'V' : (msg.username || '?').charAt(0) }}</span>
                <div
                  class="max-w-[75%] rounded-2xl px-4 py-2 text-sm"
                  :style="isMine(msg)
                    ? { background: 'var(--color-brand-light)', border: '1px solid var(--color-brand-border)' }
                    : { background: 'var(--color-bg-page)' }"
                >
                  <p class="m-0 text-xs font-semibold mb-1">{{ isMine(msg) ? 'Vous' : msg.username }}</p>
                  <p class="m-0 whitespace-pre-wrap break-words">{{ msg.commentaire }}</p>
                  <p class="m-0 text-xs mt-1" style="color: var(--color-text-secondary);">
                    {{ msg.date_creation }} {{ msg.heure_creation }}
                  </p>
                </div>
              </li>
            </ol>

            <!-- Saisie -->
            <form
              class="flex gap-2 px-5 py-4 border-t"
              style="border-color: var(--color-brand-border);"
              @submit.prevent="send"
            >
              <label for="chat-input" class="sr-only">Votre message</label>
              <input
                id="chat-input"
                v-model="draft"
                type="text"
                placeholder="Répondre ..."
                autocomplete="off"
                class="flex-1 rounded-full border px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                style="border-color: var(--color-brand-border);"
              />
              <button
                type="submit"
                :disabled="sending || !draft.trim()"
                class="px-5 py-2 rounded-full text-white text-sm font-semibold disabled:opacity-60"
                style="background: var(--color-brand);"
              >{{ sending ? 'Envoi...' : 'Envoyer' }}</button>
            </form>
            <p
              v-if="sendError"
              class="px-5 pb-4 m-0 text-sm"
              style="color: var(--color-status-rejected);"
              role="alert"
            >Erreur lors de l'envoi du message : {{ sendError }}</p>
          </section>

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
          aria-labelledby="popup-title-chat"
          @click.self="polling.dismiss()"
        >
          <div
            class="bg-white rounded-2xl mt-28 mx-4 w-full max-w-lg border-2 p-8 shadow-2xl"
            style="border-color: var(--color-brand);"
          >
            <h2
              id="popup-title-chat"
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
                autofocus
              >OK</button>
            </div>
          </div>
        </div>
      </Transition>

    </div>
  `,
});
