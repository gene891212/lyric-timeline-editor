<template>
  <div v-if="visible" class="modal-backdrop" @click.self="close">
    <section class="modal" role="dialog" aria-modal="true" aria-labelledby="guide-title">
      <div class="modal-heading">
        <div>
          <span class="content-kicker">QUICK GUIDE</span>
          <h2 id="guide-title">使用說明</h2>
        </div>
        <button class="modal-close" type="button" aria-label="關閉使用說明" @click="close">
          <X :size="18" />
        </button>
      </div>
      <div class="guide-grid">
        <article>
          <span class="guide-number">01</span>
          <h3>輸入歌詞</h3>
          <p>貼上純文字、LRC 或 SRT。</p>
        </article>
        <article>
          <span class="guide-number">02</span>
          <h3>同步時間</h3>
          <p>列表適合逐行打點，時間軸適合微調。</p>
        </article>
        <article>
          <span class="guide-number">03</span>
          <h3>接上媒體</h3>
          <p>支援 YouTube、本機音檔與無媒體預覽。</p>
        </article>
        <article>
          <span class="guide-number">04</span>
          <h3>輸出成果</h3>
          <p>匯出 LRC 或 SRT 並下載。</p>
        </article>
      </div>
      <div class="guide-shortcuts">
        <div><kbd>Space</kbd><span>列表打點 / 時間軸播放</span></div>
        <div><kbd>Ctrl/Cmd + Z</kbd><span>復原</span></div>
        <div><kbd>Shift + Ctrl/Cmd + Z</kbd><span>重做</span></div>
        <div><kbd>Delete</kbd><span>刪除時間軸選取</span></div>
      </div>
      <div class="modal-actions">
        <button class="btn btn-primary" type="button" @click="close">知道了</button>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { X } from '@lucide/vue'

defineProps<{ visible: boolean }>()
const emit = defineEmits<{ (event: 'update:visible', value: boolean): void }>()
const close = () => emit('update:visible', false)
</script>

<style scoped>
.guide-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.guide-grid article {
  padding: 14px;
  border: 1px solid #e8ecf3;
  border-radius: 6px;
  background: var(--soft);
}

.guide-grid h3 {
  margin: 8px 0 4px;
  color: var(--navy-dark);
  font-size: 14px;
}

.guide-grid p {
  margin: 0;
  color: var(--muted);
  font-size: 12px;
}

.guide-shortcuts {
  display: grid;
  gap: 8px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #e8ecf3;
}

.guide-shortcuts div {
  display: flex;
  gap: 10px;
  color: var(--muted);
  font-size: 12px;
}

@media (max-width: 620px) {
  .guide-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .guide-grid {
    grid-template-columns: 1fr;
  }
}
</style>
