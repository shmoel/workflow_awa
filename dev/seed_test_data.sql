-- Données de test — base locale uniquement
--
-- Peuple une base workflow_db vide pour le développement local.
-- NE PAS exécuter en production ni en staging.
--
-- Prérequis :
--   - Schema créé (uvicorn backend.main:app --reload lance Base.metadata.create_all)
--   - venv AWA_W1 actif avec bcrypt==3.2.0 (cf. requirements.txt)
--
-- Commande d'exécution (psql demande le mot de passe) :
--   & "C:\Program Files\PostgreSQL\17\bin\psql.exe" `
--       -U postgres -h localhost -d workflow_db `
--       -v ON_ERROR_STOP=1 -1 -f dev/seed_test_data.sql
--
-- Compte de test créé : testawa / test1234  (banque AWA, Niveau 3)
-- Comptes secondaires (section 7, même mot de passe test1234) :
--   introci, risqueci, dgci (filiale BKCI), introsn (filiale BKSN),
--   testggr (banque AIG, entité GGR)
-- ============================================================


-- ============================================================
-- 0. Données géographiques et institutionnelles
-- ============================================================

INSERT INTO localisation (id, pays, capitale, sigle_pays)
  VALUES (1, 'Cote d''Ivoire', 'Abidjan', 'CI');

INSERT INTO typeinstitution (id, libelle)
  VALUES (1, 'Banque centrale groupe');

SELECT setval('localisation_id_seq', 1);
SELECT setval('typeinstitution_id_seq', 1);


-- ============================================================
-- 1. Banque AWA (groupe central)
-- ============================================================

INSERT INTO banque (id, sigle, nom, id_loc, id_type_instit)
  VALUES (1, 'AWA', 'AWA', 1, 1);

SELECT setval('banque_id_seq', 1);


-- ============================================================
-- 2. Tables de profil utilisateur
-- ============================================================

INSERT INTO niveauhab (id, code, description)
  VALUES (1, 'Niveau 3', 'Validateur central — accès complet (historique visible)');

INSERT INTO entite (id, libelle, description)
  VALUES (1, 'Salle des marchés', 'Salle des marchés');

INSERT INTO poste (id, libelle)
  VALUES (1, 'Analyste');

SELECT setval('niveauhab_id_seq', 1);
SELECT setval('entite_id_seq', 1);
SELECT setval('poste_id_seq', 1);


-- ============================================================
-- 3. Utilisateur de test : testawa / test1234
--
--   Hash bcrypt généré avec bcrypt==3.2.0 (version requirements.txt).
--   Pour régénérer :
--     python -c "import bcrypt; print(bcrypt.hashpw(b'test1234', bcrypt.gensalt()).decode())"
-- ============================================================

INSERT INTO users (id, username, nom, prenom, hashed_password, password,
                   email, id_banque, id_niv_hab, id_entite, id_poste)
  VALUES (1, 'testawa', 'Test', 'AWA',
          '$2b$12$E4nzqOrwpxSGBVzhJNYn6ed6D008VggXdDeLvwBA79zq.bB0Lws3q',
          'test1234',
          'testawa@awa.test', 1, 1, 1, 1);

SELECT setval('users_id_seq', 1);


-- ============================================================
-- 4. Lookup tables métier
-- ============================================================

-- États du lifecycle (id_event 1–9)
INSERT INTO eventstatut (id, libelle, description) VALUES
  (1, 'SOUMISE',      'Soumise — en attente premier avis'),
  (2, 'VAL_RISQUE',   'Validée par Risque Local'),
  (3, 'VAL_DG_LOCAL', 'Validée par DG Local'),
  (4, 'EN_ATT_AWA',   'En attente validation Central (AWA)'),
  (5, 'EN_ATT_AIG',   'En attente validation Région (AIG)'),
  (6, 'APPROUVEE',    'Approuvée — circuit complet'),
  (7, 'CLOTUREE',     'Clôturée'),
  (8, 'SUPPRIMEE',    'Supprimée'),
  (9, 'REJET_DG',     'Rejetée par DG Local');

INSERT INTO decision (id, libelle) VALUES
  (1, 'Validée'),
  (2, 'Rejetée'),
  (3, 'En attente');

INSERT INTO niveauvalidation (id, libelle, niveau) VALUES
  (1, 'Risque Local',  '1'),
  (2, 'DG Local',      '2'),
  (3, 'Central (AWA)', '3'),
  (4, 'Région (AIG)',  '4'),
  (5, 'GGR',           '5');

INSERT INTO departementgroup (id, libelle) VALUES
  (1, 'CIB'),
  (2, 'CDCF');

INSERT INTO categoriedemande (id, libelle, id_departementgroup) VALUES
  (1, 'Salle des marchés', 1),
  (2, 'Corporate',         1),
  (3, 'Trade Finance',     2);

INSERT INTO typedemande (id, libelle, id_categoriedemande) VALUES
  (1, 'Limite de contrepartie', 1),
  (2, 'Autorisation de change', 1),
  (3, 'Ligne de crédit',        2),
  (4, 'Garantie bancaire',      3);

-- Domaine : AWA voit toutes les demandes (libellé 'ALL')
INSERT INTO domaine (id, libelle) VALUES (1, 'ALL');

-- Lier testawa au domaine ALL
INSERT INTO user_domaine (user_id, domaine_id) VALUES (1, 1);

SELECT setval('eventstatut_id_seq', 9);
SELECT setval('decision_id_seq', 3);
SELECT setval('niveauvalidation_id_seq', 5);
SELECT setval('departementgroup_id_seq', 2);
SELECT setval('categoriedemande_id_seq', 3);
SELECT setval('typedemande_id_seq', 4);
SELECT setval('domaine_id_seq', 1);


-- ============================================================
-- 5. Demandes de test
--
--   DMD 1–4 : demandes en cours (accueil)
--   DMD 5–7 : max(id_event)=6 → visibles dans /demandes_cloturer/ (historique)
--   DMD 8   : max(id_event)=7 → clôturée, absente de tous les tableaux
--             (illustre le gap backend signalé dans CHANGELOG_REFACTORING.md)
-- ============================================================

INSERT INTO demandes (id, id_typedemande, banque, id_user, nom_client, montant, date, heure) VALUES
  (1, 1, 1, 1, 'SOCIETE GENERALE CI', 500000000, '2026-09-01', '09:00:00'),
  (2, 2, 1, 1, 'NSIA BANQUE',         250000000, '2026-09-03', '10:30:00'),
  (3, 3, 1, 1, 'ATLANTIQUE BANQUE',   750000000, '2026-09-05', '14:00:00'),
  (4, 1, 1, 1, 'BICICI',              300000000, '2026-09-08', '11:00:00'),
  (5, 2, 1, 1, 'ECOBANK CI',          450000000, '2026-09-10', '09:30:00'),
  (6, 3, 1, 1, 'ORAGROUP',            600000000, '2026-09-12', '15:00:00'),
  (7, 1, 1, 1, 'CORIS BANK',          200000000, '2026-09-15', '08:45:00'),
  (8, 2, 1, 1, 'BOA CI',              350000000, '2026-09-18', '16:00:00');

SELECT setval('demandes_id_seq', 8);


-- ============================================================
-- 6. Avis (trace du circuit pour chaque demande)
-- ============================================================

-- DMD 1 : soumise (max id_event = 1)
INSERT INTO avis (id_demande, id_event, id_valideur, id_decision, "id_niveauValidation", date, heure, commentaire) VALUES
  (1, 1, 1, 3, 1, '2026-09-01', '09:05:00', 'Demande soumise');

-- DMD 2 : validée Risque Local (max = 2)
INSERT INTO avis (id_demande, id_event, id_valideur, id_decision, "id_niveauValidation", date, heure, commentaire) VALUES
  (2, 1, 1, 3, 1, '2026-09-03', '10:35:00', 'Demande soumise'),
  (2, 2, 1, 1, 1, '2026-09-04', '11:00:00', 'Validé Risque Local');

-- DMD 3 : validée DG Local (max = 3)
INSERT INTO avis (id_demande, id_event, id_valideur, id_decision, "id_niveauValidation", date, heure, commentaire) VALUES
  (3, 1, 1, 3, 1, '2026-09-05', '14:05:00', 'Demande soumise'),
  (3, 2, 1, 1, 1, '2026-09-06', '09:00:00', 'Validé Risque Local'),
  (3, 3, 1, 1, 2, '2026-09-07', '10:00:00', 'Validé DG Local');

-- DMD 4 : en attente AWA (max = 4)
INSERT INTO avis (id_demande, id_event, id_valideur, id_decision, "id_niveauValidation", date, heure, commentaire) VALUES
  (4, 1, 1, 3, 1, '2026-09-08', '11:05:00', 'Demande soumise'),
  (4, 2, 1, 1, 1, '2026-09-09', '09:00:00', 'Validé Risque Local'),
  (4, 3, 1, 1, 2, '2026-09-09', '14:00:00', 'Validé DG Local'),
  (4, 4, 1, 3, 3, '2026-09-10', '09:00:00', 'Transmis à AWA');

-- DMD 5 : approuvée circuit complet (max = 6) → HISTORIQUE
INSERT INTO avis (id_demande, id_event, id_valideur, id_decision, "id_niveauValidation", date, heure, commentaire) VALUES
  (5, 1, 1, 3, 1, '2026-09-10', '09:35:00', 'Demande soumise'),
  (5, 2, 1, 1, 1, '2026-09-11', '10:00:00', 'Validé Risque Local'),
  (5, 3, 1, 1, 2, '2026-09-11', '15:00:00', 'Validé DG Local'),
  (5, 4, 1, 1, 3, '2026-09-12', '09:00:00', 'Validé AWA'),
  (5, 6, 1, 1, 5, '2026-09-13', '14:00:00', 'Approuvé GGR');

-- DMD 6 : approuvée (max = 6) → HISTORIQUE
INSERT INTO avis (id_demande, id_event, id_valideur, id_decision, "id_niveauValidation", date, heure, commentaire) VALUES
  (6, 1, 1, 3, 1, '2026-09-12', '15:05:00', 'Demande soumise'),
  (6, 2, 1, 1, 1, '2026-09-13', '09:00:00', 'Validé Risque Local'),
  (6, 3, 1, 1, 2, '2026-09-14', '10:00:00', 'Validé DG Local'),
  (6, 4, 1, 1, 3, '2026-09-15', '09:00:00', 'Validé AWA'),
  (6, 6, 1, 1, 5, '2026-09-16', '16:00:00', 'Approuvé GGR');

-- DMD 7 : approuvée (max = 6) → HISTORIQUE
INSERT INTO avis (id_demande, id_event, id_valideur, id_decision, "id_niveauValidation", date, heure, commentaire) VALUES
  (7, 1, 1, 3, 1, '2026-09-15', '08:50:00', 'Demande soumise'),
  (7, 2, 1, 1, 1, '2026-09-16', '09:00:00', 'Validé Risque Local'),
  (7, 3, 1, 1, 2, '2026-09-17', '10:00:00', 'Validé DG Local'),
  (7, 4, 1, 1, 3, '2026-09-18', '09:00:00', 'Validé AWA'),
  (7, 6, 1, 1, 5, '2026-09-19', '11:00:00', 'Approuvé GGR');

-- DMD 8 : clôturée (max = 7) → absente de /demandes_cloturer/ et de l'accueil
INSERT INTO avis (id_demande, id_event, id_valideur, id_decision, "id_niveauValidation", date, heure, commentaire) VALUES
  (8, 1, 1, 3, 1, '2026-09-18', '16:05:00', 'Demande soumise'),
  (8, 7, 1, 2, 5, '2026-09-20', '10:00:00', 'Clôturée administrativement');


-- ============================================================
-- 7. Jeu étendu : filiales, valideurs tiers, demandes 9–17
--
--   But : alimenter les tableaux, les filtres et le bouton Détails.
--   Les avis des DMD 9–17 sont donnés par d'autres utilisateurs que
--   testawa : /demandes_a_consulter/ (accueil) exclut toute demande
--   sur laquelle l'utilisateur connecté a déjà émis un avis, ce qui
--   rend les DMD 1–8 invisibles sur l'accueil de testawa.
--
--   Visibilité attendue pour testawa (AWA) :
--     DMD  | max | Accueil | À valider | Déjà validées | Historique
--     9    |  1  |   oui   |           |               |
--     10   |  2  |   oui   |           |               |
--     11   |  3  |   oui   |    oui    |               |
--     12   |  3  |   oui   |    oui    |               |
--     13   |  4  |         |           |      oui      |
--     14   |  5  |   oui   |           |               |
--     15   |  6  |   oui   |           |               |    oui
--     16   |  9  |         |           |               |
--     17   |  8  |         |           |               |
--   testggr : DMD 14 dans « à valider » (max = 5), DMD 5/6/7/15 « à clôturer ».
-- ============================================================

INSERT INTO localisation (id, pays, capitale, sigle_pays)
  VALUES (2, 'Senegal', 'Dakar', 'SN');

INSERT INTO typeinstitution (id, libelle) VALUES
  (2, 'Filiale'),
  (3, 'Direction régionale');

INSERT INTO banque (id, sigle, nom, id_loc, id_type_instit) VALUES
  (2, 'AIG',  'AIG — Direction régionale', 1, 3),
  (3, 'BKCI', 'Filiale Cote d''Ivoire',    1, 2),
  (4, 'BKSN', 'Filiale Senegal',           2, 2);

INSERT INTO niveauhab (id, code, description) VALUES
  (2, 'Niveau 1', 'Saisie — introduction des demandes'),
  (3, 'Niveau 2', 'Validateur local');

INSERT INTO entite (id, libelle, description) VALUES
  (2, 'Corporate', 'Corporate'),
  (3, 'GGR',       'Gestion Globale des Risques');

INSERT INTO poste (id, libelle) VALUES
  (2, 'Chargé d''affaires'),
  (3, 'Risk Manager'),
  (4, 'Directeur Général');

-- Même hash que testawa (mot de passe test1234)
INSERT INTO users (id, username, nom, prenom, hashed_password, password,
                   email, id_banque, id_niv_hab, id_entite, id_poste) VALUES
  (2, 'introci',  'Intro',  'CI',  '$2b$12$E4nzqOrwpxSGBVzhJNYn6ed6D008VggXdDeLvwBA79zq.bB0Lws3q', 'test1234', 'introci@awa.test',  3, 2, 2, 2),
  (3, 'risqueci', 'Risque', 'CI',  '$2b$12$E4nzqOrwpxSGBVzhJNYn6ed6D008VggXdDeLvwBA79zq.bB0Lws3q', 'test1234', 'risqueci@awa.test', 3, 3, 1, 3),
  (4, 'dgci',     'DG',     'CI',  '$2b$12$E4nzqOrwpxSGBVzhJNYn6ed6D008VggXdDeLvwBA79zq.bB0Lws3q', 'test1234', 'dgci@awa.test',     3, 3, 2, 4),
  (5, 'introsn',  'Intro',  'SN',  '$2b$12$E4nzqOrwpxSGBVzhJNYn6ed6D008VggXdDeLvwBA79zq.bB0Lws3q', 'test1234', 'introsn@awa.test',  4, 2, 1, 2),
  (6, 'testggr',  'Test',   'GGR', '$2b$12$E4nzqOrwpxSGBVzhJNYn6ed6D008VggXdDeLvwBA79zq.bB0Lws3q', 'test1234', 'testggr@awa.test',  2, 1, 3, 3);

-- Domaines filiales : libellé = categoriedemande.libelle (filtre de l'accueil filiale).
-- Un seul domaine par utilisateur (useCurrentUser lit la première ligne).
--   risqueci → Corporate         : voit DMD 9 sur l'accueil
--   dgci     → Trade Finance     : voit DMD 10 sur l'accueil
--   introci, introsn             : accueil vide (ils sont auteurs de toutes
--                                  les demandes de leur banque) ; à tester
--                                  plutôt sur consulter_demandes
INSERT INTO domaine (id, libelle) VALUES
  (2, 'Salle des marchés'),
  (3, 'Corporate'),
  (4, 'Trade Finance');

INSERT INTO user_domaine (user_id, domaine_id) VALUES
  (2, 3),
  (3, 3),
  (4, 4),
  (5, 2),
  (6, 1);

SELECT setval('domaine_id_seq', 4);

SELECT setval('localisation_id_seq', 2);
SELECT setval('typeinstitution_id_seq', 3);
SELECT setval('banque_id_seq', 4);
SELECT setval('niveauhab_id_seq', 3);
SELECT setval('entite_id_seq', 3);
SELECT setval('poste_id_seq', 4);
SELECT setval('users_id_seq', 6);


-- Demandes : banques, types, catégories, montants et dates variés pour les filtres.
-- DMD 11 porte une note d'analyse (le fichier n'existe pas sur le disque :
-- le lien Détails doit s'afficher, le téléchargement renverra 404).
INSERT INTO demandes (id, id_typedemande, banque, id_user, nom_client, montant, date, heure, note_analyse) VALUES
  (9,  3, 3, 2, 'AGRO-IVOIRE SA',          120000000, '2026-08-04', '08:30:00', NULL),
  (10, 4, 3, 2, 'BTP LAGUNE',               85000000, '2026-08-19', '10:15:00', NULL),
  (11, 1, 4, 5, 'DAKAR LOGISTIQUE',        950000000, '2026-08-27', '09:45:00', '20260827_094500_note_dakar_logistique.pdf'),
  (12, 4, 3, 2, 'COTON EXPORT SARL',        40000000, '2026-09-02', '13:20:00', NULL),
  (13, 2, 4, 5, 'SENEGAL ENERGIE',         275000000, '2026-09-09', '11:10:00', NULL),
  (14, 3, 3, 2, 'TRANSPORTS KONE',        1500000000, '2026-09-14', '16:40:00', NULL),
  (15, 1, 4, 5, 'SOCIETE MINIERE DU NORD', 680000000, '2026-09-21', '09:00:00', NULL),
  (16, 3, 3, 2, 'IMMOBILIERE PLATEAU',     220000000, '2026-09-24', '14:30:00', NULL),
  (17, 4, 4, 5, 'PECHERIES DU CAP',         60000000, '2026-09-28', '10:00:00', NULL);

SELECT setval('demandes_id_seq', 17);


INSERT INTO avis (id_demande, id_event, id_valideur, id_decision, "id_niveauValidation", date, heure, commentaire) VALUES
  -- DMD 9 : soumise (max = 1)
  (9,  1, 2, 3, 1, '2026-08-04', '08:35:00', 'Demande soumise'),
  -- DMD 10 : validée Risque Local (max = 2)
  (10, 1, 2, 3, 1, '2026-08-19', '10:20:00', 'Demande soumise'),
  (10, 2, 3, 1, 1, '2026-08-20', '09:00:00', 'Dossier complet, risque acceptable'),
  -- DMD 11 : validée DG Local, en attente AWA (max = 3)
  (11, 1, 5, 3, 1, '2026-08-27', '09:50:00', 'Demande soumise'),
  (11, 2, 5, 1, 1, '2026-08-28', '10:00:00', 'Validé Risque Local'),
  (11, 3, 5, 1, 2, '2026-08-29', '15:00:00', 'Montant élevé — avis AWA requis'),
  -- DMD 12 : validée DG Local, en attente AWA (max = 3)
  (12, 1, 2, 3, 1, '2026-09-02', '13:25:00', 'Demande soumise'),
  (12, 2, 3, 1, 1, '2026-09-03', '09:30:00', 'Validé Risque Local'),
  (12, 3, 4, 1, 2, '2026-09-04', '11:00:00', 'Validé DG Local'),
  -- DMD 13 : validée par testawa, en attente AIG (max = 4)
  (13, 1, 5, 3, 1, '2026-09-09', '11:15:00', 'Demande soumise'),
  (13, 2, 5, 1, 1, '2026-09-10', '09:00:00', 'Validé Risque Local'),
  (13, 3, 5, 1, 2, '2026-09-10', '17:00:00', 'Validé DG Local'),
  (13, 4, 1, 1, 3, '2026-09-11', '10:30:00', 'Validé AWA, transmis AIG'),
  -- DMD 14 : en attente GGR (max = 5)
  (14, 1, 2, 3, 1, '2026-09-14', '16:45:00', 'Demande soumise'),
  (14, 2, 3, 1, 1, '2026-09-15', '09:00:00', 'Validé Risque Local'),
  (14, 3, 4, 1, 2, '2026-09-15', '15:00:00', 'Validé DG Local'),
  (14, 5, 6, 3, 4, '2026-09-17', '10:00:00', 'Transmis GGR'),
  -- DMD 15 : approuvée par testggr (max = 6)
  (15, 1, 5, 3, 1, '2026-09-21', '09:05:00', 'Demande soumise'),
  (15, 2, 5, 1, 1, '2026-09-22', '09:00:00', 'Validé Risque Local'),
  (15, 3, 5, 1, 2, '2026-09-22', '16:00:00', 'Validé DG Local'),
  (15, 6, 6, 1, 5, '2026-09-25', '11:00:00', 'Approuvé GGR'),
  -- DMD 16 : rejetée par DG Local (max = 9)
  (16, 1, 2, 3, 1, '2026-09-24', '14:35:00', 'Demande soumise'),
  (16, 2, 3, 1, 1, '2026-09-25', '09:00:00', 'Validé Risque Local'),
  (16, 9, 4, 2, 2, '2026-09-26', '10:00:00', 'Rejeté : garanties insuffisantes'),
  -- DMD 17 : supprimée (max = 8)
  (17, 1, 5, 3, 1, '2026-09-28', '10:05:00', 'Demande soumise'),
  (17, 8, 5, 2, 1, '2026-09-29', '08:00:00', 'Doublon, demande supprimée');


-- Messages (chat accueil). Le 2e contient du HTML : il doit s'afficher
-- tel quel, ce qui vérifie le passage par escapeHtml().
INSERT INTO commentaires (id_user, commentaire, date_creation, heure_creation, demande_id) VALUES
  (5, 'Note d''analyse jointe, merci pour votre retour.', '2026-08-29', '15:10:00', 11),
  (6, 'Test d''échappement : <b>gras</b> <img src=x onerror=alert(1)>', '2026-08-30', '09:00:00', 11);
