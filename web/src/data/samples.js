// src/data/samples.js
// ─────────────────────────────────────────────────────────────
// WHY THIS FILE EXISTS:
// All sample programs for every language live here.
// Previously they were hardcoded inside App.jsx as a plain object.
// Separating them means: adding a new sample = touch only this file.
// Structure: { [language]: { [sampleName]: codeString } }
// ─────────────────────────────────────────────────────────────

export const SAMPLES = {
  c: {
    "Basic Math": `int x = 5;
int y = 3;
int z = x + y;
x = x * 2;
z = z - 1;`,

    "If / Else": `int score = 72;
int grade = 0;
if (score >= 90) {
  grade = 1;
} else {
  grade = 2;
}
int bonus = 10;`,

    "While Loop": `int i = 0;
int sum = 0;
while (i < 5) {
  sum = sum + i;
  i = i + 1;
}`,

    "For Loop": `int total = 0;
for (int i = 1; i <= 5; i++) {
  total = total + i;
}`,

    "FizzBuzz (lite)": `int n = 1;
int fizz = 0;
int buzz = 0;
while (n <= 6) {
  fizz = n % 3;
  buzz = n % 5;
  if (fizz == 0) {
    fizz = 1;
  }
  n = n + 1;
}`,
  },

  cpp: {
    "Basic Math": `int x = 10;
int y = 4;
int z = x - y;
x = x + 1;`,

    "While Loop": `int i = 0;
int sum = 0;
while (i < 4) {
  sum = sum + i;
  i = i + 1;
}`,
  },

  java: {
    "Hello Variables": `int x = 10;
int y = 20;
int sum = x + y;`,

    "Simple Loop": `int count = 0;
while (count < 3) {
  count = count + 1;
}`,
  },

  python: {
    "Basic Math": `x = 5
y = 3
z = x + y
x = x * 2`,

    "While Loop": `i = 0
total = 0
while i < 4:
    total = total + i
    i = i + 1`,
  },
};

// The first sample name to select by default, per language
export const DEFAULT_SAMPLE = {
  c: "Basic Math",
  cpp: "Basic Math",
  java: "Hello Variables",
  python: "Basic Math",
};
