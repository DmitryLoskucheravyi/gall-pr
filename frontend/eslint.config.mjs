import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactNative from 'eslint-plugin-react-native';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['node_modules/**', 'android/**', 'dist/**'] },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  react.configs.flat.recommended,
  react.configs.flat['jsx-runtime'],
  eslintPluginPrettierRecommended,
  {
    plugins: { 'react-hooks': reactHooks, 'react-native': reactNative },
    languageOptions: {
      globals: {
        ...globals.browser,
        ...reactNative.environments['react-native'].globals,
        __DEV__: 'readonly',
      },
    },
    settings: { react: { version: 'detect' } },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_' },
      ],
      'react/prop-types': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'prettier/prettier': ['error', { endOfLine: 'auto' }],
    },
  },
);
