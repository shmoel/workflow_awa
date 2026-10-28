"""Lot F (feuille de route UI/UX, niveau 1) : états des tableaux, montants, chat
vide, accessibilité des onglets et de l'accordéon, note d'analyse sans doublon.

Les cas sont provoqués en interceptant les réponses de l'API : rien n'est
envoyé ni modifié sur le serveur.
"""
import pytest

from outils import (injecter_note, modifier_reponse, ouvrir, premier_id,
                    repondre_json, sans_reponse, texte)

# Montant formaté en français : espaces fines insécables entre les milliers
MONTANT_FORMATE = "1 500 000"


# ---- Tableaux : « Chargement… » puis « Aucune demande » ----

def test_tableau_chargement(ouvrir_session):
    page, _ = ouvrir_session("testawa")
    sans_reponse(page, "**/api/demandes_a_valider/**")
    ouvrir(page, "demandes_validation.html", attente_ms=1_000)
    ligne = page.locator("#demande-intro tr[data-message]")
    assert ligne.inner_text().strip() == "Chargement…"


def test_tableau_vide(ouvrir_session):
    page, _ = ouvrir_session("introci")
    repondre_json(page, "**/api/demandes_user/**", {"results": []})
    ouvrir(page, "consulter_demandes.html")
    ligne = page.locator("#demande-intro tr[data-message]")
    assert ligne.inner_text().strip() == "Aucune demande"


def test_tableau_erreur_prioritaire(ouvrir_session):
    """En cas d'erreur, seule la ligne d'erreur s'affiche (pas « Aucune demande »)."""
    page, _ = ouvrir_session("introci")
    repondre_json(page, "**/api/demandes_user/**", {"detail": "erreur"}, status=500)
    ouvrir(page, "consulter_demandes.html")
    lignes = page.locator("#demande-intro tr[data-message]")
    assert lignes.count() == 1
    assert lignes.first.get_attribute("data-message") == "erreur"


# ---- Montants formatés (Valider, Chat) ----

def _ouvrir_evaluation(page):
    ouvrir(page, "demandes_validation.html")
    bouton = page.locator("button:has-text('valuer')")
    if bouton.count() == 0:
        pytest.skip("aucune demande à valider pour dgci")
    bouton.first.click()
    page.wait_for_url("**/valider_demande.html?id_dmd=*")
    page.wait_for_timeout(1_500)


def test_montant_formate_valider(ouvrir_session):
    page, _ = ouvrir_session("dgci")
    modifier_reponse(page, "**/api/demande_particulier/**", montant=1500000)
    _ouvrir_evaluation(page)
    assert MONTANT_FORMATE in texte(page)


def test_montant_formate_chat(ouvrir_session):
    page, _ = ouvrir_session("introci")
    ouvrir(page, "acceuil.html", attente_ms=0)
    id_dmd = premier_id(page, "/demandes_user/")
    if id_dmd is None:
        pytest.skip("aucune demande introduite pour introci")
    modifier_reponse(page, "**/api/demandes/*", montant=1500000)
    ouvrir(page, f"chat.html?id_dmd={id_dmd}")
    assert f"{MONTANT_FORMATE} XOF" in texte(page)


def test_chat_sans_message(ouvrir_session):
    page, _ = ouvrir_session("introci")
    ouvrir(page, "acceuil.html", attente_ms=0)
    id_dmd = premier_id(page, "/demandes_user/")
    if id_dmd is None:
        pytest.skip("aucune demande introduite pour introci")
    repondre_json(page, "**/api/messages_chat/**", {"results": []})
    ouvrir(page, f"chat.html?id_dmd={id_dmd}")
    assert "Aucun message pour cette demande" in texte(page)


# ---- Accessibilité ----

def test_onglets_clavier(ouvrir_session):
    page, _ = ouvrir_session("testawa")
    ouvrir(page, "demandes_validation.html")
    onglets = page.locator("[role=tablist] [role=tab]")
    assert onglets.count() == 3
    assert onglets.nth(0).get_attribute("aria-selected") == "true"
    assert page.locator("#demande-intro[role=tabpanel]").is_visible()

    onglets.nth(0).focus()
    page.keyboard.press("ArrowRight")
    page.wait_for_timeout(200)
    assert onglets.nth(1).get_attribute("aria-selected") == "true"
    assert onglets.nth(0).get_attribute("aria-selected") == "false"
    assert page.evaluate("document.activeElement.getAttribute('aria-selected')") == "true"
    assert page.locator("#demande-val").is_visible()
    assert not page.locator("#demande-intro").is_visible()

    page.keyboard.press("ArrowLeft")
    page.keyboard.press("ArrowLeft")  # du premier onglet, revient au dernier
    page.wait_for_timeout(200)
    assert onglets.nth(2).get_attribute("aria-selected") == "true"

    page.keyboard.press("Enter")      # Entrée sur l'onglet focalisé : reste sélectionné
    assert onglets.nth(2).get_attribute("aria-selected") == "true"


def test_accordeon_avis_clavier(ouvrir_session):
    page, _ = ouvrir_session("introci")
    ouvrir(page, "acceuil.html", attente_ms=0)
    id_dmd = premier_id(page, "/demandes_user/")
    if id_dmd is None:
        pytest.skip("aucune demande introduite pour introci")
    ouvrir(page, f"detail_consulter_demande.html?id_dmd={id_dmd}")
    entetes = page.locator("#detail_commentaire button[aria-expanded]")
    if entetes.count() == 0:
        pytest.skip("aucun avis sur cette demande")
    entete = entetes.first
    avant = entete.get_attribute("aria-expanded")
    entete.focus()
    page.keyboard.press("Enter")
    page.wait_for_timeout(200)
    assert entete.get_attribute("aria-expanded") != avant


@pytest.mark.parametrize("chemin", ["acceuil.html", "demandes_validation.html"])
def test_plus_de_lien_javascript_hors_liens_conserves(ouvrir_session, chemin):
    """Onglets, menus et bas de carte : plus de href="javascript:". Restent les
    liens morts conservés (décision du 28/10/2026) et la déconnexion."""
    page, _ = ouvrir_session("testawa")
    ouvrir(page, chemin)
    liens = page.evaluate("""() => [...document.querySelectorAll('a[href^="javascript"]')]
        .map(a => a.innerText.trim())""")
    conserves = {"Statistiques", "My profile", "Messages", "Account settings", "",  # déconnexion : <input> dans le lien
                 "Attijariwestafrica", "About Us OKKKKKK", "Help", "Contact", "Terms & Conditions"}
    assert set(liens) <= conserves, f"liens javascript: inattendus : {set(liens) - conserves}"


# ---- Note d'analyse : « Télécharger » ou « Aucune note jointe », jamais les deux ----

def test_note_detail_sans_doublon(ouvrir_session):
    page, _ = ouvrir_session("introci")
    ouvrir(page, "acceuil.html", attente_ms=0)
    id_dmd = premier_id(page, "/demandes_user/")
    if id_dmd is None:
        pytest.skip("aucune demande introduite pour introci")
    injecter_note(page, "**/api/demande_particulier/**")
    ouvrir(page, f"detail_consulter_demande.html?id_dmd={id_dmd}")
    contenu = texte(page)
    assert "Télécharger la note" in contenu or "TÉLÉCHARGER LA NOTE" in contenu
    assert "Aucune note jointe".upper() not in contenu.upper()


def test_note_detail_absente(ouvrir_session):
    page, _ = ouvrir_session("introci")
    ouvrir(page, "acceuil.html", attente_ms=0)
    id_dmd = premier_id(page, "/demandes_user/")
    if id_dmd is None:
        pytest.skip("aucune demande introduite pour introci")
    modifier_reponse(page, "**/api/demande_particulier/**", note_analyse=None)
    ouvrir(page, f"detail_consulter_demande.html?id_dmd={id_dmd}")
    contenu = texte(page).upper()
    assert "AUCUNE NOTE JOINTE" in contenu
    assert "TÉLÉCHARGER LA NOTE" not in contenu


def test_note_valider_sans_doublon(ouvrir_session):
    page, _ = ouvrir_session("dgci")
    injecter_note(page, "**/api/demande_particulier/**")
    _ouvrir_evaluation(page)
    contenu = texte(page)
    assert "Télécharger" in contenu
    assert "Aucune note jointe" not in contenu
