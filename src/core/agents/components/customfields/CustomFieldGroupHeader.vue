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
import type { CustomFieldGroupConfig, FieldSortBy } from "./types";
import { UNGROUPED_GROUP_ID } from "./types";

const props = defineProps<{
  group: CustomFieldGroupConfig;
  isEditMode: boolean;
}>();

const emit = defineEmits<{
  "collapse-toggle": [];
  rename: [newName: string];
  remove: [];
  sort: [sortBy: FieldSortBy];
}>();

const isUngrouped = computed(() => props.group.id === UNGROUPED_GROUP_ID);

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
</script>

<style lang="sass" scoped>
.group-name-label
  min-width: 0
  max-width: 200px
  overflow: hidden
  text-overflow: ellipsis
  white-space: nowrap
</style>
