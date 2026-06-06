<template>
  <div class="chip-input__wrapper">
    <help-tip
      position="top-right"
      title="Tips"
      :tips="[
        { key: 'Enter', text: 'to add' },
        { key: 'Paste', text: 'multiple lines to bulk add' },
        { key: 'Click', text: 'a chip to edit, Enter to save' },
        { key: 'Drag', text: 'the grip icon to reorder' },
        { key: 'Backspace', text: 'when empty removes last' },
      ]"
    />
    <q-field
      filled
      dense
      :label="label"
      :readonly="readonly"
      stack-label
      class="chip-input"
      @focus="focusInput"
    >
      <template v-if="items.length > 1" #append>
        <q-btn
          flat
          dense
          round
          size="sm"
          :icon="sortAsc ? 'arrow_upward' : 'arrow_downward'"
          :title="sortAsc ? 'Sort A-Z' : 'Sort Z-A'"
          @click.stop="sortItems"
        />
      </template>
      <template #control>
      <div class="chip-input__container" @click="onContainerClick" @mousedown="onContainerMousedown">
        <draggable
          v-model="items"
          item-key="index"
          class="chip-input__draggable"
          ghost-class="chip-input__ghost"
          handle=".drag-handle"
          :disabled="readonly"
        >
          <template #item="{ element, index }">
            <span class="chip-input__item">
              <!-- Editing chip -->
              <q-chip
                v-if="editingIndex === index"
                dense
                :ripple="false"
                class="chip-input__chip chip-input__chip--editing"
              >
                <input
                  ref="editInputRef"
                  v-model="editValue"
                  class="chip-input__edit-input"
                  :size="Math.max(editValue.length, 1)"
                  @keydown.enter.prevent="saveEdit(index)"
                  @keydown.escape.prevent.stop="cancelEdit"
                />
              </q-chip>

              <!-- Normal chip -->
              <q-chip
                v-else
                dense
                :removable="!readonly"
                :clickable="!readonly"
                class="chip-input__chip"
                @click.stop="startEdit(index)"
                @remove="removeChip(index)"
              >
                <q-icon
                  v-if="!readonly && items.length > 1"
                  name="drag_indicator"
                  size="14px"
                  class="drag-handle chip-input__handle"
                />
                {{ element }}
              </q-chip>
            </span>
          </template>
        </draggable>

        <!-- New value input -->
        <input
          v-if="!readonly"
          ref="inputRef"
          v-model="inputValue"
          class="chip-input__input"
          @keydown.enter.prevent="addValue"
          @keydown.delete="onBackspace"
          @paste="onPaste"
        />
      </div>
      </template>
    </q-field>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed, nextTick } from "vue";
import draggable from "vuedraggable";
import HelpTip from "./HelpTip.vue";

defineProps<{
  label?: string;
  readonly?: boolean;
}>();

const model = defineModel<string[] | undefined>({ default: () => [] });

const items = computed({
  get: () => model.value ?? [],
  set: (val: string[]) => { model.value = val; },
});

const inputValue = ref("");
const inputRef = ref<HTMLInputElement | null>(null);
const editInputRef = ref<HTMLInputElement | HTMLInputElement[] | null>(null);
const editingIndex = ref<number | null>(null);
const editValue = ref("");
const sortAsc = ref(true);


function sortItems() {
  const sorted = [...items.value].sort((a, b) =>
    sortAsc.value ? a.localeCompare(b) : b.localeCompare(a),
  );
  model.value = sorted;
  sortAsc.value = !sortAsc.value;
}

function focusInput() {
  inputRef.value?.focus();
}

function onContainerClick(e: MouseEvent) {
  if (editingIndex.value !== null) {
    e.stopPropagation();
    return;
  }
  focusInput();
}

function onContainerMousedown(e: MouseEvent) {
  if (editingIndex.value !== null) {
    e.stopPropagation();
    if (!(e.target instanceof HTMLInputElement)) {
      e.preventDefault();
    }
  }
}

function addValue() {
  const trimmed = inputValue.value.trim();
  if (trimmed) {
    model.value = [...items.value, trimmed];
    inputValue.value = "";
  }
}

function removeChip(index: number) {
  model.value = items.value.filter((_, i) => i !== index);
}

function onBackspace(e: KeyboardEvent) {
  if (inputValue.value === "" && items.value.length > 0) {
    e.preventDefault();
    model.value = items.value.slice(0, -1);
  }
}

function onPaste(e: ClipboardEvent) {
  const text = e.clipboardData?.getData("text/plain") ?? "";
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  if (lines.length > 1) {
    e.preventDefault();
    model.value = [...items.value, ...lines];
    inputValue.value = "";
  }
  // Single line: let default paste behavior handle it
}

function startEdit(index: number) {
  editingIndex.value = index;
  editValue.value = items.value[index] ?? "";
  void nextTick(() => {
    const el = Array.isArray(editInputRef.value) ? editInputRef.value[0] : editInputRef.value;
    el?.focus();
  });
}

function saveEdit(index: number) {
  if (editingIndex.value !== index) return;
  const trimmed = editValue.value.trim();
  if (trimmed) {
    const updated = [...items.value];
    updated[index] = trimmed;
    model.value = updated;
  } else {
    // Empty value = delete
    model.value = items.value.filter((_, i) => i !== index);
  }
  editingIndex.value = null;
}

function cancelEdit() {
  editingIndex.value = null;
}
</script>

<style lang="sass" scoped>
.chip-input__wrapper
  position: relative

.chip-input__container
  display: flex
  flex-wrap: wrap
  align-items: center
  gap: 2px
  min-height: 32px
  width: 100%
  cursor: text
  padding: 2px 0

.chip-input__input
  border: none
  outline: none
  background: transparent
  flex: 1 1 60px
  min-width: 60px
  font-size: 14px
  padding: 4px 0
  color: inherit

.chip-input__item
  display: inline-flex

.chip-input__draggable
  display: flex
  flex-wrap: wrap
  align-items: center
  gap: 2px

.chip-input__handle
  cursor: grab
  margin-right: 2px
  opacity: 0.5
  &:hover
    opacity: 1

.chip-input__chip--editing
  padding: 0

.chip-input__ghost
  opacity: 0.4

.chip-input__edit-input
  border: none
  outline: none
  background: transparent
  font-size: 12px
  width: auto
  min-width: 40px
  padding: 2px 4px
  color: inherit
</style>
