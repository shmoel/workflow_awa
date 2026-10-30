/**
 * components/ui/NotificationCenter.js
 *
 * Centre de notifications moderne avec historique persistant.
 * Affiche les notifications système avec badge de compteur et actions rapides.
 *
 * Fonctionnalités:
 * - Badge avec nombre de notifications non lues
 * - Historique des 24 dernières heures
 * - Types : success, error, warning, info
 * - Actions rapides (Voir/Ignorer)
 * - Persistance dans localStorage
 *
 * Événements émis:
 * - @view: (notification) - Quand l'utilisateur clique sur "Voir"
 * - @dismiss: (notificationId) - Quand l'utilisateur ignore une notification
 */

import { defineComponent, ref, computed, onMounted, watch } from "vue";

const STORAGE_KEY = "workflow_notifications";
const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 heures

// Types de notifications avec icônes et couleurs
const TYPES = {
  success: { icon: "bi-check-circle-fill", color: "text-success", bgColor: "bg-[#ecfdf5]", borderColor: "border-success" },
  error:   { icon: "bi-exclamation-triangle-fill", color: "text-danger", bgColor: "bg-[#fef2f2]", borderColor: "border-danger" },
  warning: { icon: "bi-exclamation-circle-fill", color: "text-[#f59e0b]", bgColor: "bg-[#fffbeb]", borderColor: "border-[#f59e0b]" },
  info:    { icon: "bi-info-circle-fill", color: "text-[#3b82f6]", bgColor: "bg-[#eff6ff]", borderColor: "border-[#3b82f6]" },
};

export default defineComponent({
  name: "NotificationCenter",

  emits: ["view", "dismiss"],

  setup(props, { emit }) {
    const isOpen = ref(false);
    const notifications = ref([]);

    // Charger les notifications depuis localStorage
    function loadNotifications() {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          // Filtrer les notifications de plus de 24h
          const now = Date.now();
          notifications.value = parsed.filter((n) => now - n.timestamp < MAX_AGE_MS);
          saveNotifications();
        }
      } catch (e) {
        console.error("[NotificationCenter] Erreur chargement:", e);
        notifications.value = [];
      }
    }

    // Sauvegarder les notifications dans localStorage
    function saveNotifications() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications.value));
      } catch (e) {
        console.error("[NotificationCenter] Erreur sauvegarde:", e);
      }
    }

    // Nombre de notifications non lues
    const unreadCount = computed(() => notifications.value.filter((n) => !n.read).length);

    // Marquer toutes comme lues quand on ouvre le panneau
    watch(isOpen, (open) => {
      if (open && unreadCount.value > 0) {
        notifications.value.forEach((n) => (n.read = true));
        saveNotifications();
      }
    });

    // Ajouter une notification
    function addNotification({ type = "info", title, message, action }) {
      const notification = {
        id: Date.now() + Math.random(),
        type,
        title,
        message,
        action,
        timestamp: Date.now(),
        read: false,
      };
      notifications.value.unshift(notification);
      saveNotifications();
    }

    // Ignorer une notification
    function dismiss(id) {
      notifications.value = notifications.value.filter((n) => n.id !== id);
      saveNotifications();
      emit("dismiss", id);
    }

    // Action "Voir"
    function view(notification) {
      emit("view", notification);
      if (notification.action?.dismiss) {
        dismiss(notification.id);
      }
      isOpen.value = false;
    }

    // Formater le temps relatif (ex: "5 min", "2 h", "hier")
    function timeAgo(timestamp) {
      const diff = Date.now() - timestamp;
      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(diff / 3600000);
      const days = Math.floor(diff / 86400000);

      if (minutes < 1) return "À l'instant";
      if (minutes < 60) return `${minutes} min`;
      if (hours < 24) return `${hours} h`;
      if (days === 1) return "Hier";
      return `${days} j`;
    }

    onMounted(loadNotifications);

    // Exposer la méthode pour ajouter des notifications depuis l'extérieur
    return {
      isOpen,
      notifications,
      unreadCount,
      addNotification,
      dismiss,
      view,
      timeAgo,
      TYPES,
    };
  },

  template: /* html */ `
    <div class="relative">
      <!-- Bouton avec badge -->
      <button
        type="button"
        class="relative p-2 text-chrome-text hover:text-white transition-colors duration-200"
        aria-label="Notifications"
        @click="isOpen = !isOpen"
      >
        <i class="bi bi-bell text-xl"></i>
        <span
          v-if="unreadCount > 0"
          class="absolute top-0 right-0 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-danger rounded-full animate-pulse"
        >
          {{ unreadCount > 9 ? '9+' : unreadCount }}
        </span>
      </button>

      <!-- Panneau de notifications -->
      <div
        v-show="isOpen"
        class="absolute top-full right-0 mt-2 w-[380px] max-w-[calc(100vw-2rem)] bg-white rounded-lg shadow-xl border border-line z-[9999] max-h-[80vh] flex flex-col"
        @click.stop
      >
        <!-- En-tête -->
        <div class="flex items-center justify-between px-4 py-3 border-b border-line">
          <h3 class="text-base font-semibold text-ink m-0">
            Notifications
            <span v-if="notifications.length > 0" class="text-sm text-muted font-normal ml-1">
              ({{ notifications.length }})
            </span>
          </h3>
          <button
            type="button"
            class="p-1 text-muted hover:text-ink transition-colors"
            aria-label="Fermer"
            @click="isOpen = false"
          >
            <i class="bi bi-x-lg"></i>
          </button>
        </div>

        <!-- Liste des notifications -->
        <div class="flex-1 overflow-y-auto">
          <div v-if="notifications.length === 0" class="px-4 py-12 text-center text-muted">
            <i class="bi bi-bell-slash text-4xl mb-3 block"></i>
            <p class="text-sm m-0">Aucune notification</p>
          </div>

          <div
            v-for="notif in notifications"
            :key="notif.id"
            class="border-b border-line last:border-b-0 hover:bg-gray-50 transition-colors"
          >
            <div class="px-4 py-3">
              <div class="flex items-start gap-3">
                <!-- Icône -->
                <div class="shrink-0 mt-0.5">
                  <i
                    :class="[
                      'bi',
                      TYPES[notif.type].icon,
                      TYPES[notif.type].color,
                      'text-lg'
                    ]"
                  ></i>
                </div>

                <!-- Contenu -->
                <div class="flex-1 min-w-0">
                  <div class="flex items-start justify-between gap-2 mb-1">
                    <h4 class="text-sm font-semibold text-ink m-0 truncate">
                      {{ notif.title }}
                    </h4>
                    <span class="text-xs text-muted whitespace-nowrap">
                      {{ timeAgo(notif.timestamp) }}
                    </span>
                  </div>
                  
                  <p v-if="notif.message" class="text-sm text-muted m-0 mb-2">
                    {{ notif.message }}
                  </p>

                  <!-- Actions -->
                  <div class="flex items-center gap-2 text-xs">
                    <button
                      v-if="notif.action"
                      type="button"
                      class="text-brand hover:text-brand-hover font-medium transition-colors"
                      @click="view(notif)"
                    >
                      {{ notif.action.label || 'Voir' }}
                    </button>
                    <button
                      type="button"
                      class="text-muted hover:text-ink transition-colors"
                      @click="dismiss(notif.id)"
                    >
                      Ignorer
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Pied -->
        <div v-if="notifications.length > 0" class="px-4 py-2 border-t border-line bg-gray-50">
          <button
            type="button"
            class="w-full text-sm text-muted hover:text-ink transition-colors text-center"
            @click="notifications = []; saveNotifications(); isOpen = false"
          >
            Tout effacer
          </button>
        </div>
      </div>

      <!-- Voile de fermeture -->
      <div
        v-if="isOpen"
        class="fixed inset-0 z-[9998]"
        @click="isOpen = false"
      ></div>
    </div>
  `,
});
