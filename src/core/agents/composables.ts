import { onMounted, computed, ref } from "vue";
import { useQuasar } from "quasar";

import { useAgentStore, useCheckStore, useWindowsUpdateStore, useDashboardStore } from "src/stores/api";
import type { Option, SelectableOption } from "../dashboard/types";

import PendingActions from "src/core/logs/components/PendingActions.vue";
import AgentRecovery from "./components/AgentRecovery.vue";
import PolicyAdd from "src/core/automation/components/PolicyAdd.vue";
import RebootLater from "./components/RebootLater.vue";
import EditAgent from "./components/EditAgent.vue";
import SendCommand from "./components/SendCommand.vue";
import RunScript from "./components/RunScript.vue";
import ConfirmYesDialog from "./components/ConfirmYesDialog.vue";

import type { Agent } from "./types";

const agentStore = useAgentStore();
const dashboardStore = useDashboardStore();

export function useAgentDropdown() {
  const { dropdownAgents, isDropdownLoading } = agentStore;

  // Returns string agent_id as value (for bulk actions, logs, scripts, etc.)
  const agentOptions = computed(() => {
    return _formatAgentOptions(dropdownAgents.value);
  });

  // Returns numeric id as value (for exclusions)
  const agentOptionsById = computed(() => {
    return _formatAgentOptions(dropdownAgents.value, (agent) => agent.id);
  });

  onMounted(agentStore.getDropdownAgents);

  return {
    agentOptions,
    agentOptionsById,
    isLoading: isDropdownLoading,
  };
}

export function _formatAgentOptions(
  data: Agent[],
  getValue: (agent: Agent) => string | number = (agent) => agent.agent_id,
): Option[] {
  const agents = data.map((agent) => ({
    label: agent.hostname,
    value: getValue(agent),
    category: `${agent.client_name} > ${agent.site_name}`,
  }));

  agents.sort((a, b) => a.label.localeCompare(b.label));

  const categoryMap = new Map<string, Option[]>();

  for (const agent of agents) {
    if (!categoryMap.has(agent.category)) {
      categoryMap.set(agent.category, []);
    }
    categoryMap
      .get(agent.category)!
      .push({ type: "option", label: agent.label, value: agent.value, category: agent.category });
  }

  return Array.from(categoryMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .flatMap(([category, agents]) => [
      { type: "header", label: category, value: `header_${category}` },
      ...agents,
    ]);
}

export function useAgentDiskDropdown(agentId: string | null) {
  if (!agentId) return { agentDiskOptions: ref<string[]>([]) };
  const { selectedAgent } = agentStore;

  const agentDiskOptions = computed(() => {
    if (selectedAgent.value?.disks) return selectedAgent.value.disks.map((disk) => disk.device);
    else return [];
  });

  onMounted(() => agentStore.getAgent(agentId));

  return {
    agentDiskOptions,
  };
}

export function useAgentServiceDropdown(agentId: string | null) {
  if (!agentId) return { agentServiceOptions: ref<SelectableOption[]>([]) };

  const { selectedAgent } = agentStore;

  const agentServiceOptions = computed(() => {
    if (selectedAgent.value?.services)
      return selectedAgent.value.services
        .map((service) => ({
          type: "option",
          label: service.display_name,
          value: service.name,
        }))
        .sort((a, b) => a.label.localeCompare(b.label)) as SelectableOption[];
    else return [] as SelectableOption[];
  });

  onMounted(() => agentStore.getAgent(agentId));

  return {
    agentServiceOptions,
  };
}

export function cmdPlaceholder(shell: string) {
  const placeholders = computed(() => dashboardStore.dashboardSettings.runCmdPlaceholderText);

  if (shell === "cmd") return placeholders.value.cmd;
  else if (shell === "powershell") return placeholders.value.powershell;
  else return placeholders.value.shell;
}

export const agentPlatformOptions = [
  { value: "windows", label: "Windows" },
  { value: "linux", label: "Linux" },
  { value: "darwin", label: "macOS" },
];

export function useAgentActions() {
  const $q = useQuasar();
  const { updateAgent, wakeUpWOL, runTakeControl, runRemoteBackground, runWebVNC, agentRebootNow, agentShutdown, sendAgentPing, removeAgent } = useAgentStore();
  const { runAgentChecks } = useCheckStore();
  const { runAgentUpdateScan, runAgentUpdateInstall } = useWindowsUpdateStore();

  function showEditAgent(agentId: string) {
    $q.dialog({
      component: EditAgent,
      componentProps: { agentId },
    });
  }

  function showPendingActionsModal(agent: Agent) {
    $q.dialog({
      component: PendingActions,
      componentProps: { agent },
    });
  }

  function showSendCommand(agent: Agent) {
    $q.dialog({
      component: SendCommand,
      componentProps: { agent },
    });
  }

  function showRunScript(agent: Agent, script: number | undefined = undefined) {
    $q.dialog({
      component: RunScript,
      componentProps: { agent, script },
    });
  }

  function toggleMaintenance(agent: Agent) {
    void updateAgent(agent.agent_id, { maintenance_mode: !agent.maintenance_mode });
  }

  function runPatchStatusScan(agent: Agent) {
    void runAgentUpdateScan(agent.agent_id);
  }

  function installPatches(agent: Agent) {
    void runAgentUpdateInstall(agent.agent_id);
  }

  function runChecks(agent: Agent) {
    void runAgentChecks(agent.agent_id);
  }

  function wakeUp(agent: Agent) {
    void wakeUpWOL(agent.agent_id);
  }

  function showRebootLaterModal(agent: Agent) {
    $q.dialog({
      component: RebootLater,
      componentProps: { agent },
    });
  }

  function launchWebVNC(agentId: string) {
    $q.dialog({
      title: "VNC Server Port",
      message: "Enter the VNC server port:",
      prompt: { model: "5900", type: "text" },
      cancel: true,
      ok: { label: "Launch", color: "primary" },
      noBackdropDismiss: true,
    }).onOk((port) => {
      runWebVNC(agentId, port);
    });
  }

  function rebootNow(agent: Agent) {
    $q.dialog({
      title: "Are you sure?",
      message: `Reboot ${agent.hostname} now`,
      cancel: true,
      noBackdropDismiss: true,
    }).onOk(() => {
      void agentRebootNow(agent.agent_id);
    });
  }

  function shutdown(agent: Agent) {
    $q.dialog({
      component: ConfirmYesDialog,
      componentProps: {
        hostname: agent.hostname,
        actionVerb: "shutdown",
        title: "Confirm Shutdown",
        okLabel: "Shutdown",
        okColor: "negative",
      },
    }).onOk(() => {
      void agentShutdown(agent.agent_id);
    });
  }

  function showPolicyAdd(agent: Agent) {
    $q.dialog({
      component: PolicyAdd,
      componentProps: { type: "agent", object: agent },
    });
  }

  function showAgentRecovery(agent: Agent) {
    $q.dialog({
      component: AgentRecovery,
      componentProps: { agent },
    });
  }

  function handleRemoveAgent(event: Event, agent: Agent) {
    if ((event as MouseEvent).shiftKey && agent.status === "overdue") {
      $q.dialog({
        title: "Confirm Delete",
        message: `Are you sure you want to delete ${agent.hostname}? The agent will need to be manually uninstalled from the computer.`,
        cancel: { label: "No", color: "primary" },
        ok: { label: "Yes", color: "negative" },
        noBackdropDismiss: true,
      }).onOk(() => {
        void removeAgent(agent.agent_id);
      });
    } else {
      void pingAgent(agent);
    }
  }

  async function pingAgent(agent: Agent) {
    $q.loading.show();
    const result = await sendAgentPing(agent.agent_id);
    $q.loading.hide();
    if (result === "online") {
      deleteAgent(agent);
    } else {
      $q.dialog({
        title: "Agent offline",
        message: `${agent.hostname} cannot be contacted.
                  Would you like to continue with the uninstall?
                  If so, the agent will need to be manually uninstalled from the computer.`,
        cancel: { label: "No", color: "negative" },
        ok: { label: "Yes", color: "positive" },
        noBackdropDismiss: true,
      })
        .onOk(() => deleteAgent(agent))
        .onCancel(() => { return; });
    }
  }

  function deleteAgent(agent: Agent) {
    $q.dialog({
      component: ConfirmYesDialog,
      componentProps: {
        hostname: agent.hostname,
        actionVerb: "deletion",
        title: "Confirm Deletion",
        okLabel: "Uninstall",
        okColor: "negative",
      },
    }).onOk(() => {
      void removeAgent(agent.agent_id);
    });
  }

  return {
    showEditAgent,
    showPendingActionsModal,
    showSendCommand,
    showRunScript,
    toggleMaintenance,
    runPatchStatusScan,
    installPatches,
    runChecks,
    wakeUp,
    showRebootLaterModal,
    launchWebVNC,
    rebootNow,
    shutdown,
    showPolicyAdd,
    showAgentRecovery,
    handleRemoveAgent,
    runTakeControl,
    runRemoteBackground,
  };
}
