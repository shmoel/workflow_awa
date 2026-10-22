-- Entité « DG » pour les directeurs généraux de filiale — base locale uniquement
--
-- À exécuter après dev/seed_test_comptes_2026-10-22.sql.
-- NE PAS exécuter en production ni en staging.
--
-- Le backend (POST /valider_avis/…) décide de l'étape d'un validateur de
-- filiale selon le libellé de son ENTITÉ :
--   GGR → id_event 2 (risque local)
--   DG  → id_event 3 (poursuite) ou 9 (arrêt, fenêtre « OUI / NON »)
--   autre entité → id_event non défini : erreur 500.
-- dgci / dgsn avaient le poste « Directeur Général » mais l'entité Corporate :
-- leur validation échouait (constaté le 22/10/2026).
-- Ils restent à l'étape 2 dans GET /demandes_a_valider/ (filiale, entité ≠ GGR).
--
-- Commande (psql demande le mot de passe) :
--   & "C:\Program Files\PostgreSQL\17\bin\psql.exe" `
--       -U postgres -h localhost -d workflow_db `
--       -v ON_ERROR_STOP=1 -1 -f dev/fix_entite_dg_2026-10-22.sql

INSERT INTO entite (id, libelle, description) VALUES
  (6, 'DG', 'Direction générale de la filiale (validation DG local)')
ON CONFLICT (id) DO NOTHING;
SELECT setval('entite_id_seq', GREATEST((SELECT MAX(id) FROM entite), 6));

UPDATE users SET id_entite = (SELECT id FROM entite WHERE libelle = 'DG')
 WHERE username IN ('dgci', 'dgsn');
