/**
 * services/api.js
 *
 * SEUL endroit de toute l'application qui connaît :
 *   - l'URL de base de l'API
 *   - la lecture du token depuis localStorage
 *   - les fonctions génériques GET / POST / POST_FORM (multipart) / DELETE
 *   - la traduction des erreurs HTTP et le téléchargement des fichiers
 *
 * Toute la logique d'appel réseau passe par ce module.
 * Les composants et composables n'utilisent JAMAIS fetch() directement.
 *
 * Aligné sur docs/conventions-api-v2.md (§5 erreurs, §7 session, §8 fichiers) :
 *   - chaque erreur est une ApiError { status, code, detail, champs } dont le
 *     message est affichable tel quel ; les détails techniques ne vont que dans
 *     la console. Les deux formats de réponse sont lus : v1 { detail } et
 *     v2 { code, detail, champs }.
 *   - 401 : token effacé, retour à la connexion avec le message « session expirée »
 *   - téléchargements authentifiés (fetch + blob), jamais par un simple lien
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

/**
 * Clé sessionStorage posée quand la session a expiré (401 ou jeton périmé) :
 * la page de connexion l'affiche puis l'efface.
 */
export const SESSION_EXPIRED_KEY = "sessionExpiree";

/** Taille maximale d'un fichier joint (conventions API v2 §8, comme le backend) */
export const MAX_FILE_SIZE = 5 * 1024 * 1024;

/** Extensions de fichier acceptées (conventions API v2 §8, comme le backend) */
export const ALLOWED_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png"];

// ---------------------------------------------------------------------------
// Erreurs
// ---------------------------------------------------------------------------

/** Messages affichés selon le statut HTTP (conventions API v2 §5) */
const GENERIC_ERROR  = "Une erreur est survenue, réessayez.";
const NOT_FOUND      = "Introuvable.";
const NETWORK_ERROR  = "Le serveur ne répond pas. Vérifiez votre connexion et réessayez.";
const SESSION_ENDED  = "Votre session a expiré. Veuillez vous reconnecter.";

/**
 * Erreur d'appel API.
 *   status : code HTTP (0 si le serveur n'a pas répondu)
 *   code   : identifiant stable (v2), sinon déduit du statut (ex. « HTTP_404 »)
 *   detail : texte renvoyé par le serveur, s'il en a envoyé un
 *   champs : { nom_du_champ: message } pour les erreurs de validation (422)
 *   message : texte affichable à l'utilisateur
 */
export class ApiError extends Error {
  constructor({ status, code, detail = "", champs = null, message }) {
    super(message);
    this.name   = "ApiError";
    this.status = status;
    this.code   = code;
    this.detail = detail;
    this.champs = champs;
  }
}

/**
 * Message affichable pour une réponse en erreur (tableau du §5).
 * 422 v1 (FastAPI) : detail est une liste de { loc, msg } → messages par champ.
 */
function _userMessage(status, detail, champs) {
  if (status === 404) return NOT_FOUND;
  if (status >= 500) return GENERIC_ERROR;
  if (status === 422 && champs) {
    return Object.entries(champs).map(([k, v]) => `${k} : ${v}`).join(" ; ");
  }
  return typeof detail === "string" && detail ? detail : GENERIC_ERROR;
}

/** Convertit un 422 FastAPI v1 ({ detail: [{ loc, msg }] }) en { champ: message } */
function _champsFromV1(detail) {
  if (!Array.isArray(detail)) return null;
  const champs = {};
  for (const d of detail) {
    const loc = Array.isArray(d.loc) ? d.loc[d.loc.length - 1] : "requete";
    champs[loc] = d.msg;
  }
  return champs;
}

/** Retour à la connexion, avec le message « session expirée » */
function _expireSession() {
  localStorage.removeItem("token");
  localStorage.removeItem("tokenExpiry");
  try { sessionStorage.setItem(SESSION_EXPIRED_KEY, "1"); } catch { /* stockage indisponible */ }
  window.location.href = "index.html";
}

/**
 * Vérifie la réponse HTTP et lance une ApiError si elle n'est pas OK.
 *
 * Gestion spéciale HTTP 401 (Non autorisé) :
 *   - Supprime le token (invalide ou expiré côté serveur) et redirige vers
 *     index.html, qui affiche « Votre session a expiré »
 *   Décision validée : CORRECTION-02 (voir docs/CHANGELOG_REFACTORING.md) ;
 *   message ajouté : CORRECTION-14
 *
 * Exception : POST /login/ passe redirectOn401 = false — un 401 y signifie
 * « identifiants incorrects » et la page de connexion affiche l'erreur.
 *
 * @param {Response} response
 * @param {string} context - label pour la console (ex. « GET /demandes_user/ »)
 * @param {{ redirectOn401?: boolean }} [options]
 * @returns {Promise<Response>}
 */
async function _checkResponse(response, context = "", { redirectOn401 = true } = {}) {
  if (response.ok) return response;

  let body = null;
  try { body = await response.clone().json(); } catch { /* corps absent ou non JSON */ }
  const status = response.status;
  const detail = body?.detail ?? response.statusText;
  const champs = body?.champs ?? (status === 422 ? _champsFromV1(body?.detail) : null);
  const code   = body?.code ?? `HTTP_${status}`;

  console.error(`[API${context ? " – " + context : ""}] HTTP ${status}`, body ?? response.statusText);

  if (status === 401 && redirectOn401) {
    _expireSession();
    throw new ApiError({ status, code, detail, message: SESSION_ENDED });
  }
  throw new ApiError({ status, code, detail, champs, message: _userMessage(status, detail, champs) });
}

/** fetch() qui transforme une absence de réponse du serveur en ApiError */
async function _fetch(url, init, context) {
  try {
    return await fetch(url, init);
  } catch (e) {
    console.error(`[API – ${context}] pas de réponse du serveur`, e);
    throw new ApiError({ status: 0, code: "RESEAU", message: NETWORK_ERROR });
  }
}

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
  const response = await _fetch(`${API_URL}${path}`, {
    method: "GET",
    headers: _authHeaders(),
  }, `GET ${path}`);
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
  const response = await _fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: _authHeaders(),
    body: JSON.stringify(body),
  }, `POST ${path}`);
  await _checkResponse(response, `POST ${path}`, options);
  return response.json();
}

/**
 * Requête POST authentifiée avec FormData (multipart/form-data).
 * Utilisée pour les uploads de fichiers (note d'analyse).
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
  const response = await _fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: _authHeadersOnly(),
    body: formData,
  }, `POST (form) ${path}`);
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
  const response = await _fetch(`${API_URL}${path}`, {
    method: "DELETE",
    headers: _authHeaders(),
  }, `DELETE ${path}`);
  await _checkResponse(response, `DELETE ${path}`);
  // Certains endpoints DELETE renvoient 204 No Content
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

/**
 * Télécharge une note d'analyse avec le jeton (conventions API v2 §8) et
 * l'ouvre dans un nouvel onglet. Un simple lien <a href> n'enverrait pas le
 * jeton : il ne fonctionnerait plus dès que le serveur exigera l'authentification.
 *
 * L'onglet est ouvert avant l'appel réseau (sinon le navigateur le bloque
 * comme fenêtre surgissante), puis reçoit le fichier.
 *
 * @param {string} filename - nom du fichier stocké (préfixe YYYYMMDD_HHMMSS_)
 * @returns {Promise<void>}
 * @throws {ApiError} en cas d'échec : l'appelant affiche e.message dans la page
 *   (composables/useNoteDownload.js)
 */
export async function downloadNote(filename) {
  const tab = window.open("", "_blank");
  try {
    const path = `/download/${encodeURIComponent(filename)}`;
    const response = await _fetch(`${API_URL}${path}`, {
      method: "GET",
      headers: _authHeadersOnly(),
    }, `GET ${path}`);
    await _checkResponse(response, `GET ${path}`);
    const url = URL.createObjectURL(await response.blob());
    if (tab) tab.location.href = url; else window.open(url, "_blank");
    // L'onglet a chargé le fichier : l'adresse temporaire peut être libérée
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch (e) {
    if (tab) tab.close();
    throw e;
  }
}

/**
 * Contrôle d'un fichier joint avant envoi (conventions API v2 §8, mêmes règles
 * que le backend) : extension .pdf, .jpg, .jpeg ou .png, 5 Mo au maximum.
 *
 * @param {File} file
 * @returns {string} message d'erreur, ou "" si le fichier est accepté
 */
export function checkAttachment(file) {
  const name = (file?.name ?? "").toLowerCase();
  if (!ALLOWED_EXTENSIONS.some((ext) => name.endsWith(ext))) {
    return "Formats acceptés : PDF, JPG, JPEG ou PNG.";
  }
  if (file.size > MAX_FILE_SIZE) {
    return "Le fichier dépasse la taille maximale de 5 Mo.";
  }
  return "";
}
