/**
 * components/ui/FormField.js
 *
 * Composant de champ de formulaire avec validation en temps réel.
 * Affiche des indicateurs visuels (✓ vert, ✗ rouge) et des messages d'aide.
 *
 * Props:
 *   modelValue: Valeur du champ
 *   label: Label du champ
 *   type: Type d'input (text, number, email, password, textarea, select)
 *   placeholder: Placeholder
 *   required: Champ obligatoire
 *   disabled: Champ désactivé
 *   error: Message d'erreur externe
 *   helpText: Texte d'aide contextuel
 *   validate: Fonction de validation personnalisée (value) => { valid, message }
 *   options: Options pour select (Array<{ value, label }>)
 *   rows: Nombre de lignes pour textarea
 *
 * Événements:
 *   @update:modelValue: Émis quand la valeur change
 *   @validate: Émis après validation { valid, message }
 */

import { defineComponent, ref, computed, watch } from "vue";

// Classes CSS réutilisables
const LABEL_BASE = "block mb-2 text-sm font-medium text-ink";
const INPUT_BASE = "block w-full px-4 py-2 text-sm leading-[1.5] text-ink bg-white border-2 rounded-lg " +
                   "placeholder:text-muted transition-all duration-200 " +
                   "focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed";

export default defineComponent({
  name: "FormField",

  props: {
    modelValue: { type: [String, Number], default: "" },
    label: { type: String, required: true },
    type: { type: String, default: "text" },
    placeholder: { type: String, default: "" },
    required: { type: Boolean, default: false },
    disabled: { type: Boolean, default: false },
    error: { type: String, default: "" },
    helpText: { type: String, default: "" },
    validate: { type: Function, default: null },
    options: { type: Array, default: () => [] },
    rows: { type: Number, default: 4 },
  },

  emits: ["update:modelValue", "validate"],

  setup(props, { emit }) {
    const touched = ref(false);
    const validationMessage = ref("");
    const isValid = ref(true);

    // Valeur interne
    const internalValue = computed({
      get: () => props.modelValue,
      set: (value) => emit("update:modelValue", value),
    });

    // Validation
    function validateField() {
      if (!touched.value) return;

      // Vérifier si requis et vide
      if (props.required && !internalValue.value) {
        isValid.value = false;
        validationMessage.value = "Ce champ est obligatoire";
        emit("validate", { valid: false, message: validationMessage.value });
        return;
      }

      // Validation personnalisée
      if (props.validate && internalValue.value) {
        const result = props.validate(internalValue.value);
        isValid.value = result.valid;
        validationMessage.value = result.message || "";
        emit("validate", { valid: result.valid, message: validationMessage.value });
        return;
      }

      // Validation réussie
      isValid.value = true;
      validationMessage.value = "";
      emit("validate", { valid: true, message: "" });
    }

    // Observer les changements de valeur
    watch(() => props.modelValue, () => {
      if (touched.value) {
        validateField();
      }
    });

    // Marquer comme touché et valider
    function handleBlur() {
      touched.value = true;
      validateField();
    }

    // Classes de validation
    const inputClass = computed(() => {
      const classes = [INPUT_BASE];
      
      if (touched.value || props.error) {
        if (!isValid.value || props.error) {
          classes.push("border-danger focus:border-danger focus:shadow-[0_0_0_3px_rgba(239,68,68,0.1)]");
        } else if (internalValue.value && isValid.value) {
          classes.push("border-success focus:border-success focus:shadow-[0_0_0_3px_rgba(16,185,129,0.1)]");
        } else {
          classes.push("border-line focus:border-brand focus:shadow-[0_0_0_3px_rgba(234,88,12,0.1)]");
        }
      } else {
        classes.push("border-line focus:border-brand focus:shadow-[0_0_0_3px_rgba(234,88,12,0.1)]");
      }

      return classes.join(" ");
    });

    // Message d'erreur à afficher
    const displayError = computed(() => props.error || validationMessage.value);

    // Afficher l'indicateur de validation
    const showValidation = computed(() => 
      touched.value && internalValue.value && !props.error && !props.disabled
    );

    return {
      internalValue,
      touched,
      isValid,
      inputClass,
      displayError,
      showValidation,
      handleBlur,
      LABEL_BASE,
    };
  },

  template: /* html */ `
    <div class="mb-4">
      <!-- Label -->
      <label :class="LABEL_BASE">
        {{ label }}
        <span v-if="required" class="text-danger ml-0.5">*</span>
      </label>

      <!-- Input wrapper avec icône de validation -->
      <div class="relative">
        <!-- Input Text/Email/Password/Number -->
        <input
          v-if="['text', 'email', 'password', 'number'].includes(type)"
          :type="type"
          v-model="internalValue"
          :class="inputClass"
          :placeholder="placeholder"
          :required="required"
          :disabled="disabled"
          @blur="handleBlur"
        />

        <!-- Textarea -->
        <textarea
          v-else-if="type === 'textarea'"
          v-model="internalValue"
          :class="inputClass"
          :placeholder="placeholder"
          :required="required"
          :disabled="disabled"
          :rows="rows"
          @blur="handleBlur"
        ></textarea>

        <!-- Select -->
        <select
          v-else-if="type === 'select'"
          v-model="internalValue"
          :class="inputClass"
          :required="required"
          :disabled="disabled"
          @blur="handleBlur"
        >
          <option value="" disabled>{{ placeholder || 'Sélectionnez...' }}</option>
          <option
            v-for="option in options"
            :key="option.value"
            :value="option.value"
          >
            {{ option.label }}
          </option>
        </select>

        <!-- Icône de validation -->
        <div
          v-if="showValidation"
          class="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
        >
          <i
            v-if="isValid"
            class="bi bi-check-circle-fill text-success text-lg"
          ></i>
          <i
            v-else
            class="bi bi-x-circle-fill text-danger text-lg"
          ></i>
        </div>
      </div>

      <!-- Message d'erreur -->
      <p
        v-if="displayError"
        class="mt-1 text-sm text-danger flex items-center gap-1"
      >
        <i class="bi bi-exclamation-triangle text-xs"></i>
        {{ displayError }}
      </p>

      <!-- Message de validation positive -->
      <p
        v-else-if="showValidation && isValid"
        class="mt-1 text-sm text-success flex items-center gap-1"
      >
        <i class="bi bi-check-circle text-xs"></i>
        Valide
      </p>

      <!-- Texte d'aide -->
      <p
        v-else-if="helpText && !displayError"
        class="mt-1 text-sm text-muted flex items-start gap-1"
      >
        <i class="bi bi-info-circle text-xs mt-0.5"></i>
        <span>{{ helpText }}</span>
      </p>
    </div>
  `,
});
