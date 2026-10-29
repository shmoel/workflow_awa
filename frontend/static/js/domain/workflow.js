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

/** Étapes du circuit de validation, dans l'ordre (frise de la page détail) */
export const CIRCUIT = Object.freeze([
  "Introduction", "Risque local", "DG local", "AWA", "AIG", "GGR",
]);

/**
 * Position d'une demande dans le circuit, d'après son statut (MAX(id_event)).
 * Statut 1 à 5 : l'étape `courante` attend un avis, les précédentes sont
 * passées. Statut 6 ou 7 : circuit terminé (courante = null, toutes passées).
 * Statut 8 / 9 : demande arrêtée à l'étape `courante` (supprimée avant le
 * premier avis, arrêtée par le DG local).
 * @param {number|null|undefined} maxEvent
 * @returns {{ passees: number, courante: number|null, arret: string|null } | null}
 *          null si le statut est inconnu
 */
export function positionCircuit(maxEvent) {
  const e = Number(maxEvent);
  if (e >= EVENT.SOUMISE && e <= EVENT.ATTENTE_GGR) return { passees: e, courante: e, arret: null };
  if (e === EVENT.APPROUVEE || e === EVENT.CLOTUREE) return { passees: CIRCUIT.length, courante: null, arret: null };
  if (e === EVENT.SUPPRIMEE)  return { passees: 1, courante: 1, arret: "Supprimée" };
  if (e === EVENT.ARRETEE_DG) return { passees: 2, courante: 2, arret: "Arrêtée par le DG local" };
  return null;
}

/**
 * Ton de la pastille de statut (clé de PILL, components/ui/classes.js).
 * @param {number|null|undefined} maxEvent
 * @returns {"encours" | "succes" | "arret" | "neutre"}
 */
export function statutTone(maxEvent) {
  const e = Number(maxEvent);
  if (e >= EVENT.SOUMISE && e <= EVENT.ATTENTE_GGR) return "encours";
  if (e === EVENT.APPROUVEE) return "succes";
  if (e === EVENT.ARRETEE_DG) return "arret";
  return "neutre";
}
