<template>
  <q-icon
    :name="icon"
    :size="size"
    color="primary"
    :class="['help-tip', position ? `help-tip--${position}` : '']"
  >
    <q-tooltip class="help-tip__tooltip" :max-width="maxWidth">
      <div v-if="title" class="help-tip__title">{{ title }}</div>
      <div v-for="(tip, i) in tips" :key="i" class="help-tip__row">
        <q-icon name="chevron_right" size="12px" class="help-tip__bullet" />
        <span
          ><b>{{ tip.key }}</b> {{ tip.text }}</span
        >
      </div>
    </q-tooltip>
  </q-icon>
</template>

<script lang="ts" setup>
export interface HelpTipItem {
  key: string;
  text: string;
}

export type HelpTipPosition = "top-left" | "top-right" | "bottom-left" | "bottom-right" | "inline";

withDefaults(
  defineProps<{
    tips: HelpTipItem[];
    title?: string;
    position?: HelpTipPosition;
    icon?: string;
    size?: string;
    maxWidth?: string;
  }>(),
  {
    title: "",
    position: "inline",
    icon: "help_outline",
    size: "16px",
    maxWidth: "280px",
  },
);
</script>

<style lang="sass" scoped>
.help-tip
  opacity: 0.5
  cursor: help
  transition: opacity 0.2s ease
  z-index: 1
  &:hover
    opacity: 1

.help-tip--top-left,
.help-tip--top-right,
.help-tip--bottom-left,
.help-tip--bottom-right
  position: absolute

.help-tip--top-left
  top: 0
  left: 0
  transform: translate(-80%, -50%)

.help-tip--top-right
  top: 0
  right: 0

.help-tip--bottom-left
  bottom: 0
  left: 0
  transform: translate(-100%, 50%)

.help-tip--bottom-right
  bottom: 0
  right: 0
  transform: translate(100%, 50%)
</style>

<style lang="sass">
.help-tip__tooltip
  padding: 8px 12px
  font-size: 12px
  line-height: 1.6

.help-tip__title
  font-weight: 600
  margin-bottom: 4px
  font-size: 13px

.help-tip__row
  display: flex
  align-items: center
  gap: 4px

.help-tip__bullet
  opacity: 0.6
  flex-shrink: 0
</style>
