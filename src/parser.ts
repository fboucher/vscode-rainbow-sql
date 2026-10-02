import { TextPosition, TextRange, ColumnInfo, ValueInfo, ValueRow, InsertStatement } from './types';

export class PositionHelper {
  private lineOffsets: number[] = [0];

  constructor(private readonly text: string) {
    for (let i = 0; i < text.length; i++) {
      if (text[i] === '\n') {
        this.lineOffsets.push(i + 1);
      }
    }
  }

  public getPosition(offset: number): TextPosition {
    // Binary search to find the line
    let low = 0;
    let high = this.lineOffsets.length - 1;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      if (this.lineOffsets[mid] <= offset) {
        if (mid === this.lineOffsets.length - 1 || this.lineOffsets[mid + 1] > offset) {
          return {
            line: mid,
            character: offset - this.lineOffsets[mid],
          };
        }
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

    return { line: 0, character: offset };
  }

  public createRange(startOffset: number, endOffset: number): TextRange {
    return {
      startOffset,
      endOffset,
      start: this.getPosition(startOffset),
      end: this.getPosition(endOffset),
    };
  }
}

export class SqlInsertParser {
  private pos = 0;
  private readonly len: number;
  private helper: PositionHelper;

  constructor(private readonly text: string) {
    this.len = text.length;
    this.helper = new PositionHelper(text);
  }

  public parse(): InsertStatement[] {
    const statements: InsertStatement[] = [];
    this.pos = 0;

    while (this.pos < this.len) {
      this.skipWhitespaceAndComments();
      if (this.pos >= this.len) {
        break;
      }

      const stmtStart = this.pos;
      if (this.matchKeyword('INSERT')) {
        const stmt = this.parseInsertStatement(stmtStart);
        if (stmt) {
          statements.push(stmt);
        }
      } else {
        // Advance past current token/character to avoid infinite loop
        this.pos++;
      }
    }

    return statements;
  }

  private parseInsertStatement(stmtStart: number): InsertStatement | null {
    // Check optional modifiers: OR REPLACE, OR IGNORE, LOW_PRIORITY, HIGH_PRIORITY, DELAYED, IGNORE
    while (this.pos < this.len) {
      this.skipWhitespaceAndComments();
      if (this.matchKeyword('OR')) {
        this.skipWhitespaceAndComments();
        this.matchKeyword('REPLACE') || this.matchKeyword('IGNORE');
      } else if (
        this.matchKeyword('LOW_PRIORITY') ||
        this.matchKeyword('HIGH_PRIORITY') ||
        this.matchKeyword('DELAYED') ||
        this.matchKeyword('IGNORE')
      ) {
        // continue
      } else {
        break;
      }
    }

    this.skipWhitespaceAndComments();
    // Optional INTO keyword
    this.matchKeyword('INTO');

    this.skipWhitespaceAndComments();
    const tableStart = this.pos;
    const tableName = this.parseTableName();
    const tableEnd = this.pos;

    if (!tableName) {
      return null;
    }

    const tableRange = this.helper.createRange(tableStart, tableEnd);

    this.skipWhitespaceAndComments();
    if (this.peekChar() !== '(') {
      // INSERT without column list: not rainbow-column targeted
      return null;
    }

    // Parse column list
    const colListStart = this.pos;
    this.pos++; // consume '('
    const columns = this.parseColumnList();
    if (this.peekChar() !== ')') {
      return null;
    }
    this.pos++; // consume ')'
    const colListEnd = this.pos;
    const columnsRange = this.helper.createRange(colListStart, colListEnd);

    this.skipWhitespaceAndComments();
    // Match VALUES or VALUE
    if (!this.matchKeyword('VALUES') && !this.matchKeyword('VALUE')) {
      return null;
    }

    // Parse value rows: ( ... ), ( ... )
    const rows: ValueRow[] = [];
    let rowIndex = 0;

    while (this.pos < this.len) {
      this.skipWhitespaceAndComments();
      if (this.peekChar() !== '(') {
        break;
      }

      const rowStart = this.pos;
      this.pos++; // consume '('
      const values = this.parseRowValues(columns);
      if (this.peekChar() !== ')') {
        break;
      }
      this.pos++; // consume ')'
      const rowEnd = this.pos;

      const rowRange = this.helper.createRange(rowStart, rowEnd);
      const isMismatch = values.length !== columns.length;

      rows.push({
        rowIndex: rowIndex++,
        range: rowRange,
        values,
        mismatch: isMismatch
          ? {
              expected: columns.length,
              actual: values.length,
            }
          : undefined,
      });

      this.skipWhitespaceAndComments();
      if (this.peekChar() === ',') {
        const savedPos = this.pos;
        this.pos++; // consume ','
        this.skipWhitespaceAndComments();
        if (this.peekChar() === '(') {
          // Another row follows
          continue;
        } else {
          // Comma not followed by a row tuple, revert or end
          this.pos = savedPos;
          break;
        }
      } else {
        break;
      }
    }

    if (rows.length === 0) {
      return null;
    }

    // Check optional trailing semicolon
    this.skipWhitespaceAndComments();
    if (this.peekChar() === ';') {
      this.pos++;
    }

    const stmtEnd = this.pos;
    return {
      tableName,
      tableRange,
      columns,
      columnsRange,
      rows,
      statementRange: this.helper.createRange(stmtStart, stmtEnd),
    };
  }

  private parseTableName(): string | null {
    const start = this.pos;
    let name = '';

    while (this.pos < this.len) {
      this.skipWhitespaceAndComments();
      const part = this.parseIdentifierOrWord();
      if (!part) {
        break;
      }
      name += (name.length > 0 ? '.' : '') + part;

      this.skipWhitespaceAndComments();
      if (this.peekChar() === '.') {
        this.pos++; // consume '.'
      } else {
        break;
      }
    }

    return name.length > 0 ? name : null;
  }

  private parseColumnList(): ColumnInfo[] {
    const columns: ColumnInfo[] = [];
    let colIndex = 0;

    while (this.pos < this.len) {
      this.skipWhitespaceAndComments();
      if (this.peekChar() === ')' || this.pos >= this.len) {
        break;
      }

      const colStart = this.pos;
      const colName = this.parseIdentifierOrWord();
      const colEnd = this.pos;

      if (colName) {
        columns.push({
          index: colIndex++,
          name: colName,
          range: this.helper.createRange(colStart, colEnd),
        });
      }

      this.skipWhitespaceAndComments();
      if (this.peekChar() === ',') {
        this.pos++; // consume ','
      } else {
        break;
      }
    }

    return columns;
  }

  private parseRowValues(columns: ColumnInfo[]): ValueInfo[] {
    const values: ValueInfo[] = [];
    let valIndex = 0;

    while (this.pos < this.len) {
      this.skipWhitespaceAndComments();
      if (this.peekChar() === ')' || this.pos >= this.len) {
        break;
      }

      const valStart = this.pos;
      const rawText = this.parseValueExpression();
      const valEnd = this.pos;

      // Trim leading/trailing whitespace offsets
      let trimmedStart = valStart;
      let trimmedEnd = valEnd;
      while (trimmedStart < trimmedEnd && /\s/.test(this.text[trimmedStart])) {
        trimmedStart++;
      }
      while (trimmedEnd > trimmedStart && /\s/.test(this.text[trimmedEnd - 1])) {
        trimmedEnd--;
      }

      if (trimmedStart < trimmedEnd) {
        const matchedColumn = valIndex < columns.length ? columns[valIndex] : undefined;
        values.push({
          index: valIndex,
          rawText: this.text.substring(trimmedStart, trimmedEnd),
          range: this.helper.createRange(trimmedStart, trimmedEnd),
          matchedColumn,
        });
        valIndex++;
      }

      this.skipWhitespaceAndComments();
      if (this.peekChar() === ',') {
        this.pos++; // consume ','
      } else {
        break;
      }
    }

    return values;
  }

  private parseValueExpression(): string {
    const start = this.pos;
    let parenDepth = 0;

    while (this.pos < this.len) {
      const ch = this.text[this.pos];

      // If at depth 0 and encounter ',' or ')', expression ended
      if (parenDepth === 0 && (ch === ',' || ch === ')')) {
        break;
      }

      // Check comments
      if (ch === '-' && this.text[this.pos + 1] === '-') {
        this.skipLineComment();
        continue;
      }
      if (ch === '/' && this.text[this.pos + 1] === '*') {
        this.skipBlockComment();
        continue;
      }

      // String literal
      if (ch === "'") {
        this.skipSingleQuoteString();
        continue;
      }

      // Parentheses nesting
      if (ch === '(') {
        parenDepth++;
        this.pos++;
        continue;
      }
      if (ch === ')') {
        if (parenDepth > 0) {
          parenDepth--;
          this.pos++;
          continue;
        } else {
          break;
        }
      }

      // Quoted identifier or square bracket
      if (ch === '"' || ch === '`') {
        this.skipQuotedIdentifier(ch);
        continue;
      }
      if (ch === '[') {
        this.skipBracketIdentifier();
        continue;
      }

      this.pos++;
    }

    return this.text.substring(start, this.pos);
  }

  private parseIdentifierOrWord(): string | null {
    this.skipWhitespaceAndComments();
    if (this.pos >= this.len) {
      return null;
    }

    const ch = this.text[this.pos];
    // Quoted identifier
    if (ch === '`' || ch === '"') {
      const quote = ch;
      this.pos++;
      const start = this.pos;
      while (this.pos < this.len && this.text[this.pos] !== quote) {
        this.pos++;
      }
      const val = this.text.substring(start, this.pos);
      if (this.pos < this.len && this.text[this.pos] === quote) {
        this.pos++;
      }
      return val;
    }

    if (ch === '[') {
      this.pos++;
      const start = this.pos;
      while (this.pos < this.len && this.text[this.pos] !== ']') {
        this.pos++;
      }
      const val = this.text.substring(start, this.pos);
      if (this.pos < this.len && this.text[this.pos] === ']') {
        this.pos++;
      }
      return val;
    }

    // Unquoted identifier: word characters [A-Za-z0-9_#$]
    const start = this.pos;
    while (this.pos < this.len && /[a-zA-Z0-9_#$]/.test(this.text[this.pos])) {
      this.pos++;
    }

    if (this.pos > start) {
      return this.text.substring(start, this.pos);
    }

    return null;
  }

  private skipSingleQuoteString(): void {
    this.pos++; // consume opening '
    while (this.pos < this.len) {
      if (this.text[this.pos] === "'") {
        if (this.pos + 1 < this.len && this.text[this.pos + 1] === "'") {
          this.pos += 2; // escaped ''
        } else {
          this.pos++; // closing '
          break;
        }
      } else if (this.text[this.pos] === '\\') {
        this.pos += 2; // escaped char
      } else {
        this.pos++;
      }
    }
  }

  private skipQuotedIdentifier(quote: string): void {
    this.pos++; // consume opening quote
    while (this.pos < this.len) {
      if (this.text[this.pos] === quote) {
        if (this.pos + 1 < this.len && this.text[this.pos + 1] === quote) {
          this.pos += 2;
        } else {
          this.pos++;
          break;
        }
      } else {
        this.pos++;
      }
    }
  }

  private skipBracketIdentifier(): void {
    this.pos++; // consume '['
    while (this.pos < this.len && this.text[this.pos] !== ']') {
      this.pos++;
    }
    if (this.pos < this.len && this.text[this.pos] === ']') {
      this.pos++;
    }
  }

  private skipLineComment(): void {
    this.pos += 2;
    while (this.pos < this.len && this.text[this.pos] !== '\n') {
      this.pos++;
    }
  }

  private skipBlockComment(): void {
    this.pos += 2;
    while (this.pos < this.len) {
      if (this.text[this.pos] === '*' && this.pos + 1 < this.len && this.text[this.pos + 1] === '/') {
        this.pos += 2;
        break;
      }
      this.pos++;
    }
  }

  private skipWhitespaceAndComments(): void {
    while (this.pos < this.len) {
      const ch = this.text[this.pos];
      if (/\s/.test(ch)) {
        this.pos++;
        continue;
      }
      if (ch === '-' && this.text[this.pos + 1] === '-') {
        this.skipLineComment();
        continue;
      }
      if (ch === '#' && this.pos + 1 < this.len) {
        // MySQL comment
        this.skipLineComment();
        continue;
      }
      if (ch === '/' && this.text[this.pos + 1] === '*') {
        this.skipBlockComment();
        continue;
      }
      break;
    }
  }

  private matchKeyword(keyword: string): boolean {
    const kLen = keyword.length;
    if (this.pos + kLen > this.len) {
      return false;
    }

    const sub = this.text.substring(this.pos, this.pos + kLen);
    if (sub.toUpperCase() === keyword) {
      // Ensure it's a word boundary
      const nextChar = this.text[this.pos + kLen];
      if (!nextChar || !/[a-zA-Z0-9_]/.test(nextChar)) {
        this.pos += kLen;
        return true;
      }
    }
    return false;
  }

  private peekChar(): string {
    return this.pos < this.len ? this.text[this.pos] : '';
  }
}
