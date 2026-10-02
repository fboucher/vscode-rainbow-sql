import * as vscode from 'vscode';
import { InsertStatement } from './types';
import { RainbowSqlConfig } from './config';

export class RainbowStatusBar {
  private statusBarItem: vscode.StatusBarItem;

  constructor() {
    this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  }

  public update(editor: vscode.TextEditor | undefined, statements: InsertStatement[]): void {
    if (!editor || !RainbowSqlConfig.isEnabled() || !RainbowSqlConfig.isStatusBarEnabled()) {
      this.statusBarItem.hide();
      return;
    }

    const pos = editor.selection.active;
    const info = this.findCursorColumnInfo(pos, statements);

    if (info) {
      this.statusBarItem.text = `$(symbol-field) Col #${info.index + 1}: ${info.name}`;
      this.statusBarItem.tooltip = `Rainbow SQL\nTable: ${info.tableName}\nColumn #${info.index + 1}: ${info.name}${info.extra ? `\n${info.extra}` : ''}`;
      this.statusBarItem.show();
    } else {
      this.statusBarItem.hide();
    }
  }

  public hide(): void {
    this.statusBarItem.hide();
  }

  public dispose(): void {
    this.statusBarItem.dispose();
  }

  private findCursorColumnInfo(
    pos: vscode.Position,
    statements: InsertStatement[]
  ): { index: number; name: string; tableName: string; extra?: string } | null {
    for (const stmt of statements) {
      // Check column header
      for (const col of stmt.columns) {
        if (this.isPositionInRange(pos, col.range)) {
          return {
            index: col.index,
            name: col.name,
            tableName: stmt.tableName,
            extra: `Total Columns: ${stmt.columns.length}`,
          };
        }
      }

      // Check values
      for (const row of stmt.rows) {
        for (const val of row.values) {
          if (this.isPositionInRange(pos, val.range)) {
            if (val.matchedColumn) {
              return {
                index: val.matchedColumn.index,
                name: val.matchedColumn.name,
                tableName: stmt.tableName,
                extra: `Row #${row.rowIndex + 1} of ${stmt.rows.length}`,
              };
            } else {
              return {
                index: val.index,
                name: '<unmatched/extra>',
                tableName: stmt.tableName,
                extra: `⚠️ Row #${row.rowIndex + 1} exceeds column count`,
              };
            }
          }
        }
      }
    }

    return null;
  }

  private isPositionInRange(
    pos: vscode.Position,
    range: { start: { line: number; character: number }; end: { line: number; character: number } }
  ): boolean {
    if (pos.line < range.start.line || pos.line > range.end.line) {
      return false;
    }
    if (pos.line === range.start.line && pos.character < range.start.character) {
      return false;
    }
    if (pos.line === range.end.line && pos.character > range.end.character) {
      return false;
    }
    return true;
  }
}
