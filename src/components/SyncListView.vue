<template>
  <div class="sync-banner">
    <span class="msg">
      <template v-if="stampMode === 'lrc'">LRC 單點：按下 <kbd>Space</kbd> 記錄開始時間並跳至下一行。</template>
      <template v-else>SRT 區間：按第一次記錄開始，按第二次記錄結束並跳至下一行。</template>
    </span>
  </div>
  <div class="sync-list" aria-label="歌詞同步列表">
    <div v-if="lines.length === 0" class="list-empty">
      <span class="empty-kicker">NO LYRICS</span>
      <strong>尚無歌詞文字</strong>
      <span>回到第一步貼上歌詞後開始同步。</span>
    </div>
    <article
      v-for="(line, index) in lines"
      :id="'sync-line-' + line.id"
      :key="line.id"
      class="sync-line"
      :class="{ 'is-active': activeLineId === line.id }"
      @click="emit('select', line)"
    >
      <div class="sync-line-main">
        <span class="line-number">{{ String(index + 1).padStart(2, '0') }}</span>
        <div class="line-time-fields">
          <template v-if="stampMode === 'lrc'">
            <span class="line-time">{{ line.startMs === null ? '—' : formatClock(line.startMs) }}</span>
          </template>
          <template v-else>
            <span class="line-time">{{ line.startMs === null ? '—' : formatClock(line.startMs) }}</span>
            <span>→</span>
            <span class="line-time">{{ line.endMs === null ? '—' : formatClock(line.endMs) }}</span>
          </template>
        </div>
        <span class="line-text">{{ line.text }}</span>
      </div>
      <div class="sync-line-actions">
        <span class="line-number">{{ String(index + 1).padStart(2, '0') }}</span>
        <button
          v-if="line.startMs !== null || line.endMs !== null"
          class="line-action"
          type="button"
          @click.stop="emit('clear-stamp', line.id)"
        >清除時間</button>
        <button class="line-action" type="button" @click.stop="emit('stamp', line.id)">{{ stampButtonLabel(line) }}</button>
      </div>
    </article>
  </div>
</template>

<script setup lang="ts">
import type { LyricLine } from '../types'
import { formatClock } from '../utils/lyric-format'

type StampMode = 'lrc' | 'srt'

const props = defineProps<{
  lines: LyricLine[]
  activeLineId: string | null
  stampMode: StampMode
}>()

const emit = defineEmits<{
  (event: 'select', line: LyricLine): void
  (event: 'clear-stamp', id: string): void
  (event: 'stamp', id: string): void
}>()

const stampButtonLabel = (line: LyricLine) =>
  props.stampMode === 'lrc' ? '打點' : line.startMs !== null && line.endMs === null ? '結束' : '開始'
</script>
