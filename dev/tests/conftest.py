"""Configuration pytest des tests de recette du frontend (voir README.md)."""
import os
import urllib.request

import pytest
from playwright.sync_api import sync_playwright

from outils import BASE_URL, Suivi

MOT_DE_PASSE = os.environ.get("WORKFLOW_TEST_PASSWORD")


def pytest_sessionstart(session):
    if not MOT_DE_PASSE:
        pytest.exit("Variable WORKFLOW_TEST_PASSWORD absente : mot de passe des comptes de test "
                    "(voir dev/tests/README.md).", returncode=2)
    try:
        urllib.request.urlopen(f"{BASE_URL}/index.html", timeout=10)
    except Exception as e:
        pytest.exit(f"Application injoignable ({BASE_URL}) : lancer uvicorn d'abord. ({e})", returncode=2)


@pytest.fixture(scope="session")
def navigateur():
    with sync_playwright() as p:
        # Chrome installé sur le poste (aucun navigateur téléchargé par Playwright)
        br = p.chromium.launch(channel=os.environ.get("WORKFLOW_BROWSER", "chrome"))
        yield br
        br.close()


@pytest.fixture
def ouvrir_session(navigateur):
    """Fabrique : ouvrir_session("introci") → (page connectée, Suivi).

    En fin de test, vérifie pour chaque page : aucune erreur JavaScript et
    aucune fenêtre du navigateur (alert / confirm).
    """
    ouverts = []

    def _ouvrir(utilisateur=None):
        ctx = navigateur.new_context(viewport={"width": 1366, "height": 768})
        page = ctx.new_page()
        suivi = Suivi(page)
        page.goto(f"{BASE_URL}/index.html", wait_until="domcontentloaded", timeout=60_000)
        if utilisateur:
            page.evaluate(
                "async ([u, p]) => { const m = await import('./static/js/services/auth.js'); await m.login(u, p); }",
                [utilisateur, MOT_DE_PASSE],
            )
        ouverts.append((ctx, suivi))
        return page, suivi

    yield _ouvrir

    for ctx, suivi in ouverts:
        ctx.close()
    for _, suivi in ouverts:
        assert not suivi.erreurs_js, f"Erreurs JavaScript : {suivi.erreurs_js}"
        assert not suivi.fenetres, f"Fenêtres du navigateur : {suivi.fenetres}"
