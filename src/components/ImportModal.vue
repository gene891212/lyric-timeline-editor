<template>
  <div v-if="visible" class="modal-backdrop" @click.self="close">
    <section class="modal" role="dialog" aria-modal="true" aria-labelledby="import-title">
      <div class="modal-heading">
        <div>
          <span class="content-kicker">IMPORT</span>
          <h2 id="import-title">匯入歌詞</h2>
        </div>
        <button class="modal-close" type="button" @click="close">×</button>
      </div>
      <label class="drop-zone compact-drop" for="import-file">
        <span class="drop-icon">↥</span>
        <strong>選擇 LRC、SRT 或 TXT</strong>
        <span>也可以直接在下方貼上內容</span>
        <input id="import-file" type="file" accept=".lrc,.srt,.txt,text/plain" @change="handleFile" />
      </label>
      <label class="field-label" for="import-text">歌詞內容</label>
      <textarea id="import-text" v-model="text" class="modal-textarea" placeholder="貼上 LRC、SRT 或純文字歌詞。"></textarea>
      <p class="modal-hint">ⓘ 純文字會保留為未定時歌詞。</p>
      <div class="modal-actions">
        <button class="btn btn-secondary" type="button" @click="close">取消</button>
        <button class="btn btn-primary" type="button" :disabled="!text.trim()" @click="submit">匯入內容</button>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

defineProps<{ visible: boolean }>()
const emit = defineEmits<{
  (event: 'update:visible', value: boolean): void
  (event: 'import', text: string): void
}>()

const text = ref('')

const close = () => emit('update:visible', false)

const handleFile = async (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (file) text.value = await file.text()
}

const submit = () => {
  const content = text.value.trim()
  if (!content) return
  emit('import', content)
  close()
}
</script>

<style scoped>
.compact-drop {
  margin-bottom: 17px;
}

.modal-hint {
  margin: 9px 0;
  color: var(--subtle);
  font-size: 11px;
}
</style>
