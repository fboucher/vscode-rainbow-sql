import * as vscode from 'vscode';
import { InsertStatement } from './types';
import { RainbowSqlConfig } from './config';

export class RainbowDecorator {
  private colorDecorations: vscode.TextEditorDecorationType[] = [];
  private mismatchDecoration: vscode.TextEditorDecorationType | null = null;
  private currentColors: string[] = [];

  constructor() {
    this.initDecorations();
  }

  public initDecorations(): void {
    this.dispose();

    const colors = RainbowSqlConfig.getColors(vscode.window.activeColorTheme.kind);
    this.currentColors = colors;

    this.colorDecorations = colors.map((color) =>
      vscode.window.createTextEditorDecorationType({
        color: color,
        fontWeight: 'bold',
      })
    );

    this.mismatchDecoration = vscode.window.createTextEditorDecorationType({
      backgroundColor: 'rgba(255, 82, 82, 0.25)',
      border: '1px solid #FF5252',
      borderRadius: '3px',
      overviewRulerColor: '#FF5252',
      overviewRulerLane: vscode.OverviewRulerLane.Right,
    });
  }

  public applyDecorations(editor: vscode.TextEditor, statements: InsertStatement[]): void {
    if (!RainbowSqlConfig.isEnabled()) {
      this.clearDecorations(editor);
      return;
    }

    if (this.colorDecorations.length === 0) {
      this.initDecorations();
    }

    const colorBuckets: vscode.Range[][] = this.colorDecorations.map(() => []);
    const mismatchRanges: vscode.DecorationOptions[] = [];
    const highlightMismatches = RainbowSqlConfig.isHighlightMismatchesEnabled();

    for (const stmt of statements) {
      // 1. Color columns
      for (const col of stmt.columns) {
        const colorIdx = col.index % this.colorDecorations.length;
        const range = new vscode.Range(
          col.range.start.line,
          col.range.start.character,
          col.range.end.line,
          col.range.end.character
        );
        colorBuckets[colorIdx].push(range);
      }

      // 2. Color values
      for (const row of stmt.rows) {
        for (const val of row.values) {
          if (val.matchedColumn) {
            const colorIdx = val.index % this.colorDecorations.length;
            const range = new vscode.Range(
              val.range.start.line,
              val.range.start.character,
              val.range.end.line,
              val.range.end.character
            );
            colorBuckets[colorIdx].push(range);
          } else {
            // Extra unmatched value
            const range = new vscode.Range(
              val.range.start.line,
              val.range.start.character,
              val.range.end.line,
              val.range.end.character
            );
            mismatchRanges.push({
              range,
              hoverMessage: new vscode.MarkdownString(
                `$(warning) **Rainbow SQL Warning**: Extra value at position #${val.index + 1} (Statement expects only ${stmt.columns.length} columns)`
              ),
            });
          }
        }

        // 3. Highlight row mismatch if expected != actual
        if (highlightMismatches && row.mismatch) {
          const rowRange = new vscode.Range(
            row.range.start.line,
            row.range.start.character,
            row.range.end.line,
            row.range.end.character
          );

          const message =
            row.mismatch.actual < row.mismatch.expected
              ? `$(warning) **Rainbow SQL Mismatch**: Too few values in row #${row.rowIndex + 1} (Expected ${row.mismatch.expected}, found only ${row.mismatch.actual})`
              : `$(warning) **Rainbow SQL Mismatch**: Too many values in row #${row.rowIndex + 1} (Expected ${row.mismatch.expected}, found ${row.mismatch.actual})`;

          mismatchRanges.push({
            range: rowRange,
            hoverMessage: new vscode.MarkdownString(message),
          });
        }
      }
    }

    // Apply color decorations
    for (let i = 0; i < this.colorDecorations.length; i++) {
      editor.setDecorations(this.colorDecorations[i], colorBuckets[i]);
    }

    // Apply mismatch decorations
    if (this.mismatchDecoration) {
      editor.setDecorations(this.mismatchDecoration, mismatchRanges);
    }
  }

  public clearDecorations(editor: vscode.TextEditor): void {
    for (const dec of this.colorDecorations) {
      editor.setDecorations(dec, []);
    }
    if (this.mismatchDecoration) {
      editor.setDecorations(this.mismatchDecoration, []);
    }
  }

  public dispose(): void {
    for (const dec of this.colorDecorations) {
      dec.dispose();
    }
    this.colorDecorations = [];

    if (this.mismatchDecoration) {
      this.mismatchDecoration.dispose();
      this.mismatchDecoration = null;
    }
  }
}
