<template>
  <q-card-section class="row items-center wrap q-py-xs q-px-sm">
    <!-- Drag handle (edit mode only) -->
    <q-icon
      v-if="isEditMode"
      name="drag_handle"
      class="group-drag-handle q-mr-sm"
      size="sm"
      color="grey"
      style="cursor: move"
    />

    <!-- Collapse toggle -->
    <q-btn
      flat
      dense
      round
      size="sm"
      :icon="group.collapsed ? 'expand_more' : 'expand_less'"
      @click="$emit('collapse-toggle')"
    />

    <!-- Group name (view or inline rename) -->
    <span v-if="!isRenaming" class="text-subtitle2 q-ml-xs ellipsis group-name-label">{{ group.name }}</span>
    <q-input
      v-else
      ref="renameInput"
      v-model="renameName"
      dense
      borderless
      class="q-ml-xs"
      input-style="font-weight: 600"
      @keyup.enter.stop="confirmRename"
      @blur="confirmRename"
    />

    <q-space />

    <!-- Edit mode controls -->
    <template v-if="isEditMode">
      <q-btn flat dense round size="sm" icon="sort">
        <q-tooltip>Sort fields</q-tooltip>
        <q-menu>
          <q-list dense style="min-width: 140px">
            <q-item v-close-popup clickable @click="$emit('sort', 'name-asc')">
              <q-item-section>Name A-Z</q-item-section>
            </q-item>
            <q-item v-close-popup clickable @click="$emit('sort', 'name-desc')">
              <q-item-section>Name Z-A</q-item-section>
            </q-item>
            <q-item v-close-popup clickable @click="$emit('sort', 'type')">
              <q-item-section>Type</q-item-section>
            </q-item>
          </q-list>
        </q-menu>
      </q-btn>
      <q-btn
        flat
        dense
        round
        size="sm"
        icon="palette"
        :color="hasColors ? 'primary' : undefined"
      >
        <q-tooltip>Group colors</q-tooltip>
        <q-menu :offset="[0, 8]" @before-show="onMenuShow">
          <div class="q-pa-sm" style="min-width: 260px; max-width: 300px">

            <!-- PRIMARY COLOR (border) -->
            <div class="text-caption text-grey q-mb-xs">Primary (border)</div>
            <div class="row q-gutter-xs q-mb-xs">
              <div
                v-for="c in primaryPresets"
                :key="'p-' + c"
                class="color-swatch cursor-pointer"
                :style="{ backgroundColor: c }"
                :class="{ 'color-swatch--active': primaryDraft === c }"
                @click="primaryDraft = c"
              />
            </div>
            <div class="hue-wheel-row q-mb-xs">
              <div
                v-for="c in primaryHueWheel"
                :key="'ph-' + c"
                class="hue-swatch cursor-pointer"
                :style="{ backgroundColor: c }"
                :class="{ 'hue-swatch--active': primaryDraft === c }"
                @click="primaryDraft = c"
              />
            </div>
            <q-input
              v-model="primaryDraft"
              dense
              filled
              placeholder="#hex"
              class="q-mb-sm"
              @keydown.enter.stop
            >
              <template v-if="primaryDraft" #append>
                <div class="color-preview" :style="{ backgroundColor: primaryDraft }" />
              </template>
            </q-input>

            <q-separator class="q-mb-sm" />

            <!-- BACKGROUND COLOR -->
            <div class="row items-center q-mb-xs">
              <span class="text-caption text-grey">Background</span>
              <q-space />
              <q-checkbox
                v-model="bgLinkedDraft"
                dense
                size="xs"
                label="Linked to primary"
                class="text-caption"
              />
            </div>
            <template v-if="!bgLinkedDraft">
              <div class="row q-gutter-xs q-mb-xs">
                <div
                  v-for="c in bgPresets"
                  :key="'bg-' + c"
                  class="color-swatch cursor-pointer"
                  :style="{ backgroundColor: c }"
                  :class="{ 'color-swatch--active': bgDraft === c }"
                  @click="bgDraft = c"
                />
              </div>
              <div class="hue-wheel-row q-mb-xs">
                <div
                  v-for="c in bgHueWheel"
                  :key="'bgh-' + c"
                  class="hue-swatch cursor-pointer"
                  :style="{ backgroundColor: c }"
                  :class="{ 'hue-swatch--active': bgDraft === c }"
                  @click="bgDraft = c"
                />
              </div>
              <q-input
                v-model="bgDraft"
                dense
                filled
                placeholder="#hex"
                class="q-mb-sm"
                @keydown.enter.stop
              >
                <template v-if="bgDraft" #append>
                  <div class="color-preview" :style="{ backgroundColor: bgDraft }" />
                </template>
              </q-input>
            </template>
            <div v-else class="q-mb-sm q-pl-xs">
              <div class="row items-center q-mb-xs">
                <span class="text-caption text-grey-6" style="min-width: 70px">Saturation</span>
                <q-slider v-model="bgSatDraft" :min="0" :max="100" dense class="q-mx-sm" style="flex: 1" />
                <span class="text-caption" style="min-width: 28px; text-align: right">{{ bgSatDraft }}</span>
              </div>
              <div class="row items-center">
                <span class="text-caption text-grey-6" style="min-width: 70px">Lightness</span>
                <q-slider v-model="bgLightDraft" :min="50" :max="97" dense class="q-mx-sm" style="flex: 1" />
                <span class="text-caption" style="min-width: 28px; text-align: right">{{ bgLightDraft }}</span>
              </div>
            </div>

            <q-separator class="q-mb-sm" />

            <!-- TEXT COLOR -->
            <div class="row items-center q-mb-xs">
              <span class="text-caption text-grey">Text</span>
              <q-space />
              <q-checkbox
                v-model="textLinkedDraft"
                dense
                size="xs"
                label="Linked to primary"
                class="text-caption"
              />
            </div>
            <template v-if="!textLinkedDraft">
              <div class="row q-gutter-xs q-mb-xs">
                <div
                  v-for="c in textPresets"
                  :key="'t-' + c"
                  class="color-swatch cursor-pointer"
                  :style="{ backgroundColor: c }"
                  :class="{ 'color-swatch--active': textDraft === c }"
                  @click="textDraft = c"
                />
              </div>
              <div class="hue-wheel-row q-mb-xs">
                <div
                  v-for="c in textHueWheel"
                  :key="'th-' + c"
                  class="hue-swatch cursor-pointer"
                  :style="{ backgroundColor: c }"
                  :class="{ 'hue-swatch--active': textDraft === c }"
                  @click="textDraft = c"
                />
              </div>
              <q-input
                v-model="textDraft"
                dense
                filled
                placeholder="#hex"
                class="q-mb-sm"
                @keydown.enter.stop
              >
                <template v-if="textDraft" #append>
                  <div class="color-preview" :style="{ backgroundColor: textDraft }" />
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
                backgroundColor: effectiveBgPreview || '#ffffff',
                borderColor: primaryDraft || 'transparent',
                color: effectiveTextPreview || 'inherit',
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
                @click="applyColors"
              />
              <q-btn
                v-close-popup
                dense
                flat
                no-caps
                size="sm"
                label="Clear"
                color="grey"
                @click="clearColors"
              />
            </div>
          </div>
        </q-menu>
      </q-btn>
      <q-btn flat dense round size="sm" icon="edit" @click="startRename" />
      <q-btn
        v-if="!isUngrouped"
        flat
        dense
        round
        size="sm"
        icon="delete"
        color="negative"
        @click="$emit('remove')"
      />
    </template>
  </q-card-section>
  <q-separator />
</template>

<script lang="ts" setup>
import { ref, nextTick, computed } from "vue";
import type { QInput } from "quasar";
import type { CustomFieldGroupConfig, FieldSortBy, GroupColorPatch } from "./types";
import { UNGROUPED_GROUP_ID } from "./types";
import { lightenColor, getContrastTextColor, generateHueWheel } from "./colorUtils";

const props = defineProps<{
  group: CustomFieldGroupConfig;
  isEditMode: boolean;
}>();

const emit = defineEmits<{
  "collapse-toggle": [];
  rename: [newName: string];
  remove: [];
  sort: [sortBy: FieldSortBy];
  "color-change": [colors: GroupColorPatch];
}>();

const isUngrouped = computed(() => props.group.id === UNGROUPED_GROUP_ID);

// --- Rename ---
const isRenaming = ref(false);
const renameName = ref("");
const renameInput = ref<QInput | null>(null);

function startRename() {
  renameName.value = props.group.name;
  isRenaming.value = true;
  void nextTick(() => {
    renameInput.value?.focus();
  });
}

function confirmRename() {
  if (!isRenaming.value) return;
  isRenaming.value = false;
  const trimmed = renameName.value.trim();
  if (trimmed && trimmed !== props.group.name) {
    emit("rename", trimmed);
  }
}

// --- Colors ---
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

// Hue wheel colors for expanded color choices
const primaryHueWheel = generateHueWheel(18, 65, 60);
const bgHueWheel = generateHueWheel(18, 50, 88);
const textHueWheel = generateHueWheel(18, 70, 35);

// Draft state for the menu
const primaryDraft = ref("");
const bgLinkedDraft = ref(true);
const bgDraft = ref("");
const bgSatDraft = ref(60);
const bgLightDraft = ref(92);
const textLinkedDraft = ref(true);
const textDraft = ref("");

// Effective preview values (derived)
const effectiveBgPreview = computed(() => {
  if (bgLinkedDraft.value && primaryDraft.value) {
    return lightenColor(primaryDraft.value, bgLightDraft.value, bgSatDraft.value);
  }
  return bgDraft.value || undefined;
});

const effectiveTextPreview = computed(() => {
  if (textLinkedDraft.value && effectiveBgPreview.value) {
    return getContrastTextColor(effectiveBgPreview.value);
  }
  return textDraft.value || undefined;
});

const hasColors = computed(
  () => !!props.group.primaryColor || !!props.group.backgroundColor || !!props.group.textColor,
);

// Reset drafts when menu opens (sync from props)
function onMenuShow() {
  primaryDraft.value = props.group.primaryColor ?? "";
  bgLinkedDraft.value = props.group.bgLinkedToPrimary !== false;
  bgDraft.value = props.group.backgroundColor ?? "";
  bgSatDraft.value = props.group.bgSaturation ?? 60;
  bgLightDraft.value = props.group.bgLightness ?? 92;
  textLinkedDraft.value = props.group.textLinkedToPrimary !== false;
  textDraft.value = props.group.textColor ?? "";
}

function applyColors() {
  const patch: GroupColorPatch = {
    primaryColor: primaryDraft.value || undefined,
    backgroundColor: bgLinkedDraft.value ? undefined : (bgDraft.value || undefined),
    textColor: textLinkedDraft.value ? undefined : (textDraft.value || undefined),
    bgLinkedToPrimary: bgLinkedDraft.value,
    textLinkedToPrimary: textLinkedDraft.value,
  };
  if (bgLinkedDraft.value) {
    patch.bgSaturation = bgSatDraft.value;
    patch.bgLightness = bgLightDraft.value;
  }
  emit("color-change", patch);
}

function clearColors() {
  primaryDraft.value = "";
  bgDraft.value = "";
  textDraft.value = "";
  bgLinkedDraft.value = true;
  textLinkedDraft.value = true;
  bgSatDraft.value = 60;
  bgLightDraft.value = 92;
  emit("color-change", {
    primaryColor: undefined,
    backgroundColor: undefined,
    textColor: undefined,
    bgLinkedToPrimary: true,
    textLinkedToPrimary: true,
  });
}
</script>

<style lang="sass" scoped>
.group-name-label
  min-width: 0
  max-width: 200px
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
