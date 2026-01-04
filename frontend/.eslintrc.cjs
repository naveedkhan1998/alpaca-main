module.exports = {
  root: true,
  env: { browser: true, es2024: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs'],
  parser: '@typescript-eslint/parser',
  plugins: ['react-refresh'],
  rules: {
    'react-refresh/only-export-components': 'off',
    'react-hooks/set-state-in-effect': 'off',
    'react-refresh/only-export-components': 'off',
    'react-hooks/purity': 'off',
    'react-hooks/static-components': 'off',
  },
};
