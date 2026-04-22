<template>
  <tactical-table
    dense
    flat
    :rows="sites"
    :columns="columns"
    :pagination="{ rowsPerPage: 0, sortBy: 'name', descending: false }"
    row-key="id"
    binary-state-sort
    :rows-per-page-options="[0]"
    no-data-label="No Sites"
    hide-bottom
    column-select
    storage-key="clients-manager-sites"
  >
    <!-- body slot -->
    <template #body="bodyProps">
      <q-tr class="cursor-pointer" @dblclick="showEditSite(bodyProps.row)">
        <!-- context menu -->
        <q-menu context-menu>
          <q-list dense style="min-width: 200px">
            <q-item v-close-popup clickable @click="showEditSite(bodyProps.row)">
              <q-item-section side>
                <q-icon name="edit" />
              </q-item-section>
              <q-item-section>Edit</q-item-section>
            </q-item>
            <q-item v-close-popup clickable @click="showSiteDeleteModal(bodyProps.row)">
              <q-item-section side>
                <q-icon name="delete" />
              </q-item-section>
              <q-item-section>Delete</q-item-section>
            </q-item>

            <q-separator></q-separator>

            <q-item v-close-popup clickable>
              <q-item-section>Close</q-item-section>
            </q-item>
          </q-list>
        </q-menu>

        <q-td v-for="col in bodyProps.cols" :key="col.name" :props="bodyProps">
          <template v-if="col.name === 'name'">
            <span
              draggable="true"
              class="site-drag-handle"
              :title="`Drag to move ${bodyProps.row.name} to another client`"
              @dragstart="onSiteDragStart(bodyProps.row.id, $event)"
              @dragend="onSiteDragEnd"
            >
              <q-icon name="drag_indicator" size="xs" class="q-mr-xs text-grey" />
              {{ bodyProps.row.name }}
            </span>
          </template>
          <template v-else-if="col.name === 'block_policy_inheritance'">
            <q-icon
              v-if="bodyProps.row.block_policy_inheritance"
              name="check"
              color="positive"
            />
          </template>
          <template v-else-if="col.name === 'maintenance_mode'">
            <q-icon v-if="bodyProps.row.maintenance_mode" name="build" color="warning" />
          </template>
          <template v-else>
            {{ col.value }}
          </template>
        </q-td>
      </q-tr>
    </template>

    <!-- footer totals row -->
    <template #bottom-row="bottomProps">
      <q-tr class="text-weight-medium">
        <q-td v-for="col in bottomProps.cols" :key="col.name" :class="`text-${col.align}`">
          <template v-if="col.name === 'name'">
            Totals ({{ sites.length }}
            {{ sites.length === 1 ? "site" : "sites" }})
          </template>
          <template v-else-if="col.name === 'agent_count'">
            {{ totalAgents }} {{ totalAgents === 1 ? "agent" : "agents" }}
          </template>
        </q-td>
      </q-tr>
    </template>
  </tactical-table>
</template>

<script lang="ts" setup>
// composition imports
import { computed, onMounted } from "vue";
import { useQuasar } from "quasar";
import { useCustomFieldStore } from "src/stores/api";
import { useSiteStore } from "src/stores/api";

const { siteCustomFields, getCustomFields } = useCustomFieldStore();
const { removeSite } = useSiteStore();

// ui imports
import SitesForm from "./SitesForm.vue";
import DeleteClient from "./DeleteClient.vue";

// type imports
import type { Client, Site } from "../types";
import type { TacticalColumn } from "src/core/dashboard/types";
import { useSiteDrag } from "../composables";

const props = defineProps<{
  client: Client;
}>();

// drag source wiring
const { onSiteDragStart, onSiteDragEnd } = useSiteDrag();

const sites = computed(() => props.client.sites ?? []);

const totalAgents = computed(() =>
  sites.value.reduce((n, s) => n + (s.agent_count ?? 0), 0),
);

const columns = computed<TacticalColumn[]>(() => {
  const base: TacticalColumn[] = [
    { name: "name", label: "Name", field: "name", align: "left", sortable: true },
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
      hiddenByDefault: true,
    },
    {
      name: "maintenance_mode",
      label: "Maintenance Mode",
      field: "maintenance_mode",
      align: "left",
      sortable: true,
      hiddenByDefault: true,
    },
  ];

  const cfCols: TacticalColumn[] = siteCustomFields.value.map((cf) => ({
    name: `cf_${cf.id}`,
    label: cf.name,
    field: (row: Site) => {
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

// setup quasar dialog
const $q = useQuasar();

function showSiteDeleteModal(site: Site) {
  if (site.agent_count && site.agent_count > 0) {
    $q.dialog({
      component: DeleteClient,
      componentProps: {
        object: site,
        type: "site",
      },
    });
  } else {
    $q.dialog({
      title: "Are you sure?",
      message: `Delete site: ${site.name}.`,
      cancel: true,
      ok: { label: "Delete", color: "negative" },
    }).onOk(() => void removeSite(site.id));
  }
}

function showEditSite(site: Site) {
  $q.dialog({
    component: SitesForm,
    componentProps: {
      site: site,
    },
  });
}

onMounted(() => {
  getCustomFields();
});
</script>

<style lang="sass" scoped>
.site-drag-handle
  cursor: grab
  user-select: none
  &:active
    cursor: grabbing
</style>
