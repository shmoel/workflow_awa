"""Erreurs affichées dans la page, jamais par une fenêtre du navigateur (CORRECTION-18).

Les erreurs sont provoquées en interceptant les appels réseau dans le
navigateur : rien n'est envoyé ni modifié sur le serveur.
"""
import pytest

from outils import (MSG_RESEAU, couper, injecter_note, ouvrir, premier_id,
                    repondre_404, repondre_json, texte)


def test_suppression_erreur_dans_la_page(ouvrir_session):
    page, _ = ouvrir_session("introci")
    ouvrir(page, "consulter_demandes.html")
    if page.locator("button:has-text('Supprimer')").count() == 0:
        pytest.skip("aucune demande introduite pour introci")
    couper(page, "**/api/avis/")
    page.locator("button:has-text('Supprimer')").first.click()
    page.locator("textarea:visible").fill("test automatique")
    page.locator("button:visible", has_text="Confirmer").click()
    page.wait_for_timeout(1_000)
    assert f"Erreur lors de la suppression : {MSG_RESEAU}" in texte(page)


@pytest.mark.parametrize("gabarit,lien,route", [
    ("detail_consulter_demande.html?id_dmd={id}", "Télécharger la note", "**/api/demande_particulier/**"),
    ("modifier_demande.html?id_dmd={id}", "Consulter la note", "**/api/demandes/*"),
], ids=["detail", "modifier"])
def test_note_introuvable_dans_la_page(ouvrir_session, gabarit, lien, route):
    page, _ = ouvrir_session("introci")
    ouvrir(page, "acceuil.html", attente_ms=0)
    id_dmd = premier_id(page, "/demandes_user/")
    if id_dmd is None:
        pytest.skip("aucune demande introduite pour introci")
    injecter_note(page, route)
    repondre_404(page, "**/api/download/**")
    ouvrir(page, gabarit.format(id=id_dmd))
    page.locator(f"a:has-text(\"{lien}\")").first.click()
    page.wait_for_timeout(1_000)
    assert "Introuvable." in texte(page)
    assert len(page.context.pages) == 1, "l'onglet ouvert pour le téléchargement doit être refermé"


def test_cloture_erreur_dans_la_page(ouvrir_session):
    page, _ = ouvrir_session("testggr")
    ligne = {"id_demande": 999_999, "type_demande": "Test", "banque": "BKCI", "nom_client": "Client test",
             "categorie_demande": "CIB", "montant": 1, "date": "2026-01-01", "heure": "10:00:00"}
    repondre_json(page, "**/api/demandes_a_cloturer/", {"results": [ligne]})
    couper(page, "**/api/cloturer_demande/**")
    ouvrir(page, "ggrg_demandes_validation.html", attente_ms=1_500)
    page.locator("a,button,li", has_text="Demandes fin de processus").first.click()
    page.locator("button:visible", has_text="Cloturer").first.click()
    page.locator("button:visible", has_text="Confirmer").click()
    page.wait_for_timeout(1_000)
    assert f"Erreur lors de la clôture : {MSG_RESEAU}" in texte(page)


def _ouvrir_evaluation(page):
    ouvrir(page, "demandes_validation.html")
    bouton = page.locator("button:has-text('valuer'), a:has-text('valuer')")
    if bouton.count() == 0:
        pytest.skip("aucune demande à valider pour dgci")
    bouton.first.click()
    page.wait_for_url("**/valider_demande.html?id_dmd=*")
    page.wait_for_timeout(1_500)


def test_valider_note_introuvable(ouvrir_session):
    page, _ = ouvrir_session("dgci")
    injecter_note(page, "**/api/demande_particulier/**")
    repondre_404(page, "**/api/download/**")
    _ouvrir_evaluation(page)
    page.locator("a", has_text="Télécharger").first.click()
    page.wait_for_timeout(1_000)
    assert "Introuvable." in texte(page)


def test_valider_message_de_l_api(ouvrir_session):
    page, _ = ouvrir_session("dgci")
    _ouvrir_evaluation(page)
    couper(page, "**/api/valider_avis/**")
    page.select_option("select", label="Rejetée")
    page.locator("form button[type=submit]").first.click()
    page.wait_for_timeout(500)
    page.locator("button:visible", has_text="OUI").click()
    page.wait_for_timeout(800)
    alerte = page.locator("#alert-container").inner_text()
    assert f"Erreur lors de la soumission du formulaire : {MSG_RESEAU}" in alerte


def test_croix_fenetre_dg_cliquable(ouvrir_session):
    page, suivi = ouvrir_session("dgci")
    _ouvrir_evaluation(page)
    page.select_option("select", label="Rejetée")
    page.locator("form button[type=submit]").first.click()
    page.wait_for_timeout(500)
    page.locator("[aria-label='Fermer']:visible").first.click(timeout=5_000)  # clic réel
    page.wait_for_url("**/demandes_validation.html", timeout=10_000)
    assert not suivi.envois, f"avis envoyé : {suivi.envois}"
