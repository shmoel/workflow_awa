/**
 * utils/exportCsv.js
 *
 * Export d'un tableau de lignes vers un fichier CSV téléchargeable.
 * Aucune dépendance externe — Blob + URL.createObjectURL.
 *
 * @param {Array<Object>} rows    — lignes à exporter
 * @param {Array<{key,label}>} cols — colonnes (key = propriété de la ligne, label = en-tête)
 * @param {string} filename       — nom du fichier sans extension
 */
export function exportCsv(rows, cols, filename = "export") {
  const sep = ";";

  function escape(v) {
    if (v == null) return "";
    const s = String(v).replace(/"/g, '""');
    return s.includes(sep) || s.includes("\n") || s.includes('"') ? `"${s}"` : s;
  }

  const header = cols.map((c) => escape(c.label)).join(sep);
  const body   = rows.map((row) =>
    cols.map((c) => escape(row[c.key])).join(sep)
  );

  const csv = [header, ...body].join("\r\n");
  const bom = "﻿"; // BOM UTF-8 pour Excel
  const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" });

  const url  = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href     = url;
  link.download = `${filename}_${_today()}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

function _today() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}`;
}
