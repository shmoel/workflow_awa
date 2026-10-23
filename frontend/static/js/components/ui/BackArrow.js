/**
 * components/ui/BackArrow.js
 *
 * Petite flèche « retour » en haut des pages ouvertes sur une demande
 * (détail, chat, modifier, valider) — décision du 22/10/2026, CORRECTION-16.
 *
 * Clic : retour à la page précédente si elle appartient à l'application
 * (liste d'où l'on vient) ; sinon (favori, lien copié, page de connexion),
 * ouverture de la page `fallback`. Le lien porte aussi `fallback` en href,
 * pour l'ouverture dans un nouvel onglet.
 *
 * Props :
 *   fallback : String — page de repli (ex. « acceuil.html »)
 */

import { defineComponent } from "vue";

export default defineComponent({
  name: "BackArrow",

  props: {
    fallback: { type: String, required: true },
  },

  setup(props) {
    function goBack() {
      let fromApp = false;
      try {
        const ref = new URL(document.referrer);
        fromApp = ref.origin === window.location.origin
          && ref.pathname.startsWith("/workflow/")
          && ref.pathname !== window.location.pathname
          && !ref.pathname.endsWith("/index.html");
      } catch { /* pas de page précédente */ }
      if (fromApp && window.history.length > 1) window.history.back();
      else window.location.href = props.fallback;
    }
    return { goBack };
  },

  template: /* html */ `
    <div class="py-2">
        <a :href="fallback" title="Retour" aria-label="Retour"
           class="inline-flex items-center justify-center w-8 h-8 -ml-2 text-[20px] text-muted rounded-full transition-colors duration-200 hover:text-brand hover:bg-brand-soft"
           @click.prevent="goBack"><i class="feather icon-arrow-left"></i></a>
    </div>
  `,
});
