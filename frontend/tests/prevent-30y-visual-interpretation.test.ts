import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const calculator = readFileSync(
  new URL("../src/components/calculator/PreventCalculator.tsx", import.meta.url),
  "utf8",
);

test("30-year PREVENT risk does not use categorical visual labels", () => {
  assert.match(calculator, /if \(horizon !== "10y"\) \{\s*return null;\s*\}/);
  assert.doesNotMatch(calculator, /if \(risk >= 40\) return "high";/);
  assert.doesNotMatch(calculator, /if \(risk >= 20\) return "intermediate";/);
  assert.match(calculator, /RIESGO ACUMULADO/);
});

test("30-year PREVENT panel explains cumulative numeric interpretation", () => {
  assert.match(calculator, /Estimación acumulada a 30 años/);
  assert.match(calculator, /AHAprevent entrega un valor numérico/);
  assert.match(calculator, /no existe una clasificación oficial bajo\/intermedio\/alto/);
});

test("10-year visual category convention remains available", () => {
  assert.match(calculator, /if \(risk >= 20\) return "high";/);
  assert.match(calculator, /if \(risk >= 7\.5\) return "intermediate";/);
  assert.match(calculator, /if \(risk >= 5\) return "borderline";/);
  assert.match(calculator, /return "low";/);
  assert.match(calculator, /if \(category === "low"\) return "Bajo";/);
  assert.match(calculator, /Categoría visual de 10 años/);
});

