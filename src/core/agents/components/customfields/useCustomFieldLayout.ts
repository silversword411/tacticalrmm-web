import { ref, computed } from "vue";
import { useStorage } from "@vueuse/core";
import { uid } from "quasar";
import type { Ref, ComputedRef } from "vue";
import type { CustomField } from "src/core/settings/types";
import type {
  CustomFieldLayout,
  CustomFieldGroupConfig,
  CustomFieldPlacement,
  GridColSpan,
  ResolvedFieldItem,
  FieldSortBy,
} from "./types";
import {
  createDefaultLayout,
  DEFAULT_COL_SPAN,
  UNGROUPED_GROUP_ID,
} from "./types";

const STORAGE_KEY = "customFieldLayout";

/**
 * Reconciles a stored layout against the current set of custom fields.
 * - Prunes fields that no longer exist
 * - Adds newly discovered fields to the ungrouped group
 * - Ensures the ungrouped group always exists
 */
function reconcileLayout(
  current: CustomFieldLayout,
  fields: CustomField[],
): CustomFieldLayout {
  const fieldIds = new Set(fields.map((f) => f.id));
  const assignedIds = new Set(
    current.groups.flatMap((g) => g.fields.map((f) => f.fieldId)),
  );

  // Prune fields that no longer exist from all groups
  const prunedGroups = current.groups.map((group) => ({
    ...group,
    fields: group.fields.filter((f) => fieldIds.has(f.fieldId)),
  }));

  // Find fields not yet assigned to any group
  const unassignedIds = [...fieldIds].filter((id) => !assignedIds.has(id));

  // Ensure ungrouped group exists
  let ungrouped = prunedGroups.find((g) => g.id === UNGROUPED_GROUP_ID);
  if (!ungrouped) {
    ungrouped = {
      id: UNGROUPED_GROUP_ID,
      name: "General",
      order: prunedGroups.length,
      collapsed: false,
      fields: [],
    };
    prunedGroups.push(ungrouped);
  }

  // Add unassigned fields to ungrouped
  if (unassignedIds.length > 0) {
    const maxOrder =
      ungrouped.fields.length > 0
        ? Math.max(...ungrouped.fields.map((f) => f.order))
        : -1;

    for (let i = 0; i < unassignedIds.length; i++) {
      ungrouped.fields.push({
        fieldId: unassignedIds[i]!,
        colSpan: DEFAULT_COL_SPAN,
        order: maxOrder + 1 + i,
      });
    }
  }

  return { ...current, groups: prunedGroups };
}

export function useCustomFieldLayout(
  agentCustomFields: Ref<CustomField[]> | ComputedRef<CustomField[]>,
) {
  // --- Storage layer (swappable for future server migration) ---
  const storedLayout = useStorage<CustomFieldLayout>(
    STORAGE_KEY,
    createDefaultLayout(),
    localStorage,
    { mergeDefaults: true },
  );

  // --- Edit mode ---
  const isEditMode = ref(false);

  function toggleEditMode() {
    isEditMode.value = !isEditMode.value;
  }

  // --- Reconciled layout ---
  const layout = computed<CustomFieldLayout>({
    get() {
      return reconcileLayout(storedLayout.value, agentCustomFields.value);
    },
    set(newLayout: CustomFieldLayout) {
      storedLayout.value = newLayout;
    },
  });

  // --- Sorted groups ---
  const sortedGroups = computed(() =>
    [...layout.value.groups].sort((a, b) => a.order - b.order),
  );

  // --- Resolve fields: pair placements with CustomField definitions ---
  function resolveGroupFields(
    group: CustomFieldGroupConfig,
  ): ResolvedFieldItem[] {
    const fieldMap = new Map(agentCustomFields.value.map((f) => [f.id, f]));
    return [...group.fields]
      .sort((a, b) => a.order - b.order)
      .map((placement) => ({
        placement,
        field: fieldMap.get(placement.fieldId)!,
      }))
      .filter((item) => item.field !== undefined);
  }

  // --- Helper to get group by ID ---
  function getGroupById(groupId: string): CustomFieldGroupConfig {
    return layout.value.groups.find((g) => g.id === groupId)!;
  }

  // --- Group CRUD ---
  function addGroup(name: string) {
    const maxOrder =
      layout.value.groups.length > 0
        ? Math.max(...layout.value.groups.map((g) => g.order))
        : -1;
    const newGroup: CustomFieldGroupConfig = {
      id: uid(),
      name,
      order: maxOrder + 1,
      collapsed: false,
      fields: [],
    };
    layout.value = {
      ...layout.value,
      groups: [...layout.value.groups, newGroup],
    };
  }

  function renameGroup(groupId: string, newName: string) {
    layout.value = {
      ...layout.value,
      groups: layout.value.groups.map((g) =>
        g.id === groupId ? { ...g, name: newName } : g,
      ),
    };
  }

  function removeGroup(groupId: string) {
    if (groupId === UNGROUPED_GROUP_ID) return;
    const group = layout.value.groups.find((g) => g.id === groupId);
    if (!group) return;

    const ungrouped = layout.value.groups.find(
      (g) => g.id === UNGROUPED_GROUP_ID,
    )!;
    const maxOrder =
      ungrouped.fields.length > 0
        ? Math.max(...ungrouped.fields.map((f) => f.order))
        : -1;

    // Move orphaned fields to ungrouped
    const movedFields = group.fields.map((f, i) => ({
      ...f,
      order: maxOrder + 1 + i,
    }));

    layout.value = {
      ...layout.value,
      groups: layout.value.groups
        .filter((g) => g.id !== groupId)
        .map((g) =>
          g.id === UNGROUPED_GROUP_ID
            ? { ...g, fields: [...g.fields, ...movedFields] }
            : g,
        ),
    };
  }

  function toggleGroupCollapsed(groupId: string) {
    layout.value = {
      ...layout.value,
      groups: layout.value.groups.map((g) =>
        g.id === groupId ? { ...g, collapsed: !g.collapsed } : g,
      ),
    };
  }

  // --- Field operations ---
  function setFieldColSpan(
    groupId: string,
    fieldId: number,
    colSpan: GridColSpan,
  ) {
    layout.value = {
      ...layout.value,
      groups: layout.value.groups.map((g) => {
        if (g.id !== groupId) return g;
        return {
          ...g,
          fields: g.fields.map((f) =>
            f.fieldId === fieldId ? { ...f, colSpan } : f,
          ),
        };
      }),
    };
  }

  // --- Helper to update a single field placement with exact optional properties ---
  function updateFieldPlacement(
    groupId: string,
    fieldId: number,
    patch: { displayName?: string | undefined; maskAsPassword?: boolean | undefined },
  ) {
    layout.value = {
      ...layout.value,
      groups: layout.value.groups.map((g) => {
        if (g.id !== groupId) return g;
        return {
          ...g,
          fields: g.fields.map((f) => {
            if (f.fieldId !== fieldId) return f;
            const updated: CustomFieldPlacement = {
              fieldId: f.fieldId,
              colSpan: f.colSpan,
              order: f.order,
            };
            // Preserve existing optional props, then apply patch
            const displayName = "displayName" in patch ? patch.displayName : f.displayName;
            const maskAsPassword = "maskAsPassword" in patch ? patch.maskAsPassword : f.maskAsPassword;
            if (displayName) updated.displayName = displayName;
            if (maskAsPassword) updated.maskAsPassword = maskAsPassword;
            return updated;
          }),
        };
      }),
    };
  }

  // --- Field display name ---
  function setFieldDisplayName(
    groupId: string,
    fieldId: number,
    displayName: string | undefined,
  ) {
    updateFieldPlacement(groupId, fieldId, { displayName });
  }

  // --- Field password masking ---
  function setFieldMasked(
    groupId: string,
    fieldId: number,
    maskAsPassword: boolean,
  ) {
    updateFieldPlacement(groupId, fieldId, { maskAsPassword: maskAsPassword || undefined });
  }

  // --- Drag-and-drop: group reordering ---
  function updateGroupOrder(orderedGroupIds: string[]) {
    layout.value = {
      ...layout.value,
      groups: layout.value.groups.map((g) => ({
        ...g,
        order: orderedGroupIds.indexOf(g.id),
      })),
    };
  }

  // --- Drag-and-drop: field reordering within a group ---
  function updateFieldsInGroup(groupId: string, orderedFieldIds: number[]) {
    layout.value = {
      ...layout.value,
      groups: layout.value.groups.map((g) => {
        if (g.id !== groupId) return g;
        return {
          ...g,
          fields: g.fields.map((f) => ({
            ...f,
            order: orderedFieldIds.indexOf(f.fieldId),
          })),
        };
      }),
    };
  }

  // --- Drag-and-drop: move field between groups ---
  function moveFieldToGroup(
    fieldId: number,
    fromGroupId: string,
    toGroupId: string,
    newOrder: number,
  ) {
    let movedField: CustomFieldPlacement | undefined;

    // Remove from source, add to target
    const groups = layout.value.groups.map((g) => {
      if (g.id === fromGroupId) {
        const field = g.fields.find((f) => f.fieldId === fieldId);
        movedField = field ? { ...field } : undefined;
        return { ...g, fields: g.fields.filter((f) => f.fieldId !== fieldId) };
      }
      return g;
    });

    if (!movedField) return;

    layout.value = {
      ...layout.value,
      groups: groups.map((g) => {
        if (g.id !== toGroupId) return g;
        return {
          ...g,
          fields: [...g.fields, { ...movedField!, order: newOrder }],
        };
      }),
    };
  }

  // --- Drag-and-drop: add a field to a group (cross-group drag target) ---
  function addFieldToGroup(
    groupId: string,
    fieldId: number,
    newIndex: number,
  ) {
    // Find the field placement from any group (to preserve colSpan)
    let existingPlacement: CustomFieldPlacement | undefined;
    for (const g of layout.value.groups) {
      existingPlacement = g.fields.find((f) => f.fieldId === fieldId);
      if (existingPlacement) break;
    }

    const colSpan = existingPlacement?.colSpan ?? DEFAULT_COL_SPAN;

    layout.value = {
      ...layout.value,
      groups: layout.value.groups.map((g) => {
        if (g.id !== groupId) return g;
        // Insert the field and re-index orders
        const fields = [...g.fields];
        fields.splice(newIndex, 0, { fieldId, colSpan, order: newIndex });
        return {
          ...g,
          fields: fields.map((f, i) => ({ ...f, order: i })),
        };
      }),
    };
  }

  // --- Drag-and-drop: remove a field from a group (cross-group drag source) ---
  function removeFieldFromGroup(groupId: string, fieldId: number) {
    layout.value = {
      ...layout.value,
      groups: layout.value.groups.map((g) => {
        if (g.id !== groupId) return g;
        const filtered = g.fields.filter((f) => f.fieldId !== fieldId);
        return {
          ...g,
          fields: filtered.map((f, i) => ({ ...f, order: i })),
        };
      }),
    };
  }

  // --- Sort fields within a group ---
  function sortFieldsInGroup(groupId: string, sortBy: FieldSortBy) {
    const fieldMap = new Map(agentCustomFields.value.map((f) => [f.id, f]));

    layout.value = {
      ...layout.value,
      groups: layout.value.groups.map((g) => {
        if (g.id !== groupId) return g;
        const sorted = [...g.fields].sort((a, b) => {
          const fa = fieldMap.get(a.fieldId);
          const fb = fieldMap.get(b.fieldId);
          if (!fa || !fb) return 0;

          switch (sortBy) {
            case "name-asc":
              return fa.name.localeCompare(fb.name);
            case "name-desc":
              return fb.name.localeCompare(fa.name);
            case "type":
              return fa.type.localeCompare(fb.type) || fa.name.localeCompare(fb.name);
          }
        });
        return {
          ...g,
          fields: sorted.map((f, i) => ({ ...f, order: i })),
        };
      }),
    };
  }

  // --- Reset ---
  function resetLayout() {
    storedLayout.value = createDefaultLayout();
  }

  return {
    layout,
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
    moveFieldToGroup,
    addFieldToGroup,
    removeFieldFromGroup,
    sortFieldsInGroup,
    resetLayout,
  };
}
