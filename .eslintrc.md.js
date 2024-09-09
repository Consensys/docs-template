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
    // line length
    "markdownlint/md013": ["error", {
      "line_length": 100,
      "code_block_line_length": 100,
      "code_blocks": true,
    }],
    // allow headings with the same content
    "markdownlint/md024": "off",
    // allow multiple ## and # in the same file
    "markdownlint/md025": ["error", {
      "level": 3
    }],
    // allow inline html
    "markdownlint/md033": "off",
    // allowed here, not for real docs
    "markdownlint/md051": "off",
  }
};