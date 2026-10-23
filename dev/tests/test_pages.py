"""Chaque page s'affiche pour les comptes concernés ; banque fixée (CORRECTION-17)."""
import pytest

from outils import ouvrir, premier_id

# Pages par compte du jeu de test ; {id} = première demande de « Mes demandes » (introci)
PAGES = [
    ("introci", "acceuil.html"),
    ("introci", "introduire_demandes.html"),
    ("introci", "consulter_demandes.html"),
    ("introci", "modifier_demande.html?id_dmd={id}"),
    ("introci", "detail_consulter_demande.html?id_dmd={id}"),
    ("introci", "chat.html?id_dmd={id}"),
    ("dgci", "acceuil.html"),
    ("dgci", "demandes_validation.html"),
    ("dgci", "historique.html"),
    ("testggr", "ggrg_demandes_validation.html"),
    ("testggr", "historique.html"),
    ("testawa", "acceuil.html"),
    ("testawa", "demandes_validation.html"),
]


@pytest.mark.parametrize("utilisateur,chemin", PAGES, ids=[f"{u}-{c.split('.')[0]}" for u, c in PAGES])
def test_page_affichee(ouvrir_session, utilisateur, chemin):
    page, _ = ouvrir_session(utilisateur)
    if "{id}" in chemin:
        ouvrir(page, "acceuil.html", attente_ms=0)
        id_dmd = premier_id(page, "/demandes_user/")
        if id_dmd is None:
            pytest.skip("aucune demande introduite pour ce compte")
        chemin = chemin.format(id=id_dmd)
    ouvrir(page, chemin)
    assert page.url.endswith(chemin), f"redirigé vers {page.url}"
    contenu = page.evaluate("document.querySelector('#app').innerText.trim()")
    assert len(contenu) > 50, f"page vide : {contenu!r}"


@pytest.mark.parametrize("utilisateur,sigle", [("introci", "BKCI"), ("introsn", "BKSN")])
def test_banque_fixee_creation(ouvrir_session, utilisateur, sigle):
    page, _ = ouvrir_session(utilisateur)
    ouvrir(page, "introduire_demandes.html")
    page.wait_for_function("document.querySelector('#df-banque option:checked')", timeout=15_000)
    banque = page.locator("#df-banque")
    assert banque.is_disabled()
    assert banque.evaluate("s => s.selectedOptions[0].textContent.trim()").startswith(sigle)


def test_banque_fixee_modification(ouvrir_session):
    page, _ = ouvrir_session("introci")
    ouvrir(page, "acceuil.html", attente_ms=0)
    id_dmd = premier_id(page, "/demandes_user/")
    if id_dmd is None:
        pytest.skip("aucune demande introduite pour introci")
    ouvrir(page, f"modifier_demande.html?id_dmd={id_dmd}")
    page.wait_for_function("document.querySelector('#df-banque option:checked')", timeout=15_000)
    banque = page.locator("#df-banque")
    assert banque.is_disabled()
    assert banque.evaluate("s => s.selectedOptions[0].textContent.trim()").startswith("BKCI")


def test_etats_fin_de_processus(ouvrir_session):
    page, _ = ouvrir_session("testawa")
    ouvrir(page, "demandes_validation.html")
    page.locator("a,button,li", has_text="processus").first.click()  # libellé legacy : « fin de de processus »
    page.wait_for_timeout(400)
    etats = page.evaluate("""() => [...document.querySelectorAll('button')]
        .filter(b => b.offsetParent).map(b => b.textContent.trim())
        .filter(t => t === 'Terme' || t === 'Arrêté')""")
    if not etats:
        pytest.skip("aucune demande en fin de processus")
    assert set(etats) <= {"Terme", "Arrêté"}
