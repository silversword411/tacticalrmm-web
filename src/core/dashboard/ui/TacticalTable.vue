<template>
  <q-table
    ref="tacticalTable"
    :rows="rows"
    :columns="localColumns"
    :visible-columns="visibleColumns"
    :selected="selected"
    :table-class="{
      'table-bgcolor': !$q.dark.isActive,
      'table-bgcolor-dark': $q.dark.isActive,
      'column-bgcolor-dark': $q.dark.isActive && columnSelect,
      'column-bgcolor': !$q.dark.isActive && columnSelect,
      'sticky-header-right-column': columnSelect,
      'tbl-sticky': !columnSelect,
      'col-lines': activeColumnLines && !$q.dark.isActive,
      'col-lines-dark': activeColumnLines && $q.dark.isActive,
      'col-shading': activeColumnShading && !$q.dark.isActive,
      'col-shading-dark': activeColumnShading && $q.dark.isActive,
    }"
    v-bind="$attrs"
    @update:selected="$emit('update:selected', $event)"
  >
    <template v-for="(_, slotName) in $slots" #[slotName]="slotProps">
      <slot :name="slotName" v-bind="slotProps ?? {}" />
    </template>

    <template #header-cell-columnSelect>
      <q-th auto-width>
        <q-btn dense flat icon="more_horiz">
          <q-menu
            anchor="center left"
            self="center right"
            :max-height="columnMenuMaxHeight"
          >
            <div class="row items-center q-px-sm q-pt-xs q-pb-none">
              <span class="text-caption text-grey col">Drag to reorder</span>
              <q-btn flat dense size="xs" label="Reset" @click="resetColumns" />
            </div>
            <draggable
              v-model="draggableItems"
              class="q-list q-list--dense"
              handle=".col-drag-handle"
              ghost-class="tactical-table-col-ghost"
              item-key="value"
              @start="isDragging = true"
              @end="onColumnReorder"
            >
              <template #item="{ element }">
                <q-item dense class="tactical-table-col-menu-item">
                  <q-item-section avatar class="col-drag-handle" style="min-width: 28px; cursor: move;">
                    <q-icon name="drag_handle" size="sm" color="grey" />
                  </q-item-section>
                  <q-item-section>
                    <q-checkbox
                      :model-value="visibleColumns.includes(element.value)"
                      :label="element.label"
                      dense
                      @update:model-value="(checked: boolean) => toggleColumnVisibility(element.value, checked)"
                    />
                  </q-item-section>
                </q-item>
              </template>
            </draggable>
            <q-separator />
            <div class="q-px-sm q-py-xs">
              <q-checkbox v-model="activeColumnLines" label="Column lines" dense size="sm" />
            </div>
            <div class="q-px-sm q-pb-xs">
              <q-checkbox v-model="activeColumnShading" label="Column shading" dense size="sm" />
            </div>
          </q-menu>
        </q-btn>
      </q-th>
    </template>
  </q-table>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { type TableExportFunction, tableExportKey, type TacticalColumn } from "../types";
export default defineComponent({
  inheritAttrs: false,
});
</script>

<script setup lang="ts">
import { ref, computed, watch, useTemplateRef, provide } from "vue";
import { useStorage } from "@vueuse/core";
import draggable from "vuedraggable";
import { useQuasar } from "quasar";
import type { QTable, QTableProps } from "quasar";
import { exportToCsv } from "src/utils/csv";

const $q = useQuasar();

const props = withDefaults(
  defineProps<{
    rows: QTableProps["rows"];
    columns: TacticalColumn[];
    columnSelect?: boolean;
    storageKey?: string;
    selected?: unknown[];
    columnLines?: boolean;
    columnShading?: boolean;
  }>(),
  { columnSelect: false, storageKey: "", selected: () => [], columnLines: false, columnShading: false },
);

defineEmits<{
  'update:selected': [value: readonly unknown[]];
}>();

const columnSelectCol: TacticalColumn = {
  name: "columnSelect",
  label: "Column Select",
  field: "columnSelect",
  required: true,
  sortable: false,
};

const allColumns = computed(() =>
  props.columnSelect ? [...props.columns, columnSelectCol] : [...props.columns],
);

// required columns pinned to start (e.g. row selection checkbox)
const requiredFirst = computed(() => allColumns.value.filter((c) => c.required && c.name !== "columnSelect"));
// columnSelect column always pinned to end
const requiredLast = computed(() => allColumns.value.filter((c) => c.required && c.name === "columnSelect"));
// all other columns are reorderable
const reorderableColumns = computed(() => allColumns.value.filter((c) => !c.required));

const storedNames = props.storageKey
  ? useStorage<string[]>(`${props.storageKey}-columns`, [])
  : ref<string[]>([]);

const storedOrder = props.storageKey
  ? useStorage<string[]>(`${props.storageKey}-column-order`, [])
  : ref<string[]>([]);

const activeColumnLines = props.storageKey
  ? useStorage<boolean>(`${props.storageKey}-col-lines`, props.columnLines)
  : ref<boolean>(props.columnLines);

const activeColumnShading = props.storageKey
  ? useStorage<boolean>(`${props.storageKey}-col-shading`, props.columnShading)
  : ref<boolean>(props.columnShading);

const orderedReorderableColumns = computed(() => {
  const order = storedOrder.value;
  const cols = reorderableColumns.value;
  const validOrder = order.filter((name) => cols.some((c) => c.name === name));
  // append any new columns not yet in storedOrder
  const newCols = cols.filter((c) => !validOrder.includes(c.name)).map((c) => c.name);
  const finalOrder = [...validOrder, ...newCols];
  return finalOrder.map((name) => cols.find((c) => c.name === name)!);
});

const localColumns = computed(() => [
  ...requiredFirst.value,
  ...orderedReorderableColumns.value,
  ...requiredLast.value,
]);

const defaultNames = computed(() =>
  localColumns.value.filter((c) => !c.hiddenByDefault).map((c) => c.name),
);

const visibleColumns = computed<string[]>({
  get() {
    const valid = storedNames.value.filter((n) => localColumns.value.some((c) => c.name === n));
    return valid.length ? valid : defaultNames.value;
  },
  set(v) {
    storedNames.value = v;
  },
});

// draggable column menu state
interface ColumnMenuItem { label: string; value: string; }

const draggableItems = ref<ColumnMenuItem[]>([]);
const isDragging = ref(false);

watch(
  () => orderedReorderableColumns.value.map((c) => c.name).join(","),
  () => {
    if (!isDragging.value) {
      draggableItems.value = orderedReorderableColumns.value.map((c) => ({ label: c.label, value: c.name }));
    }
  },
  { immediate: true },
);

function onColumnReorder() {
  isDragging.value = false;
  storedOrder.value = draggableItems.value.map((i) => i.value);
}

function toggleColumnVisibility(name: string, checked: boolean) {
  // If storedNames is empty we're in the default fallback state — seed it first
  const base = storedNames.value.length ? storedNames.value : [...defaultNames.value];
  if (checked) {
    storedNames.value = [...new Set([...base, name])];
  } else {
    storedNames.value = base.filter((n) => n !== name);
  }
}

function resetColumns() {
  storedOrder.value = [];
  storedNames.value = [];
  activeColumnLines.value = props.columnLines;
  activeColumnShading.value = props.columnShading;
}

const tacticalTable = useTemplateRef<QTable>("tacticalTable");

const columnMenuMaxHeight = computed(() => `${Math.max(240, $q.screen.height - 8)}px`);

function handleExportCsv() {
  if (!tacticalTable.value) {
    console.error("Table reference is not available.");
    return;
  }

  const visibleCols = localColumns.value.filter(
    (col) => visibleColumns.value.includes(col.name) && col.name !== "columnSelect",
  );

  const rowsToExport = tacticalTable.value.filteredSortedRows;

  exportToCsv(visibleCols, rowsToExport, "table-export");
}

// expose handleExportCsv on the tactical table instance and to child components
provide<TableExportFunction>(tableExportKey, handleExportCsv);
defineExpose({
  exportTable: handleExportCsv,
});
</script>

<style lang="sass">

.tactical-table-col-ghost
  opacity: 0.5
  background: $primary
  color: white

.tactical-table-col-menu-item
  padding-left: 4px
  padding-right: 8px

.column-bgcolor-dark
  td:last-child
    /* bg color is important for td; just specify one */
    background-color: #1d1d1d

.column-bgcolor
  td:last-child
    /* bg color is important for td; just specify one */
    background-color: #ffffff

.sticky-header-right-column
  tr th
    position: sticky
    /* higher than z-index for td below */
    z-index: 2
  /* this will be the loading indicator */
  thead tr:last-child th
    /* height of all previous header rows */
    top: 48px
    /* highest z-index */
    z-index: 3
  thead tr:first-child th
    top: 0
    z-index: 1
  tr:last-child th:last-child
    /* highest z-index */
    z-index: 3
  th:last-child
    position: sticky
    right: 0
  /* prevent scrolling behind sticky top row on focus */
  tbody
    /* height of all previous header rows */
    scroll-margin-top: 48px

.col-lines
  td, th
    border-right: 1px solid rgba(0, 0, 0, 0.12)
  td:last-child, th:last-child
    border-right: none

.col-lines-dark
  td, th
    border-right: 1px solid rgba(255, 255, 255, 0.14)
  td:last-child, th:last-child
    border-right: none

.col-shading
  td:nth-child(even), th:nth-child(even)
    background-color: rgba(0, 0, 0, 0.04)

.col-shading-dark
  td:nth-child(even), th:nth-child(even)
    background-color: rgba(255, 255, 255, 0.05)
</style>
