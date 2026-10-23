/*
 * static/js/tailwind.config.js
 *
 * Configuration Tailwind partagée par toutes les pages (Play CDN, version figée
 * 3.4.17), chargée juste après le script CDN :
 *
 *   <script src="https://cdn.tailwindcss.com/3.4.17"></script>
 *   <script src="static/js/tailwind.config.js"></script>
 *
 * Les valeurs reprennent celles du CSS legacy (UIKit / Bootstrap 4 material),
 * relevées dans Chrome sur les pages legacy (tag pre-bascule-vue) : couleurs,
 * tailles de texte, points de rupture Bootstrap.
 *
 * Si le CDN ne répond pas, window.tailwind n'existe pas : la configuration
 * est ignorée (pas d'erreur JavaScript), mais la page s'affiche sans style.
 */

if (window.tailwind) tailwind.config = {
  theme: {
    // Points de rupture Bootstrap (le legacy bascule le menu latéral à 992 px ;
    // xxl = conteneurs Bootstrap 5 de la vitrine)
    screens: { sm: "576px", md: "768px", lg: "992px", xl: "1200px", xxl: "1400px" },
    extend: {
      colors: {
        ink:     "#212529",                 // texte courant
        muted:   "#77757a",                 // .text-muted
        success: "#62d493",                 // .text-success
        danger:  "#ff4961",                 // .text-danger
        line:    "rgba(24, 28, 33, 0.13)",  // bordures de carte et de tableau
        chrome: {                           // barre du haut et bandeau du logo
          DEFAULT: "#606c72",
          text:    "#dadcde",
        },
        brand: {                            // orange AWA
          DEFAULT: "#ea580c",
          hover:   "#d45a0b",
          soft:    "#fff7f0",               // fond clair (lignes paires, focus)
          line:    "#f3e7de",               // bordure des cartes
          row:     "#ffe5cc",               // ligne de tableau survolée
          tab:     "#ff4a00",               // soulignement de l'onglet actif
        },
      },
      fontFamily: {
        sans:   ['"Segoe UI"', "Tahoma", "Geneva", "Verdana", "sans-serif"],
        system: ["system-ui", "-apple-system", "BlinkMacSystemFont", '"Segoe UI"', "Roboto", "sans-serif"],
        apple:  ["-apple-system", "BlinkMacSystemFont", '"Segoe UI"', "Roboto", "sans-serif"],  // chat
        poppins: ["Poppins", "sans-serif"],                                                       // vitrine
      },
      fontSize: {
        // Interlignes relatifs, comme le legacy : ils suivent la taille du texte
        base: ["14.304px", "1.47"],         // corps du texte legacy (0.894rem)
        sm:   ["12.1584px", "1.47"],        // .small
        btn:  ["13px", "1.47"],             // boutons et onglets
        h4:   ["21.008px", "1.1"],
        h5:   ["16px", "1.1"],
      },
      // Vitrine : formes du hero qui flottent (ex-@keyframes float)
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px) rotate(45deg)" },
          "50%":      { transform: "translateY(-15px) rotate(45deg)" },
        },
      },
      animation: {
        float:         "float 6s ease-in-out infinite",
        "float-slow":  "float 8s ease-in-out infinite reverse",
        "spin-btn":    "spin 0.75s linear infinite",   // ex-.spinner-border
      },
      zIndex: {
        navbar:  "1075",
        sidenav: "1080",
        popup:   "9999",
      },
    },
  },
};
