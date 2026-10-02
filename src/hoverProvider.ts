import * as vscode from 'vscode';
import { InsertStatement } from './types';
import { RainbowSqlConfig } from './config';

export class RainbowHoverProvider implements vscode.HoverProvider {
  private statementsMap = new Map<string, InsertStatement[]>();

  public updateStatements(uri: string, statements: InsertStatement[]): void {
    this.statementsMap.set(uri, statements);
  }

  public removeDocument(uri: string): void {
    this.statementsMap.delete(uri);
  }

  public provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
    _token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.Hover> {
    if (!RainbowSqlConfig.isEnabled() || !RainbowSqlConfig.isHoverEnabled()) {
      return null;
    }

    const statements = this.statementsMap.get(document.uri.toString());
    if (!statements) {
      return null;
    }

    for (const stmt of statements) {
      // 1. Check if hovering over a column name
      for (const col of stmt.columns) {
        if (this.isPositionInRange(position, col.range)) {
          const md = new vscode.MarkdownString();
          md.appendMarkdown(`### 🌈 Column **#${col.index + 1}**: \`${col.name}\`\n\n`);
          md.appendMarkdown(`- **Table**: \`${stmt.tableName}\`\n`);
          md.appendMarkdown(`- **Total Columns**: ${stmt.columns.length}\n`);
          md.appendMarkdown(`- **Total Rows**: ${stmt.rows.length}\n`);

          const hoverRange = new vscode.Range(
            col.range.start.line,
            col.range.start.character,
            col.range.end.line,
            col.range.end.character
          );
          return new vscode.Hover(md, hoverRange);
        }
      }

      // 2. Check if hovering over a value
      for (const row of stmt.rows) {
        for (const val of row.values) {
          if (this.isPositionInRange(position, val.range)) {
            const md = new vscode.MarkdownString();
            if (val.matchedColumn) {
              md.appendMarkdown(
                `### 🌈 Column **#${val.matchedColumn.index + 1}**: \`${val.matchedColumn.name}\`\n\n`
              );
              md.appendMarkdown(`- **Table**: \`${stmt.tableName}\`\n`);
              md.appendMarkdown(`- **Row**: #${row.rowIndex + 1} of ${stmt.rows.length}\n`);
              md.appendMarkdown(`- **Value**: \`${val.rawText}\`\n`);
            } else {
              md.appendMarkdown(`### ⚠️ **Extra Unmatched Value**\n\n`);
              md.appendMarkdown(`- **Position**: #${val.index + 1}\n`);
              md.appendMarkdown(`- **Expected Columns**: ${stmt.columns.length}\n`);
              md.appendMarkdown(`- **Value**: \`${val.rawText}\`\n`);
            }

            const hoverRange = new vscode.Range(
              val.range.start.line,
              val.range.start.character,
              val.range.end.line,
              val.range.end.character
            );
            return new vscode.Hover(md, hoverRange);
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
