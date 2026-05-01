<template>
  <q-dialog ref="dialogRef" no-backdrop-dismiss @hide="onDialogHide">
    <q-card class="dialog-plugin" style="min-width: 34vw">
      <q-bar>
        Move Agents
        <q-space />
        <q-btn v-close-popup dense flat icon="close" />
      </q-bar>

      <q-form @submit.prevent="moveAgents">
        <q-card-section class="q-gutter-y-sm">
          <div>
            Selected: <strong>{{ agents.length }}</strong> {{ agents.length === 1 ? "agent" : "agents" }}
          </div>

          <Tactical-dropdown
            v-model="destinationSiteId"
            dense
            options-dense
            filled
            map-options
            emit-value
            filterable
            label="Destination site *"
            :loading="isSiteLoading"
            :options="siteOptions"
            :option-disable="(opt: unknown) => isHeaderOption(opt as Option)"
            :rules="[(val: number | null) => !!val || 'Please select a destination site']"
          />

          <div v-if="destinationSiteId && skippedCount > 0" class="text-caption text-warning">
            {{ skippedCount }}
            {{ skippedCount === 1 ? "agent is" : "agents are" }}
            already in {{ destinationSiteName }} and will be skipped.
          </div>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat dense label="Cancel" @click="onDialogCancel" />
          <q-btn
            type="submit"
            color="primary"
            dense
            :loading="isMoving"
            :disable="!destinationSiteId || movableAgents.length === 0"
            label="Move"
          />
        </q-card-actions>
      </q-form>
    </q-card>
  </q-dialog>
</template>

<script lang="ts" setup>
import { computed, ref } from "vue";
import { useDialogPluginComponent } from "quasar";
import { useAgentStore, useClientStore } from "src/stores/api";
import { useSiteDropdown } from "src/core/clients/composables";
import { isHeaderOption, type Option } from "src/core/dashboard/types";
import { notifyWarning } from "src/utils/notify";
import type { Agent } from "../types";

const props = defineProps<{
  agents: Agent[];
}>();

defineEmits(useDialogPluginComponent.emits);

const { dialogRef, onDialogHide, onDialogCancel, onDialogOK } = useDialogPluginComponent();
const { updateAgent, refreshAgentSearch } = useAgentStore();
const { getClients } = useClientStore();
const { siteOptions, isLoading: isSiteLoading } = useSiteDropdown();

const destinationSiteId = ref<number | null>(null);
const isMoving = ref(false);

const movableAgents = computed(() => {
  if (!destinationSiteId.value) return [];
  return props.agents.filter((agent) => agent.site !== destinationSiteId.value);
});

const skippedCount = computed(() => props.agents.length - movableAgents.value.length);

const destinationSiteName = computed(() => {
  if (!destinationSiteId.value) return "";
  const option = siteOptions.value.find(
    (opt) => !isHeaderOption(opt as Option) && opt.value === destinationSiteId.value,
  );
  return option?.label ?? `site ${destinationSiteId.value}`;
});

async function moveAgents() {
  if (!destinationSiteId.value) return;

  if (movableAgents.value.length === 0) {
    notifyWarning(`Selected agents are already in ${destinationSiteName.value}.`);
    return;
  }

  isMoving.value = true;
  try {
    await Promise.all(
      movableAgents.value.map((agent) => updateAgent(agent.agent_id, { site: destinationSiteId.value! })),
    );
    refreshAgentSearch();
    getClients();
    onDialogOK();
  } catch {
    // Errors are handled by existing axios interceptors and store methods.
  } finally {
    isMoving.value = false;
  }
}
</script>
