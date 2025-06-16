module.exports = {
  root: true,
  parser: 'vue-eslint-parser',
  overrides: [{
    files: ['*.ts'],
    parser: '@typescript-eslint/parser',
  }],
  plugins: [
    '@typescript-eslint',
  ],
  env: {
    jest: true,
    browser: true,
  },
  parserOptions: {
    ecmaVersion: 'latest',
    parser: {
      ts: '@typescript-eslint/parser',
    },
  },
  extends: [
    'plugin:vue/vue3-recommended',
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  rules: {
    'semi': ['error', 'never'],
    'quotes': ['error', 'single', {
      avoidEscape: true,
      allowTemplateLiterals: true,
    }],
    'comma-dangle': ['error', 'always-multiline'],
    '@typescript-eslint/consistent-type-imports': 'error',
    '@typescript-eslint/no-inferrable-types': 'off',
    '@typescript-eslint/ban-ts-comment': 'off',
    // for now, explicit any is fine!
    '@typescript-eslint/no-explicit-any': 'off',
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': [
      'warn',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '(^log$|^_)',
        caughtErrorsIgnorePattern: '^_',
      },
    ],
  },
}
