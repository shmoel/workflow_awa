"""Accessibilité (lot C) : zoom autorisé, clavier dans les fenêtres ; Échap n'envoie jamais rien."""
import re

import pytest

from outils import BASE_URL, fenetre_ouverte, focus, ouvrir, premier_id, repondre_json

PAGES = ["index.html", "acceuil.html", "introduire_demandes.html", "modifier_demande.html",
         "consulter_demandes.html", "detail_consulter_demande.html", "chat.html",
         "demandes_validation.html", "valider_demande.html", "ggrg_demandes_validation.html",
         "historique.html"]


@pytest.mark.parametrize("chemin", PAGES)
def test_zoom_autorise(navigateur, chemin):
    ctx = navigateur.new_context()
    html = ctx.request.get(f"{BASE_URL}/{chemin}").text()
    ctx.close()
    viewport = re.search(r'<meta name="viewport" content="([^"]*)"', html).group(1)
    assert "user-scalable" not in viewport and "maximum-scale" not in viewport, viewport


def test_fenetre_suppression_clavier(ouvrir_session):
    page, suivi = ouvrir_session("introci")
    ouvrir(page, "consulter_demandes.html")
    if page.locator("button:has-text('Supprimer')").count() == 0:
        pytest.skip("aucune demande introduite pour introci")
    page.locator("button:has-text('Supprimer')").first.click()
    page.wait_for_timeout(400)
    assert focus(page)["surFenetre"], "le focus doit aller sur la fenêtre à l'ouverture"
    for touche in ["Tab"] * 8 + ["Shift+Tab"] * 8:
        page.keyboard.press(touche)
        assert focus(page)["dansFenetre"], f"le focus est sorti de la fenêtre ({touche})"
    page.keyboard.press("Escape")
    page.wait_for_timeout(400)
    assert not fenetre_ouverte(page)
    assert focus(page)["texte"] == "Supprimer", "le focus doit revenir au bouton d'origine"
    assert not suivi.envois, f"Échap a envoyé des données : {suivi.envois}"


def test_fenetre_information_echap_vaut_ok(ouvrir_session):
    page, _ = ouvrir_session("introci")
    ouvrir(page, "consulter_demandes.html")
    if page.locator("button:has-text('Supprimer')").count() == 0:
        pytest.skip("aucune demande introduite pour introci")
    repondre_json(page, "**/api/avis/", {})  # suppression simulée (rien n'est supprimé)
    page.locator("button:has-text('Supprimer')").first.click()
    page.locator("button:visible", has_text="Confirmer").click()
    page.wait_for_timeout(600)
    assert focus(page)["surFenetre"]
    page.evaluate("window.__avantRechargement = true")
    page.keyboard.press("Escape")
    page.wait_for_timeout(2_500)
    assert page.evaluate("window.__avantRechargement") is None, "Échap doit faire comme OK (rechargement)"


def test_fenetre_confirmation_modifier_echap_annule(ouvrir_session):
    page, suivi = ouvrir_session("introci")
    ouvrir(page, "acceuil.html", attente_ms=0)
    id_dmd = premier_id(page, "/demandes_user/")
    if id_dmd is None:
        pytest.skip("aucune demande introduite pour introci")
    ouvrir(page, f"modifier_demande.html?id_dmd={id_dmd}")
    page.locator("form button[type=submit]").first.click()
    page.wait_for_timeout(400)
    assert fenetre_ouverte(page) and focus(page)["surFenetre"]
    page.keyboard.press("Escape")
    page.wait_for_timeout(400)
    assert not fenetre_ouverte(page)
    assert not suivi.envois, f"Échap a envoyé des données : {suivi.envois}"


def test_fenetre_dg_echap_ferme_sans_enregistrer(ouvrir_session):
    page, suivi = ouvrir_session("dgci")
    ouvrir(page, "demandes_validation.html")
    bouton = page.locator("button:has-text('valuer'), a:has-text('valuer')")
    if bouton.count() == 0:
        pytest.skip("aucune demande à valider pour dgci")
    bouton.first.click()
    page.wait_for_url("**/valider_demande.html?id_dmd=*")
    page.wait_for_timeout(1_500)
    page.select_option("select", label="Rejetée")
    page.locator("form button[type=submit]").first.click()
    page.wait_for_timeout(400)
    assert fenetre_ouverte(page) and focus(page)["surFenetre"]
    for _ in range(4):
        page.keyboard.press("Tab")
        assert focus(page)["dansFenetre"]
    page.keyboard.press("Escape")
    page.wait_for_url("**/demandes_validation.html", timeout=10_000)
    assert not suivi.envois, f"avis envoyé (OUI ou NON) : {suivi.envois}"
