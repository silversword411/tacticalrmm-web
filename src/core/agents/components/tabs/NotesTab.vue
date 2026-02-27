<template>
  <div v-if="selectedAgentIds.length === 0" class="q-pa-sm">No agent selected</div>
  <div v-else-if="selectedAgentIds.length > 1"></div>
  <div v-else class="notes-tab-root">
    <!-- Toolbar -->
    <div class="notes-toolbar row items-center no-wrap q-px-sm q-py-xs">
      <q-btn
        dense
        flat
        icon="refresh"
        class="q-mr-xs"
        @click="selectedAgentId && getAgentNotes(selectedAgentId, { force: true })"
      />
      <q-btn icon="add" label="Add Note" no-caps dense flat @click="addNote" />
      <!-- Timeline strip -->
      <div v-if="agentNotes.length > 0" class="timeline-strip row items-center no-wrap overflow-auto q-mx-sm col q-px-md">
        <template v-for="(note, index) in agentNotes" :key="note.id">
          <div class="timeline-item col-auto column items-center" @click="scrollToNote(note.id)">
            <div
              class="timeline-dot"
              :class="hoveredNoteId === note.id ? 'timeline-dot--active' : ''"
              @mouseenter="hoveredNoteId = note.id"
              @mouseleave="hoveredNoteId = null"
            >
              <q-tooltip anchor="top middle" self="bottom middle" :offset="[0, 4]">
                {{ formatDate(note.entry_time) }}<br />{{ note.username }}
              </q-tooltip>
            </div>
            <div class="timeline-label text-grey-6 q-mt-xs">
              {{ shortDate(note.entry_time) }}
            </div>
          </div>
          <div v-if="index < agentNotes.length - 1" class="timeline-connector" />
        </template>
      </div>
      <q-space v-else />
      <tactical-table-export />
    </div>

    <q-separator />

    <!-- Notes list -->
    <q-scroll-area :style="{ height: `${tabHeight - 44}px` }" class="notes-scroll">
      <q-inner-loading :showing="isLoading" color="primary" />

      <div v-if="!isLoading && agentNotes.length === 0" class="q-pa-md text-grey-6 text-center">
        No notes
      </div>

      <div class="notes-grid q-pa-sm">
        <div
          v-for="note in agentNotes"
          :key="note.id"
          :ref="(el) => setNoteRef(el, note.id)"
          class="note-card"
        >
          <q-card bordered flat class="note-card-inner">
            <q-card-section class="note-header row items-center no-wrap q-py-xs q-px-sm">
              <q-icon name="far fa-sticky-note" color="primary" size="xs" class="q-mr-sm" />
              <div class="col-auto">
                <div class="text-subtitle2">{{ formatDate(note.entry_time) }}</div>
                <div class="text-caption text-grey-6">{{ note.username }}</div>
              </div>
              <q-space />
              <div class="col-auto">
                <q-btn color="grey-6" flat round dense icon="edit" size="xs" @click="editNote(note)">
                  <q-tooltip>Edit</q-tooltip>
                </q-btn>
                <q-btn color="negative" flat round dense icon="delete" size="xs" @click="deleteNote(note)">
                  <q-tooltip>Delete</q-tooltip>
                </q-btn>
              </div>
            </q-card-section>
            <q-separator />
            <q-card-section class="q-pa-sm">
              <pre class="note-pre">{{ note.note }}</pre>
            </q-card-section>
          </q-card>
        </div>
      </div>
    </q-scroll-area>
  </div>
</template>

<script lang="ts" setup>
// composition imports
import { ref, watch, onMounted } from "vue";
import { useQuasar } from "quasar";
import { useAgentNoteStore, useAgentStore, useDashboardStore } from "src/stores/api";

const { agentNotes, getAgentNotes, addAgentNote, updateAgentNote, removeAgentNote } = useAgentNoteStore();
const { selectedAgentId, selectedAgentIds, isLoading } = useAgentStore();
const { tabHeight, formatDate } = useDashboardStore();

// type imports
import type { AgentNote } from "../../types";

// setup quasar
const $q = useQuasar();

const hoveredNoteId = ref<number | null>(null);
const noteRefs = ref<Map<number, Element>>(new Map());

function setNoteRef(el: unknown, id: number) {
  if (el instanceof Element) noteRefs.value.set(id, el);
  else noteRefs.value.delete(id);
}

function scrollToNote(id: number) {
  noteRefs.value.get(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function shortDate(val: string) {
  const d = new Date(val);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function addNote() {
  $q.dialog({
    title: "Add Note",
    prompt: {
      model: "",
      type: "textarea",
      isValid: (val) => !!val,
    },
    color: "primary",
    style: "min-width: 50vw",
    ok: { label: "Add" },
    cancel: true,
  }).onOk((data: string) => {
    if (selectedAgentId.value)
      void addAgentNote({
        agent_id: selectedAgentId.value,
        note: data,
      });
  });
}

function editNote(note: AgentNote) {
  $q.dialog({
    title: "Edit Note",
    prompt: {
      model: note.note,
      type: "textarea",
      isValid: (val) => !!val,
      autogrow: true,
    },
    color: "primary",
    style: "width: 80vw; max-width: 80vw",
    ok: { label: "Save" },
    cancel: true,
  }).onOk((data) => {
    void updateAgentNote(note.id, { note: data });
  });
}

function deleteNote(note: AgentNote) {
  $q.dialog({
    title: "Delete note?",
    cancel: true,
    ok: { label: "Delete", color: "negative" },
    color: "primary",
  }).onOk(() => {
    void removeAgentNote(note.id);
  });
}

watch(selectedAgentId, (newValue) => {
  if (newValue) getAgentNotes(newValue);
});

onMounted(() => {
  if (selectedAgentId.value) getAgentNotes(selectedAgentId.value);
});
</script>

<style lang="sass" scoped>
.notes-tab-root
  display: flex
  flex-direction: column
  height: 100%

.timeline-strip
  gap: 0

.timeline-item
  cursor: pointer

.timeline-dot
  width: 8px
  height: 8px
  border-radius: 50%
  background: rgba(128, 128, 128, 0.5)
  transition: background 0.15s
  &--active
    background: var(--q-primary)

.timeline-connector
  height: 1px
  background: rgba(128, 128, 128, 0.3)
  min-width: 8px
  flex: 1

.timeline-label
  font-size: 9px
  white-space: nowrap

.notes-grid
  display: flex
  flex-wrap: wrap
  align-items: flex-start
  gap: 8px

.note-card
  min-width: 200px
  max-width: 1000px
  flex: 1 1 200px

.note-card-inner
  height: 100%

.note-pre
  white-space: pre-wrap
  word-break: break-word
  font-family: inherit
  margin: 0
  font-size: 0.85rem
  line-height: 1.5
</style>
