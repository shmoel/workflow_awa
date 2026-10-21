/**
 * components/layout/AppFooter.js
 *
 * Pied de page — balisage identique au legacy (« © Attijariwestafrica »,
 * About Us / Help / Contact / Terms & Conditions).
 */

import { defineComponent } from "https://unpkg.com/vue@3/dist/vue.esm-browser.js";

export default defineComponent({
  name: "AppFooter",

  template: /* html */ `
    <nav class="layout-footer footer bg-white">
        <div class="container-fluid d-flex flex-wrap justify-content-between text-center container-p-x pb-3">
            <div class="pt-3">
                <span class="footer-text font-weight-semibold">&copy; <a href="javascript:" class="footer-link">Attijariwestafrica</a></span>
            </div>
            <div>
                <a href="javascript:" class="footer-link pt-3">About Us OKKKKKK</a>
                <a href="javascript:" class="footer-link pt-3 ml-4">Help</a>
                <a href="javascript:" class="footer-link pt-3 ml-4">Contact</a>
                <a href="javascript:" class="footer-link pt-3 ml-4">Terms &amp; Conditions</a>
            </div>
        </div>
    </nav>
  `,
});
