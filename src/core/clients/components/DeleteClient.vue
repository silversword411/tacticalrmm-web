<template>
  <q-dialog ref="dialogRef" no-backdrop-dismiss @hide="onDialogHide">
    <q-card class="q-dialog-plugin">
      <q-bar>
        Delete {{ object.name }}
        <q-space />
        <q-btn v-close-popup dense flat icon="close" />
      </q-bar>
      <q-form @submit="submit">
        <q-inner-loading :showing="isFetchingCount" />
        <template v-if="!isFetchingCount">
          <q-card-section v-if="fetchError" class="text-negative">
            Failed to verify agent count. Please close and try again.
          </q-card-section>
          <template v-else-if="hasAgents">
            <q-card-section v-if="!hasDestinationSites">
              There are no valid sites to move agents to. Add another site and try again
            </q-card-section>
            <q-card-section v-else>
              <tactical-dropdown
                v-model="site"
                label="Site to move agents to"
                filled
                :options="filteredSiteOptions"
                map-options
                :rules="[
                  (val: number) => !!val || 'Select the site that the agents should be moved to',
                ]"
                :hint="`This ${type} has ${liveAgentCount} ${liveAgentCount === 1 ? 'agent' : 'agents'}. Select a site to move them to before deleting.`"
                filterable
              />
            </q-card-section>
          </template>
          <q-card-section v-else>
            Delete {{ type }} <strong>{{ object.name }}</strong>?
          </q-card-section>
        </template>
        <q-card-actions align="right">
          <q-btn v-close-popup dense flat push label="Cancel" />
          <q-btn
            :loading="isLoading"
            :disable="isFetchingCount || fetchError || (hasAgents && !hasDestinationSites)"
            dense
            flat
            push
            :label="hasAgents ? 'Move & Delete' : 'Delete'"
            color="negative"
            type="submit"
          />
        </q-card-actions>
      </q-form>
    </q-card>
  </q-dialog>
</template>

<script lang="ts" setup>
import { computed, ref, onMounted } from "vue";
import axios from "axios";
import { useDialogPluginComponent } from "quasar";
import { useClientStore, useSiteStore } from "src/stores/api";

const { removeClient } = useClientStore();
const { removeSite } = useSiteStore();
import { useSiteDropdown } from "../composables";
import { isHeaderOption } from "src/core/dashboard/types";

import type { Client, Site } from "../types";

const props = defineProps<{
  type: "client" | "site";
  object: Client | Site;
}>();

defineEmits(useDialogPluginComponent.emits);

const { siteOptions, isLoading } = useSiteDropdown();
const { dialogRef, onDialogOK, onDialogHide } = useDialogPluginComponent();

const liveAgentCount = ref<number>(props.object.agent_count ?? 0);
const isFetchingCount = ref(true);
const fetchError = ref(false);

onMounted(async () => {
  fetchError.value = false;
  try {
    const url = props.type === "client"
      ? `/clients/${props.object.id}/`
      : `/clients/sites/${props.object.id}/`;
    const { data } = await axios.get<Client | Site>(url);
    liveAgentCount.value = data.agent_count ?? 0;
  } catch {
    fetchError.value = true;
  } finally {
    isFetchingCount.value = false;
  }
});

const hasAgents = computed(() => liveAgentCount.value > 0);

const filteredSiteOptions = computed(() => {
  if (props.type === "client") {
    return siteOptions.value.filter((site) =>
      !isHeaderOption(site) ? site.clientId !== props.object.id : site.label !== props.object.name,
    );
  } else {
    return siteOptions.value.filter((site) =>
      !isHeaderOption(site) ? site.value !== props.object.id : true,
    );
  }
});

const hasDestinationSites = computed(() =>
  filteredSiteOptions.value.some((opt) => !isHeaderOption(opt)),
);

const site = ref(undefined);

function doDelete() {
  const action =
    props.type === "client"
      ? removeClient(props.object.id, site.value)
      : removeSite(props.object.id, site.value);
  action.then(() => onDialogOK()).catch(() => {});
}

function submit() {
  doDelete();
}
</script>
