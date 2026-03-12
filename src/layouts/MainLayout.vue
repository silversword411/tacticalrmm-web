<template>
  <q-layout view="hHh lpR fFf">
    <q-header elevated class="bg-grey-9 text-white">
      <q-banner
        v-if="reloadNeeded"
        inline-actions
        class="bg-red text-white text-center"
      >
        You are viewing an outdated version of this page.
        <q-btn color="dark" icon="refresh" label="Refresh" @click="reload" />
      </q-banner>
      <q-banner
        v-if="!hosted && tokenExpired"
        inline-actions
        class="bg-yellow text-black text-center"
      >
        <q-icon size="xl" name="warning" />
        <span
          ><br />Your license is currently inactive, usually due to a payment issue.<br /><br />To
          restore access, please update your payment method.<br /><br />
          If you’ve intentionally cancelled your sponsorship, you can remove your license key to
          stop seeing this message.<br /><br />
          If you need help, please contact our support team at
          <a
            href="https://support.amidaware.com"
            target="_blank"
            rel="noopener"
            class="text-primary"
            >https://support.amidaware.com</a
          ><br /><br
        /></span>
        <q-btn color="dark" icon="refresh" label="Refresh" @click="reload" />
      </q-banner>
      <q-toolbar>
        <q-btn
          v-if="$route.name === 'Dashboard'"
          dense
          flat
          icon="refresh"
          @click="refreshDashboard()"
        />
        <q-btn v-else dense flat icon="dashboard" @click="$router.push({ name: 'Dashboard' })">
          <q-tooltip>Back to Dashboard</q-tooltip>
        </q-btn>
        <q-toolbar-title>
          Tactical RMM<span class="text-overline q-ml-sm cursor-pointer">v{{ currentTRMMVersion }}
            <q-menu context-menu @before-show="loadFrontendVersions">
              <q-list dense style="min-width: 220px">
                <q-item-label header>Frontend Versions</q-item-label>
                <q-separator />
                <q-item
                  v-for="ver in frontendVersions"
                  :key="ver.name"
                  v-close-popup
                  clickable
                  :active="ver.active"
                  active-class="text-positive"
                  @click="switchFrontendVersion(ver.name)"
                >
                  <q-item-section side>
                    <q-icon
                      :name="ver.active ? 'check_circle' : 'radio_button_unchecked'"
                      :color="ver.active ? 'positive' : 'grey'"
                      size="xs"
                    />
                  </q-item-section>
                  <q-item-section>{{ ver.name }}</q-item-section>
                </q-item>
                <q-item v-if="frontendVersions.length === 0">
                  <q-item-section class="text-grey">No versions found</q-item-section>
                </q-item>
              </q-list>
            </q-menu>
          </span>
          <!-- update check -->
          <q-chip
            v-if="updateAvailable"
            class="text-overline q-ml-sm"
            :color="dashWarningColor"
            icon="update"
            dense
            ><a :href="latestReleaseURL" target="_blank"
              >v{{ latestTRMMVersion }} available</a
            ></q-chip
          >
          <!-- cert expiring soon check -->
          <q-chip
            v-if="daysUntilCertExpires <= 15"
            dense
            :color="dashNegativeColor"
            text-color="black"
            icon="warning"
            >SSL certificate expires in {{ daysUntilCertExpires }} days</q-chip
          >
        </q-toolbar-title>
        <!-- temp dark mode toggle -->
        <q-toggle
          v-model="dashboardSettings.darkMode"
          class="q-mr-sm"
          checked-icon="nights_stay"
          unchecked-icon="wb_sunny"
        />
        <!-- web terminal button -->
        <q-btn
          v-if="!hosted"
          label=">_"
          dense
          flat
          class="q-mr-sm"
          style="font-size: 16px"
          @click="openWebTerm"
        />
        <!-- Devices Chip -->
        <q-chip class="cursor-pointer">
          <q-avatar size="md" icon="devices" color="primary" />
          <q-tooltip :delay="600" anchor="top middle" self="top middle">Agent Count</q-tooltip>
          {{ serverCount + workstationCount }}
          <q-menu>
            <q-list dense>
              <q-item-label header>Servers</q-item-label>
              <q-item>
                <q-item-section avatar>
                  <q-icon name="dns" size="sm" color="primary" />
                </q-item-section>

                <q-item-section no-wrap>
                  <q-item-label>Total: {{ serverCount }}</q-item-label>
                </q-item-section>
              </q-item>
              <q-item>
                <q-item-section avatar>
                  <q-icon name="power_off" size="sm" :color="dashNegativeColor" />
                </q-item-section>

                <q-item-section no-wrap>
                  <q-item-label>Offline: {{ serverOfflineCount }}</q-item-label>
                </q-item-section>
              </q-item>
              <q-item-label header>Workstations</q-item-label>
              <q-item>
                <q-item-section avatar>
                  <q-icon name="computer" size="sm" color="primary" />
                </q-item-section>

                <q-item-section no-wrap>
                  <q-item-label>Total: {{ workstationCount }}</q-item-label>
                </q-item-section>
              </q-item>
              <q-item>
                <q-item-section avatar>
                  <q-icon name="power_off" size="sm" :color="dashNegativeColor" />
                </q-item-section>

                <q-item-section no-wrap>
                  <q-item-label>Offline: {{ workstationOfflineCount }}</q-item-label>
                </q-item-section>
              </q-item>
            </q-list>
          </q-menu>
        </q-chip>

        <AlertsIcon />

        <q-btn-dropdown flat no-caps stretch :label="displayName || ''">
          <q-list>
            <q-item v-ripple v-close-popup clickable @click="showUserPreferences">
              <q-item-section>
                <q-item-label>Preferences</q-item-label>
              </q-item-section>
            </q-item>
            <q-item clickable>
              <q-item-section>Account</q-item-section>
              <q-item-section side>
                <q-icon name="keyboard_arrow_right" />
              </q-item-section>

              <q-menu anchor="top end" self="top start">
                <q-list>
                  <q-item v-ripple v-close-popup clickable @click="resetPassword">
                    <q-item-section>
                      <q-item-label>Reset Password</q-item-label>
                    </q-item-section>
                  </q-item>
                  <q-item v-ripple v-close-popup clickable @click="reset2FA">
                    <q-item-section>
                      <q-item-label>Reset 2FA</q-item-label>
                    </q-item-section>
                  </q-item>
                </q-list>
              </q-menu>
            </q-item>
            <q-item to="/expired" exact>
              <q-item-section>
                <q-item-label>Logout</q-item-label>
              </q-item-section>
            </q-item>
          </q-list>
        </q-btn-dropdown>
      </q-toolbar>
    </q-header>
    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>
<script setup lang="ts">
// composition imports
import { computed, onMounted, ref } from "vue";
import { useQuasar } from "quasar";
import { useIntervalFn } from "@vueuse/shared";
import { useDashboardStore, useAuthStore } from "src/stores/api";
import { useUserStore } from "src/core/accounts/api";
import { notifyError } from "src/utils/notify";

// webtermn
import { checkWebTermPerms, openWebTerminal } from "src/core/settings/api";
import axios from "axios";

// ui imports
import AlertsIcon from "src/core/alerts/components/AlertsIcon.vue";
import UserPreferences from "src/core/accounts/components/UserPreferences.vue";
import ResetPass from "src/core/accounts/components/ResetPass.vue";

const $q = useQuasar();

// setup stores
const { userResetMFA } = useUserStore();

const {
  serverCount,
  serverOfflineCount,
  workstationCount,
  workstationOfflineCount,
  daysUntilCertExpires,
  reloadNeeded,
  updateAvailable,
  dashboardSettings,
  reload,
  refreshDashboard,
  checkRmmVersion,
  getDashInfo,
} = useDashboardStore();

const { displayName } = useAuthStore();

const currentTRMMVersion = computed(() => dashboardSettings.currentTRMMVersion);
const latestTRMMVersion = computed(() => dashboardSettings.latestTRMMVersion);
const hosted = computed(() => dashboardSettings.hosted);
const tokenExpired = computed(() => dashboardSettings.tokenExpired);
const dashWarningColor = computed(() => dashboardSettings.dashWarningColor);
const dashNegativeColor = computed(() => dashboardSettings.dashNegativeColor);

const latestReleaseURL = computed(() => {
  return latestTRMMVersion.value
    ? `https://github.com/amidaware/tacticalrmm/releases/tag/v${latestTRMMVersion.value}`
    : "";
});

function showUserPreferences() {
  $q.dialog({
    component: UserPreferences,
  });
}

function resetPassword() {
  $q.dialog({
    component: ResetPass,
  });
}

function reset2FA() {
  $q.dialog({
    title: "Reset 2FA",
    message: "Are you sure you would like to reset your 2FA token?",
    cancel: true,
    persistent: true,
  }).onOk(() => void userResetMFA());
}

async function openWebTerm() {
  try {
    const { message, status } = await checkWebTermPerms();
    if (status === 412) {
      notifyError(message);
    } else {
      openWebTerminal();
    }
  } catch (e) {
    console.error(e);
  }
}

// frontend version switching
interface FrontendVersion {
  name: string;
  active: boolean;
}

const frontendVersions = ref<FrontendVersion[]>([]);

async function loadFrontendVersions() {
  try {
    const { data } = await axios.get("/core/frontendversions/");
    frontendVersions.value = data.versions;
  } catch (e) {
    console.error("Failed to load frontend versions", e);
  }
}

async function switchFrontendVersion(versionName: string) {
  try {
    await axios.post("/core/frontendversions/switch/", { version: versionName });
    $q.notify({
      color: "positive",
      message: `Switched to frontend version: ${versionName}`,
      caption: "Reloading page...",
      timeout: 1500,
    });
    setTimeout(() => location.reload(), 1500);
  } catch (e) {
    console.error("Failed to switch frontend version", e);
  }
}

onMounted(() => {
  checkRmmVersion();
  void getDashInfo();
});

useIntervalFn(
  () => {
    checkRmmVersion();
    void getDashInfo();
  },
  60 * 4 * 1000,
  { immediate: true },
);
</script>
