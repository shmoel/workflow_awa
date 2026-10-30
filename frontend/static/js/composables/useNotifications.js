/**
 * composables/useNotifications.js
 *
 * Composable pour envoyer des notifications au centre de notifications.
 * Fournit une API simple pour ajouter des notifications depuis n'importe où.
 *
 * Usage:
 * ```js
 * import { useNotifications } from './composables/useNotifications.js';
 * 
 * const notifications = useNotifications();
 * 
 * // Succès
 * notifications.success('Demande validée', 'La demande #123 a été validée avec succès');
 * 
 * // Erreur
 * notifications.error('Échec de la connexion', 'Vérifiez vos identifiants');
 * 
 * // Info avec action
 * notifications.info(
 *   'Nouveau message',
 *   'Vous avez un nouveau message sur la demande #456',
 *   { label: 'Voir', url: 'chat.html?id_dmd=456' }
 * );
 * ```
 */

import { ref } from "vue";

// Instance globale partagée (singleton pattern)
const notificationInstance = ref(null);

export function setNotificationInstance(instance) {
  notificationInstance.value = instance;
}

export function useNotifications() {
  function addNotification(type, title, message, action) {
    if (!notificationInstance.value) {
      console.warn("[useNotifications] Centre de notifications non initialisé");
      return;
    }

    notificationInstance.value.addNotification({
      type,
      title,
      message,
      action,
    });
  }

  return {
    success(title, message, action) {
      addNotification("success", title, message, action);
    },

    error(title, message, action) {
      addNotification("error", title, message, action);
    },

    warning(title, message, action) {
      addNotification("warning", title, message, action);
    },

    info(title, message, action) {
      addNotification("info", title, message, action);
    },

    // Méthode générique
    notify(type, title, message, action) {
      addNotification(type, title, message, action);
    },
  };
}
