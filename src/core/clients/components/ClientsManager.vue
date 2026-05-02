<template>
  <q-dialog ref="dialogRef" no-backdrop-dismiss @hide="onDialogHide">
    <q-card class="q-dialog-plugin" style="min-width: 70vw; max-width: 70vw">
      <q-bar>
        <q-btn
          class="q-mr-sm"
          dense
          flat
          push
          icon="refresh"
          @click="getClients({ force: true })"
        />Clients Manager
        <q-space />
        <q-btn v-close-popup dense flat icon="close" />
      </q-bar>
      <tactical-table
        ref="tableRef"
        :rows="clients"
        :columns="columns"
        style="max-height: 70vh"
        :pagination="{ rowsPerPage: 0, sortBy: 'name', descending: false }"
        dense
        row-key="id"
        binary-state-sort
        :rows-per-page-options="[0]"
        no-data-label="No Clients"
        :loading="isLoading"
        :filter="debouncedSearch"
        :filter-method="filterClients"
        column-select
        column-shading
        storage-key="clients-manager"
      >
        <!-- top slot -->
        <template #top>
          <q-btn label="New" dense flat push no-caps icon="add" @click="showAddClient" />
          <q-space />
          <q-btn
            dense
            flat
            push
            no-caps
            :icon="expanded.size > 0 ? 'unfold_less' : 'unfold_more'"
            :label="expanded.size > 0 ? 'Collapse All' : 'Expand All'"
            :title="expanded.size > 0 ? 'Collapse all clients' : 'Expand all clients'"
            class="q-mr-sm"
            @click="expanded.size > 0 ? collapseAll() : expandAll()"
          />
          <q-input
            v-model="search"
            filled
            label="Search"
            dense
            clearable
            class="q-pr-sm"
            style="width: 300px"
          >
            <template #prepend>
              <q-icon name="search" />
            </template>
          </q-input>

          <tactical-table-export />
        </template>

        <!-- loading slot -->
        <template #loading>
          <q-inner-loading showing color="primary" />
        </template>

        <!-- body slots -->
        <template #body="bodyProps">
          <q-tr
            :class="{
              'cursor-pointer': true,
              'clients-manager-drop-target':
                draggingSiteId !== null && bodyProps.row.id !== draggingSourceClientId,
            }"
            @dblclick="showEditClient(bodyProps.row)"
            @dragover="onClientDragOver"
            @drop="onClientDrop(bodyProps.row)"
          >
            <!-- context menu -->
            <q-menu context-menu>
              <q-list dense style="min-width: 200px">
                <q-item v-close-popup clickable @click="showEditClient(bodyProps.row)">
                  <q-item-section side>
                    <q-icon name="edit" />
                  </q-item-section>
                  <q-item-section>Edit</q-item-section>
                </q-item>
                <q-item v-close-popup clickable @click="showClientDeleteModal(bodyProps.row)">
                  <q-item-section side>
                    <q-icon name="delete" />
                  </q-item-section>
                  <q-item-section>Delete</q-item-section>
                </q-item>

                <q-separator></q-separator>

                <q-item v-close-popup clickable @click="showAddSite(bodyProps.row)">
                  <q-item-section side>
                    <q-icon name="add" />
                  </q-item-section>
                  <q-item-section>Add Site</q-item-section>
                </q-item>

                <q-separator></q-separator>

                <q-item v-close-popup clickable>
                  <q-item-section>Close</q-item-section>
                </q-item>
              </q-list>
            </q-menu>

            <q-td v-for="col in bodyProps.cols" :key="col.name" :props="bodyProps">
              <template v-if="col.name === 'expand'">
                <q-btn
                  dense
                  flat
                  round
                  size="sm"
                  :icon="isExpanded(bodyProps.row.id) ? 'expand_more' : 'chevron_right'"
                  @click.stop="toggleExpanded(bodyProps.row.id)"
                />
              </template>
              <template v-else-if="col.name === 'site_count'">
                {{ bodyProps.row.sites?.length ?? 0 }}
              </template>
              <template v-else-if="col.name === 'block_policy_inheritance'">
                <q-icon
                  v-if="bodyProps.row.block_policy_inheritance"
                  name="check"
                  color="positive"
                />
              </template>
              <template v-else-if="col.name === 'maintenance_mode'">
                <q-icon
                  v-if="bodyProps.row.maintenance_mode"
                  name="build"
                  color="warning"
                />
              </template>
              <template v-else>
                {{ col.value }}
              </template>
            </q-td>
          </q-tr>

          <!-- expanded sub-row with sites table -->
          <q-tr v-if="isExpanded(bodyProps.row.id)" :props="bodyProps" no-hover>
            <q-td :colspan="bodyProps.cols.length + 1" class="q-pa-md sites-subtable-cell">
              <SitesSubTable
                :client="bodyProps.row"
                :scroll-el="scrollEl"
                :collapse-all="collapseAll"
              />
            </q-td>
          </q-tr>
        </template>

        <!-- footer totals row -->
        <template #bottom-row="bottomProps">
          <q-tr class="text-weight-medium">
            <q-td v-for="col in bottomProps.cols" :key="col.name" :class="`text-${col.align}`">
              <template v-if="col.name === 'name'">
                Totals ({{ filteredClients.length }}
                {{ filteredClients.length === 1 ? "client" : "clients" }})
              </template>
              <template v-else-if="col.name === 'site_count'">
                {{ totalSites }}
              </template>
              <template v-else-if="col.name === 'agent_count'">
                {{ totalAgents }} {{ totalAgents === 1 ? "agent" : "agents" }}
              </template>
            </q-td>
          </q-tr>
        </template>
      </tactical-table>
    </q-card>
  </q-dialog>
</template>

<script lang="ts" setup>
// composition imports
import { computed, onMounted, ref, watch } from "vue";
import { refDebounced } from "@vueuse/core";
import { useQuasar, useDialogPluginComponent } from "quasar";
import { useClientStore, useCustomFieldStore } from "src/stores/api";
import { useSiteDrag } from "../composables";

// ref to the tactical-table component; derive the scrollable inner element for auto-scroll.
const tableRef = ref<{ $el: HTMLElement } | null>(null);
const scrollEl = computed<HTMLElement | null>(
  () => tableRef.value?.$el.querySelector(".q-table__middle") ?? null,
);

const { clients, isLoading, getClients } = useClientStore();
const { clientCustomFields, getCustomFields } = useCustomFieldStore();

// ui imports
import ClientsForm from "./ClientsForm.vue";
import SitesForm from "./SitesForm.vue";
import DeleteClient from "./DeleteClient.vue";
import SitesSubTable from "./SitesSubTable.vue";
import type { Client } from "../types";
import type { TacticalColumn } from "src/core/dashboard/types";

// expand/collapse tracking
const expanded = ref<Set<number>>(new Set());
function isExpanded(id: number) {
  return expanded.value.has(id);
}
function toggleExpanded(id: number) {
  const next = new Set(expanded.value);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  expanded.value = next;
}
function collapseAll(): () => void {
  const snapshot = new Set(expanded.value);
  expanded.value = new Set();
  return () => { expanded.value = new Set(snapshot); };
}
function expandAll() {
  expanded.value = new Set(clients.value.map((c) => c.id));
}

// drag-drop target wiring
const { draggingSiteId, onClientDragOver, onClientDrop } = useSiteDrag();
const draggingSourceClientId = computed(() => {
  if (draggingSiteId.value === null) return null;
  return (
    clients.value.find((c) => c.sites?.some((s) => s.id === draggingSiteId.value))?.id ?? null
  );
});

// columns
const columns = computed<TacticalColumn[]>(() => {
  const base: TacticalColumn[] = [
    {
      name: "expand",
      label: "",
      field: "expand",
      align: "left",
      sortable: false,
      required: true,
      classes: "col-expand",
    },
    { name: "name", label: "Name", field: "name", align: "left", sortable: true },
    {
      name: "site_count",
      label: "Sites",
      field: (row: Client) => row.sites?.length ?? 0,
      align: "left",
      sortable: true,
    },
    {
      name: "agent_count",
      label: "Total Agents",
      field: "agent_count",
      align: "left",
      sortable: true,
    },
    {
      name: "block_policy_inheritance",
      label: "Block Policy Inheritance",
      field: "block_policy_inheritance",
      align: "left",
      sortable: true,
    },
    {
      name: "maintenance_mode",
      label: "Maintenance Mode",
      field: "maintenance_mode",
      align: "left",
      sortable: true,
    },
  ];

  const cfCols: TacticalColumn[] = clientCustomFields.value.map((cf) => ({
    name: `cf_${cf.id}`,
    label: cf.name,
    field: (row: Client) => {
      const value = row.custom_fields?.find((v) => v.field === cf.id)?.value;
      if (value === undefined || value === null) return "";
      if (Array.isArray(value)) return value.join(", ");
      if (typeof value === "boolean") return value ? "Yes" : "No";
      return String(value);
    },
    align: "left",
    sortable: true,
    hiddenByDefault: true,
  }));

  return [...base, ...cfCols];
});

// totals (reflect active search filter)
const filteredClients = computed(() => filterClients(clients.value, debouncedSearch.value));
const totalSites = computed(() =>
  filteredClients.value.reduce((n, c) => n + (c.sites?.length ?? 0), 0),
);
const totalAgents = computed(() =>
  filteredClients.value.reduce((n, c) => n + (c.agent_count ?? 0), 0),
);

defineEmits(useDialogPluginComponent.emits);

// setup quasar dialog
const $q = useQuasar();
const { dialogRef, onDialogHide } = useDialogPluginComponent();

const search = ref("");
const debouncedSearch = refDebounced(search, 300);

function filterClients(rows: readonly Client[], terms: string | null): Client[] {
  const needle = String(terms ?? "").trim().toLowerCase();
  if (!needle) return rows as Client[];

  return (rows as Client[]).filter((client) => {
    const clientMatch = client.name.toLowerCase().includes(needle);
    const siteMatch = client.sites?.some((s) => s.name.toLowerCase().includes(needle)) ?? false;
    return clientMatch || siteMatch;
  });
}

watch(debouncedSearch, (terms: string) => {
  const needle = String(terms ?? "").trim().toLowerCase();
  if (!needle) return;

  const toExpand = clients.value.filter(
    (client) =>
      !client.name.toLowerCase().includes(needle) &&
      (client.sites?.some((s) => s.name.toLowerCase().includes(needle)) ?? false),
  );

  if (toExpand.length === 0) return;

  const next = new Set(expanded.value);
  let changed = false;
  for (const client of toExpand) {
    if (!next.has(client.id)) {
      next.add(client.id);
      changed = true;
    }
  }
  if (changed) expanded.value = next;
});

function showClientDeleteModal(client: Client) {
  $q.dialog({
    component: DeleteClient,
    componentProps: {
      object: client,
      type: "client",
    },
  });
}

function showEditClient(client: Client) {
  $q.dialog({
    component: ClientsForm,
    componentProps: {
      client: client,
    },
  });
}

function showAddClient() {
  $q.dialog({
    component: ClientsForm,
  });
}

function showAddSite(client: Client) {
  $q.dialog({
    component: SitesForm,
    componentProps: {
      client: client.id,
    },
  });
}

onMounted(() => {
  getClients({ force: true });
  getCustomFields();
});
</script>

<style lang="sass" scoped>
.clients-manager-drop-target > td
  background-color: rgba(25, 118, 210, 0.15)
  outline: 2px dashed #1976d2
  outline-offset: -2px

.sites-subtable-cell
  border-left: 4px solid #1976d2
  padding-left: 32px !important
  :deep(.q-table tbody tr:hover > td)
    background-color: #d3dbe6
  :deep(.q-table__top)
    padding-top: 4px
    padding-bottom: 4px

body.body--dark .sites-subtable-cell
  border-left-color: #1976d2
  :deep(.q-table tbody tr:hover > td)
    background-color: #404958
</style>
