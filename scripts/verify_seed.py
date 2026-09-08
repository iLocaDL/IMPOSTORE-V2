from pathlib import Path
import sqlite3


PROJECT_ROOT = Path(__file__).resolve().parent.parent
MIGRATION_1 = (PROJECT_ROOT / "migrations" / "0001_question_sets.sql").read_text(encoding="utf-8")
MIGRATION_2 = (PROJECT_ROOT / "migrations" / "0002_question_category_constraint.sql").read_text(encoding="utf-8")
SEED = (PROJECT_ROOT / "migrations" / "seed_questions.sql").read_text(encoding="utf-8")


def expected_ids(prefix: str, count: int) -> list[str]:
    return [f"{prefix}{index:03d}" for index in range(1, count + 1)]


database = sqlite3.connect(":memory:")
database.executescript(MIGRATION_1)
database.executescript(MIGRATION_2)
database.executescript(SEED)
first_seed_count = database.execute("SELECT COUNT(*) FROM question_sets").fetchone()[0]
database.executescript(SEED)
second_seed_count = database.execute("SELECT COUNT(*) FROM question_sets").fetchone()[0]

assert first_seed_count == second_seed_count == 126
assert database.execute(
    "SELECT COUNT(*) FROM question_sets WHERE active <> 1"
).fetchone()[0] == 0
assert database.execute(
    "SELECT COUNT(*) FROM question_sets WHERE id IN ('A001', 'A002')"
).fetchone()[0] == 0
assert database.execute(
    """
    SELECT COUNT(*)
    FROM (
      SELECT question
      FROM (
        SELECT normal_question AS question FROM question_sets
        UNION ALL
        SELECT impostor_question AS question FROM question_sets
      )
      GROUP BY question
      HAVING COUNT(*) > 1
    )
    """
).fetchone()[0] == 0

expected_by_category = {
    "testuali": expected_ids("T", 89),
    "numeriche": expected_ids("N", 30),
    "extra": expected_ids("X", 7),
}

for category, expected in expected_by_category.items():
    actual = [
        row[0]
        for row in database.execute(
            "SELECT id FROM question_sets WHERE category = ? ORDER BY id",
            (category,),
        )
    ]
    assert actual == expected, (category, len(actual), actual)

try:
    database.execute(
        "INSERT INTO question_sets (id, normal_question, impostor_question, category) VALUES (?, ?, ?, ?)",
        ("BAD001", "normale", "impostore", "sconosciuta"),
    )
except sqlite3.IntegrityError:
    pass
else:
    raise AssertionError("Il vincolo category ha accettato un valore sconosciuto")

legacy_database = sqlite3.connect(":memory:")
legacy_database.executescript(MIGRATION_1)
legacy_database.execute(
    "INSERT INTO question_sets (id, normal_question, impostor_question, category) VALUES (?, ?, ?, ?)",
    ("LEGACY001", "normale", "impostore", "generali"),
)
legacy_database.executescript(MIGRATION_2)
assert legacy_database.execute(
    "SELECT category FROM question_sets WHERE id = 'LEGACY001'"
).fetchone()[0] == "testuali"

print("Seed SQL verification: OK (89 testuali, 30 numeriche, 7 extra)")
