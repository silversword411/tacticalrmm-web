<template>
  <q-card flat bordered class="q-mb-sm" :style="groupCardStyle">
    <CustomFieldGroupHeader
      :group="group"
      :is-edit-mode="isEditMode"
      @collapse-toggle="$emit('collapse-toggle', group.id)"
      @rename="(newName: string) => $emit('rename-group', group.id, newName)"
      @remove="$emit('remove-group', group.id)"
      @sort="(sortBy: FieldSortBy) => $emit('sort-fields', group.id, sortBy)"
      @color-change="(colors: GroupColorPatch) => $emit('color-change', group.id, colors)"
    />

    <q-slide-transition>
      <div v-show="!group.collapsed">
        <!-- Edit mode: draggable grid -->
        <draggable
          v-if="isEditMode"
          v-model="draggableItems"
          :group="{ name: draggableGroupName }"
          item-key="fieldId"
          class="row q-pa-sm q-col-gutter-sm"
          ghost-class="field-ghost"
          style="min-height: 40px"
          @change="onDragChange"
        >
          <template #item="{ element }">
            <div :class="`col-${getColSpan(element.fieldId)}`">
              <CustomFieldGridItem
                :placement="getPlacement(element.fieldId)"
                :field="getField(element.fieldId)"
                :value="values[getField(element.fieldId).name]"
                :is-edit-mode="true"
                @update:value="(val: unknown) => $emit('update:value', getField(element.fieldId).name, val)"
                @col-change="(span: GridColSpan) => $emit('field-col-change', group.id, element.fieldId, span)"
                @display-name-change="(name: string | undefined) => $emit('display-name-change', group.id, element.fieldId, name)"
                @mask-change="(masked: boolean) => $emit('mask-change', group.id, element.fieldId, masked)"
                @field-color-change="(colors: FieldColorPatch) => $emit('field-color-change', group.id, element.fieldId, colors)"
              />
            </div>
          </template>
        </draggable>

        <!-- View mode: static grid -->
        <div v-else class="row q-pa-sm q-col-gutter-sm">
          <div
            v-for="item in resolvedFields"
            :key="item.placement.fieldId"
            :class="`col-${item.placement.colSpan}`"
          >
            <div :style="fieldCardStyle(item.placement)" :class="{ 'field-color-wrap': hasFieldColors(item.placement) }">
              <CustomField
                :model-value="values[item.field.name]"
                :field="item.field"
                v-bind="viewFieldProps(item)"
                @update:model-value="(val: unknown) => $emit('update:value', item.field.name, val)"
              />
            </div>
          </div>
        </div>
      </div>
    </q-slide-transition>
  </q-card>
</template>

<script lang="ts" setup>
import { ref, computed, watch } from "vue";
import draggable from "vuedraggable";
import CustomField from "src/core/dashboard/ui/CustomField.vue";
import CustomFieldGridItem from "./CustomFieldGridItem.vue";
import CustomFieldGroupHeader from "./CustomFieldGroupHeader.vue";
import { lightenColor, getContrastTextColor } from "./colorUtils";
import type { CustomField as CustomFieldType, CustomFieldValueField } from "src/core/settings/types";
import type {
  CustomFieldGroupConfig,
  CustomFieldPlacement,
  ResolvedFieldItem,
  GridColSpan,
  FieldSortBy,
  GroupColorPatch,
  FieldColorPatch,
} from "./types";

interface DraggableItem {
  fieldId: number;
}

const props = defineProps<{
  group: CustomFieldGroupConfig;
  resolvedFields: ResolvedFieldItem[];
  values: Record<string, CustomFieldValueField>;
  isEditMode: boolean;
  draggableGroupName?: string;
}>();

const emit = defineEmits<{
  "collapse-toggle": [groupId: string];
  "rename-group": [groupId: string, newName: string];
  "remove-group": [groupId: string];
  "field-col-change": [groupId: string, fieldId: number, span: GridColSpan];
  "fields-reordered": [groupId: string, orderedFieldIds: number[]];
  "field-added": [groupId: string, fieldId: number, newIndex: number];
  "field-removed": [groupId: string, fieldId: number];
  "display-name-change": [groupId: string, fieldId: number, displayName: string | undefined];
  "mask-change": [groupId: string, fieldId: number, masked: boolean];
  "sort-fields": [groupId: string, sortBy: FieldSortBy];
  "color-change": [groupId: string, colors: GroupColorPatch];
  "field-color-change": [groupId: string, fieldId: number, colors: FieldColorPatch];
  "update:value": [fieldName: string, value: unknown];
}>();

// Object-based draggable model (vuedraggable v4 requires objects with item-key)
const draggableItems = ref<DraggableItem[]>([]);

watch(
  () => props.resolvedFields.map((item) => item.placement.fieldId).join(","),
  () => {
    draggableItems.value = props.resolvedFields.map((item) => ({
      fieldId: item.placement.fieldId,
    }));
  },
  { immediate: true },
);

// Lookup helpers using the full resolvedFields list from parent
// (includes fields that may have just been dragged in)
const allFieldsMap = new Map<number, CustomFieldType>();
const allPlacementsMap = new Map<number, CustomFieldPlacement>();

watch(
  () => props.resolvedFields,
  (fields) => {
    allFieldsMap.clear();
    allPlacementsMap.clear();
    for (const item of fields) {
      allFieldsMap.set(item.placement.fieldId, item.field);
      allPlacementsMap.set(item.placement.fieldId, item.placement);
    }
  },
  { immediate: true, deep: true },
);

function getField(fieldId: number): CustomFieldType {
  return allFieldsMap.get(fieldId)!;
}

function getPlacement(fieldId: number): CustomFieldPlacement {
  return (
    allPlacementsMap.get(fieldId) ?? {
      fieldId,
      colSpan: 12 as GridColSpan,
      order: 0,
    }
  );
}

function getColSpan(fieldId: number): number {
  return allPlacementsMap.get(fieldId)?.colSpan ?? 12;
}

const groupCardStyle = computed(() => {
  const style: Record<string, string> = {};
  const g = props.group;

  // Border = primaryColor
  if (g.primaryColor) {
    style.borderColor = g.primaryColor;
  }

  // Background: linked derives from primary, unlinked uses explicit value
  const bgLinked = g.bgLinkedToPrimary !== false; // default true
  let effectiveBg: string | undefined;
  if (g.primaryColor && bgLinked) {
    effectiveBg = lightenColor(g.primaryColor, g.bgLightness ?? 92, g.bgSaturation);
  } else if (!bgLinked && g.backgroundColor) {
    effectiveBg = g.backgroundColor;
  }
  if (effectiveBg) {
    style.backgroundColor = effectiveBg;
  }

  // Text color: linked auto-computes from effective background, unlinked uses explicit
  const textLinked = g.textLinkedToPrimary !== false; // default true
  if (textLinked && effectiveBg) {
    style.color = getContrastTextColor(effectiveBg);
  } else if (!textLinked && g.textColor) {
    style.color = g.textColor;
  }

  return style;
});

function viewFieldProps(item: ResolvedFieldItem): Record<string, unknown> {
  const bound: Record<string, unknown> = {};
  if (item.placement.displayName) bound.displayName = item.placement.displayName;
  if (item.placement.maskAsPassword) bound.maskAsPassword = item.placement.maskAsPassword;
  return bound;
}

function hasFieldColors(p: CustomFieldPlacement): boolean {
  return !!p.primaryColor || !!p.backgroundColor || !!p.textColor;
}

function fieldCardStyle(p: CustomFieldPlacement): Record<string, string> {
  const style: Record<string, string> = {};

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

  return style;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function onDragChange(evt: any) {
  if (evt.moved) {
    // Field reordered within same group
    const ids = draggableItems.value.map((item) => item.fieldId);
    emit("fields-reordered", props.group.id, ids);
  }
  if (evt.added) {
    // Field dragged in from another group
    emit("field-added", props.group.id, evt.added.element.fieldId, evt.added.newIndex);
  }
  if (evt.removed) {
    // Field dragged out to another group
    emit("field-removed", props.group.id, evt.removed.element.fieldId);
  }
}
</script>

<style lang="sass" scoped>
.field-ghost
  opacity: 0.4
  border: 2px dashed var(--q-primary)
  border-radius: 4px

.field-color-wrap
  padding: 8px
</style>
