import pluginVue from 'eslint-plugin-vue'
import { withVueTs, vueTsConfigs } from '@vue/eslint-config-typescript'
import prettierConfig from '@vue/eslint-config-prettier'

export default withVueTs(
  {
    ignores: ['dist/**'],
  },
  pluginVue.configs['flat/recommended'],
  vueTsConfigs.recommended,
  prettierConfig,
  {
    rules: {
      // useMediaController() hands back a controller object whose refs are meant to be
      // written to by consumers (e.g. media.youtubeVideoId.value = id) — only guard
      // against reassigning the prop itself.
      'vue/no-mutating-props': ['error', { shallowOnly: true }],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', destructuredArrayIgnorePattern: '^_' },
      ],
      // `cond ? doA() : doB()` for side effects reads fine here and is used throughout.
      '@typescript-eslint/no-unused-expressions': [
        'error',
        { allowTernary: true, allowShortCircuit: true },
      ],
    },
  },
)
