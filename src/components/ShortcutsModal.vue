<template>
  <div v-if="visible" class="modal-backdrop" @click.self="close">
    <section class="modal" role="dialog" aria-modal="true" aria-labelledby="guide-title">
      <div class="modal-heading">
        <div>
          <span class="content-kicker">QUICK GUIDE</span>
          <h2 id="guide-title">使用說明</h2>
        </div>
        <button class="modal-close" type="button" @click="close">×</button>
      </div>
      <div class="guide-grid">
        <article><span class="guide-number">01</span><h3>輸入歌詞</h3><p>貼上純文字、LRC 或 SRT。</p></article>
        <article><span class="guide-number">02</span><h3>同步時間</h3><p>列表適合逐行打點，時間軸適合微調。</p></article>
        <article><span class="guide-number">03</span><h3>接上媒體</h3><p>支援 YouTube、本機音檔與無媒體預覽。</p></article>
        <article><span class="guide-number">04</span><h3>輸出成果</h3><p>匯出 LRC 或 SRT 並下載。</p></article>
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
defineProps<{ visible: boolean }>()
const emit = defineEmits<{ (event: 'update:visible', value: boolean): void }>()
const close = () => emit('update:visible', false)
</script>
