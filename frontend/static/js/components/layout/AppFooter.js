/**
 * components/layout/AppFooter.js
 *
 * Pied de page (Tailwind) — reprend le pied de page legacy
 * (« © Attijariwestafrica », About Us / Help / Contact / Terms & Conditions).
 */

import { defineComponent } from "vue";

export default defineComponent({
  name: "AppFooter",

  template: /* html */ `
    <nav class="bg-white text-ink shadow-[0_-1px_0_0_rgba(24,28,33,0.04)]">
        <div class="flex flex-wrap justify-between px-4 lg:px-8 pb-4 text-center">
            <div class="pt-4">
                <span class="font-medium text-[#666]">&copy; <a href="javascript:" class="inline-block text-ink">Attijariwestafrica</a></span>
            </div>
            <div>
                <a href="javascript:" class="inline-block pt-4 text-ink">About Us OKKKKKK</a>
                <a href="javascript:" class="inline-block pt-4 ml-6 text-ink">Help</a>
                <a href="javascript:" class="inline-block pt-4 ml-6 text-ink">Contact</a>
                <a href="javascript:" class="inline-block pt-4 ml-6 text-ink">Terms &amp; Conditions</a>
            </div>
        </div>
    </nav>
  `,
});
