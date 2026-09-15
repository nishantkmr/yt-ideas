# Where Does Your Food Go? — Human Review

Content file: `content/human-body-digestion/content.json`

This draft must not be marked approved until a person has completed all three
sections. Source IDs in the table map directly to `researchSources` in the JSON.

## Question review

| ID | Answer | Source | Human checks |
| --- | --- | --- | --- |
| digestion_001 | Saliva | niddk-digestion | Wording, starch fact, distractors, saliva-and-food animation |
| digestion_002 | Mouth → esophagus → stomach → small intestine | niddk-digestion | Route order and ordering UI |
| digestion_003 | False | niddk-digestion; ncbi-peristalsis | Gravity wording and peristalsis explanation |
| digestion_004 | Stomach | niddk-digestion | All three clues and reveal diagram |
| digestion_005 | Liver | niddk-digestion | Bile wording and helper-organ distinction |
| digestion_006 | Gallbladder | niddk-digestion | Storage-and-release wording and small-sac diagram |
| digestion_007 | True | niddk-digestion | Pancreatic juice wording and pancreas diagram |
| digestion_008 | Small intestine | niddk-digestion | “Most nutrients” wording and diagram |
| digestion_009 | True | niddk-digestion | Water absorption and age-appropriate wording |
| digestion_010 | To absorb and use nutrients | niddk-digestion | Learning payoff and digestion-related distractors |

## Approval gates

- [x] Watch `outputs/preview-human_body_202609_digestion_01.mp4` from beginning to end.
- [x] Question, countdown, answer, and outro transitions remain readable without narration.
- [x] Choices stay visible through the countdown, and question 10 provides enough time to read every sentence choice.
- [x] The question scene does not exit or replay when the timer appears.
- [x] The compact timer feels attached to the question card and does not cover question text.
- [x] No organ label or highlighted answer appears during a question stage.
- [x] Facts checked against every mapped source.
- [x] Distractors are unambiguous and suitable for ages 7–10.
- [x] Explanations are accurate, useful, and understandable to a seven-year-old.
- [x] Pronunciations for esophagus, peristalsis, intestine, enzyme, gallbladder, and pancreas are acceptable.
- [x] Every organ reveal uses a clear close-up; especially confirm the stomach, gallbladder, pancreas, small intestine, and large intestine are visually distinct.
- [x] Reveal action cues are engaging and correctly match saliva, food movement, mixing, bile, enzymes, nutrient absorption, and water absorption.
- [x] The unlabelled question diagram does not reveal the answer.
- [x] The code-native diagram and procedural music need no third-party visual or music license.
- [x] The existing owl asset remains covered by `asset-licenses.json`.
- [x] The episode feels like an inside-the-body journey, not an animal-quiz reskin.
- [x] The final proud-message bubble stays below the owl and leaves its face completely visible.
- [x] The final screen asks a grown-up to subscribe without covering the owl.

## Decision

- Reviewer: Project owner
- Review date (YYYY-MM-DD): 2026-09-06
- [x] Facts approved
- [x] Rights approved
- [x] Editorial presentation approved
- Notes: Approved for Sarvam narration after iterative visual review and the final
  timer/outro refinements. Title changed to “Where Does Your Food Go?” and the
  final question distractors were revised on 2026-09-07.

After all boxes are complete, update the JSON review object, enable narration,
run `npm run validate:content`, and only then run `npm run generate:voiceover`.

## Post-generation audio QA

- [ ] Listen to `outputs/human_body_202609_digestion_01.mp4` from beginning to end.
- [ ] Confirm Suhani clearly pronounces esophagus, peristalsis, intestine, enzyme,
  gallbladder, and pancreas.
- [ ] Confirm narration is easy to hear above the music and countdown tick.
- [ ] Confirm no narration is clipped and pauses feel natural.
- [ ] Approve the rendered MP4 for upload.
