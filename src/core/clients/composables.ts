import { onMounted, computed, ref } from "vue";
import { Dialog } from "quasar";
import { useClientStore, useSiteStore } from "src/stores/api";

import type { Client } from "./types";

const clientStore = useClientStore();
import { type SelectableOption, type Option, type HeaderOption } from "../dashboard/types";

export function useClientDropdown() {
  const { clients, isLoading } = clientStore;

  const clientOptions = computed(() => {
    return clients.value.map(
      (client) =>
        ({
          type: "option",
          label: client.name,
          value: client.id,
        }) as Option,
    );
  });

  onMounted(clientStore.getClients);

  return {
    clientOptions,
    isLoading,
  };
}

export interface SiteSelectableOption extends SelectableOption {
  clientId: number;
}
export type SiteOption = HeaderOption | SiteSelectableOption;

export function useSiteDropdown() {
  const { clients, isLoading } = clientStore;

  const siteOptions = computed<SiteOption[]>(() => {
    return _formatSiteOptions(clients.value);
  });

  onMounted(clientStore.getClients);

  return {
    siteOptions,
    isLoading,
  };
}

// Shared drag state for reassigning a site to a different client via drag-and-drop.
const draggingSiteId = ref<number | null>(null);

export function useSiteDrag() {
  const { sites, updateSite } = useSiteStore();

  function onSiteDragStart(siteId: number, ev: DragEvent) {
    draggingSiteId.value = siteId;
    if (ev.dataTransfer) {
      ev.dataTransfer.setData("text/plain", String(siteId));
      ev.dataTransfer.effectAllowed = "move";
    }
  }

  function onSiteDragEnd() {
    draggingSiteId.value = null;
  }

  function onClientDragOver(ev: DragEvent) {
    if (draggingSiteId.value === null) return;
    ev.preventDefault();
    if (ev.dataTransfer) ev.dataTransfer.dropEffect = "move";
  }

  function onClientDrop(targetClient: Client) {
    const siteId = draggingSiteId.value;
    draggingSiteId.value = null;
    if (siteId === null) return;

    const site = sites.value.find((s) => s.id === siteId);
    const sourceClientId = site?.client ?? clientStore.clients.value.find((c) =>
      c.sites.some((s) => s.id === siteId),
    )?.id;

    if (sourceClientId === targetClient.id) return;

    const siteName = site?.name ?? clientStore.clients.value
      .flatMap((c) => c.sites)
      .find((s) => s.id === siteId)?.name ?? `site ${siteId}`;

    Dialog.create({
      title: "Move Site",
      message: `Move "${siteName}" to client "${targetClient.name}"?`,
      cancel: true,
      ok: { label: "Move", color: "primary" },
    }).onOk(() => {
      // updateSite calls refreshDashboard() which reloads clients; no extra call needed.
      void updateSite(siteId, { site: { client: targetClient.id } });
    });
  }

  return {
    draggingSiteId,
    onSiteDragStart,
    onSiteDragEnd,
    onClientDragOver,
    onClientDrop,
  };
}

function _formatSiteOptions(data: Client[]) {
  const options = [] as SiteOption[];

  data.forEach((client) => {
    options.push({ type: "header", label: client.name, value: `header_${client.name}` });
    options.push(
      ...client.sites.map(
        (site) =>
          ({
            type: "option",
            label: site.name,
            value: site.id,
            category: client.name,
            clientId: client.id,
          }) as SiteSelectableOption,
      ),
    );
  });

  return options;
}
