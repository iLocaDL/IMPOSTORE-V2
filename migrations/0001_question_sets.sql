CREATE TABLE question_sets (
  id TEXT PRIMARY KEY,
  normal_question TEXT NOT NULL,
  impostor_question TEXT NOT NULL,
  category TEXT,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1))
);

CREATE INDEX idx_question_sets_active ON question_sets (active);
