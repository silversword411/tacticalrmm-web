<template>
  <Teleport to="body">
    <Transition name="quadrant-fade">
      <div
        v-if="visible"
        ref="menuRef"
        class="quadrant-menu"
        :class="{ 'quadrant-menu--dark': $q.dark.isActive }"
        :style="menuStyle"
        tabindex="-1"
        @keydown.esc="close"
        @contextmenu.prevent
      >
        <!-- Top-Left: Config -->
        <div class="quadrant quadrant-tl">
          <div class="quadrant-header">Config</div>
          <div v-ripple class="quadrant-item" @click="action(() => showEditAgent(agent.agent_id))">
            <q-icon size="xs" name="fas fa-edit" />
            <span>Edit {{ agent.hostname }}</span>
          </div>
          <div v-ripple class="quadrant-item" @click="action(() => showPendingActionsModal(agent))">
            <q-icon size="xs" name="far fa-clock" />
            <span>Pending Agent Actions</span>
          </div>
          <div v-ripple class="quadrant-item" @click="action(() => showPolicyAdd(agent))">
            <q-icon size="xs" name="policy" />
            <span>Assign Automation Policy</span>
          </div>
          <div v-ripple class="quadrant-item" @click="action(() => toggleMaintenance(agent))">
            <q-icon size="xs" name="construction" />
            <span>{{ agent.maintenance_mode ? "Disable Maintenance Mode" : "Enable Maintenance Mode" }}</span>
          </div>
          <div v-ripple class="quadrant-item" @click="action(() => showAgentRecovery(agent))">
            <q-icon size="xs" name="fas fa-first-aid" />
            <span>Agent Recovery</span>
          </div>
        </div>

        <!-- Top-Right: Remote -->
        <div class="quadrant quadrant-tr">
          <div class="quadrant-header">Remote</div>
          <div v-ripple class="quadrant-item" @click="action(() => runTakeControl(agent.agent_id))">
            <q-icon size="xs" name="fas fa-desktop" />
            <span>Take Control</span>
          </div>
          <div v-ripple class="quadrant-item" @click="action(() => launchWebVNC(agent.agent_id))">
            <q-icon size="xs" name="screen_share" />
            <span>VNC</span>
          </div>
          <div v-ripple class="quadrant-item" @click="action(() => runRemoteBackground(agent.agent_id, agent.plat))">
            <q-icon size="xs" name="terminal" />
            <span>Remote Background</span>
          </div>
          <div v-ripple class="quadrant-item" @click="action(() => showSendCommand(agent))">
            <q-icon size="xs" name="fas fa-terminal" />
            <span>Send Command</span>
          </div>
          <div v-ripple class="quadrant-item" @click="action(() => showRunScript(agent))">
            <q-icon size="xs" name="fas fa-terminal" />
            <span>Run Script</span>
          </div>
          <div
            v-ripple
            class="quadrant-item"
            :class="{ 'quadrant-item--disabled': favoriteScriptOptions.length === 0 }"
            @click="favoriteScriptOptions.length > 0 && toggleSubmenu('favorites', $event)"
          >
            <q-icon size="xs" name="star" />
            <span>Run Favorited Script</span>
            <q-icon size="xs" name="keyboard_arrow_right" class="quadrant-chevron" />
          </div>
          <div
            v-ripple
            class="quadrant-item"
            :class="{ 'quadrant-item--disabled': webActions.length === 0 }"
            @click="webActions.length > 0 && toggleSubmenu('urlActions', $event)"
          >
            <q-icon size="xs" name="open_in_new" />
            <span>Run URL Action</span>
            <q-icon size="xs" name="keyboard_arrow_right" class="quadrant-chevron" />
          </div>
        </div>

        <!-- Bottom-Left: Maintenance -->
        <div class="quadrant quadrant-bl">
          <div class="quadrant-header">Maintenance</div>
          <div v-ripple class="quadrant-item" @click="toggleSubmenu('patchMgmt', $event)">
            <q-icon size="xs" name="system_update" />
            <span>Patch Management</span>
            <q-icon size="xs" name="keyboard_arrow_right" class="quadrant-chevron" />
          </div>
          <div v-ripple class="quadrant-item" @click="action(() => runChecks(agent))">
            <q-icon size="xs" name="fas fa-check-double" />
            <span>Run Checks</span>
          </div>
          <div v-ripple class="quadrant-item" @click="action(() => wakeUp(agent))">
            <q-icon size="xs" name="offline_bolt" />
            <span>Wake-Up (WoL)</span>
          </div>
          <div
            v-if="$integrations && $integrations.agentMenuIntegrations && $integrations.agentMenuIntegrations.length > 0"
            v-ripple
            class="quadrant-item"
            @click="toggleSubmenu('reporting', $event)"
          >
            <q-icon size="xs" name="analytics" />
            <span>Reporting</span>
            <q-icon size="xs" name="keyboard_arrow_right" class="quadrant-chevron" />
          </div>
        </div>

        <!-- Bottom-Right: Power -->
        <div class="quadrant quadrant-br">
          <div class="quadrant-header">Power</div>
          <div v-ripple class="quadrant-item" @click="toggleSubmenu('reboot', $event)">
            <q-icon size="xs" name="power_settings_new" />
            <span>Reboot</span>
            <q-icon size="xs" name="keyboard_arrow_right" class="quadrant-chevron" />
          </div>
          <div v-ripple class="quadrant-item quadrant-item--danger" @click="action(() => shutdown(agent))">
            <q-icon size="xs" name="power" />
            <span>Shutdown</span>
          </div>
          <div v-ripple class="quadrant-item quadrant-item--danger" @click="action(() => handleRemoveAgent($event, agent))">
            <q-icon size="xs" name="delete" />
            <span>Remove Agent</span>
          </div>
        </div>
      </div>
    </Transition>

      <!-- Submenu panel -->
      <div
        v-if="visible && activeSubmenu"
        class="quadrant-submenu"
        :class="{ 'quadrant-submenu--dark': $q.dark.isActive }"
        :style="submenuStyle"
      >
        <!-- Favorites submenu -->
        <template v-if="activeSubmenu === 'favorites'">
          <div
            v-for="script in favoriteScriptOptions"
            :key="script.value"
            v-ripple
            class="quadrant-submenu-item"
            @click="action(() => showRunScript(agent, script.value as number))"
          >
            {{ script.label }}
          </div>
        </template>

        <!-- URL Actions submenu -->
        <template v-if="activeSubmenu === 'urlActions'">
          <div
            v-for="urlAction in webActions"
            :key="urlAction.id"
            v-ripple
            class="quadrant-submenu-item"
            @click="action(() => runURLAction(urlAction.id, 'agent', agent.agent_id))"
          >
            {{ urlAction.name }}
          </div>
        </template>

        <!-- Patch Management submenu -->
        <template v-if="activeSubmenu === 'patchMgmt'">
          <div v-ripple class="quadrant-submenu-item" @click="action(() => runPatchStatusScan(agent))">
            Run Patch Status Scan
          </div>
          <div v-ripple class="quadrant-submenu-item" @click="action(() => installPatches(agent))">
            Install Patches Now
          </div>
        </template>

        <!-- Reboot submenu -->
        <template v-if="activeSubmenu === 'reboot'">
          <div v-ripple class="quadrant-submenu-item" @click="action(() => rebootNow(agent))">
            Now
          </div>
          <div v-ripple class="quadrant-submenu-item" @click="action(() => showRebootLaterModal(agent))">
            Later
          </div>
        </template>

        <!-- Reporting/Integrations submenu -->
        <template v-if="activeSubmenu === 'reporting'">
          <div
            v-for="integration in $integrations.agentMenuIntegrations"
            :key="integration.name"
            v-ripple
            class="quadrant-submenu-item"
            @click="action(() => handleIntegration(integration))"
          >
            {{ integration.name }}
          </div>
        </template>
      </div>
  </Teleport>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted, onUnmounted, nextTick, getCurrentInstance } from "vue";
import { useQuasar } from "quasar";
import { useURLActionStore, runURLAction } from "src/stores/api";
import { useScriptDropdown } from "src/core/scripts/composables";
import { useAgentActions } from "src/core/agents/composables";

import type { Agent } from "../types";
import type { ContextMenuIntegration } from "src/boot/integrations";

const props = defineProps<{
  agent: Agent;
  event: MouseEvent;
  visible: boolean;
}>();

const emit = defineEmits<{
  (e: "close"): void;
}>();

const $q = useQuasar();
const instance = getCurrentInstance();
const $integrations = computed(() => instance?.appContext.config.globalProperties.$integrations);

// stores
const { webActions, getURLActions } = useURLActionStore();
const { favoriteScriptOptions } = useScriptDropdown();

const {
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
} = useAgentActions();

// refs
const menuRef = ref<HTMLElement | null>(null);
const activeSubmenu = ref<string | null>(null);
const submenuAnchor = ref<{ x: number; y: number }>({ x: 0, y: 0 });

type SubmenuKey = "favorites" | "urlActions" | "patchMgmt" | "reboot" | "reporting";

// positioning
const menuStyle = computed(() => {
  const menuWidth = 420;
  const estimatedHeight = 320;
  let x = props.event.clientX - menuWidth / 2;
  let y = props.event.clientY - estimatedHeight / 2;
  x = Math.max(4, Math.min(x, window.innerWidth - menuWidth - 4));
  y = Math.max(4, Math.min(y, window.innerHeight - estimatedHeight - 4));
  return {
    left: `${x}px`,
    top: `${y}px`,
  };
});

const submenuStyle = computed(() => {
  if (!activeSubmenu.value) return {};
  const maxH = window.innerHeight - submenuAnchor.value.y - 8;
  return {
    left: `${submenuAnchor.value.x}px`,
    top: `${submenuAnchor.value.y}px`,
    maxHeight: `${maxH}px`,
    overflowY: maxH < 400 ? "auto" as const : undefined,
  };
});

// Adjust menu position after render to account for actual height
async function adjustPosition() {
  await nextTick();
  if (!menuRef.value) return;
  const rect = menuRef.value.getBoundingClientRect();
  const menuWidth = rect.width;
  const menuHeight = rect.height;
  let x = props.event.clientX - menuWidth / 2;
  let y = props.event.clientY - menuHeight / 2;
  x = Math.max(4, Math.min(x, window.innerWidth - menuWidth - 4));
  y = Math.max(4, Math.min(y, window.innerHeight - menuHeight - 4));
  menuRef.value.style.left = `${x}px`;
  menuRef.value.style.top = `${y}px`;
  menuRef.value.focus();
}

function close() {
  activeSubmenu.value = null;
  emit("close");
}

function action(fn: () => void) {
  close();
  fn();
}

function toggleSubmenu(key: SubmenuKey, event: MouseEvent) {
  event.stopPropagation();
  if (activeSubmenu.value === key) {
    activeSubmenu.value = null;
    return;
  }

  const target = event.currentTarget as HTMLElement;
  const targetRect = target.getBoundingClientRect();
  const menuRect = menuRef.value?.getBoundingClientRect();

  if (!menuRect) return;

  // Determine if the item is on the left or right half
  const itemCenterX = targetRect.left + targetRect.width / 2;
  const menuCenterX = menuRect.left + menuRect.width / 2;
  const isRightSide = itemCenterX > menuCenterX;

  let x: number;
  if (isRightSide) {
    x = menuRect.right + 4;
  } else {
    x = menuRect.left - 164; // submenu min-width (160px) + 4px gap
  }
  // Clamp x
  x = Math.max(4, Math.min(x, window.innerWidth - 164));

  let y = targetRect.top;
  // Clamp y
  y = Math.max(4, Math.min(y, window.innerHeight - 200));

  submenuAnchor.value = { x, y };
  activeSubmenu.value = key;
}

// Handle integrations (route or dialog)
function handleIntegration(integration: ContextMenuIntegration) {
  if (integration.type === "dialog") {
    $q.dialog({
      component: integration.component,
      componentProps: integration.props ? integration.props(props.agent.agent_id, "agent") : undefined,
    });
  }
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === "Escape") close();
}

function onPointerdown(e: PointerEvent) {
  const target = e.target as HTMLElement;
  if (!target.closest(".quadrant-menu") && !target.closest(".quadrant-submenu")) {
    close();
  }
}

onMounted(() => {
  getURLActions();
  document.addEventListener("keydown", onKeydown);
  window.addEventListener("pointerdown", onPointerdown, true);
  void adjustPosition();
});

onUnmounted(() => {
  document.removeEventListener("keydown", onKeydown);
  window.removeEventListener("pointerdown", onPointerdown, true);
});
</script>

<style scoped>
.quadrant-menu {
  position: fixed;
  z-index: 9999;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  grid-template-rows: auto auto;
  width: 420px;
  border-radius: 12px;
  box-shadow: 0 2px 4px -1px rgba(0, 0, 0, 0.2),
              0 4px 5px rgba(0, 0, 0, 0.14),
              0 1px 10px rgba(0, 0, 0, 0.12);
  background: #ffffff;
  overflow: hidden;
  outline: none;
  user-select: none;
}

.quadrant-menu--dark {
  background: #1d1d1d;
  box-shadow: 0 2px 4px -1px rgba(0, 0, 0, 0.4),
              0 4px 5px rgba(0, 0, 0, 0.28),
              0 1px 10px rgba(0, 0, 0, 0.24);
}

.quadrant {
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.quadrant-tl {
  border-right: 1px solid rgba(0, 0, 0, 0.12);
  border-bottom: 1px solid rgba(0, 0, 0, 0.12);
}

.quadrant-tr {
  border-bottom: 1px solid rgba(0, 0, 0, 0.12);
}

.quadrant-bl {
  border-right: 1px solid rgba(0, 0, 0, 0.12);
}

.quadrant-menu--dark .quadrant-tl,
.quadrant-menu--dark .quadrant-tr,
.quadrant-menu--dark .quadrant-bl {
  border-color: rgba(255, 255, 255, 0.12);
}

.quadrant-header {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  opacity: 0.5;
  padding: 2px 8px 4px;
  font-weight: 600;
}

.quadrant-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 8px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  white-space: nowrap;
  color: inherit;
  min-width: 0;
}

.quadrant-item > span {
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  min-width: 0;
}

.quadrant-item:hover {
  background: rgba(25, 118, 210, 0.08);
}

.quadrant-menu--dark .quadrant-item:hover {
  background: rgba(25, 118, 210, 0.15);
}

.quadrant-item--disabled {
  opacity: 0.4;
  cursor: default;
  pointer-events: none;
}

.quadrant-item--danger {
  color: var(--q-negative);
}

.quadrant-chevron {
  margin-left: auto;
}

/* Submenu */
.quadrant-submenu {
  position: fixed;
  z-index: 10000;
  min-width: 160px;
  max-width: 360px;
  background: #ffffff;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
  padding: 4px;
}

.quadrant-submenu--dark {
  background: #1d1d1d;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
}

.quadrant-submenu-item {
  position: relative;
  padding: 6px 12px;
  font-size: 12px;
  border-radius: 4px;
  cursor: pointer;
  white-space: nowrap;
}

.quadrant-submenu-item:hover {
  background: rgba(25, 118, 210, 0.08);
}

.quadrant-submenu--dark .quadrant-submenu-item:hover {
  background: rgba(25, 118, 210, 0.15);
}

/* Entrance/exit animation */
.quadrant-fade-enter-active,
.quadrant-fade-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.quadrant-fade-enter-from,
.quadrant-fade-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
</style>
