<template>
  <div class="preview-shell">
    <div class="preview-controls">
      <button class="skip-btn" type="button" @click="emit('skip', -5)">← 5s</button>
      <button class="play-btn play-btn-lg" type="button" :aria-label="isPlaying ? '暫停' : '播放'" @click="emit('toggle-play')">
        <Pause v-if="isPlaying" :size="22" fill="currentColor" />
        <Play v-else :size="22" fill="currentColor" />
      </button>
      <button class="skip-btn" type="button" @click="emit('skip', 5)">5s →</button>
      <span class="preview-time">{{ formatClock(playheadMs) }}</span>
    </div>
    <div class="karaoke">
      <div v-if="timedLines.length === 0" class="empty-state">
        <span class="empty-state-icon">♫</span>
        <p>尚未有任何時間標記歌詞</p>
        <p class="empty-state-note">請至「製作時間同步」為歌詞打上時間軸</p>
      </div>
      <button
        v-for="line in timedLines"
        :id="'preview-line-' + line.id"
        :key="line.id"
        class="karaoke-line"
        :class="{ 'is-active': activeLineId === line.id }"
        type="button"
        @click="emit('seek', line.startMs ?? 0)"
      >{{ line.text || '空白行' }}</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Pause, Play } from '@lucide/vue'
import type { LyricLine } from '../types'
import { formatClock } from '../utils/lyric-format'

defineProps<{
  timedLines: LyricLine[]
  activeLineId: string | null
  playheadMs: number
  isPlaying: boolean
}>()

const emit = defineEmits<{
  (event: 'toggle-play'): void
  (event: 'skip', seconds: number): void
  (event: 'seek', ms: number): void
}>()
</script>
