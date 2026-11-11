import assert from "node:assert/strict";
import { test } from "node:test";

import { artistNote, closing, intro, mission } from "./world-tarot.ts";

/*
  The same contract as `site.test.ts`: the extraction's only claim is that
  nothing changed. These are the values as of 11 September 2026, written out
  longhand, and this passed before any string moved into JSON.
*/

test("the masthead and the mission keep their words", () => {
  assert.equal(intro.heading, "The World Tarot");
  assert.deepEqual(intro.tagline, ["A studio devoted to the living language", "of archetypal symbols"]);
  assert.deepEqual(mission.body, [
    "Through art, writing, and cinematic interpretation, The World Tarot explores archetypes as living presences — moving between symbolism and story.",
    "It extends tarot beyond the page through visual essays, symbolic libraries, and crafted readings designed to support clarity and perspective.",
  ]);
});

test("the artist's note keeps every paragraph and both alt texts", () => {
  assert.equal(artistNote.legend, "Between Sky & Stone");
  assert.deepEqual(artistNote.body, [
    "Welcome to The World Tarot — a place between sky and stone.",
    "I am a storyteller of symbols, shaped by a lifelong devotion to art, history, and the quiet mysteries between the seen and unseen.",
    "I began as a designer, drawn to sacred geometry and the visual languages that echo across cultures and time. For more than twenty years, I have worked with tarot as a reflective language — one that reveals patterns, thresholds, and inner truth.",
    "My work now lives at the intersection of art and intuition. I explore how symbols function not only as images, but as experiences — how a single card or form can focus attention, open perspective, and gently shift the way we move through the world.",
    "Through The World Tarot, I share readings and creative work shaped by place, myth, and history. This is a contemplative studio where art, symbolism, and intention meet.",
  ]);
  assert.equal(artistNote.photoAlt, "Serafina standing among the temple towers of Angkor Wat at sunset.");
  assert.equal(artistNote.signatureAlt, "Serafina");
});

test("the closing keeps its saying, and its button still goes to the readings index", () => {
  assert.deepEqual(closing.saying, ["Every journey is made", "one step at a time"]);
  assert.deepEqual(closing.action, { label: "GET MY READING", href: "/readings/" });
});
