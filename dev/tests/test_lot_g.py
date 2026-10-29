"""Lot G (feuille de route UI/UX, niveau 2) : alertes lisibles, formulaire de
validation, frise du circuit, pastilles de statut, menu actif, cartes de
compteurs, tri, filtres, chat, coquilles.

Les données sont fournies en interceptant les réponses de l'API : rien n'est
envoyé ni modifié sur le serveur (l'enregistrement d'un avis est lui aussi
intercepté).
"""
import json

import pytest

from outils import ouvrir, repondre_json, texte

ID = 999_999
DEMANDE = {"id_demande": ID, "type_demande": "Ligne de crédit", "banque": "BKCI", "categorie_demande": "CIB",
           "nom_client": "Client test", "montant": 1500000, "note_analyse": None, "date": "2026-10-20",
           "heure": "10:15:00", "date_time": "2026-10-20 10:15:00"}
DECISIONS = [{"id": 1, "libelle": "Validée"}, {"id": 2, "libelle": "Rejetée"}]
STATUTS = [{"id": i + 1, "libelle": l, "description": l} for i, l in enumerate(
    ["SOUMISE", "VAL_RISQUE", "VAL_DG_LOCAL", "EN_ATT_AWA", "EN_ATT_AIG", "APPROUVEE", "CLOTUREE",
     "SUPPRIMEE", "REJET_DG"])]


def avis(*evenements):
    return {"results": [{"nom": "Dupont", "prenom": "Ana", "banque": "BKCI", "entite": "GGR",
                         "decision": "Validée", "commentaire": "", "event_d": e, "statut_d": e,
                         "date_time": f"2026-10-20 1{i}:00:00"} for i, e in enumerate(evenements)]}


def ligne(i, montant, max_event=3, contrepartie=None):
    return {"id_demande": ID - i, "type_demande": "Ligne de crédit", "banque": "BKCI",
            "categorie_demande": "CIB", "nom_client": contrepartie or f"Client {i}", "montant": montant,
            "date": "2026-10-20", "heure": f"1{i}:00:00", "date_val": f"2026-10-2{i} 10:00:00",
            "date_avis": f"2026-10-2{i}", "heure_avis": "10:00:00", "max_event": max_event,
            "description": f"Statut {max_event}"}


def ouvrir_evaluation(page):
    repondre_json(page, "**/api/demande_particulier/**", {"results": [DEMANDE]})
    repondre_json(page, "**/api/decisions/**", DECISIONS)
    repondre_json(page, "**/api/commentaires_demande/**", avis("SOUMISE"))
    ouvrir(page, f"valider_demande.html?id_dmd={ID}", attente_ms=1_200)


def lignes_visibles(page, volet):
    return page.locator(f"#{volet} tbody tr:not([data-message])")


# ---- Point 6 : alertes lisibles ----

def test_alerte_texte_fonce(ouvrir_session):
    page, _ = ouvrir_session("introci")
    ouvrir(page, "detail_consulter_demande.html")
    couleur = page.locator("[role=alert]").first.evaluate("e => getComputedStyle(e).color")
    assert couleur == "rgb(163, 23, 43)", couleur


# ---- Point 7 : formulaire de validation ----

def test_aucune_decision_preselectionnee(ouvrir_session):
    page, suivi = ouvrir_session("testawa")
    ouvrir_evaluation(page)
    choix = page.locator("#decision")
    assert choix.input_value() == ""
    assert choix.locator("option").first.inner_text().strip() == "Choisir une décision"
    page.locator("#valider_avis").click()
    page.wait_for_timeout(300)
    assert page.locator("[role=dialog]").count() == 0, "fenêtre ouverte sans décision choisie"
    assert not suivi.envois


def test_confirmation_recapitulatif(ouvrir_session):
    page, suivi = ouvrir_session("testawa")
    ouvrir_evaluation(page)
    page.select_option("#decision", label="Validée")
    page.locator("#valider_avis").click()
    recap = page.locator("[role=dialog] [data-recap]").inner_text()
    for attendu in ("Validée", f"DEM-CIB-{ID}", "Client test", "1 500 000 XOF"):
        assert attendu in recap, (attendu, recap)
    page.locator("[role=dialog] button", has_text="Annuler").click()
    assert not suivi.envois


def test_avis_enregistre_sans_attente(ouvrir_session):
    page, _ = ouvrir_session("testawa")
    ouvrir_evaluation(page)
    repondre_json(page, "**/api/valider_avis/**", {})   # intercepté : rien n'est enregistré
    page.select_option("#decision", label="Validée")
    page.locator("#valider_avis").click()
    page.locator("[role=dialog] button", has_text="Confirmer").click()
    page.wait_for_timeout(600)   # le legacy attendait 2 s avant la fenêtre de succès
    assert "Votre avis a bien été enregistré !" in texte(page)


def test_fenetre_dg_boutons_explicites(ouvrir_session):
    page, suivi = ouvrir_session("dgci")
    ouvrir_evaluation(page)
    page.select_option("#decision", label="Rejetée")
    page.locator("#valider_avis").click()
    fenetre = page.locator("[role=dialog]")
    # innerText suit text-transform (boutons en capitales) : comparaison en minuscules
    boutons = [t.strip().lower() for t in fenetre.locator("button").all_inner_texts()]
    assert "poursuivre le circuit" in boutons and "arrêter la demande" in boutons, boutons
    assert "oui" not in boutons and "non" not in boutons, boutons
    assert not suivi.envois


# ---- Point 8 : frise du circuit et pastilles ----

def ouvrir_detail(page, *evenements):
    repondre_json(page, "**/api/demande_particulier/**", {"results": [DEMANDE]})
    repondre_json(page, "**/api/commentaires_demande/**", avis(*evenements))
    repondre_json(page, "**/api/event_statuts/**", STATUTS)
    ouvrir(page, f"detail_consulter_demande.html?id_dmd={ID}", attente_ms=1_200)


def test_frise_etape_courante(ouvrir_session):
    page, _ = ouvrir_session("introci")
    ouvrir_detail(page, "SOUMISE", "VAL_RISQUE")
    courante = page.locator("[data-frise] li[aria-current=step]")
    assert courante.get_attribute("data-etat") == "courante"
    assert "DG local" in courante.inner_text()
    assert page.locator("[data-frise] li[data-etat=passee]").count() == 2


def test_frise_arret_dg(ouvrir_session):
    page, _ = ouvrir_session("introci")
    ouvrir_detail(page, "SOUMISE", "VAL_RISQUE", "REJET_DG")
    arret = page.locator("[data-frise] li[data-etat=arret]")
    assert "DG local" in arret.inner_text()
    assert "Arrêtée par le DG local" in page.locator("[data-frise]").inner_text()


def test_frise_absente_sans_statut(ouvrir_session):
    page, _ = ouvrir_session("introci")
    repondre_json(page, "**/api/event_statuts/**", {"detail": "erreur"}, status=500)
    repondre_json(page, "**/api/demande_particulier/**", {"results": [DEMANDE]})
    repondre_json(page, "**/api/commentaires_demande/**", avis("SOUMISE"))
    ouvrir(page, f"detail_consulter_demande.html?id_dmd={ID}", attente_ms=1_200)
    assert page.locator("[data-frise]").count() == 0
    assert "Client test" in texte(page)   # la page s'affiche quand même


def test_pastille_statut_mes_demandes(ouvrir_session):
    page, _ = ouvrir_session("introci")
    repondre_json(page, "**/api/demandes_user_valider/**", {"results": [ligne(1, 1000, max_event=3)]})
    ouvrir(page, "consulter_demandes.html")
    page.locator("#demande-val-tab").click()
    pastille = page.locator("#demande-val span.rounded-full", has_text="Statut 3")
    assert pastille.count() == 1


# ---- Point 9 : menu latéral ----

@pytest.mark.parametrize("chemin,entree", [
    ("acceuil.html", "Accueil"),
    ("consulter_demandes.html", "Consulter mes demandes"),
    ("introduire_demandes.html", "Introduire demande"),
])
def test_menu_page_courante(ouvrir_session, chemin, entree):
    page, _ = ouvrir_session("introci")
    ouvrir(page, chemin)
    actifs = page.locator("a[aria-current=page]")
    assert actifs.count() == 1
    assert actifs.first.is_visible(), "le sous-menu de la page courante doit être ouvert"
    assert actifs.first.inner_text().strip() == entree


def test_menu_validation_page_evaluer(ouvrir_session):
    page, _ = ouvrir_session("testawa")
    ouvrir_evaluation(page)
    actif = page.locator("a[aria-current=page]:visible")
    assert actif.inner_text().strip() == "Valider des demandes"


# ---- Point 10 : cartes de compteurs ----

def test_cartes_ordre_et_filtre(ouvrir_session):
    page, _ = ouvrir_session("introci")
    lignes = [ligne(1, 10, max_event=1), ligne(2, 20, max_event=3), ligne(3, 30, max_event=3)]
    repondre_json(page, "**/api/demandes_a_consulter/**", {"results": lignes})
    ouvrir(page, "acceuil.html", attente_ms=1_200)
    cartes = page.locator("button[aria-pressed]")
    titres = [t.split("\n")[0].strip() for t in cartes.all_inner_texts()]
    assert titres == ["Validation GGR Local", "Validation DG Local", "Validation AWA",
                      "Validation FO Group", "Validation GGR Group", "Clôturées"], titres

    cartes.nth(2).click()
    assert cartes.nth(2).get_attribute("aria-pressed") == "true"
    assert lignes_visibles(page, "demande-intro").count() == 2
    assert "Validation AWA" in page.locator("[data-filtre-statut]").inner_text()

    page.locator("[aria-label='Retirer le filtre']").click()
    assert lignes_visibles(page, "demande-intro").count() == 3
    assert page.locator("[data-filtre-statut]").count() == 0


# ---- Point 12 : tri, filtres ----

def montants(page):
    return [t.strip() for t in page.locator("#demande-intro tbody tr td:nth-child(5)").all_inner_texts()]


def test_tri_montant(ouvrir_session):
    page, _ = ouvrir_session("testawa")
    repondre_json(page, "**/api/demandes_a_valider/**",
                  {"results": [ligne(1, 75000), ligne(2, 250000000), ligne(3, 1500000)]})
    ouvrir(page, "demandes_validation.html")
    entete = page.locator("#demande-intro th", has_text="Montant")
    assert entete.get_attribute("aria-sort") == "none"
    entete.locator("button").click()
    assert entete.get_attribute("aria-sort") == "ascending"
    assert montants(page) == ["75 000", "1 500 000", "250 000 000"]
    entete.locator("button").click()
    assert entete.get_attribute("aria-sort") == "descending"
    assert montants(page) == ["250 000 000", "1 500 000", "75 000"]


def test_filtres_page_validation_et_effacer(ouvrir_session):
    page, _ = ouvrir_session("testawa")
    repondre_json(page, "**/api/demandes_a_valider/**",
                  {"results": [ligne(1, 10), ligne(2, 20, contrepartie="Société Alpha"), ligne(3, 30)]})
    ouvrir(page, "demandes_validation.html")
    assert page.locator("button", has_text="Effacer les filtres").count() == 0
    page.get_by_label("Filtrer par Contrepartie").fill("alpha")
    assert lignes_visibles(page, "demande-intro").count() == 1
    page.get_by_label("Filtrer par Contrepartie").fill("inexistant")
    assert "Aucune demande ne correspond aux filtres" in page.locator("#demande-intro").inner_text()
    page.locator("button", has_text="Effacer les filtres").click()
    assert lignes_visibles(page, "demande-intro").count() == 3
    assert page.get_by_label("Filtrer par Contrepartie").input_value() == ""


# ---- Point 13 : chat ----

def test_chat_utilisateur_inconnu_et_rechargement(ouvrir_session):
    page, _ = ouvrir_session("introci")
    repondre_json(page, "**/api/demandes/*", {"results": {**DEMANDE, "banque_user": "BKCI",
                                                          "description": "Soumise", "date_creation": "2026-10-20"}})
    message = {"id_user": -1, "username": None, "commentaire": "Premier message",
               "date_creation": "2026-10-20", "heure_creation": "10:00:00"}
    reponses = [[message], [message, {**message, "username": "Ana", "commentaire": "Second message"}]]

    def messages(route):
        corps = reponses[0]
        route.fulfill(status=200, content_type="application/json", body=json.dumps({"results": corps}))
    page.route("**/api/messages_chat/**", messages)
    page.clock.install()
    ouvrir(page, f"chat.html?id_dmd={ID}", attente_ms=1_000)
    assert "Utilisateur inconnu" in texte(page)
    assert "BanqueBot" not in texte(page)

    # Les appels suivants renvoient un nouveau message : affiché au tour suivant (25 s)
    reponses.pop(0)
    page.clock.run_for(26_000)
    page.wait_for_timeout(500)
    assert "Second message" in texte(page)


# ---- Point 11 : coquilles ----

def test_coquilles_corrigees(ouvrir_session):
    page, _ = ouvrir_session("testawa")
    ouvrir(page, "demandes_validation.html")
    contenu = texte(page)
    assert "DEMANDES À VALIDER" in contenu.upper()
    assert "fin de processus" in contenu.lower() and "fin de de" not in contenu.lower()
    ouvrir(page, "acceuil.html")
    assert "Clôturées" in texte(page)
