"""Utilitaires partagés par les tests de recette (navigation, données, interceptions)."""
import json
import os

BASE_URL = os.environ.get("WORKFLOW_URL", "http://127.0.0.1:8000/workflow").rstrip("/")

# Message de l'application quand un appel réseau échoue (services/api.js, NETWORK_ERROR)
MSG_RESEAU = "Le serveur ne répond pas"


class Suivi:
    """Erreurs JavaScript, fenêtres du navigateur (alert/confirm) et envois POST d'une page."""

    def __init__(self, page):
        self.erreurs_js = []
        self.fenetres = []
        self.envois = []
        page.on("pageerror", lambda e: self.erreurs_js.append(str(e)))
        page.on("dialog", self._fenetre)
        page.on("request", self._requete)

    def _fenetre(self, dialog):
        self.fenetres.append(dialog.message)
        dialog.dismiss()

    def _requete(self, req):
        if req.method == "POST" and "/api/" in req.url and "/login" not in req.url:
            self.envois.append(req.url)


def ouvrir(page, chemin, attente_ms=800):
    """Ouvre une page de l'application et attend la fin des chargements."""
    page.goto(f"{BASE_URL}/{chemin}", wait_until="domcontentloaded", timeout=60_000)
    try:
        page.wait_for_load_state("networkidle", timeout=8_000)
    except Exception:
        pass  # la vérification périodique des notifications peut empêcher « networkidle »
    page.wait_for_timeout(attente_ms)


def texte(page):
    return page.evaluate("document.body.innerText")


def premier_id(page, route):
    """id_demande de la première ligne renvoyée par une route GET de l'API (None si vide)."""
    return page.evaluate(
        """async (route) => {
            const m = await import('./static/js/services/api.js');
            const d = await m.apiGet(route);
            const rows = Array.isArray(d) ? d : (d?.results ?? []);
            return rows[0]?.id_demande ?? null;
        }""",
        route,
    )


def focus(page):
    """Où se trouve le focus clavier : dans une fenêtre (role=dialog) ou non."""
    return page.evaluate(
        """() => { const a = document.activeElement;
            return { dansFenetre: !!a?.closest('[role=dialog]'),
                     surFenetre: a?.getAttribute('role') === 'dialog',
                     texte: (a?.textContent || '').trim().slice(0, 30) }; }"""
    )


def fenetre_ouverte(page):
    return page.locator("[role=dialog]").count() > 0


# ---- Interceptions réseau (aucune donnée n'est modifiée sur le serveur) ----

def couper(page, motif):
    """Fait échouer les appels correspondants comme si le serveur ne répondait pas."""
    page.route(motif, lambda route: route.abort())


def repondre_404(page, motif):
    page.route(motif, lambda route: route.fulfill(
        status=404, content_type="application/json", body='{"detail": "introuvable"}'))


def repondre_json(page, motif, donnees, status=200):
    page.route(motif, lambda route: route.fulfill(
        status=status, content_type="application/json", body=json.dumps(donnees)))


def modifier_reponse(page, motif, **champs):
    """Remplace des champs de la demande renvoyée par le serveur (lecture seule, rien n'est écrit)."""
    def _route(route):
        reponse = route.fetch()
        donnees = reponse.json()
        res = donnees.get("results")
        for ligne in (res if isinstance(res, list) else [res]):
            if isinstance(ligne, dict):
                ligne.update(champs)
        route.fulfill(response=reponse, body=json.dumps(donnees))
    page.route(motif, _route)


def injecter_note(page, motif, nom="20260101_000000_note_absente.pdf"):
    """Ajoute une note d'analyse à la demande renvoyée par le serveur (lien « Télécharger » affiché)."""
    modifier_reponse(page, motif, note_analyse=nom)


def sans_reponse(page, motif):
    """Laisse les appels correspondants sans réponse (page figée sur « Chargement… »)."""
    page.route(motif, lambda route: None)
