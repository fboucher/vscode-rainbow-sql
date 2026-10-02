# Rainbow SQL

Rainbow SQL is a Visual Studio Code extension inspired by [Rainbow CSV](https://github.com/mechatroner/vscode_rainbow_csv).

It brings the readability of rainbow column colorization to SQL `INSERT` statements by coloring column names and their corresponding values with matching rainbow colors, while preserving standard SQL syntax highlighting on keywords, parentheses, commas, and other statements.

---

## ✨ Features

- 🌈 **Rainbow Column-Value Matching**: Automatically pairs each column name in `INSERT INTO table (col1, col2, ...)` with its value in `VALUES (val1, val2, ...)` using matching foreground colors.
- 📑 **Single-Row & Multi-Row Support**: Works smoothly with single-line inserts, multi-line statements, and multi-row tuples:
  ```sql
  INSERT INTO items (id, code, price)
  VALUES
    (101, 'ITEM_A', 19.99),
    (102, 'ITEM_B', 24.50);
  ```
- 🔍 **Interactive Column Hover Tooltips**: Hover over any value or column name to see its column number, column name, table name, and row position (e.g. `Column #4: health_points`).
- 📌 **Active Column Status Bar Tracking**: Moving the cursor through columns or values instantly displays the current column name and index in the VS Code status bar (`Col #4: health_points`).
- ⚠️ **Column & Value Count Mismatch Alerts**: Instantly flags rows where the number of values does not match the number of declared columns with alert decorations and informative hover warnings (e.g., *Expected 14 values, found 13*).
- 🌓 **Theme-Aware Palettes**: Ships with distinct, accessible palettes for Dark and Light VS Code themes, fully customizable in settings.
- ⚡ **Zero-Dependency & High Performance**: Includes a custom, robust SQL tokenizer that handles quotes (`'...'`, `''`, `\'`), comments (`--`, `/* */`), nested expressions (`COALESCE(...)`, `(1 + 2)`), and dialect identifiers (`col`, `"col"`, `` `col` ``, `[col]`).

---

## 🚀 Quick Start / How to Run

1. Open this repository in VS Code.
2. Press `F5` to open the **Extension Development Host**.
3. Open [`sample.sql`](./sample.sql) to see the colors, hover tooltips, and status bar in action!

---

## ⚙️ Extension Settings

| Setting | Type | Default | Description |
|---|---|---|---|
| `rainbowSql.enabled` | `boolean` | `true` | Enable or disable Rainbow SQL column highlighting. |
| `rainbowSql.enableHover` | `boolean` | `true` | Show column name and index on hover over values. |
| `rainbowSql.enableStatusBar` | `boolean` | `true` | Show active column under cursor in the status bar. |
| `rainbowSql.highlightMismatches` | `boolean` | `true` | Highlight rows where the number of values does not match columns. |
| `rainbowSql.darkColors` | `string[]` | *10 Colors* | Custom hex color codes for Dark theme. |
| `rainbowSql.lightColors` | `string[]` | *10 Colors* | Custom hex color codes for Light theme. |

---

## ⌨️ Commands

- `Rainbow SQL: Toggle Rainbow SQL Highlighting`: Quickly toggle rainbow highlighting on or off from the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`).

---

## 🧪 Running Tests

```bash
npm test
```
Runs the automated test suite covering single-row, multi-row, multi-line, nested expressions, escaped quotes, and mismatch detection.
