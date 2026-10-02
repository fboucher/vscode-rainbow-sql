import * as vscode from 'vscode';

export const DEFAULT_DARK_COLORS = [
  '#E57373', // Red
  '#BA68C8', // Purple
  '#64B5F6', // Blue
  '#4DD0E1', // Cyan
  '#81C784', // Green
  '#DCE775', // Lime
  '#FFD54F', // Amber / Gold
  '#FF8A65', // Deep Orange
  '#A1887F', // Brown
  '#4DB6AC', // Teal
];

export const DEFAULT_LIGHT_COLORS = [
  '#C62828', // Dark Red
  '#6A1B9A', // Dark Purple
  '#1565C0', // Dark Blue
  '#00838F', // Dark Cyan
  '#2E7D32', // Dark Green
  '#9E9D24', // Dark Lime
  '#EF6C00', // Dark Orange
  '#D84315', // Dark Deep Orange
  '#4E342E', // Dark Brown
  '#00695C', // Dark Teal
];

export class RainbowSqlConfig {
  public static isEnabled(): boolean {
    return vscode.workspace.getConfiguration('rainbowSql').get<boolean>('enabled', true);
  }

  public static isHoverEnabled(): boolean {
    return vscode.workspace.getConfiguration('rainbowSql').get<boolean>('enableHover', true);
  }

  public static isStatusBarEnabled(): boolean {
    return vscode.workspace.getConfiguration('rainbowSql').get<boolean>('enableStatusBar', true);
  }

  public static isHighlightMismatchesEnabled(): boolean {
    return vscode.workspace.getConfiguration('rainbowSql').get<boolean>('highlightMismatches', true);
  }

  public static getColors(colorThemeKind: vscode.ColorThemeKind): string[] {
    const isDark =
      colorThemeKind === vscode.ColorThemeKind.Dark ||
      colorThemeKind === vscode.ColorThemeKind.HighContrast;

    const config = vscode.workspace.getConfiguration('rainbowSql');

    if (isDark) {
      const colors = config.get<string[]>('darkColors');
      return colors && colors.length > 0 ? colors : DEFAULT_DARK_COLORS;
    } else {
      const colors = config.get<string[]>('lightColors');
      return colors && colors.length > 0 ? colors : DEFAULT_LIGHT_COLORS;
    }
  }
}
