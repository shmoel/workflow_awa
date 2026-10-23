/**
 * utils/url.js
 *
 * Lecture des paramètres d'URL communs aux pages.
 */

/**
 * Identifiant de demande passé dans l'URL (?id_dmd=X).
 * @returns {string|null} null s'il est absent ou n'est pas un entier positif
 */
export function readDemandeId() {
  const id = new URLSearchParams(window.location.search).get("id_dmd");
  return id && /^[1-9]\d*$/.test(id) ? id : null;
}
