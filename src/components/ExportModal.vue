<template>
  <div v-if="visible" class="modal-backdrop" @click.self="close">
    <section class="modal" role="dialog" aria-modal="true" aria-labelledby="export-title">
      <div class="modal-heading">
        <div>
          <span class="content-kicker">EXPORT</span>
          <h2 id="export-title">匯出歌詞</h2>
        </div>
        <button class="modal-close" type="button" aria-label="關閉匯出視窗" @click="close">
          <X :size="18" />
        </button>
      </div>
      <div class="format-picker">
        <button class="format-option" :class="{ 'is-active': format === 'srt' }" type="button" @click="emit('update:format', 'srt')">
          <FileText :size="14" />SRT
        </button>
        <button class="format-option" :class="{ 'is-active': format === 'lrc' }" type="button" @click="emit('update:format', 'lrc')">
          <FileText :size="14" />LRC
        </button>
      </div>
      <textarea class="modal-textarea export-preview" :value="text" readonly></textarea>
      <div class="modal-actions">
        <button class="btn btn-secondary" type="button" @click="emit('copy')">
          <Copy :size="15" />複製內容
        </button>
        <button class="btn btn-primary" type="button" @click="emit('download')">
          <Download :size="15" />下載檔案
        </button>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { Copy, Download, FileText, X } from '@lucide/vue'
import type { ExportFormat } from '../types'

defineProps<{ visible: boolean; format: ExportFormat; text: string }>()
const emit = defineEmits<{
  (event: 'update:visible', value: boolean): void
  (event: 'update:format', value: ExportFormat): void
  (event: 'copy'): void
  (event: 'download'): void
}>()

const close = () => emit('update:visible', false)
</script>
