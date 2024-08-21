module.exports = {
  extends: [
    "plugin:markdownlint/recommended",
  ],
  "parser": "eslint-plugin-markdownlint/parser",
  "parserOptions": {
    "ecmaVersion": "latest",
    "sourceType": "module",
    "ecmaFeatures": {
      "jsx": true
    },
  },
  rules: {
    "markdownlint/md001": "off",
    "markdownlint/md003": "warn",
    "markdownlint/md025": ["error", {
      "level": 2
    }]
  }
};