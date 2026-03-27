<template>
  <div v-if="selectedAgentIds.length === 0" class="q-pa-sm">No agent selected</div>
  <div v-else-if="selectedAgentIds.length > 1"></div>
  <div v-else-if="selectedAgentPlatform !== 'windows'" class="q-pa-sm">
    Only supported for Windows agents at this time
  </div>
  <div v-else>
    <tactical-table
      v-model:pagination="pagination"
      dense
      :rows="agentSoftware"
      :columns="columns"
      :filter="filter"
      :style="{ 'max-height': `${tabHeight}px` }"
      binary-state-sort
      row-key="id"
      virtual-scroll
      :rows-per-page-options="[0]"
      :loading="isLoading"
      column-select
      storage-key="agent-software-tab"
    >
      <template #loading>
        <q-inner-loading showing color="primary" />
      </template>

      <template #top>
        <q-btn
          class="q-mr-sm"
          dense
          flat
          push
          icon="refresh"
          @click="selectedAgentId && getAgentSoftware(selectedAgentId, { force: true })"
        />
        <q-btn
          icon="add"
          label="Install Software"
          no-caps
          dense
          flat
          push
          @click="showInstallSoftwareModal"
        />

        <q-space />

        <q-input v-model="filter" filled label="Search" dense clearable class="q-pr-sm" style="width: 300px">
          <template #prepend>
            <q-icon name="search" color="primary" />
          </template>
        </q-input>
        <tactical-table-export />
      </template>

      <template #body-cell-uninstall="props">
        <q-td :props="props">
          <q-btn
            v-if="props.row.uninstall"
            label="Uninstall"
            color="primary"
            dense
            size="sm"
            @click="openUninstallSoftware(props.row)"
          />
        </q-td>
      </template>
    </tactical-table>
  </div>
</template>

<script lang="ts" setup>
// composition imports
import { ref, watch, onMounted } from "vue";
import { useQuasar } from "quasar";
import { useAgentSoftwareStore, useAgentStore, useDashboardStore } from "src/stores/api";

const { selectedAgentPlatform, selectedAgentId, selectedAgentIds } = useAgentStore();
const { agentSoftware, isLoading, getAgentSoftware } = useAgentSoftwareStore();
const { tabHeight } = useDashboardStore();

// ui imports
import InstallSoftware from "src/core/agents/components/InstallSoftware.vue";
import UninstallSoftware from "src/core/agents/components/UninstallSoftware.vue";

// type imports
import type { TacticalColumn } from "src/core/dashboard/types";
import type { Software } from "src/core/agents/types";

// static data
const columns: TacticalColumn[] = [
  {
    name: "name",
    align: "left",
    label: "Name",
    field: "name",
    sortable: true,
  },
  {
    name: "publisher",
    align: "left",
    label: "Publisher",
    field: "publisher",
    sortable: true,
  },
  {
    name: "install_date",
    align: "left",
    label: "Installed On",
    field: "install_date",
    sortable: true,
    format: (val) => {
      return val === "01/01/1" || val === "01-1-01" ? "" : val;
    },
    sort: (a: string, b: string) => {
      const invalidDates = ["01/01/1", "01-1-01", ""];
      const aInvalid = invalidDates.includes(a) || !a;
      const bInvalid = invalidDates.includes(b) || !b;
      if (aInvalid && bInvalid) return 0;
      if (aInvalid) return -1;
      if (bInvalid) return 1;
      return new Date(a).getTime() - new Date(b).getTime();
    },
  },
  {
    name: "size",
    align: "left",
    label: "Size",
    field: "size",
    sortable: true,
    sort: (a: string, b: string) => {
      const parseSize = (val: string): number => {
        if (!val) return 0;
        const num = parseFloat(val);
        if (isNaN(num)) return 0;
        const upper = val.toUpperCase();
        if (upper.includes("GB")) return num * 1024;
        if (upper.includes("KB")) return num / 1024;
        return num;
      };
      return parseSize(a) - parseSize(b);
    },
  },
  {
    name: "version",
    align: "left",
    label: "Version",
    field: "version",
    sortable: true,
    sort: (a: string, b: string) => {
      if (!a && !b) return 0;
      if (!a) return -1;
      if (!b) return 1;
      const aParts = a.split(".").map((p) => parseInt(p) || 0);
      const bParts = b.split(".").map((p) => parseInt(p) || 0);
      const len = Math.max(aParts.length, bParts.length);
      for (let i = 0; i < len; i++) {
        const diff = (aParts[i] || 0) - (bParts[i] || 0);
        if (diff !== 0) return diff;
      }
      return 0;
    },
  },
  {
    name: "uninstall",
    align: "left",
    label: "Uninstall",
    field: "uninstall",
    sortable: false,
  },
];

// setup quasar
const $q = useQuasar();

// software tab logic
const filter = ref("");
const pagination = ref({
  rowsPerPage: 0,
  sortBy: "name",
  descending: false,
});

function showInstallSoftwareModal() {
  $q.dialog({
    component: InstallSoftware,
    componentProps: {
      agentId: selectedAgentId.value,
    },
  });
}

function openUninstallSoftware(software: Software) {
  if (!selectedAgentId.value) return;

  // Auto-append silent flags for MSI-based uninstalls
  const uninstallString =
    software.uninstall +
    (software.uninstall.toLowerCase().includes("msiexec") ? " /qn /norestart" : "");

  $q.dialog({
    component: UninstallSoftware,
    componentProps: {
      agentId: selectedAgentId.value,
      softwareName: software.name,
      initialUninstallString: uninstallString,
    },
  });
}

watch(selectedAgentId, (newValue) => {
  if (newValue) {
    getAgentSoftware(newValue);
  }
});

onMounted(() => {
  if (selectedAgentId.value) getAgentSoftware(selectedAgentId.value);
});
</script>
