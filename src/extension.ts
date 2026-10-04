import * as vscode from 'vscode';
import { SqlInsertParser } from './parser';
import { RainbowDecorator } from './decorator';
import { RainbowHoverProvider } from './hoverProvider';
import { RainbowStatusBar } from './statusBar';
import { RainbowSqlConfig } from './config';
import { InsertStatement } from './types';

const SUPPORTED_LANGUAGES = ['sql', 'postgres', 'mysql', 'plsql', 'tsql', 'sqlite'];

export function activate(context: vscode.ExtensionContext): void {
  const decorator = new RainbowDecorator();
  const hoverProvider = new RainbowHoverProvider();
  const statusBar = new RainbowStatusBar();

  // Cache statements per document URI
  const docStatements = new Map<string, InsertStatement[]>();

  // Debounce timer per document URI
  const debounceTimers = new Map<string, NodeJS.Timeout>();

  function isSqlDocument(document: vscode.TextDocument): boolean {
    return (
      SUPPORTED_LANGUAGES.includes(document.languageId) ||
      document.fileName.endsWith('.sql')
    );
  }

  function triggerUpdate(editor: vscode.TextEditor | undefined, delayMs = 100): void {
    if (!editor || !isSqlDocument(editor.document)) {
      statusBar.hide();
      return;
    }

    const uriStr = editor.document.uri.toString();
    const existingTimer = debounceTimers.get(uriStr);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const timer = setTimeout(() => {
      debounceTimers.delete(uriStr);
      updateEditor(editor);
    }, delayMs);

    debounceTimers.set(uriStr, timer);
  }

  function updateEditor(editor: vscode.TextEditor): void {
    if (!RainbowSqlConfig.isEnabled()) {
      decorator.clearDecorations(editor);
      statusBar.hide();
      return;
    }

    try {
      const text = editor.document.getText();
      const parser = new SqlInsertParser(text);
      const statements = parser.parse();

      const uriStr = editor.document.uri.toString();
      docStatements.set(uriStr, statements);
      hoverProvider.updateStatements(uriStr, statements);

      decorator.applyDecorations(editor, statements);
      statusBar.update(editor, statements);
    } catch (err) {
      console.error('Rainbow SQL: Error parsing statements', err);
    }
  }

  // Register hover provider for all supported languages
  for (const lang of SUPPORTED_LANGUAGES) {
    context.subscriptions.push(
      vscode.languages.registerHoverProvider({ language: lang }, hoverProvider)
    );
  }

  // Register toggle command
  context.subscriptions.push(
    vscode.commands.registerCommand('rainbowSql.toggle', async () => {
      const config = vscode.workspace.getConfiguration('rainbowSql');
      const currentState = config.get<boolean>('enabled', true);
      const newState = !currentState;
      await config.update('enabled', newState, vscode.ConfigurationTarget.Global);

      vscode.window.showInformationMessage(
        `Rainbow SQL highlighting ${newState ? 'enabled' : 'disabled'}.`
      );

      const activeEditor = vscode.window.activeTextEditor;
      if (activeEditor && isSqlDocument(activeEditor.document)) {
        if (!newState) {
          decorator.clearDecorations(activeEditor);
          statusBar.hide();
        } else {
          updateEditor(activeEditor);
        }
      }
    })
  );

  // Document change events
  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((event) => {
      const activeEditor = vscode.window.activeTextEditor;
      if (activeEditor && activeEditor.document === event.document) {
        triggerUpdate(activeEditor, 150);
      }
    })
  );

  // Active editor change
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor) {
        triggerUpdate(editor, 0);
      } else {
        statusBar.hide();
      }
    })
  );

  // Cursor selection change (for status bar updates)
  context.subscriptions.push(
    vscode.window.onDidChangeTextEditorSelection((event) => {
      if (isSqlDocument(event.textEditor.document)) {
        const statements = docStatements.get(event.textEditor.document.uri.toString()) || [];
        statusBar.update(event.textEditor, statements);
      }
    })
  );

  // Theme change event (switch dark/light color palette)
  context.subscriptions.push(
    vscode.window.onDidChangeActiveColorTheme(() => {
      decorator.initDecorations();
      const activeEditor = vscode.window.activeTextEditor;
      if (activeEditor && isSqlDocument(activeEditor.document)) {
        updateEditor(activeEditor);
      }
    })
  );

  // Configuration change event
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration('rainbowSql')) {
        decorator.initDecorations();
        const activeEditor = vscode.window.activeTextEditor;
        if (activeEditor && isSqlDocument(activeEditor.document)) {
          updateEditor(activeEditor);
        }
      }
    })
  );

  // Document closed event
  context.subscriptions.push(
    vscode.workspace.onDidCloseTextDocument((document) => {
      const uriStr = document.uri.toString();
      docStatements.delete(uriStr);
      hoverProvider.removeDocument(uriStr);
      const timer = debounceTimers.get(uriStr);
      if (timer) {
        clearTimeout(timer);
        debounceTimers.delete(uriStr);
      }
    })
  );

  // Initial trigger for currently open editor
  if (vscode.window.activeTextEditor) {
    triggerUpdate(vscode.window.activeTextEditor, 0);
  }

  // Clean up
  context.subscriptions.push({
    dispose: () => {
      decorator.dispose();
      statusBar.dispose();
      for (const timer of debounceTimers.values()) {
        clearTimeout(timer);
      }
      debounceTimers.clear();
      docStatements.clear();
    },
  });
}

export function deactivate(): void {
  // Handled by context subscriptions
}
