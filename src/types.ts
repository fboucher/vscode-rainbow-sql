export interface TextPosition {
  line: number;
  character: number;
}

export interface TextRange {
  startOffset: number;
  endOffset: number;
  start: TextPosition;
  end: TextPosition;
}

export interface ColumnInfo {
  index: number; // 0-based
  name: string;
  range: TextRange;
}

export interface ValueInfo {
  index: number; // 0-based
  rawText: string;
  range: TextRange;
  matchedColumn?: ColumnInfo;
}

export interface ValueRow {
  rowIndex: number; // 0-based
  range: TextRange;
  values: ValueInfo[];
  mismatch?: {
    expected: number;
    actual: number;
  };
}

export interface InsertStatement {
  tableName: string;
  tableRange?: TextRange;
  columns: ColumnInfo[];
  columnsRange?: TextRange;
  rows: ValueRow[];
  statementRange: TextRange;
}
