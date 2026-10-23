-- Comptes de test complémentaires — base locale uniquement
--
-- À exécuter après dev/seed_test_data.sql (et, pour une base peuplée avant le
-- 22/10/2026, après dev/fix_niveaux_comptes_2026-10-22.sql).
-- NE PAS exécuter en production ni en staging.
--
-- Objectif : un compte par profil du document officiel
-- Resume_Plateforme_Workflow_AWA (§2, §3), pour tester chaque étape du circuit.
-- Mot de passe de tous les comptes : test1234 (même hash que testawa).
--
-- Aiguillage des validations par le backend (GET /demandes_a_valider/) :
--   filiale + entité GGR   → étape 1 (risque local, « GGR local »)
--   filiale + autre entité → étape 2 (DG local)
--   AWA                    → étape 3 (validation centrale)
--   AIG + entité = département du type de demande (CIB / CDCF) → étape 4 (régional)
--   AIG + entité GGR       → étape 5 (GGR, décision finale et clôture)
--
-- Commande (psql demande le mot de passe) :
--   & "C:\Program Files\PostgreSQL\17\bin\psql.exe" `
--       -U postgres -h localhost -d workflow_db `
--       -v ON_ERROR_STOP=1 -1 -f dev/seed_test_comptes_2026-10-22.sql

-- Entités des validateurs régionaux AIG : même libellé que les départements
INSERT INTO entite (id, libelle, description) VALUES
  (4, 'CIB',  'Département CIB (validation régionale AIG)'),
  (5, 'CDCF', 'Département CDCF (validation régionale AIG)')
ON CONFLICT (id) DO NOTHING;
SELECT setval('entite_id_seq', GREATEST((SELECT MAX(id) FROM entite), 5));

-- risqueci : risque local de BKCI → entité GGR (étape 1)
UPDATE users SET id_entite = (SELECT id FROM entite WHERE libelle = 'GGR')
 WHERE username = 'risqueci';

-- Nouveaux comptes
--   consultci : Niveau 1 (consultation), BKCI
--   risquesn  : Niveau 3, BKSN, entité GGR       → étape 1 (risque local)
--   dgsn      : Niveau 3, BKSN, entité Corporate → étape 2 (DG local)
--   regcib    : Niveau 3, AIG, entité CIB        → étape 4 (régional, demandes CIB)
--   regcdcf   : Niveau 3, AIG, entité CDCF       → étape 4 (régional, demandes CDCF)
INSERT INTO users (id, username, nom, prenom, hashed_password, password,
                   email, id_banque, id_niv_hab, id_entite, id_poste) VALUES
  (7,  'consultci', 'Consult',  'CI',   '$2b$12$E4nzqOrwpxSGBVzhJNYn6ed6D008VggXdDeLvwBA79zq.bB0Lws3q', 'test1234', 'consultci@awa.test',
       (SELECT id FROM banque WHERE sigle = 'BKCI'), (SELECT id FROM niveauhab WHERE code = 'Niveau 1'),
       (SELECT id FROM entite WHERE libelle = 'Corporate'), (SELECT id FROM poste WHERE libelle = 'Analyste')),
  (8,  'risquesn',  'Risque',   'SN',   '$2b$12$E4nzqOrwpxSGBVzhJNYn6ed6D008VggXdDeLvwBA79zq.bB0Lws3q', 'test1234', 'risquesn@awa.test',
       (SELECT id FROM banque WHERE sigle = 'BKSN'), (SELECT id FROM niveauhab WHERE code = 'Niveau 3'),
       (SELECT id FROM entite WHERE libelle = 'GGR'), (SELECT id FROM poste WHERE libelle = 'Risk Manager')),
  (9,  'dgsn',      'DG',       'SN',   '$2b$12$E4nzqOrwpxSGBVzhJNYn6ed6D008VggXdDeLvwBA79zq.bB0Lws3q', 'test1234', 'dgsn@awa.test',
       (SELECT id FROM banque WHERE sigle = 'BKSN'), (SELECT id FROM niveauhab WHERE code = 'Niveau 3'),
       (SELECT id FROM entite WHERE libelle = 'Corporate'), (SELECT id FROM poste WHERE libelle = 'Directeur Général')),
  (10, 'regcib',    'Regional', 'CIB',  '$2b$12$E4nzqOrwpxSGBVzhJNYn6ed6D008VggXdDeLvwBA79zq.bB0Lws3q', 'test1234', 'regcib@awa.test',
       (SELECT id FROM banque WHERE sigle = 'AIG'), (SELECT id FROM niveauhab WHERE code = 'Niveau 3'),
       (SELECT id FROM entite WHERE libelle = 'CIB'), (SELECT id FROM poste WHERE libelle = 'Risk Manager')),
  (11, 'regcdcf',   'Regional', 'CDCF', '$2b$12$E4nzqOrwpxSGBVzhJNYn6ed6D008VggXdDeLvwBA79zq.bB0Lws3q', 'test1234', 'regcdcf@awa.test',
       (SELECT id FROM banque WHERE sigle = 'AIG'), (SELECT id FROM niveauhab WHERE code = 'Niveau 3'),
       (SELECT id FROM entite WHERE libelle = 'CDCF'), (SELECT id FROM poste WHERE libelle = 'Risk Manager'))
ON CONFLICT (id) DO NOTHING;
SELECT setval('users_id_seq', GREATEST((SELECT MAX(id) FROM users), 11));

-- Domaines (un seul par utilisateur ; libellé = catégorie filtrée sur l'accueil,
-- 'ALL' = toutes les demandes du périmètre)
INSERT INTO user_domaine (user_id, domaine_id)
SELECT u.id, d.id
  FROM (VALUES ('consultci', 'Corporate'), ('risquesn', 'Salle des marchés'), ('dgsn', 'Salle des marchés'),
               ('regcib', 'ALL'), ('regcdcf', 'ALL')) AS v(username, domaine)
  JOIN users u   ON u.username = v.username
  JOIN domaine d ON d.libelle  = v.domaine
 WHERE NOT EXISTS (SELECT 1 FROM user_domaine ud WHERE ud.user_id = u.id);
