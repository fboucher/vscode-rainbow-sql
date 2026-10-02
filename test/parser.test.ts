import * as assert from 'assert';
import { SqlInsertParser } from '../src/parser';

describe('SqlInsertParser', () => {
  it('parses basic single-row INSERT statement', () => {
    const sql = `INSERT INTO users (id, name, age) VALUES (1, 'Alice', 30);`;
    const parser = new SqlInsertParser(sql);
    const statements = parser.parse();

    assert.strictEqual(statements.length, 1);
    const stmt = statements[0];
    assert.strictEqual(stmt.tableName, 'users');
    assert.strictEqual(stmt.columns.length, 3);
    assert.strictEqual(stmt.columns[0].name, 'id');
    assert.strictEqual(stmt.columns[1].name, 'name');
    assert.strictEqual(stmt.columns[2].name, 'age');

    assert.strictEqual(stmt.rows.length, 1);
    assert.strictEqual(stmt.rows[0].values.length, 3);
    assert.strictEqual(stmt.rows[0].values[0].rawText, '1');
    assert.strictEqual(stmt.rows[0].values[1].rawText, "'Alice'");
    assert.strictEqual(stmt.rows[0].values[2].rawText, '30');
    assert.strictEqual(stmt.rows[0].values[0].matchedColumn?.name, 'id');
    assert.strictEqual(stmt.rows[0].values[1].matchedColumn?.name, 'name');
    assert.strictEqual(stmt.rows[0].values[2].matchedColumn?.name, 'age');
    assert.strictEqual(stmt.rows[0].mismatch, undefined);
  });

  it('parses user sample queries accurately with 14 columns and pipe/apostrophe characters', () => {
    const sql = `
INSERT INTO db2d6.creatures(name, level, creature_type, health_points, experience, shift_points, treasure, interrupt1, interrupt2, manoeuvre1, manoeuvre2, description, prime_attack_rolls, mishap_attack_rolls)
VALUES('APOTHECARY', 1, 'Humanoid', 12, 35, 1, 'Roll on POT1', 'Blinding Smoke on Primary|1s and 4s|-2 damage', 'Glowing Shield on Secondary|2s|-2 damage', '4-5|FIRE BOMB|D6 -2 damage', '1-5|GAS CLOUD|D6 -2 + special - you may not attack next turn', 'The apothecary wears breeches and a leather tunic which they open to reveal a collection of vials. Pulling one free they throw it at you as they attack.', 'They retrieve a larger bottle and throw it. Flames burst up around you. Lose D6 HP.', 'One of the vials smashes at your feet but nothing happens. You gain an extra attack.');

INSERT INTO db2d6.creatures(name, level, creature_type, health_points, experience, shift_points, treasure, interrupt1, interrupt2, manoeuvre1, manoeuvre2, description, prime_attack_rolls, mishap_attack_rolls)
VALUES('ARTISAN', 1, 'Humanoid', 3, 5, 1, 'Roll on PT1 -2|+ 2D6 SC', 'Deflect on Secondary|1s|-2 damage', 'Distract on Secondary|6s|-1 damage', '5-4|JAB|D6 -3 damage', '', 'A skilled worker who has spent many years learning their art. They are not fither but are well coordinated and wear sturdy leather work clothes. They will defend their home.', 'They grab up a lenght of wood, but it is brittle and crumbles in their hand. Gain an extra attack.', 'The artisant pulls a handful of nails from a pocket and throws them in your face. Take 2 damage.');
`;
    const parser = new SqlInsertParser(sql);
    const stmts = parser.parse();

    assert.strictEqual(stmts.length, 2);

    for (const stmt of stmts) {
      assert.strictEqual(stmt.tableName, 'db2d6.creatures');
      assert.strictEqual(stmt.columns.length, 14);
      assert.strictEqual(stmt.columns[0].name, 'name');
      assert.strictEqual(stmt.columns[3].name, 'health_points');
      assert.strictEqual(stmt.columns[13].name, 'mishap_attack_rolls');

      assert.strictEqual(stmt.rows.length, 1);
      assert.strictEqual(stmt.rows[0].values.length, 14);
      assert.strictEqual(stmt.rows[0].mismatch, undefined);

      for (let i = 0; i < 14; i++) {
        assert.strictEqual(stmt.rows[0].values[i].matchedColumn?.name, stmt.columns[i].name);
      }
    }
  });

  it('parses multi-row INSERT statements', () => {
    const sql = `
INSERT INTO items (id, code, price)
VALUES
  (101, 'ITEM_A', 19.99),
  (102, 'ITEM_B', 24.50),
  (103, 'ITEM_C', 99.00);
`;
    const parser = new SqlInsertParser(sql);
    const stmts = parser.parse();

    assert.strictEqual(stmts.length, 1);
    const stmt = stmts[0];
    assert.strictEqual(stmt.tableName, 'items');
    assert.strictEqual(stmt.columns.length, 3);
    assert.strictEqual(stmt.rows.length, 3);

    assert.strictEqual(stmt.rows[0].values[1].rawText, "'ITEM_A'");
    assert.strictEqual(stmt.rows[1].values[1].rawText, "'ITEM_B'");
    assert.strictEqual(stmt.rows[2].values[1].rawText, "'ITEM_C'");

    assert.strictEqual(stmt.rows[0].values[1].matchedColumn?.name, 'code');
    assert.strictEqual(stmt.rows[1].values[1].matchedColumn?.name, 'code');
    assert.strictEqual(stmt.rows[2].values[1].matchedColumn?.name, 'code');
  });

  it('detects mismatched column and value counts', () => {
    const sql = `
INSERT INTO test (col1, col2, col3)
VALUES
  (1, 'valid', 3),
  (2, 'too few'),
  (3, 'too many', 99, 'extra');
`;
    const parser = new SqlInsertParser(sql);
    const stmts = parser.parse();

    assert.strictEqual(stmts.length, 1);
    const stmt = stmts[0];
    assert.strictEqual(stmt.rows.length, 3);

    assert.strictEqual(stmt.rows[0].mismatch, undefined);

    assert.deepStrictEqual(stmt.rows[1].mismatch, {
      expected: 3,
      actual: 2,
    });

    assert.deepStrictEqual(stmt.rows[2].mismatch, {
      expected: 3,
      actual: 4,
    });
    // col3 is matched to index 2, extra is undefined matchedColumn
    assert.strictEqual(stmt.rows[2].values[3].matchedColumn, undefined);
  });

  it('handles quoted identifiers and nested parentheses in value expressions', () => {
    const sql = `
INSERT INTO "inventory" ([item_id], \`calc_val\`, "status")
VALUES (1, COALESCE(NULL, 10 + 5), 'ACTIVE');
`;
    const parser = new SqlInsertParser(sql);
    const stmts = parser.parse();

    assert.strictEqual(stmts.length, 1);
    const stmt = stmts[0];
    assert.strictEqual(stmt.columns.length, 3);
    assert.strictEqual(stmt.columns[0].name, 'item_id');
    assert.strictEqual(stmt.columns[1].name, 'calc_val');
    assert.strictEqual(stmt.columns[2].name, 'status');

    assert.strictEqual(stmt.rows[0].values.length, 3);
    assert.strictEqual(stmt.rows[0].values[1].rawText, 'COALESCE(NULL, 10 + 5)');
  });

  it('handles escaped quotes and comments properly', () => {
    const sql = `
-- Inserting a hero
INSERT INTO hero (id, bio)
/* block comment */
VALUES (1, 'He said: ''I am ready''');
`;
    const parser = new SqlInsertParser(sql);
    const stmts = parser.parse();

    assert.strictEqual(stmts.length, 1);
    const stmt = stmts[0];
    assert.strictEqual(stmt.columns.length, 2);
    assert.strictEqual(stmt.rows[0].values[1].rawText, `'He said: ''I am ready'''`);
  });
});
