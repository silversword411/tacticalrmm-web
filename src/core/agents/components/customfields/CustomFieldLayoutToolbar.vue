<template>
  <div class="row items-center q-pa-xs q-mb-sm">
    <q-space />
    <q-btn
      :icon="isEditMode ? 'check' : 'edit'"
      :label="isEditMode ? 'Done' : 'Edit Layout'"
      dense
      flat
      no-caps
      :color="isEditMode ? 'positive' : 'primary'"
      size="sm"
      @click="$emit('toggle-edit')"
    />
    <q-btn
      v-if="isEditMode"
      icon="restart_alt"
      label="Reset"
      dense
      flat
      no-caps
      color="grey"
      size="sm"
      class="q-ml-sm"
      @click="$emit('reset')"
    />
  </div>
</template>

<script lang="ts" setup>
defineProps<{
  isEditMode: boolean;
}>();

defineEmits<{
  "toggle-edit": [];
  reset: [];
}>();
</script>
