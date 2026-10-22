-- Correction des niveaux d'habilitation des comptes de test — base locale uniquement
--
-- Aligne une base déjà peuplée par dev/seed_test_data.sql sur le document
-- officiel Resume_Plateforme_Workflow_AWA (§2) :
--   Niveau 1 = consultation, Niveau 2 = saisie, Niveau 3 = validation.
-- NE PAS exécuter en production ni en staging.
--
-- Commande (psql demande le mot de passe) :
--   & "C:\Program Files\PostgreSQL\17\bin\psql.exe" `
--       -U postgres -h localhost -d workflow_db `
--       -v ON_ERROR_STOP=1 -1 -f dev/fix_niveaux_comptes_2026-10-22.sql

UPDATE niveauhab SET description = 'Validation — valider des demandes, historique'   WHERE code = 'Niveau 3';
UPDATE niveauhab SET description = 'Consultation — accueil et statistiques'          WHERE code = 'Niveau 1';
UPDATE niveauhab SET description = 'Saisie — introduire et consulter ses demandes'   WHERE code = 'Niveau 2';

-- Saisie (filiales) : Niveau 2
UPDATE users SET id_niv_hab = (SELECT id FROM niveauhab WHERE code = 'Niveau 2')
 WHERE username IN ('introci', 'introsn');

-- Validation locale (risque local, DG local) : Niveau 3
UPDATE users SET id_niv_hab = (SELECT id FROM niveauhab WHERE code = 'Niveau 3')
 WHERE username IN ('risqueci', 'dgci');
