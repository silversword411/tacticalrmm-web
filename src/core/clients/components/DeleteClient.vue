<template>
  <q-dialog ref="dialogRef" no-backdrop-dismiss @hide="onDialogHide">
    <q-card class="q-dialog-plugin">
      <q-bar>
        Delete {{ object.name }}
        <q-space />
        <q-btn v-close-popup dense flat icon="close" />
      </q-bar>
      <q-form @submit="submit">
        <template v-if="hasAgents">
          <q-card-section v-if="filteredSiteOptions.length === 0">
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
              :hint="`This ${type} has ${object.agent_count} ${object.agent_count === 1 ? 'agent' : 'agents'}. Select a site to move them to before deleting.`"
              filterable
            />
          </q-card-section>
        </template>
        <q-card-section v-else>
          Delete {{ type }} <strong>{{ object.name }}</strong>?
        </q-card-section>
        <q-card-actions align="right">
          <q-btn v-close-popup dense flat push label="Cancel" />
          <q-btn
            :loading="isLoading"
            :disable="hasAgents && filteredSiteOptions.length === 0"
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
// composition imports
import { computed, ref } from "vue";
import { useQuasar, useDialogPluginComponent } from "quasar";
import { useClientStore, useSiteStore } from "src/stores/api";

const { removeClient } = useClientStore();
const { removeSite } = useSiteStore();
import { useSiteDropdown } from "../composables";
import { isHeaderOption } from "src/core/dashboard/types";

// type imports
import type { Client, Site } from "../types";

const props = defineProps<{
  type: "client" | "site";
  object: Client | Site;
}>();

defineEmits(useDialogPluginComponent.emits);

// setup stores

// setup dropdowns
const { siteOptions, isLoading } = useSiteDropdown();

// setup quasar dialog
const $q = useQuasar();
const { dialogRef, onDialogOK, onDialogHide } = useDialogPluginComponent();

const hasAgents = computed(() => !!props.object.agent_count && props.object.agent_count > 0);

// Remove the site being currently deleted or the client that is being deleted from the options
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

// delete client logic
const site = ref(undefined);

function doDelete() {
  const action =
    props.type === "client"
      ? removeClient(props.object.id, site.value)
      : removeSite(props.object.id, site.value);
  action.then(() => onDialogOK()).catch(() => {});
}

function submit() {
  if (hasAgents.value) {
    $q.dialog({
      title: "Are you sure?",
      message: `Deleting ${props.type} ${props.object.name}. ${props.object.agent_count} ${props.object.agent_count === 1 ? "agent" : "agents"} will be moved to the selected site.`,
      cancel: true,
      ok: { label: "Delete", color: "negative" },
    }).onOk(doDelete);
  } else {
    doDelete();
  }
}
</script>
