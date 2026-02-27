<template>
  <div :class="{ 'edit-mode-field': isEditMode }">
    <!-- Edit mode controls -->
    <div v-if="isEditMode" class="row items-center wrap q-mb-xs">
      <q-icon
        name="drag_indicator"
        class="cursor-move q-mr-xs"
        size="xs"
        color="grey"
      />
      <span class="text-caption text-grey ellipsis field-name-label">{{ field.name }}</span>
      <q-space />

      <!-- Display name inline edit -->
      <q-input
        v-if="isRenamingLabel"
        ref="labelInput"
        v-model="labelDraft"
        dense
        borderless
        size="sm"
        placeholder="Display name"
        input-class="text-caption"
        style="max-width: 140px"
        @keyup.enter.stop="confirmLabel"
        @blur="confirmLabel"
      />
      <q-btn
        v-else
        dense
        flat
        no-caps
        size="xs"
        :color="placement.displayName ? 'primary' : 'grey'"
        :icon="placement.displayName ? undefined : 'label'"
        :label="placement.displayName || undefined"
        class="display-name-btn"
        @click="startLabelEdit"
      >
        <q-tooltip v-if="!placement.displayName">Set display name</q-tooltip>
        <q-tooltip v-else>Edit display name</q-tooltip>
      </q-btn>
      <q-btn
        v-if="placement.displayName && !isRenamingLabel"
        dense
        flat
        round
        size="xs"
        icon="close"
        color="grey"
        @click="$emit('display-name-change', undefined)"
      >
        <q-tooltip>Clear display name</q-tooltip>
      </q-btn>

      <!-- Password mask toggle (text fields only) -->
      <q-btn
        v-if="field.type === 'text'"
        dense
        flat
        round
        size="xs"
        :icon="placement.maskAsPassword ? 'visibility_off' : 'visibility'"
        :color="placement.maskAsPassword ? 'primary' : 'grey'"
        @click="$emit('mask-change', !placement.maskAsPassword)"
      >
        <q-tooltip>{{ placement.maskAsPassword ? 'Unmask field' : 'Mask as password' }}</q-tooltip>
      </q-btn>

      <q-separator vertical class="q-mx-xs" />

      <!-- Column span selector -->
      <q-btn-group flat dense>
        <q-btn
          v-for="opt in colSpanOptions"
          :key="opt.value"
          :label="opt.label"
          dense
          flat
          no-caps
          size="xs"
          :color="placement.colSpan === opt.value ? 'primary' : 'grey'"
          @click="$emit('col-change', opt.value)"
        />
      </q-btn-group>
    </div>

    <!-- The actual custom field input -->
    <CustomField
      :model-value="value"
      :field="field"
      v-bind="optionalFieldProps"
      @update:model-value="$emit('update:value', $event)"
    />
  </div>
</template>

<script lang="ts" setup>
import { ref, computed, nextTick } from "vue";
import type { QInput } from "quasar";
import CustomField from "src/core/dashboard/ui/CustomField.vue";
import type { CustomField as CustomFieldType } from "src/core/settings/types";
import type { CustomFieldPlacement, GridColSpan } from "./types";

const props = defineProps<{
  placement: CustomFieldPlacement;
  field: CustomFieldType;
  value: unknown;
  isEditMode: boolean;
}>();

const optionalFieldProps = computed(() => {
  const bound: Record<string, unknown> = {};
  if (props.placement.displayName) bound.displayName = props.placement.displayName;
  if (props.placement.maskAsPassword) bound.maskAsPassword = props.placement.maskAsPassword;
  return bound;
});

const emit = defineEmits<{
  "update:value": [value: unknown];
  "col-change": [span: GridColSpan];
  "display-name-change": [displayName: string | undefined];
  "mask-change": [masked: boolean];
}>();

const colSpanOptions: { label: string; value: GridColSpan }[] = [
  { label: "1/4", value: 3 },
  { label: "1/3", value: 4 },
  { label: "1/2", value: 6 },
  { label: "Full", value: 12 },
];

const isRenamingLabel = ref(false);
const labelDraft = ref("");
const labelInput = ref<QInput | null>(null);

function startLabelEdit() {
  labelDraft.value = "";
  isRenamingLabel.value = true;
  void nextTick(() => {
    labelInput.value?.focus();
  });
}

function confirmLabel() {
  if (!isRenamingLabel.value) return;
  isRenamingLabel.value = false;
  const trimmed = labelDraft.value.trim();
  emit("display-name-change", trimmed || undefined);
}
</script>

<style lang="sass" scoped>
.edit-mode-field
  border: 1px dashed rgba(128, 128, 128, 0.4)
  border-radius: 4px
  padding: 8px

.field-name-label
  min-width: 0
  max-width: 120px
  overflow: hidden
  text-overflow: ellipsis
  white-space: nowrap

.display-name-btn
  max-width: 120px
  :deep(.q-btn__content)
    overflow: hidden
    text-overflow: ellipsis
    white-space: nowrap
</style>
