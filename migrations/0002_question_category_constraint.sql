CREATE TABLE question_sets_with_valid_category (
  id TEXT PRIMARY KEY,
  normal_question TEXT NOT NULL,
  impostor_question TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'testuali'
    CHECK (category IN ('testuali', 'numeriche', 'extra')),
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1))
);

INSERT INTO question_sets_with_valid_category (
  id,
  normal_question,
  impostor_question,
  category,
  active
)
SELECT
  id,
  normal_question,
  impostor_question,
  CASE
    WHEN category IN ('testuali', 'numeriche', 'extra') THEN category
    ELSE 'testuali'
  END,
  active
FROM question_sets;

DROP TABLE question_sets;

ALTER TABLE question_sets_with_valid_category RENAME TO question_sets;

CREATE INDEX idx_question_sets_active ON question_sets (active);
CREATE INDEX idx_question_sets_active_category ON question_sets (active, category);
