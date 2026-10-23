/**
 * domain/workflow.js
 *
 * Constantes du circuit de validation, partagées par les pages (au lieu de
 * chiffres écrits en dur). Valeurs imposées par le backend (table event_statut,
 * route POST /valider_avis/{id}/process_ongoing/{0|1}).
 *
 * Statut d'une demande = MAX(id_event) de ses avis (document officiel
 * Resume_Plateforme_Workflow_AWA, §3).
 */

/** Codes id_event */
export const EVENT = Object.freeze({
  SOUMISE:              1, // soumise, en attente du premier avis
  VALIDEE_RISQUE_LOCAL: 2, // validée par le risque local
  VALIDEE_DG_LOCAL:     3, // validée par le DG local, en attente du siège AWA
  ATTENTE_REGIONAL:     4, // en attente de la validation régionale (AIG)
  ATTENTE_GGR:          5, // en attente du GGR
  APPROUVEE:            6, // approuvée, circuit complet
  CLOTUREE:             7, // clôturée
  SUPPRIMEE:            8, // supprimée par son auteur
  ARRETEE_DG:           9, // arrêtée par le DG local
});

/** Paramètre process_ongoing de POST /valider_avis : choix du DG local */
export const PROCESS = Object.freeze({
  POURSUIVRE: 1, // la demande continue le circuit (cas général)
  ARRETER:    0, // le DG local arrête la demande (statut ARRETEE_DG)
});

/**
 * Libellé de l'état d'une demande en fin de processus.
 * @param {{ max_event?: number }} row
 * @returns {"Arrêté" | "Terme"}
 */
export function etatFinProcess(row) {
  return row.max_event === EVENT.ARRETEE_DG ? "Arrêté" : "Terme";
}
