<template>
  <div :class="{ 'edit-mode-field': isEditMode && !hasFieldColors, 'edit-mode-field-colored': isEditMode && hasFieldColors }" :style="fieldStyle">
    <!-- Edit mode controls -->
    <div v-if="isEditMode" class="row items-center wrap q-mb-xs">
      <q-icon
        name="drag_indicator"
        class="cursor-move q-mr-xs"
        size="xs"
        :color="hasFieldColors ? undefined : 'grey'"
      />
      <span class="text-caption ellipsis field-name-label" :class="{ 'text-grey': !hasFieldColors }">{{ field.name }}</span>
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

      <!-- Field color picker -->
      <q-btn
        dense
        flat
        round
        size="xs"
        icon="palette"
        :color="hasFieldColors ? 'primary' : 'grey'"
      >
        <q-tooltip>Field colors</q-tooltip>
        <q-menu :offset="[0, 8]" @before-show="onColorMenuShow">
          <div class="q-pa-sm" style="min-width: 260px; max-width: 300px">

            <!-- PRIMARY COLOR (border) -->
            <div class="text-caption text-grey q-mb-xs">Primary (border)</div>
            <div class="row q-gutter-xs q-mb-xs">
              <div
                v-for="c in primaryPresets"
                :key="'fp-' + c"
                class="color-swatch cursor-pointer"
                :style="{ backgroundColor: c }"
                :class="{ 'color-swatch--active': fPrimaryDraft === c }"
                @click="fPrimaryDraft = c"
              />
            </div>
            <div class="hue-wheel-row q-mb-xs">
              <div
                v-for="c in primaryHueWheel"
                :key="'fph-' + c"
                class="hue-swatch cursor-pointer"
                :style="{ backgroundColor: c }"
                :class="{ 'hue-swatch--active': fPrimaryDraft === c }"
                @click="fPrimaryDraft = c"
              />
            </div>
            <q-input
              v-model="fPrimaryDraft"
              dense
              filled
              placeholder="#hex"
              class="q-mb-sm"
              @keydown.enter.stop
            >
              <template v-if="fPrimaryDraft" #append>
                <div class="color-preview" :style="{ backgroundColor: fPrimaryDraft }" />
              </template>
            </q-input>

            <q-separator class="q-mb-sm" />

            <!-- BACKGROUND COLOR -->
            <div class="row items-center q-mb-xs">
              <span class="text-caption text-grey">Background</span>
              <q-space />
              <q-checkbox
                v-model="fBgLinkedDraft"
                dense
                size="xs"
                label="Linked to primary"
                class="text-caption"
              />
            </div>
            <template v-if="!fBgLinkedDraft">
              <div class="row q-gutter-xs q-mb-xs">
                <div
                  v-for="c in bgPresets"
                  :key="'fbg-' + c"
                  class="color-swatch cursor-pointer"
                  :style="{ backgroundColor: c }"
                  :class="{ 'color-swatch--active': fBgDraft === c }"
                  @click="fBgDraft = c"
                />
              </div>
              <div class="hue-wheel-row q-mb-xs">
                <div
                  v-for="c in bgHueWheel"
                  :key="'fbgh-' + c"
                  class="hue-swatch cursor-pointer"
                  :style="{ backgroundColor: c }"
                  :class="{ 'hue-swatch--active': fBgDraft === c }"
                  @click="fBgDraft = c"
                />
              </div>
              <q-input
                v-model="fBgDraft"
                dense
                filled
                placeholder="#hex"
                class="q-mb-sm"
                @keydown.enter.stop
              >
                <template v-if="fBgDraft" #append>
                  <div class="color-preview" :style="{ backgroundColor: fBgDraft }" />
                </template>
              </q-input>
            </template>
            <div v-else class="q-mb-sm q-pl-xs">
              <div class="row items-center q-mb-xs">
                <span class="text-caption text-grey-6" style="min-width: 70px">Saturation</span>
                <q-slider v-model="fBgSatDraft" :min="0" :max="100" dense class="q-mx-sm" style="flex: 1" />
                <span class="text-caption" style="min-width: 28px; text-align: right">{{ fBgSatDraft }}</span>
              </div>
              <div class="row items-center">
                <span class="text-caption text-grey-6" style="min-width: 70px">Lightness</span>
                <q-slider v-model="fBgLightDraft" :min="50" :max="97" dense class="q-mx-sm" style="flex: 1" />
                <span class="text-caption" style="min-width: 28px; text-align: right">{{ fBgLightDraft }}</span>
              </div>
            </div>

            <q-separator class="q-mb-sm" />

            <!-- TEXT COLOR -->
            <div class="row items-center q-mb-xs">
              <span class="text-caption text-grey">Text</span>
              <q-space />
              <q-checkbox
                v-model="fTextLinkedDraft"
                dense
                size="xs"
                label="Linked to primary"
                class="text-caption"
              />
            </div>
            <template v-if="!fTextLinkedDraft">
              <div class="row q-gutter-xs q-mb-xs">
                <div
                  v-for="c in textPresets"
                  :key="'ft-' + c"
                  class="color-swatch cursor-pointer"
                  :style="{ backgroundColor: c }"
                  :class="{ 'color-swatch--active': fTextDraft === c }"
                  @click="fTextDraft = c"
                />
              </div>
              <div class="hue-wheel-row q-mb-xs">
                <div
                  v-for="c in textHueWheel"
                  :key="'fth-' + c"
                  class="hue-swatch cursor-pointer"
                  :style="{ backgroundColor: c }"
                  :class="{ 'hue-swatch--active': fTextDraft === c }"
                  @click="fTextDraft = c"
                />
              </div>
              <q-input
                v-model="fTextDraft"
                dense
                filled
                placeholder="#hex"
                class="q-mb-sm"
                @keydown.enter.stop
              >
                <template v-if="fTextDraft" #append>
                  <div class="color-preview" :style="{ backgroundColor: fTextDraft }" />
                </template>
              </q-input>
            </template>
            <div v-else class="text-caption text-grey-6 q-mb-sm q-pl-xs">
              Auto-computed for readability
            </div>

            <!-- PREVIEW BOX -->
            <div
              class="color-preview-box q-pa-sm q-mb-sm"
              :style="{
                backgroundColor: fEffectiveBgPreview || '#ffffff',
                borderColor: fPrimaryDraft || 'transparent',
                color: fEffectiveTextPreview || 'inherit',
              }"
            >
              <span class="text-caption">Preview text</span>
            </div>

            <!-- ACTION BUTTONS -->
            <div class="row q-gutter-xs">
              <q-btn
                v-close-popup
                dense
                flat
                no-caps
                size="sm"
                label="Apply"
                color="primary"
                @click="applyFieldColors"
              />
              <q-btn
                v-close-popup
                dense
                flat
                no-caps
                size="sm"
                label="Clear"
                color="grey"
                @click="clearFieldColors"
              />
            </div>
          </div>
        </q-menu>
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
import type { CustomFieldPlacement, GridColSpan, FieldColorPatch } from "./types";
import { lightenColor, getContrastTextColor, generateHueWheel } from "./colorUtils";

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

// Compute inline style from field-level colors
const fieldStyle = computed(() => {
  const style: Record<string, string> = {};
  const p = props.placement;

  if (p.primaryColor) {
    style.borderColor = p.primaryColor;
    style.borderStyle = "solid";
    style.borderWidth = "1px";
    style.borderRadius = "4px";
  }

  const bgLinked = p.bgLinkedToPrimary !== false;
  let effectiveBg: string | undefined;
  if (p.primaryColor && bgLinked) {
    effectiveBg = lightenColor(p.primaryColor, p.bgLightness ?? 92, p.bgSaturation);
  } else if (!bgLinked && p.backgroundColor) {
    effectiveBg = p.backgroundColor;
  }
  if (effectiveBg) {
    style.backgroundColor = effectiveBg;
  }

  const textLinked = p.textLinkedToPrimary !== false;
  if (textLinked && effectiveBg) {
    style.color = getContrastTextColor(effectiveBg);
  } else if (!textLinked && p.textColor) {
    style.color = p.textColor;
  }

  // Add padding when colors are set so content doesn't touch borders (view mode only;
  // edit mode gets padding from the .edit-mode-field-colored class)
  if (Object.keys(style).length > 0 && !props.isEditMode) {
    style.padding = "8px";
  }

  return style;
});

const emit = defineEmits<{
  "update:value": [value: unknown];
  "col-change": [span: GridColSpan];
  "display-name-change": [displayName: string | undefined];
  "mask-change": [masked: boolean];
  "field-color-change": [colors: FieldColorPatch];
}>();

const colSpanOptions: { label: string; value: GridColSpan }[] = [
  { label: "1/4", value: 3 },
  { label: "1/3", value: 4 },
  { label: "1/2", value: 6 },
  { label: "Full", value: 12 },
];

// --- Display name ---
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

// --- Field colors ---
const primaryPresets = [
  "#90caf9", "#a5d6a7", "#ffcc80", "#f48fb1",
  "#ce93d8", "#80cbc4", "#fff176", "#bcaaa4",
];
const bgPresets = [
  "#e3f2fd", "#e8f5e9", "#fff3e0", "#fce4ec",
  "#f3e5f5", "#e0f2f1", "#fff9c4", "#efebe9",
];
const textPresets = [
  "#1a1a1a", "#333333", "#555555", "#f5f5f5",
  "#ffffff", "#0d47a1", "#1b5e20", "#b71c1c",
];

const primaryHueWheel = generateHueWheel(18, 65, 60);
const bgHueWheel = generateHueWheel(18, 50, 88);
const textHueWheel = generateHueWheel(18, 70, 35);

const fPrimaryDraft = ref("");
const fBgLinkedDraft = ref(true);
const fBgDraft = ref("");
const fBgSatDraft = ref(60);
const fBgLightDraft = ref(92);
const fTextLinkedDraft = ref(true);
const fTextDraft = ref("");

const fEffectiveBgPreview = computed(() => {
  if (fBgLinkedDraft.value && fPrimaryDraft.value) {
    return lightenColor(fPrimaryDraft.value, fBgLightDraft.value, fBgSatDraft.value);
  }
  return fBgDraft.value || undefined;
});

const fEffectiveTextPreview = computed(() => {
  if (fTextLinkedDraft.value && fEffectiveBgPreview.value) {
    return getContrastTextColor(fEffectiveBgPreview.value);
  }
  return fTextDraft.value || undefined;
});

const hasFieldColors = computed(
  () => !!props.placement.primaryColor || !!props.placement.backgroundColor || !!props.placement.textColor,
);

function onColorMenuShow() {
  fPrimaryDraft.value = props.placement.primaryColor ?? "";
  fBgLinkedDraft.value = props.placement.bgLinkedToPrimary !== false;
  fBgDraft.value = props.placement.backgroundColor ?? "";
  fBgSatDraft.value = props.placement.bgSaturation ?? 60;
  fBgLightDraft.value = props.placement.bgLightness ?? 92;
  fTextLinkedDraft.value = props.placement.textLinkedToPrimary !== false;
  fTextDraft.value = props.placement.textColor ?? "";
}

function applyFieldColors() {
  const patch: FieldColorPatch = {
    primaryColor: fPrimaryDraft.value || undefined,
    backgroundColor: fBgLinkedDraft.value ? undefined : (fBgDraft.value || undefined),
    textColor: fTextLinkedDraft.value ? undefined : (fTextDraft.value || undefined),
    bgLinkedToPrimary: fBgLinkedDraft.value,
    textLinkedToPrimary: fTextLinkedDraft.value,
  };
  if (fBgLinkedDraft.value) {
    patch.bgSaturation = fBgSatDraft.value;
    patch.bgLightness = fBgLightDraft.value;
  }
  emit("field-color-change", patch);
}

function clearFieldColors() {
  fPrimaryDraft.value = "";
  fBgDraft.value = "";
  fTextDraft.value = "";
  fBgLinkedDraft.value = true;
  fTextLinkedDraft.value = true;
  fBgSatDraft.value = 60;
  fBgLightDraft.value = 92;
  emit("field-color-change", {
    primaryColor: undefined,
    backgroundColor: undefined,
    textColor: undefined,
    bgLinkedToPrimary: true,
    textLinkedToPrimary: true,
  });
}
</script>

<style lang="sass" scoped>
.edit-mode-field
  border: 1px dashed rgba(128, 128, 128, 0.4)
  border-radius: 4px
  padding: 8px

.edit-mode-field-colored
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

.color-swatch
  width: 20px
  height: 20px
  border-radius: 50%
  border: 2px solid transparent
  &--active
    border-color: var(--q-primary)

.color-preview
  width: 16px
  height: 16px
  border-radius: 3px
  border: 1px solid rgba(128, 128, 128, 0.4)

.color-preview-box
  border: 2px solid transparent
  border-radius: 4px
  text-align: center
  min-height: 32px
  display: flex
  align-items: center
  justify-content: center

.hue-wheel-row
  display: flex
  gap: 1px
  border-radius: 10px
  overflow: hidden

.hue-swatch
  flex: 1
  height: 14px
  min-width: 0
  position: relative
  &--active
    outline: 2px solid var(--q-primary)
    outline-offset: -1px
    z-index: 1
    border-radius: 2px
</style>
