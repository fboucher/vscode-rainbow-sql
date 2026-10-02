-- =====================================================================
-- Rainbow SQL Sample Demonstration File
-- Open this file with Rainbow SQL enabled to see the rainbow coloring!
-- =====================================================================

-- 1. Single-row INSERTs with many columns (User's Game Creatures Table)
INSERT INTO db2d6.creatures(name, level, creature_type, health_points, experience, shift_points, treasure, interrupt1, interrupt2, manoeuvre1, manoeuvre2, description, prime_attack_rolls, mishap_attack_rolls)
VALUES('APOTHECARY', 1, 'Humanoid', 12, 35, 1, 'Roll on POT1', 'Blinding Smoke on Primary|1s and 4s|-2 damage', 'Glowing Shield on Secondary|2s|-2 damage', '4-5|FIRE BOMB|D6 -2 damage', '1-5|GAS CLOUD|D6 -2 + special - you may not attack next turn', 'The apothecary wears breeches and a leather tunic which they open to reveal a collection of vials. Pulling one free they throw it at you as they attack.', 'They retrieve a larger bottle and throw it. Flames burst up around you. Lose D6 HP.', 'One of the vials smashes at your feet but nothing happens. You gain an extra attack.');

INSERT INTO db2d6.creatures(name, level, creature_type, health_points, experience, shift_points, treasure, interrupt1, interrupt2, manoeuvre1, manoeuvre2, description, prime_attack_rolls, mishap_attack_rolls)
VALUES('ARTISAN', 1, 'Humanoid', 3, 5, 1, 'Roll on PT1 -2|+ 2D6 SC', 'Deflect on Secondary|1s|-2 damage', 'Distract on Secondary|6s|-1 damage', '5-4|JAB|D6 -3 damage', '', 'A skilled worker who has spent many years learning their art. They are not fither but are well coordinated and wear sturdy leather work clothes. They will defend their home.', 'They grab up a lenght of wood, but it is brittle and crumbles in their hand. Gain an extra attack.', 'The artisant pulls a handful of nails from a pocket and throws them in your face. Take 2 damage.');

INSERT INTO db2d6.creatures(name, level, creature_type, health_points, experience, shift_points, treasure, interrupt1, interrupt2, manoeuvre1, manoeuvre2, description, prime_attack_rolls, mishap_attack_rolls)
VALUES('BLACKSMITH', 1, 'Humanoid', 6, 9, 1, 'Roll on MIT1 and PT1', 'Crossed Arms on Secondary|3s and 6s|-2 damage', '', '4-3|HAMMER BLOW|D6 -1 damage', '', 'A hardy artisan, wearing a heavy leather apron, used to hammering metal so they are strong and resistant.', 'The blacksmith pulls out a large hook and throws it at you. It catches your arm. Lose D3 HP.', 'As the blacksmith attacks they catch their hammer in their apron. You kick out and cause D3 damage.');


-- 2. Multi-row and multi-line formatted INSERT
INSERT INTO game.inventory (item_id, item_name, quantity, unit_price, in_stock, notes)
VALUES
  (101, 'Iron Dagger', 5, 12.50, TRUE, 'Sharp blade'),
  (102, 'Healing Salve', 25, 4.00, TRUE, 'Restores 5 HP'),
  (103, 'Dragon Shield', 1, 150.00, FALSE, 'Rare drop');


-- 3. Mismatched Column / Value Count Detection
-- Notice row 2 has only 3 values (expected 4), and row 3 has 5 values (expected 4)
INSERT INTO test_mismatch (col_a, col_b, col_c, col_d)
VALUES
  (1, 'Alpha', 100, 'All good'),
  (2, 'Beta', 200),
  (3, 'Gamma', 300, 'Extra value', 999);
