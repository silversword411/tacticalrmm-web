<template>
  <div>
    <!-- Empty state -->
    <div v-if="agentCustomFields.length === 0" class="text-subtitle">
      No agent custom fields found. Go to <b>Settings &gt; Global Settings &gt; Custom Settings</b>
    </div>

    <template v-else>
      <!-- Toolbar: edit mode toggle + reset -->
      <CustomFieldLayoutToolbar
        :is-edit-mode="isEditMode"
        @toggle-edit="toggleEditMode"
        @reset="confirmReset"
      />

      <!-- Edit mode: draggable groups -->
      <draggable
        v-if="isEditMode"
        v-model="draggableGroups"
        item-key="id"
        handle=".group-drag-handle"
        ghost-class="group-ghost"
        @change="onGroupDragChange"
      >
        <template #item="{ element }">
          <CustomFieldGroup
            :group="getGroupById(element.id)"
            :resolved-fields="resolveGroupFields(getGroupById(element.id))"
            :values="values"
            :is-edit-mode="true"
            :draggable-group-name="DRAG_GROUP_NAME"
            @collapse-toggle="toggleGroupCollapsed"
            @rename-group="renameGroup"
            @remove-group="confirmRemoveGroup"
            @field-col-change="setFieldColSpan"
            @fields-reordered="updateFieldsInGroup"
            @field-added="addFieldToGroup"
            @field-removed="removeFieldFromGroup"
            @display-name-change="setFieldDisplayName"
            @mask-change="setFieldMasked"
            @sort-fields="sortFieldsInGroup"
            @color-change="setGroupColors"
            @field-color-change="setFieldColors"
            @update:value="onFieldValueUpdate"
          />
        </template>
      </draggable>

      <!-- View mode: static rendering -->
      <div v-else>
        <CustomFieldGroup
          v-for="group in sortedGroups"
          :key="group.id"
          :group="group"
          :resolved-fields="resolveGroupFields(group)"
          :values="values"
          :is-edit-mode="false"
          @collapse-toggle="toggleGroupCollapsed"
          @update:value="onFieldValueUpdate"
        />
      </div>

      <!-- Add group button (edit mode only) -->
      <div v-if="isEditMode" class="q-pa-sm">
        <q-btn
          flat
          dense
          icon="add"
          label="Add Group"
          color="primary"
          no-caps
          size="sm"
          @click="promptAddGroup"
        />
      </div>
    </template>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed, watch } from "vue";
import { useQuasar } from "quasar";
import draggable from "vuedraggable";
import CustomFieldGroup from "./CustomFieldGroup.vue";
import CustomFieldLayoutToolbar from "./CustomFieldLayoutToolbar.vue";
import { useCustomFieldLayout } from "./useCustomFieldLayout";
import type { CustomField, CustomFieldValueField } from "src/core/settings/types";

const props = defineProps<{
  agentCustomFields: CustomField[];
  values: Record<string, CustomFieldValueField>;
}>();

const $q = useQuasar();
const DRAG_GROUP_NAME = "customFieldsDrag";

// Wrap the array prop as a computed for the composable
const fieldsRef = computed(() => props.agentCustomFields);

const {
  sortedGroups,
  isEditMode,
  toggleEditMode,
  addGroup,
  renameGroup,
  removeGroup,
  toggleGroupCollapsed,
  resolveGroupFields,
  getGroupById,
  setFieldColSpan,
  setFieldDisplayName,
  setFieldMasked,
  updateGroupOrder,
  updateFieldsInGroup,
  addFieldToGroup,
  removeFieldFromGroup,
  sortFieldsInGroup,
  setGroupColors,
  setFieldColors,
  resetLayout,
} = useCustomFieldLayout(fieldsRef);

// Object-based draggable model for groups (vuedraggable v4 requires objects)
interface DraggableGroupItem {
  id: string;
}

const draggableGroups = ref<DraggableGroupItem[]>([]);

watch(
  () => sortedGroups.value.map((g) => g.id).join(","),
  () => {
    draggableGroups.value = sortedGroups.value.map((g) => ({ id: g.id }));
  },
  { immediate: true },
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function onGroupDragChange(evt: any) {
  if (evt.moved) {
    const orderedIds = draggableGroups.value.map((g) => g.id);
    updateGroupOrder(orderedIds);
  }
}

function onFieldValueUpdate(fieldName: string, value: unknown) {
  // Mutate the reactive values record passed from EditAgent
  (props.values as Record<string, unknown>)[fieldName] = value;
}

function promptAddGroup() {
  $q.dialog({
    title: "Add Group",
    message: "Enter a name for the new group:",
    prompt: {
      model: "",
      type: "text",
    },
    cancel: true,
    persistent: false,
  }).onOk((name: string) => {
    const trimmed = name.trim();
    if (trimmed) {
      addGroup(trimmed);
    }
  });
}

function confirmRemoveGroup(groupId: string) {
  const group = getGroupById(groupId);
  const fieldCount = group.fields.length;
  const message =
    fieldCount > 0
      ? `Delete group "${group.name}"? Its ${fieldCount} field(s) will be moved to the General group.`
      : `Delete group "${group.name}"?`;

  $q.dialog({
    title: "Delete Group",
    message,
    cancel: true,
    persistent: false,
  }).onOk(() => {
    removeGroup(groupId);
  });
}

function confirmReset() {
  $q.dialog({
    title: "Reset Layout",
    message: "Reset to the default layout? All groups and sizing will be removed.",
    cancel: true,
    persistent: false,
  }).onOk(() => {
    resetLayout();
  });
}
</script>

<style lang="sass" scoped>
.group-ghost
  opacity: 0.5
  background: var(--q-primary)
  border-radius: 4px
</style>
