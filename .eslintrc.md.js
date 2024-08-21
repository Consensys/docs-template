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
    // https://github.com/DavidAnson/markdownlint?tab=readme-ov-file
    "markdownlint/md001": "off",
    "markdownlint/md003": "warn",
    "markdownlint/md013": ["error", {
      "line_length": 100,
      "code_block_line_length": 100,
      "code_blocks": true,
    }],
    "markdownlint/md025": ["error", {
      "level": 2
    }]
  }
};