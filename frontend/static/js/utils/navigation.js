/**
 * utils/navigation.js
 *
 * Ouverture des pages d'une demande depuis les listes (boutons des tableaux).
 */

/** @param {number|string} id */
export function goToDetail(id) {
  window.location.href = `detail_consulter_demande.html?id_dmd=${id}`;
}

/** @param {number|string} id */
export function goToChat(id) {
  window.location.href = `chat.html?id_dmd=${id}`;
}

/** @param {number|string} id */
export function goToModify(id) {
  window.location.href = `modifier_demande.html?id_dmd=${id}`;
}

/** @param {number|string} id */
export function goToEvaluer(id) {
  window.location.href = `valider_demande.html?id_dmd=${id}`;
}
