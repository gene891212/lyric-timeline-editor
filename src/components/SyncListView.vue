<template>
  <div class="sync-banner">
    <span class="msg">
      <template v-if="stampMode === 'lrc'"
        >LRC 單點：按下 <kbd>Space</kbd> 記錄開始時間並跳至下一行。</template
      >
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
            <span class="line-time">{{
              line.startMs === null ? '—' : formatClock(line.startMs)
            }}</span>
          </template>
          <template v-else>
            <span class="line-time">{{
              line.startMs === null ? '—' : formatClock(line.startMs)
            }}</span>
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
        >
          清除時間
        </button>
        <button class="line-action" type="button" @click.stop="emit('stamp', line.id)">
          {{ stampButtonLabel(line) }}
        </button>
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
  props.stampMode === 'lrc'
    ? '打點'
    : line.startMs !== null && line.endMs === null
      ? '結束'
      : '開始'
</script>

<style scoped>
.sync-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 10px 13px;
  border: 1px solid var(--border);
  border-left: 3px solid var(--violet);
  border-radius: 5px;
  background: var(--soft);
  color: var(--muted);
  font-size: 12px;
}

.sync-list {
  flex: 1;
  min-height: 380px;
  max-height: 520px;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 6px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--lx-ink-25);
}

.sync-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border: 1px solid transparent;
  border-radius: 4px;
  background: #fff;
  cursor: pointer;
  transition:
    background var(--dur-1) var(--ease-out),
    border-color var(--dur-1) var(--ease-out);
}

.sync-line:hover {
  border-color: #adbce0;
  background: var(--lx-navy-50);
}

.sync-line.is-active {
  border-color: #b3aad7;
  background: var(--lx-violet-50);
}

.sync-line.is-playing {
  box-shadow: none;
}

.sync-line-main {
  min-width: 0;
  flex: 1;
  display: flex;
  align-items: center;
  gap: 9px;
}

.line-number {
  width: 23px;
  color: var(--subtle);
  font: 10px var(--mono);
  text-align: right;
}

.line-time-fields {
  display: flex;
  align-items: center;
  gap: 4px;
  flex: none;
  color: var(--subtle);
  font: 10px var(--mono);
}

.sync-line-actions {
  display: flex;
  align-items: center;
  gap: 5px;
  flex: none;
}

.line-action {
  padding: 5px 7px;
  border: 0;
  border-radius: 4px;
  background: var(--soft);
  color: #1f3a82;
  font-size: 10px;
  font-weight: 700;
}

.sync-banner kbd {
  padding: 1px 6px;
  border: 1px solid var(--border-1);
  border-radius: var(--r-1);
  background: #fff;
  color: var(--lx-navy-700);
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 500;
}

.sync-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-3);
  padding: var(--sp-3) var(--sp-4);
  border: 1px solid var(--border-1);
  border-left: 3px solid var(--lx-violet-500);
  border-radius: var(--r-2);
  background: var(--bg-3);
  font-size: var(--fs-13);
}

.sync-banner .msg {
  color: var(--fg-1);
}

.sync-list {
  min-height: 380px;
  max-height: 520px;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  overflow-y: auto;
  padding: 6px;
  border: 1px solid var(--border-1);
  border-radius: var(--r-3);
  background: var(--bg-2);
}

.sync-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-3);
  padding: 10px 12px;
  border: 1px solid transparent;
  border-radius: var(--r-2);
  background: #fff;
  cursor: pointer;
  transition:
    background var(--dur-1) var(--ease-out),
    border-color var(--dur-1) var(--ease-out);
}

.sync-line:hover {
  border-color: var(--border-1);
  background: var(--lx-ink-25);
}

.sync-line.is-active {
  border-color: var(--lx-violet-200);
  background: var(--lx-violet-50);
}

.sync-line.is-playing {
  box-shadow: none;
}

.sync-line-main {
  min-width: 0;
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10px;
}

.line-number {
  width: 22px;
  flex-shrink: 0;
  color: var(--fg-3);
  font-family: var(--font-mono);
  font-size: 11px;
  text-align: right;
}

.line-time-fields {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  color: var(--fg-3);
  font-family: var(--font-mono);
  font-size: 11px;
}

.line-time {
  min-width: 62px;
  padding: 3px 6px;
  border-radius: var(--r-1);
  background: var(--bg-3);
  color: var(--lx-navy-700);
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 500;
  text-align: center;
}

.line-text {
  min-width: 0;
  flex: 1;
  overflow: hidden;
  color: var(--fg-1);
  font-size: var(--fs-14);
  line-height: 1.4;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sync-line.is-active .line-text {
  color: var(--lx-navy-800);
  font-weight: 500;
}

.sync-line-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.sync-line-actions .line-number {
  display: none;
}

.line-action {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: var(--r-1);
  background: var(--bg-3);
  color: var(--fg-2);
  font-size: 11px;
  font-weight: 500;
}

.line-action:hover {
  background: var(--lx-navy-500);
  color: #fff;
}

.sync-line.is-playing {
  border-color: var(--lx-violet-300);
  background: var(--lx-violet-50);
  box-shadow: none;
}

.sync-line.is-playing .line-text {
  color: var(--lx-navy-800);
  font-weight: 700;
}

.line-text {
  font-family: var(--font-lyrics);
}

@media (max-width: 1080px) {
  .line-time-fields {
    display: none;
  }
}

@media (max-width: 620px) {
  .sync-banner {
    align-items: flex-start;
    flex-direction: column;
  }

  .sync-line-main {
    align-items: flex-start;
    flex-direction: column;
    gap: 5px;
  }

  .sync-line-actions {
    flex-direction: column;
  }

  .line-number {
    text-align: left;
  }
}

@media (max-width: 720px) {
  .sync-banner {
    align-items: flex-start;
    flex-direction: column;
  }

  .line-time-fields {
    display: none;
  }
}
</style>
