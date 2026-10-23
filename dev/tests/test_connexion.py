"""Connexion : alerte temporaire, session expirée (CORRECTION-14)."""
from outils import BASE_URL, ouvrir


def test_formulaire_incomplet_alerte_temporaire(ouvrir_session):
    page, _ = ouvrir_session()
    ouvrir(page, "index.html")
    page.fill("input[autocomplete=username]", "   ")
    page.fill("input[autocomplete=current-password]", "   ")
    page.evaluate("document.querySelector('#loginForm').requestSubmit()")
    page.wait_for_timeout(300)
    assert "remplir correctement" in page.locator("#alert-container").inner_text()
    page.wait_for_timeout(5_300)
    assert page.locator("#alert-container").inner_text().strip() == ""


def test_identifiants_invalides(ouvrir_session):
    page, _ = ouvrir_session()
    ouvrir(page, "index.html")
    page.fill("input[autocomplete=username]", "inconnu")
    page.fill("input[autocomplete=current-password]", "mauvais")
    page.evaluate("document.querySelector('#loginForm').requestSubmit()")
    page.wait_for_timeout(1_500)
    assert "Vérifiez vos identifiants" in page.locator("#alert-container").inner_text()
    assert page.url.endswith("index.html")


def test_session_expiree_message(ouvrir_session):
    page, _ = ouvrir_session("introci")
    page.evaluate("localStorage.setItem('tokenExpiry', String(Date.now() - 1000))")
    page.goto(f"{BASE_URL}/acceuil.html", wait_until="domcontentloaded")
    page.wait_for_url("**/index.html*", timeout=15_000)
    page.wait_for_timeout(800)
    assert "Votre session a expiré" in page.locator("#alert-container").inner_text()
