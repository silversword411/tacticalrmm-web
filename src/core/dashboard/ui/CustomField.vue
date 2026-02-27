<template>
  <q-input
    v-if="field.type === 'text' || field.type === 'number'"
    v-model="value"
    :class="longTextClass(field)"
    filled
    dense
    :label="label"
    :type="inputType"
    :hint="hintText(field)"
    :rules="[...validationRules]"
    reactive-rules
    :autogrow="!maskAsPassword"
    @keydown.enter.stop
  >
    <template #append>
      <q-icon
        v-if="maskAsPassword && field.type === 'text'"
        :name="passwordVisible ? 'visibility' : 'visibility_off'"
        class="cursor-pointer"
        size="xs"
        @click.stop="passwordVisible = !passwordVisible"
      >
        <q-tooltip>{{ passwordVisible ? 'Hide' : 'Show' }}</q-tooltip>
      </q-icon>
      <q-icon
        v-if="copyableText"
        name="content_copy"
        class="cursor-pointer"
        size="xs"
        @click.stop="copyValue"
      >
        <q-tooltip>Copy to clipboard</q-tooltip>
      </q-icon>
    </template>
    <q-tooltip v-if="displayName">{{ field.name }}</q-tooltip>
  </q-input>

  <q-toggle
    v-else-if="field.type === 'checkbox'"
    v-model="value"
    :label="label"
    :hint="hintText(field)"
    class="custom-field-toggle"
  >
    <q-tooltip>{{ field.name }}</q-tooltip>
  </q-toggle>

  <q-input
    v-else-if="field.type === 'datetime'"
    v-model="value"
    :label="label"
    :hint="hintText(field)"
    type="datetime-local"
    dense
    stack-label
    filled
    :rules="[...validationRules]"
    reactive-rules
    @keydown.enter.stop
  >
    <template v-if="copyableText" #append>
      <q-icon name="content_copy" class="cursor-pointer" size="xs" @click.stop="copyValue">
        <q-tooltip>Copy to clipboard</q-tooltip>
      </q-icon>
    </template>
    <q-tooltip v-if="displayName">{{ field.name }}</q-tooltip>
  </q-input>

  <q-select
    v-else-if="field.type === 'single' || field.type === 'multiple'"
    v-model="value"
    filled
    dense
    :hint="hintText(field)"
    :label="label"
    :options="field.options"
    :multiple="field.type === 'multiple'"
    :rules="[...validationRules]"
    reactive-rules
    clearable
  >
    <template v-if="copyableText" #append>
      <q-icon name="content_copy" class="cursor-pointer" size="xs" @click.stop="copyValue">
        <q-tooltip>Copy to clipboard</q-tooltip>
      </q-icon>
    </template>
    <q-tooltip v-if="displayName">{{ field.name }}</q-tooltip>
  </q-select>
</template>

<script lang="ts" setup>
import { computed, ref } from "vue";
import type { CustomField } from "src/core/settings/types";
import { truncateText } from "src/utils/format";
import { copyOutput } from "src/utils/helpers";

const props = defineProps<{
  field: CustomField;
  displayName?: string;
  maskAsPassword?: boolean;
}>();

const label = computed(() => props.displayName || props.field.name);

const passwordVisible = ref(false);

const inputType = computed(() => {
  if (props.maskAsPassword && props.field.type === "text") {
    return passwordVisible.value ? "text" : "password";
  }
  return props.field.type === "text" ? "text" : "number";
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const value = defineModel<any>();

const copyableText = computed(() => {
  if (value.value == null || value.value === "") return "";
  if (Array.isArray(value.value)) return value.value.join(", ");
  return String(value.value);
});

function copyValue() {
  if (copyableText.value) {
    copyOutput(copyableText.value);
  }
}

const validationRules = computed(() => {
  const rules = [];

  if (props.field.required) {
    rules.push((val: string) => !!val || `${props.field.name} is required`);
  }

  return rules;
});

function hintText(field: CustomField) {
  let value = "";
  if (field.type === "multiple")
    value =
      field.default_values_multiple.length > 0
        ? `Default value: ${field.default_values_multiple.join(", ")}`
        : "";
  else if (field.type === "checkbox")
    value = field.default_value_bool ? `Default value: ${field.default_value_bool}` : "";
  else value = field.default_value_string ? `Default value: ${field.default_value_string}` : "";

  return value.length > 100 ? truncateText(value, 100) : value;
}

function longTextClass(field: CustomField) {
  return "default_value_string" in field && field.default_value_string.length >= 130
    ? "q-mb-xl q-mt-xl"
    : "";
}
</script>

<style lang="sass" scoped>
.custom-field-toggle
  max-width: 100%
  :deep(.q-toggle__label)
    overflow: hidden
    text-overflow: ellipsis
    white-space: nowrap
    min-width: 0
</style>
