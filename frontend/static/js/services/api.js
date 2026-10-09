/**
 * services/api.js
 *
 * SEUL endroit de toute l'application qui connaît :
 *   - l'URL de base de l'API
 *   - la lecture du token depuis localStorage
 *   - les fonctions génériques GET / POST / POST_FORM (multipart)
 *
 * Toute la logique d'appel réseau passe par ce module.
 * Les composants et composables n'utilisent JAMAIS fetch() directement.
 *
 * Duplications éliminées :
 *   - "const API_URL = ..." défini 13× dans les fichiers legacy
 *   - "localStorage.getItem('token')" + headers Authorization répété ~40×
 *   - Vérification response.ok + throw répétée dans chaque fetch inline
 */

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

export const API_URL = `${window.location.origin}/api`;

// ---------------------------------------------------------------------------
// Helpers internes
// ---------------------------------------------------------------------------

/**
 * Retourne les headers JSON standards avec le token Bearer si présent.
 * @returns {HeadersInit}
 */
function _authHeaders() {
  const token = localStorage.getItem("token");
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = "Bearer " + token;
  return headers;
}

/**
 * Retourne uniquement le header Authorization (pour les requêtes FormData
 * où Content-Type est positionné automatiquement par le browser).
 * @returns {HeadersInit}
 */
function _authHeadersOnly() {
  const token = localStorage.getItem("token");
  const headers = {};
  if (token) headers["Authorization"] = "Bearer " + token;
  return headers;
}

/**
 * Vérifie la réponse HTTP et lance une erreur descriptive si elle n'est pas OK.
 *
 * Gestion spéciale HTTP 401 (Non autorisé) :
 *   - Supprime le token de localStorage (il est invalide ou expiré côté serveur)
 *   - Redirige immédiatement vers index.html
 *   - Cette approche remplace la vérification tokenExpiry côté client, qui
 *     utilisait une durée fixe (1h) ne correspondant pas à l'expiration réelle
 *     du token backend (30 min). Le serveur fait autorité.
 *   Décision validée : CORRECTION-02 (voir CHANGELOG_REFACTORING.md)
 *
 * Exception : POST /login/ passe redirectOn401 = false — un 401 y signifie
 * « identifiants incorrects » et la page de connexion affiche l'erreur.
 *
 * @param {Response} response
 * @param {string} context - label pour le message d'erreur
 * @param {{ redirectOn401?: boolean }} [options]
 * @returns {Response}
 */
async function _checkResponse(response, context = "", { redirectOn401 = true } = {}) {
  if (!response.ok) {
    // 401 : token absent, invalide ou expiré côté serveur → redirection login
    if (response.status === 401 && redirectOn401) {
      localStorage.removeItem("token");
      window.location.href = "index.html";
      // On lève quand même une erreur pour interrompre la chaîne appelante
      throw new Error("[API] Session expirée — redirection vers index.html");
    }

    let detail = "";
    try {
      const body = await response.clone().json();
      detail = body.detail || JSON.stringify(body);
    } catch {
      detail = response.statusText;
    }
    throw new Error(
      `[API${context ? " – " + context : ""}] HTTP ${response.status}: ${detail}`
    );
  }
  return response;
}

// ---------------------------------------------------------------------------
// API publique
// ---------------------------------------------------------------------------

/**
 * Requête GET authentifiée.
 * Retourne directement l'objet JSON parsé.
 *
 * @param {string} path  - chemin relatif ex: "/users-joined/"
 * @returns {Promise<any>}
 *
 * @example
 *   const data = await apiGet("/users-joined/");
 *   const user = data.results[0];
 */
export async function apiGet(path) {
  const response = await fetch(`${API_URL}${path}`, {
    method: "GET",
    headers: _authHeaders(),
  });
  await _checkResponse(response, `GET ${path}`);
  return response.json();
}

/**
 * Requête POST authentifiée avec corps JSON.
 * Retourne directement l'objet JSON parsé.
 *
 * @param {string} path   - chemin relatif ex: "/avis"
 * @param {object} body   - données à envoyer (sérialisées en JSON)
 * @param {{ redirectOn401?: boolean }} [options] - false pour /login/
 * @returns {Promise<any>}
 *
 * @example
 *   const result = await apiPost("/login/", { username, password });
 *   const token = result.access_token;
 */
export async function apiPost(path, body = {}, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: _authHeaders(),
    body: JSON.stringify(body),
  });
  await _checkResponse(response, `POST ${path}`, options);
  return response.json();
}

/**
 * Requête POST authentifiée avec FormData (multipart/form-data).
 * Utilisée pour les uploads de fichiers (PDF de note d'analyse).
 * NE PAS passer Content-Type : le browser le génère avec le boundary correct.
 *
 * @param {string}   path      - chemin relatif ex: "/demandes"
 * @param {FormData} formData  - objet FormData pré-rempli par l'appelant
 * @returns {Promise<any>}
 *
 * @example
 *   const fd = new FormData();
 *   fd.append("id_user", userId);
 *   fd.append("note_analyse", fileInput.files[0]);
 *   const result = await apiPostForm("/demandes", fd);
 */
export async function apiPostForm(path, formData) {
  const response = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: _authHeadersOnly(),
    body: formData,
  });
  await _checkResponse(response, `POST (form) ${path}`);
  return response.json();
}

/**
 * Requête DELETE authentifiée.
 * Retourne l'objet JSON parsé si le serveur en renvoie un, sinon null.
 *
 * @param {string} path - chemin relatif ex: "/supprimer_demande/42"
 * @returns {Promise<any|null>}
 */
export async function apiDelete(path) {
  const response = await fetch(`${API_URL}${path}`, {
    method: "DELETE",
    headers: _authHeaders(),
  });
  await _checkResponse(response, `DELETE ${path}`);
  // Certains endpoints DELETE renvoient 204 No Content
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

/**
 * Construit l'URL complète de téléchargement d'un fichier
 * (les liens /download/{filename} ne passent pas par apiGet car
 * ils ouvrent directement un fichier binaire dans un nouvel onglet).
 *
 * @param {string} filename
 * @returns {string}
 *
 * @example
 *   window.open(downloadUrl("note_123.pdf"), "_blank");
 */
export function downloadUrl(filename) {
  return `${API_URL}/download/${filename}`;
}
