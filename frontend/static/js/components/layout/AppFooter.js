/**
 * components/layout/AppFooter.js
 *
 * Pied de page — composant Vue 3.
 *
 * Reproduit à l'identique le footer legacy :
 *   "© Attijariwestafrica  |  About Us  Help  Contact  Terms & Conditions"
 *
 * Pas de props : le footer est identique sur toutes les pages.
 */

import { defineComponent } from "https://unpkg.com/vue@3/dist/vue.esm-browser.js";

export default defineComponent({
  name: "AppFooter",

  template: /* html */ `
    <footer
      class="flex flex-wrap items-center justify-between px-6 py-3 border-t border-slate-200 bg-white text-sm"
      style="font-family: var(--font-family-base); color: var(--color-text-secondary);"
      role="contentinfo"
    >
      <!-- Copyright -->
      <div class="py-1">
        <span>
          &copy;
          <a
            href="#"
            class="font-semibold"
            style="color: var(--color-brand);"
          >
            Attijariwestafrica
          </a>
        </span>
      </div>

      <!-- Liens -->
      <nav aria-label="Liens du pied de page">
        <ul class="flex flex-wrap gap-4 list-none m-0 p-0 py-1">
          <li>
            <a href="#" class="footer-link">About Us</a>
          </li>
          <li>
            <a href="#" class="footer-link">Help</a>
          </li>
          <li>
            <a href="#" class="footer-link">Contact</a>
          </li>
          <li>
            <a href="#" class="footer-link">Terms &amp; Conditions</a>
          </li>
        </ul>
      </nav>
    </footer>
  `,
});
