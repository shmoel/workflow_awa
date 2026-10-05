-- Données de test complémentaires — base locale uniquement
--
-- Ajoute deux demandes de recette pour la page détail
-- (detail_consulter_demande) sur une base déjà peuplée par
-- dev/seed_test_data.sql. Aucune réinitialisation nécessaire.
-- NE PAS exécuter en production ni en staging.
--
-- Idempotent : chaque demande est repérée par son nom_client ; si elle
-- existe déjà, elle n'est pas recréée. Les identifiants sont attribués par
-- les séquences et affichés en NOTICE à l'exécution.
--
-- Prérequis : utilisateurs introci (2), risqueci (3), introsn (5),
--             banques BKCI (3), BKSN (4), types de demande 1 et 3
--             (créés par dev/seed_test_data.sql).
--
-- Commande d'exécution (psql demande le mot de passe) :
--   & "C:\Program Files\PostgreSQL\17\bin\psql.exe" `
--       -U postgres -h localhost -d workflow_db `
--       -v ON_ERROR_STOP=1 -1 -f dev/seed_test_extra.sql
-- ============================================================

DO $$
DECLARE
  v_id integer;
BEGIN

  -- ==========================================================
  -- Cas A — Deux avis du même type (id_event = 2) sur une demande
  --
  --   Risque Local met d'abord la demande en attente (complément
  --   demandé), puis la valide. Vérifie que les deux panneaux de
  --   l'accordéon s'ouvrent séparément (le legacy les identifiait
  --   par event_d : ils s'ouvraient ensemble).
  --   max(id_event) = 2
  -- ==========================================================
  SELECT id INTO v_id FROM demandes WHERE nom_client = 'TEST AVIS DOUBLES';

  IF v_id IS NULL THEN
    INSERT INTO demandes (id_typedemande, banque, id_user, nom_client, montant, date, heure, note_analyse)
      VALUES (3, 3, 2, 'TEST AVIS DOUBLES', 180000000, '2026-10-01', '09:00:00', NULL)
      RETURNING id INTO v_id;

    INSERT INTO avis (id_demande, id_event, id_valideur, id_decision, "id_niveauValidation", date, heure, commentaire) VALUES
      (v_id, 1, 2, 3, 1, '2026-10-01', '09:05:00', 'Demande soumise'),
      (v_id, 2, 3, 3, 1, '2026-10-02', '10:00:00', 'Complément demandé : états financiers 2025 manquants'),
      (v_id, 2, 3, 1, 1, '2026-10-03', '15:30:00', 'Compléments reçus, risque acceptable');

    RAISE NOTICE 'Cas A créé : DMD % (TEST AVIS DOUBLES)', v_id;
  ELSE
    RAISE NOTICE 'Cas A déjà présent : DMD % (TEST AVIS DOUBLES)', v_id;
  END IF;

  -- ==========================================================
  -- Cas B — Commentaire d'avis contenant du HTML
  --
  --   Le commentaire doit s'afficher tel quel, en texte, sans gras
  --   ni image ni alerte : vérifie l'échappement dans AvisTimeline.
  --   L'avis est le dernier (et le seul) : ouvert par défaut.
  --   max(id_event) = 1
  -- ==========================================================
  SELECT id INTO v_id FROM demandes WHERE nom_client = 'TEST ECHAPPEMENT HTML';

  IF v_id IS NULL THEN
    INSERT INTO demandes (id_typedemande, banque, id_user, nom_client, montant, date, heure, note_analyse)
      VALUES (1, 4, 5, 'TEST ECHAPPEMENT HTML', 90000000, '2026-10-02', '11:00:00', NULL)
      RETURNING id INTO v_id;

    INSERT INTO avis (id_demande, id_event, id_valideur, id_decision, "id_niveauValidation", date, heure, commentaire) VALUES
      (v_id, 1, 5, 3, 1, '2026-10-02', '11:05:00', '<b>gras</b> <img src=x onerror=alert(1)>');

    RAISE NOTICE 'Cas B créé : DMD % (TEST ECHAPPEMENT HTML)', v_id;
  ELSE
    RAISE NOTICE 'Cas B déjà présent : DMD % (TEST ECHAPPEMENT HTML)', v_id;
  END IF;

END $$;
