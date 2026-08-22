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

<style scoped>
.preview-time {
  color: #182d66;
  font: 12px var(--mono);
}

.karaoke-line {
  max-width: 90%;
  padding: 4px 12px;
  border: 0;
  background: transparent;
  color: #b1b9c8;
  font-size: 20px;
  font-weight: 600;
}

.karaoke-line.is-active {
  color: var(--violet);
  font-size: 27px;
}

.play-btn-lg {
  width: 52px;
  height: 52px;
}

.preview-time {
  color: var(--fg-2);
  font-family: var(--font-mono);
  font-size: var(--fs-12);
}

.preview-shell {
  min-height: 460px;
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--sp-5);
}

.preview-controls {
  display: flex;
  align-items: center;
  gap: var(--sp-4);
  padding: 8px 18px;
  border: 1px solid var(--border-1);
  border-radius: 999px;
  background: #fff;
  box-shadow: var(--shadow-2);
}

.skip-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--fg-2);
  font-family: var(--font-mono);
  font-size: var(--fs-12);
  transition: color var(--dur-1) var(--ease-out);
}

.skip-btn:hover {
  color: var(--lx-navy-800);
}

.karaoke {
  width: 100%;
  max-height: 640px;
  flex: 1;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--sp-4);
  overflow-y: auto;
  padding: 80px var(--sp-4);
  border: 1px solid var(--border-1);
  border-radius: var(--r-3);
  background: linear-gradient(180deg, #fff 0%, rgba(255, 255, 255, 0) 12%, rgba(255, 255, 255, 0) 88%, #fff 100%), var(--bg-2);
  text-align: center;
}

.karaoke-line {
  max-width: 90%;
  padding: 4px 0;
  border: 0;
  background: transparent;
  color: var(--lx-ink-300);
  font-size: var(--fs-18);
  font-weight: 500;
  line-height: 1.4;
  cursor: pointer;
  transition: all var(--dur-3) var(--ease-out);
}

.karaoke-line:hover {
  color: var(--lx-ink-500);
}

.karaoke-line.is-active {
  color: var(--lx-violet-500);
  font-size: var(--fs-30);
  font-weight: 700;
  letter-spacing: var(--tracking-snug);
}

.karaoke-line {
  font-family: var(--font-lyrics);
}
</style>
