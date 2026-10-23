/**
 * services/chatSeen.js
 *
 * Mémorisation du dernier message de chat vu, par demande, pour le badge
 * « Nouveau » de l'accueil.
 *
 * Clé localStorage : lastMsg_{id_demande}
 * Valeur           : "{date_creation} {heure_creation}" du dernier message vu
 *
 * Utilisé par :
 *   - AccueilPage : badge si la valeur stockée ≠ dernier message de l'API ;
 *                   clic CHAT → marque vu
 *   - ChatPage    : marque vu au chargement et après chaque envoi (sinon le
 *                   message que l'on vient d'envoyer déclenchait le badge)
 */

/** @param {number|string} id */
export function lastMsgKey(id) {
  return `lastMsg_${id}`;
}

/**
 * Horodatage d'un message de GET /messages_chat/{id}, au format stocké.
 * @param {{ date_creation?: string, heure_creation?: string }} msg
 * @returns {string}
 */
export function messageStamp(msg) {
  return `${msg.date_creation || ""} ${msg.heure_creation || ""}`.trim();
}

/**
 * Marque le dernier message de la liste comme vu. Liste vide : rien à faire.
 * @param {number|string} id
 * @param {Array} messages - résultats de GET /messages_chat/{id}, ordre chronologique
 */
export function markMessagesSeen(id, messages) {
  if (!messages || messages.length === 0) return;
  localStorage.setItem(lastMsgKey(id), messageStamp(messages[messages.length - 1]));
}
