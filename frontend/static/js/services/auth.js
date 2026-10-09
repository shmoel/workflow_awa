/**
 * services/auth.js
 *
 * Responsabilités :
 *   - login  : appel POST /login/, stockage du token, détection du rôle
 *   - logout : suppression du token + redirection vers index.html
 *   - isAuthenticated : vérification de la présence du token (garde de route)
 *   - getToken / setToken : accès normalisé au token (les autres modules
 *     n'ont JAMAIS besoin d'appeler localStorage directement pour le token)
 *
 * Duplications éliminées :
 *   - logout() copiée dans ~9 fichiers (avec window.location.href commenté)
 *   - isConnected() copiée dans ~8 fichiers
 *   - checkUserRole() copiée dans index.html et index_.html
 *   - lecture localStorage.getItem("token") répétée partout
 *
 * Note : ce module importe apiPost/apiGet depuis api.js —
 *        il ne fait jamais de fetch() direct.
 */

import { apiPost, apiGet } from "./api.js";

// ---------------------------------------------------------------------------
// Clés localStorage (une seule source de vérité pour les noms de clés)
// ---------------------------------------------------------------------------

const TOKEN_KEY = "token";
const TOKEN_EXPIRY_KEY = "tokenExpiry";
/** Durée de vie du token côté client : 1 heure (ms) */
const TOKEN_TTL_MS = 3_600_000;

// ---------------------------------------------------------------------------
// Gestion du token
// ---------------------------------------------------------------------------

/**
 * Retourne le token stocké, ou null si absent/expiré.
 * Vérifie l'expiration (tokenExpiry) que le code legacy stockait mais n'utilisait jamais.
 *
 * @returns {string|null}
 */
export function getToken() {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return null;

  const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);
  if (expiry && Date.now() > parseInt(expiry, 10)) {
    // Token expiré : nettoyage silencieux
    _clearToken();
    return null;
  }
  return token;
}

/**
 * Stocke le token avec sa date d'expiration.
 * @param {string} token
 */
function _setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(TOKEN_EXPIRY_KEY, Date.now() + TOKEN_TTL_MS);
}

/**
 * Supprime le token et ses métadonnées de localStorage.
 */
function _clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(TOKEN_EXPIRY_KEY);
}

// ---------------------------------------------------------------------------
// Authentification
// ---------------------------------------------------------------------------

/**
 * Vérifie si un token valide (non expiré) est présent.
 * À appeler en début de chaque page protégée.
 * Redirige automatiquement vers index.html si non authentifié.
 *
 * @param {boolean} [redirect=true] - si false, retourne un booléen sans rediriger
 * @returns {boolean}
 */
export function isAuthenticated(redirect = true) {
  const token = getToken();
  if (!token) {
    if (redirect) window.location.href = "index.html";
    return false;
  }
  return true;
}

/**
 * Effectue la connexion :
 *   1. POST /login/ avec username + password
 *   2. Stocke le token
 *   3. Récupère le rôle via GET /users/me/
 *   4. Retourne l'objet { token, role: "admin"|"user" }
 *
 * Les erreurs remontent à l'appelant (le composant page gère l'affichage).
 *
 * @param {string} username
 * @param {string} password
 * @returns {Promise<{ token: string, role: "admin"|"user" }>}
 */
export async function login(username, password) {
  // Ancien token supprimé avant l'appel (legacy), et pas de redirection
  // sur 401 : la page de connexion affiche l'erreur
  _clearToken();
  const data = await apiPost("/login/", { username, password }, { redirectOn401: false });
  const token = data.access_token;
  _setToken(token);

  const role = await _fetchRole();
  return { token, role };
}

/**
 * Déconnecte l'utilisateur :
 *   - supprime le token
 *   - redirige vers index.html
 *
 * Corrige le bug legacy : window.location.href était commenté dans tous les fichiers.
 */
export function logout() {
  _clearToken();
  window.location.href = "index.html";
}

// ---------------------------------------------------------------------------
// Rôle utilisateur
// ---------------------------------------------------------------------------

/**
 * Récupère le rôle depuis GET /users/me/.
 * Retourne "admin" si id_niv_hab === 4, sinon "user".
 *
 * @returns {Promise<"admin"|"user">}
 */
async function _fetchRole() {
  const data = await apiGet("/users/me/");
  const user = data.result;

  if (!user || !user.username || user.id_niv_hab === undefined) {
    throw new Error("[auth] Données utilisateur invalides depuis /users/me/");
  }
  return user.id_niv_hab === 4 ? "admin" : "user";
}

/**
 * Expose _fetchRole pour les pages qui ont besoin du rôle sans re-login.
 * @returns {Promise<"admin"|"user">}
 */
export async function fetchRole() {
  return _fetchRole();
}
