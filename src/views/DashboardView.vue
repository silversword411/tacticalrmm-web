<template>
  <q-page>
    <FileBar />
    <q-splitter
      ref="vSplitter"
      :model-value="dashboardSettings.clientTreeSplitter"
      :style="{ height: `${$q.screen.height - 50 - 32}px` }"
      @update:model-value="(val: number) => setClientTreeSplitter(Math.floor(val))"
    >
      <template #separator>
        <div class="vsplitter-dblclick-target" @dblclick.prevent.stop="autoFitClientTree" />
      </template>

      <template #before>
        <div v-if="!clientTree" class="q-pa-sm q-gutter-sm text-center" style="height: 30vh">
          <q-spinner size="40px" color="primary" />
        </div>
        <div
          v-else
          ref="treeContainer"
          class="q-pa-sm q-gutter-sm scroll"
          style="height: 85vh; overflow: initial"
        >
          <q-list dense class="rounded-borders">
            <q-item
              v-ripple
              clickable
              :active="selectedClientSiteNode === null"
              @click="selectedClientSiteNode = null"
            >
              <q-item-section avatar>
                <q-icon name="fas fa-home" />
              </q-item-section>
              <q-item-section>
                <span class="client-tree-row-content">All Clients</span>
              </q-item-section>
            </q-item>
            <q-tree
              ref="tree"
              v-model:selected="selectedClientSiteNode"
              :nodes="clientTree"
              node-key="raw"
              no-nodes-label="No Clients"
              selected-color="primary"
              no-selection-unset
            >
              <template #default-header="props">
                <div
                  class="row items-center no-wrap"
                  :class="{
                    'drag-drop-target': !props.node.children && dropTargetNode === props.node.raw,
                    'drag-expand-target':
                      props.node.children && expandTargetNode === props.node.raw,
                  }"
                  @dragenter.prevent="onTreeNodeDragEnter($event, props.node)"
                  @dragover.prevent="onTreeNodeDragOver($event, props.node)"
                  @dragleave="onTreeNodeDragLeave(props.node)"
                  @drop.prevent="onTreeNodeDrop($event, props.node)"
                  @dblclick.prevent.stop="showEditModal(props.node)"
                >
                  <q-icon :name="props.node.icon" :color="props.node.color" class="q-mr-sm" />
                  <div class="client-tree-row-content">
                    {{ props.node.label }}
                    <q-tooltip :delay="600">
                      ID: {{ props.node.id }}<br />
                      Agent Count:
                      {{
                        props.node.children
                          ? props.node.client.agent_count
                          : props.node.site.agent_count
                      }}
                    </q-tooltip>
                  </div>

                  <q-menu context-menu>
                    <q-list dense style="min-width: 200px">
                      <q-item v-close-popup clickable @click="showEditModal(props.node)">
                        <q-item-section side>
                          <q-icon name="edit" />
                        </q-item-section>
                        <q-item-section>Edit</q-item-section>
                      </q-item>
                      <q-item v-close-popup clickable @click="showDeleteModal(props.node)">
                        <q-item-section side>
                          <q-icon name="delete" />
                        </q-item-section>
                        <q-item-section>Delete</q-item-section>
                      </q-item>

                      <q-separator></q-separator>

                      <q-item
                        v-if="props.node.children"
                        v-close-popup
                        clickable
                        @click="showAddSiteModal(props.node)"
                      >
                        <q-item-section side>
                          <q-icon name="add" />
                        </q-item-section>
                        <q-item-section>Add Site</q-item-section>
                      </q-item>

                      <q-item v-close-popup clickable @click="showToggleMaintenance(props.node)">
                        <q-item-section side>
                          <q-icon name="construction" />
                        </q-item-section>
                        <q-item-section>{{
                          props.node.color === "green"
                            ? "Disable Maintenance Mode"
                            : "Enable Maintenance Mode"
                        }}</q-item-section>
                      </q-item>

                      <q-item
                        v-if="props.node.children === undefined"
                        v-close-popup
                        clickable
                        @click="showInstallAgent(props.node)"
                      >
                        <q-item-section side>
                          <q-icon name="cloud_download" />
                        </q-item-section>
                        <q-item-section>Install Agent</q-item-section>
                      </q-item>

                      <q-item v-close-popup clickable @click="showPolicyAdd(props.node)">
                        <q-item-section side>
                          <q-icon name="policy" />
                        </q-item-section>
                        <q-item-section>Assign Automation Policy</q-item-section>
                      </q-item>

                      <q-item v-close-popup clickable @click="showAlertTemplateAdd(props.node)">
                        <q-item-section side>
                          <q-icon name="error" />
                        </q-item-section>
                        <q-item-section>Assign Alert Template</q-item-section>
                      </q-item>

                      <q-item v-ripple clickable>
                        <q-item-section side>
                          <q-icon name="open_in_new" />
                        </q-item-section>
                        <q-item-section>Run URL Action</q-item-section>
                        <q-item-section side>
                          <q-icon name="keyboard_arrow_right" />
                        </q-item-section>
                        <q-menu auto-close anchor="top end" self="top start">
                          <q-list>
                            <q-item
                              v-for="action in urlActions"
                              :key="action.id"
                              v-close-popup
                              dense
                              clickable
                              @click="
                                runURLAction(
                                  action.id,
                                  props.node.children ? 'client' : 'site',
                                  props.node.id,
                                )
                              "
                            >
                              {{ action.name }}
                            </q-item>
                          </q-list>
                        </q-menu>
                      </q-item>

                      <!-- Bulk Run Checks -->
                      <q-item v-close-popup clickable @click="runChecks(props.node)">
                        <q-item-section side>
                          <q-icon name="fas fa-check-double" />
                        </q-item-section>
                        <q-item-section>Run Checks</q-item-section>
                      </q-item>

                      <q-item
                        v-if="
                          (props.node.children &&
                            $integrations?.clientMenuIntegrations?.length > 0) ||
                          (!props.node.children && $integrations?.siteMenuIntegrations.length > 0)
                        "
                        clickable
                      >
                        <q-item-section side>
                          <q-icon name="analytics" />
                        </q-item-section>
                        <q-item-section>Reporting</q-item-section>
                        <q-item-section side>
                          <q-icon name="keyboard_arrow_right" />
                        </q-item-section>
                        <integrations-context-menu
                          :id="props.node.id"
                          :type="props.node.children ? 'client' : 'site'"
                        />
                      </q-item>

                      <q-separator></q-separator>

                      <q-item v-close-popup clickable>
                        <q-item-section>Close</q-item-section>
                      </q-item>
                    </q-list>
                  </q-menu>
                </div>
              </template>
            </q-tree>
          </q-list>
        </div>
      </template>

      <template #after>
        <q-splitter
          v-model="dashboardSettings.agentTableSplitter"
          reverse
          unit="px"
          horizontal
          after-class="hide-scrollbar"
          before-class="hide-scrollbar"
          separator-class="splitter-separator"
          emit-immediately
          @update:model-value="(val: number) => setTableHeight(val)"
        >
          <template #before>
            <AgentTable />
          </template>
          <template #separator>
            <q-avatar color="primary" text-color="white" size="20px" icon="drag_indicator" />
          </template>
          <template #after>
            <SubTableTabs />
          </template>
        </q-splitter>
      </template>
    </q-splitter>
  </q-page>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted, useTemplateRef } from "vue";
import { useQuasar, QTree, QSplitter } from "quasar";
import {
  useDashboardStore,
  useClientStore,
  useURLActionStore,
  runURLAction,
  useAgentStore,
} from "src/stores/api";

const { clients, getClients } = useClientStore();
const { webActions, getURLActions } = useURLActionStore();
import axios from "axios";

// import ui
import FileBar from "src/core/dashboard/components/FileBar.vue";
import AgentTable from "src/core/agents/components/AgentTable.vue";
import SubTableTabs from "src/core/dashboard/components/SubTableTabs.vue";
import PolicyAdd from "src/core/automation/components/PolicyAdd.vue";
import ClientsForm from "src/core/clients/components/ClientsForm.vue";
import SitesForm from "src/core/clients/components/SitesForm.vue";
import DeleteClient from "src/core/clients/components/DeleteClient.vue";
import InstallAgent from "src/core/agents/components/InstallAgent.vue";
import AlertTemplateAdd from "src/core/alerts/components/AlertTemplateAdd.vue";
import IntegrationsContextMenu from "src/core/dashboard/ui/IntegrationsContextMenu.vue";

//types
import { notifySuccess, notifyWarning } from "src/utils/notify";
import type { ClientTreeNode } from "src/core/dashboard/types";
const {
  selectedClientSiteNode,
  dashboardSettings,
  setClientTreeSplitter,
  setTableHeight,
  refreshDashboard,
  draggingAgent,
} = useDashboardStore();

const { updateAgent, refreshAgentSearch, agents, selectedAgentIds } = useAgentStore();

const $q = useQuasar();

const dropTargetNode = ref<string | null>(null);
const expandTargetNode = ref<string | null>(null);
const tree = useTemplateRef<QTree>("tree");
const vSplitter = useTemplateRef<QSplitter>("vSplitter");
const treeContainer = useTemplateRef<HTMLDivElement>("treeContainer");

function getClientTreeAutoFitPct() {
  const splitterEl = (vSplitter.value as unknown as { $el: HTMLElement } | null)?.$el;
  const containerEl = treeContainer.value;
  if (!splitterEl || !containerEl) return null;

  const splitterWidth = splitterEl.offsetWidth;
  if (splitterWidth <= 0) return null;

  // Apply nowrap + overflow:visible while measuring so long client/site names
  // expose their natural width beyond the constrained panel.
  containerEl.classList.add("measure-natural-width");
  try {
    void containerEl.offsetWidth; // force reflow
    const containerRect = containerEl.getBoundingClientRect();
    let maxRight = 0;
    const rows = containerEl.querySelectorAll<HTMLElement>(".client-tree-row-content");
    rows.forEach((row) => {
      const right = row.getBoundingClientRect().right - containerRect.left;
      if (right > maxRight) maxRight = right;
    });

    const paddingRight = parseFloat(window.getComputedStyle(containerEl).paddingRight) || 0;
    const buffer = paddingRight + 7;
    return Math.floor(Math.min(70, Math.max(10, ((maxRight + buffer) / splitterWidth) * 100)));
  } finally {
    containerEl.classList.remove("measure-natural-width");
  }
}

function autoFitClientTree() {
  const fitPct = getClientTreeAutoFitPct();
  if (fitPct === null) return;
  setClientTreeSplitter(fitPct);
}
let dragExpandTimer: ReturnType<typeof setTimeout> | null = null;

function clearDragExpandTimer() {
  if (dragExpandTimer) {
    clearTimeout(dragExpandTimer);
    dragExpandTimer = null;
  }
  expandTargetNode.value = null;
}

const clientTree = computed((): ClientTreeNode[] => {
  const output: ClientTreeNode[] = [];

  for (const client of clients.value) {
    const childSites: ClientTreeNode[] = [];

    for (const site of client.sites) {
      const siteNode: ClientTreeNode = {
        label: site.name,
        id: site.id,
        raw: `site|${site.id}|${site.name}`,
        header: "generic",
        icon: "apartment",
        selectable: true,
        site: site,
      };

      if (site.maintenance_mode) {
        siteNode.color = "green";
      } else if (site.failing_checks.error) {
        siteNode.color = "negative";
      } else if (site.failing_checks.warning) {
        siteNode.color = "warning";
      }

      childSites.push(siteNode);
    }

    const clientNode: ClientTreeNode = {
      label: client.name,
      id: client.id,
      raw: `client|${client.id}|${client.name}`,
      header: "root",
      icon: "business",
      children: childSites,
      client: client,
    };

    if (client.maintenance_mode) {
      clientNode.color = "green";
    } else if (client.failing_checks.error) {
      clientNode.color = "negative";
    } else if (client.failing_checks.warning) {
      clientNode.color = "warning";
    }

    output.push(clientNode);
  }

  const sorted = output.sort((a, b) => a.label.localeCompare(b.label));

  if (dashboardSettings.clientTreeSort === "alphafail") {
    const failing = sorted.filter((i) => i.color === "negative" || i.color === "warning");
    const ok = sorted.filter((i) => i.color !== "negative" && i.color !== "warning");
    return [...failing, ...ok];
  } else {
    return sorted;
  }
});

function showPolicyAdd(node: ClientTreeNode) {
  $q.dialog({
    component: PolicyAdd,
    componentProps: {
      type: node.children ? "client" : "site",
      object: node.children ? node.client : node.site,
    },
  });
}

function showAddSiteModal(node: ClientTreeNode) {
  $q.dialog({
    component: SitesForm,
    componentProps: { client: node.id },
  });
}

function showEditModal(node: ClientTreeNode) {
  $q.dialog({
    component: node.children ? ClientsForm : SitesForm,
    componentProps: node.children
      ? { client: node.client }
      : { site: node.site, client: node.site?.client },
  });
}

function showDeleteModal(node: ClientTreeNode) {
  if (!node.children) {
    $q.dialog({
      component: DeleteClient,
      componentProps: {
        object: node.site,
        type: "site",
      },
    }).onOk(() => (selectedClientSiteNode.value = null));
    return;
  }

  $q.dialog({
    component: DeleteClient,
    componentProps: {
      object: node.client,
      type: "client",
    },
  }).onOk(() => (selectedClientSiteNode.value = null));
}

function showInstallAgent(node: ClientTreeNode) {
  $q.dialog({
    component: InstallAgent,
    componentProps: {
      sitePk: node.id,
    },
  });
}

function showAlertTemplateAdd(node: ClientTreeNode) {
  $q.dialog({
    component: AlertTemplateAdd,
    componentProps: {
      type: node.children ? "client" : "site",
      object: node.children ? node.client : node.site,
    },
  });
}

function runChecks(node: ClientTreeNode) {
  const target = node.children ? "client" : "site";
  axios
    .post(`/checks/${target}/${node.id}/csbulkrun/`)
    .then((r) => {
      notifySuccess(r.data);
    })
    .catch((e) => console.error(e));
}

function showToggleMaintenance(node: ClientTreeNode) {
  const rawType = node.raw.split("|")[0];
  const data = {
    id: node.id,
    type: rawType === "client" ? "Client" : "Site",
    action: node.color !== "green",
  };

  axios
    .post("/agents/maintenance/bulk/", data)
    .then((r) => {
      notifySuccess(r.data);
      refreshDashboard();
    })
    .catch((e) => console.error(e));
}

const urlActions = computed(() => {
  const actions = webActions.value
    .filter((action) => action.action_type === "web")
    .sort((a, b) => a.name.localeCompare(b.name));

  if (actions.length === 0) {
    notifyWarning("No URL Actions configured. Go to Settings > Global Settings > URL Actions");
    return [];
  } else {
    return actions;
  }
});

function onTreeNodeDragEnter(event: DragEvent, node: ClientTreeNode) {
  if (!draggingAgent.value) return;
  clearDragExpandTimer();
  if (node.children) {
    expandTargetNode.value = node.raw;
    dragExpandTimer = setTimeout(() => {
      if (tree.value && !tree.value.isExpanded(node.raw)) {
        tree.value.setExpanded(node.raw, true);
      }
      expandTargetNode.value = null;
    }, 600);
    return;
  }
  dropTargetNode.value = node.raw;
  if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
}

function onTreeNodeDragOver(event: DragEvent, node: ClientTreeNode) {
  if (!draggingAgent.value) return;
  if (node.children) return;
  if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
}

function onTreeNodeDragLeave(node: ClientTreeNode) {
  clearDragExpandTimer();
  if (dropTargetNode.value === node.raw) dropTargetNode.value = null;
}

function onTreeNodeDrop(event: DragEvent, node: ClientTreeNode) {
  clearDragExpandTimer();
  dropTargetNode.value = null;
  const agent = draggingAgent.value;
  draggingAgent.value = null;

  if (!agent || node.children) return;

  const targetSiteId = parseInt(node.raw.split("|")[1] ?? "");

  // If the dragged agent is part of a multi-selection, move all selected agents;
  // otherwise just move the single dragged agent.
  const agentsToMove =
    selectedAgentIds.value.includes(agent.agent_id) && selectedAgentIds.value.length > 1
      ? agents.value.filter(
          (a) => selectedAgentIds.value.includes(a.agent_id) && a.site !== targetSiteId,
        )
      : agent.site !== targetSiteId
        ? [agent]
        : [];

  if (agentsToMove.length === 0) {
    notifyWarning(`Agent(s) already in site: ${node.label}`);
    return;
  }

  const message =
    agentsToMove.length === 1
      ? `Move "${agentsToMove[0]?.hostname}" to site "${node.label}"?`
      : `Move ${agentsToMove.length} agents to site "${node.label}"?`;

  $q.dialog({
    title: "Move Agent",
    message,
    cancel: true,
    ok: { label: "Move", color: "primary" },
  }).onOk(() => {
    void (async () => {
      try {
        await Promise.all(agentsToMove.map((a) => updateAgent(a.agent_id, { site: targetSiteId })));
        refreshAgentSearch();
        getClients({ force: true });
      } catch {
        // updateAgent handles error notification internally
      }
    })();
  });
}

onMounted(() => {
  getClients();
  getURLActions();
  setTableHeight(dashboardSettings.agentTableSplitter);
});
</script>

<style>
.my-menu-link {
  color: white;
  background: lightgray;
}

.drag-drop-target {
  background-color: rgba(25, 118, 210, 0.15);
  border-radius: 4px;
  outline: 2px dashed #1976d2;
}

.drag-expand-target {
  background-color: rgba(25, 118, 210, 0.08);
  border-radius: 4px;
  outline: 1px dashed #1976d2;
}

.splitter-separator {
  background: rgba(0, 0, 0, 0.5) !important;
}

.body--dark .splitter-separator {
  background: rgba(255, 255, 255, 0.5) !important;
}

.vsplitter-dblclick-target {
  position: absolute;
  top: 0;
  left: 0;
  inset: 0;
  transform: none;
  cursor: col-resize;
}

.client-tree-row-content,
.client-tree-row-content * {
  display: inline-block;
  white-space: nowrap;
}

.measure-natural-width,
.measure-natural-width * {
  white-space: nowrap !important;
  overflow: visible !important;
  max-width: none !important;
  text-overflow: clip !important;
}

.measure-natural-width .client-tree-row-content {
  width: max-content !important;
  min-width: max-content !important;
}
</style>
