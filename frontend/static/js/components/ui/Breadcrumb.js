/**
 * components/ui/Breadcrumb.js
 *
 * Fil d'Ariane (breadcrumb) pour améliorer la navigation et l'orientation.
 * Affiche le chemin de navigation avec liens cliquables.
 *
 * Props:
 *   items: Array<{ label: string, href?: string, active?: boolean }>
 *
 * Exemple d'utilisation:
 * <Breadcrumb :items="[
 *   { label: 'Accueil', href: 'acceuil.html' },
 *   { label: 'Mes Demandes', href: 'consulter_demandes.html' },
 *   { label: 'Détails #2024-001234', active: true }
 * ]" />
 */

import { defineComponent } from "vue";

export default defineComponent({
  name: "Breadcrumb",

  props: {
    items: {
      type: Array,
      required: true,
      validator: (items) => items.every((item) => typeof item.label === "string"),
    },
  },

  template: /* html */ `
    <nav aria-label="Fil d'Ariane" class="mb-4">
      <ol class="flex items-center flex-wrap gap-2 text-sm">
        <template v-for="(item, index) in items" :key="index">
          <li v-if="index > 0" class="text-muted" aria-hidden="true">
            <i class="bi bi-chevron-right text-xs"></i>
          </li>
          <li :class="{ 'text-brand font-medium': item.active }">
            <a
              v-if="item.href && !item.active"
              :href="item.href"
              class="text-ink hover:text-brand transition-colors duration-200 no-underline"
            >
              {{ item.label }}
            </a>
            <span v-else :class="item.active ? 'text-brand' : 'text-muted'">
              {{ item.label }}
            </span>
          </li>
        </template>
      </ol>
    </nav>
  `,
});
