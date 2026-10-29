/**
 * pages/AccueilPage.js
 *
 * Composant "page" pour acceuil.html — tableau de bord principal.
 *
 * Reproduit à l'identique le comportement legacy :
 *   - 6 cartes de compteurs (GET /nombre_demandes/{niveau}), dans l'ordre du
 *     circuit ; un clic filtre le tableau sur ce statut (lot G, point 10)
 *   - Tableau des demandes introduites (GET /demandes_a_consulter/{domaine})
 *   - Badge "Nouveau message" par ligne (GET /messages_chat/{id} × n demandes)
 *     détection : localStorage lastMsg_{id} ≠ dernière date API
 *   - Filtres en temps réel : Banque / Entité / Type / Contrepartie / Date
 *   - Bouton CHAT : marque vu dans localStorage puis redirige vers chat.html
 *   - Bouton Détails : redirige vers detail_consulter_demande.html
 *   - Popup polling "Nouvelle demande à valider" (useNotificationPolling)
 *
 * Colonnes du tableau (ordre legacy) :
 *   Banque | Entité | Type de demande | Contrepartie | Date/Heure |
 *   Niveau validation | [Détails] [CHAT]
 *
 * Utilise DemandesTable v2 (props rows/columns/slots).
 * Les filtres et l'onglet sont dans DemandesCard (DemandeFilters).
 * Les StatCards sont autonomes (chargement interne).
 */

import {
  defineComponent,
  ref,
  computed,
  onMounted,
  onUnmounted,
} from "vue";

import { apiGet }                     from "../services/api.js";
import { lastMsgKey, messageStamp, markMessagesSeen } from "../services/chatSeen.js";
import { useCurrentUser }             from "../composables/useCurrentUser.js";
import { useNotificationPolling }     from "../composables/useNotificationPolling.js";
import { useDashboardDemandes }       from "../composables/useDashboardDemandes.js";
import { goToDetail, goToChat }       from "../utils/navigation.js";

import AppLayout from "../components/layout/AppLayout.js";
import ActionCell from "../components/demandes/ActionCell.js";
import StatCard       from "../components/demandes/StatCard.js";
import DemandesTable  from "../components/demandes/DemandesTable.js";
import DemandesCard   from "../components/demandes/DemandesCard.js";
import { BTN, LINK_BUTTON } from "../components/ui/classes.js";

// ---------------------------------------------------------------------------
// Cartes de compteurs, dans l'ordre du circuit (lot G ; le legacy affichait
// 1, 6, 4, 2, 3, 5). niveau = statut compté (id_event)
// ---------------------------------------------------------------------------
const STAT_CARDS = [
  { title: "Validation GGR Local",  niveau: 1 },
  { title: "Validation DG Local",   niveau: 2 },
  { title: "Validation AWA",        niveau: 3 },
  { title: "Validation FO Group",   niveau: 4 },
  { title: "Validation GGR Group",  niveau: 5 },
  { title: "Clôturées",             niveau: 6 },
];

// ---------------------------------------------------------------------------
// Composant page
// ---------------------------------------------------------------------------

export default defineComponent({
  name: "AccueilPage",

  components: { AppLayout, StatCard, DemandesTable, DemandesCard, ActionCell },

  setup() {
    const user    = useCurrentUser();
    const polling = useNotificationPolling();

    // Colonnes, filtres et chargement communs avec l'historique ;
    // la route dépend du domaine du profil (rien à charger sans domaine)
    const { liste, filters, statut, filteredRows, emptyText, filterFields, columns } = useDashboardDemandes(
      () => (user.domaine.value ? `/demandes_a_consulter/${user.domaine.value}` : null)
    );

    // ---- Filtre par carte de compteur : second clic sur la carte = tous ----
    function selectStatut(niveau) {
      statut.value = statut.value === niveau ? null : niveau;
    }
    const statutTitle = computed(() => STAT_CARDS.find((c) => c.niveau === statut.value)?.title ?? "");

    // ---- Badges "Nouveau" : id_demande → boolean ----
    const newMessageMap = ref({});

    // ---- Vérification nouveau message pour une demande ----
    async function _checkNewMsg(id) {
      try {
        const data = await apiGet(`/messages_chat/${id}`);
        const msgs = data.results;
        if (!msgs || msgs.length === 0) return false;
        const lastDate = messageStamp(msgs[msgs.length - 1]);
        const key = lastMsgKey(id);
        const seen = localStorage.getItem(key);
        if (seen === null) { localStorage.setItem(key, ""); return false; }
        return seen !== lastDate;
      } catch { return false; }
    }

    // ---- Badges "Nouveau message" — vérification en parallèle ----
    async function loadBadges(rows) {
      const checks = await Promise.allSettled(
        rows.map((r) => _checkNewMsg(r.id_demande))
      );
      const map = {};
      rows.forEach((r, i) => {
        map[r.id_demande] =
          checks[i].status === "fulfilled" ? checks[i].value : false;
      });
      newMessageMap.value = map;
    }

    // ---- Actions boutons ----

    /**
     * Clic CHAT : marque le dernier message comme vu, puis redirige.
     * Même logique que handleChatClick() du legacy.
     */
    async function handleChatClick(id) {
      try {
        const data = await apiGet(`/messages_chat/${id}`);
        markMessagesSeen(id, data.results);
      } catch { /* silencieux */ }
      setTimeout(() => goToChat(id), 100);
    }

    // ---- Cycle de vie ----
    onMounted(async () => {
      await user.fetchUser();
      polling.start();
      await liste.load();
      await loadBadges(liste.rows);
    });

    onUnmounted(() => polling.stop());

    return {
      user,
      polling,
      statCards:     STAT_CARDS,
      liste,
      filteredRows,
      emptyText,
      newMessageMap,
      filters,
      statut,
      statutTitle,
      selectStatut,
      filterFields,
      columns,
      handleChatClick,
      goToDetail,
      BTN,
      LINK_BUTTON,
    };
  },

  template: /* html */ `
    <AppLayout :polling="polling">
        <div class="flex-grow px-4 lg:px-8 py-6">
            <h4 class="py-4 mb-0 text-h4 font-bold">Demandes</h4>
            <div class="mb-6"></div>
            <div class="flex flex-wrap -mx-3">
                <div class="w-full">
                    <div class="flex flex-wrap -mx-3">
                        <StatCard v-for="card in statCards" :key="card.niveau" :title="card.title" :niveau="card.niveau"
                                  :active="statut === card.niveau" @select="selectStatut(card.niveau)" />
                    </div>
                </div>
            </div>

            <div class="flex flex-wrap -mx-3">

                <div class="h-[310px]" id="tasks-inner"></div>

                <div v-if="statut !== null" class="w-full px-3 mb-3" data-filtre-statut>
                    <span class="inline-flex items-center gap-2 px-3 py-1 text-sm bg-brand-soft border border-brand-line rounded-full">
                        Filtre : <strong>{{ statutTitle }}</strong>
                        <button type="button" :class="LINK_BUTTON + ' no-underline text-base leading-none'" aria-label="Retirer le filtre" @click="statut = null">×</button>
                    </span>
                </div>

                <DemandesCard tab-label="Introduites" :fields="filterFields" v-model="filters">
                    <DemandesTable theme="dashboard" :rows="filteredRows" :columns="columns" :action-headers="2" :error="liste.error" :loading="liste.loading" :empty-text="emptyText">
                        <template #badge="{ row }">
                            <span v-if="newMessageMap[row.id_demande]" style='background:#ea580c;color:#fff;padding:2px 8px;border-radius:8px;font-size:12px;margin-left:8px;'>Nouveau</span>
                        </template>
                        <template #actions="{ row }">
                            <ActionCell :btn-class="BTN.outlineBrand" label="Détails" @click="goToDetail(row.id_demande)" />
                            <ActionCell :btn-class="BTN.outlineBrand" label="CHAT" @click="handleChatClick(row.id_demande)" />
                        </template>
                    </DemandesTable>
                </DemandesCard>
            </div>

        </div>
    </AppLayout>
  `,
});
