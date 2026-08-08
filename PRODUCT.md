# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Static HTML/CSS/JS, no framework, no backend. Deliberate choice for now: features that require AI calls (Claude, Groq, Gemini) and a backend will be addressed later, when those features are built.

## Users

Rebeca, a single primary user: a medical student in the 4th period, using MediStudy to study for her own course. This is a personal-use project, not a product being launched for other students. Login is identification-only (email + name), consistent with a single-user tool rather than a multi-tenant product.

Current focus subjects (4th period): Farmacologia II, Patologia Clínica, Semiologia IV, Microbiologia, Parasitologia, Humanidades (Direitos Humanos, Deontologia e Ética).

## Product Purpose

A personal study companion for medical school that combines classic study methods (spaced repetition, Active Recall, Feynman technique, Pomodoro) with AI-generated study aids (clinical cases, flashcards from lecture photos, mind maps, mock exams styled after specific professors) and organizational tools (exam calendar, grade tracking, study timeline). Success means Rebeca studies more consistently and effectively for her own coursework and exams.

## Positioning

The differentiator is emotional/adaptive study support layered on top of the academic content, not just another flashcard or case-generator app (where Anki, UpToDate, etc. already compete). Planned mechanisms: an exam-anxiety mode that adapts tone when she's getting things wrong, an intelligent error diary that surfaces error patterns, and emotional anchors that tie difficult concepts to personal memories. The tool is meant to respond to how she's doing, not just what she's studying.

## Operating Context

- Studying for medical school exams and clinical rotations, within a Brazilian medical curriculum (professors, provas, and clinical style referenced throughout planning).
- Workflow moments called out in planning: pre-class quick review (5 min before aula), night-before-exam mode ("véspera de prova"), post-study auto-summary, and continuing from where she left off on the home screen.
- Source materials she works from: lecture slides/photos, PDFs, exam results (hemograma, gasometria, etc.) to be uploaded and interpreted.
- Current home screen ("missão do dia") shows a daily study mission, subject tag, and a "continue studying" action — the organizing metaphor is a daily mission/quest, not a plain dashboard.

## Capabilities and Constraints

Confirmed from current implementation:
- Login/identification screen (email + name, no password) — `index.html`, `script.js`.
- Home screen with daily mission, greeting, ECG-styled hero illustration — `home.html`, `home.js`, `style.css`.
- Visual identity already in place: caduceus logo, heart illustration, ECG line motif, Cinzel display typeface.

Planned but not yet built (from `planejamento.md`), grouped as open scope, not commitments:
- Study tools: spaced-repetition flashcards, AI-generated clinical cases, interactive mind maps, "explain to the professor" mode, "what if" body-cascade simulator, whiteboard schematics, comic-strip explainers, answer simplifier, post-study image/question quiz, multiple-choice clinical simulator (physiology + pathology + mechanism triad), professor-styled mock exam simulator, Anki importer, Active Recall, Feynman method, auto post-session summary, quick-review mode, exam-eve mode, cross-subject connection generator, integrated Pomodoro, lecture-photo-to-flashcard clip tool, AI-driven anamnesis simulator (AI plays the patient), lab-result interpreter (hemograma, gasometria, etc.), ethical-dilemma simulator (Humanidades), microbiology/parasitology agent identifier, exam-anxiety mode, intelligent error diary, emotional anchor for hard concepts.
- Organization: exam calendar, grade tracking with "what I need next" calculator, progress history with charts, spaced-repetition notifications, semester study timeline, Google/Apple Calendar integration, resume-where-left-off.
- Files: PDF/image/document upload and content analysis.
- Access: offline mode for already-generated flashcards/mind maps, full admin panel (admin panel is notable scope even for a single-user tool — undecided why; treat as open).
- Planned AI providers/roles: Claude for heavy reasoning and complex clinical cases; Groq for fast/simple responses; Gemini for image and PDF handling; Cohere/Mistral/OpenRouter as backup and token-cost savings.

Explicitly undecided: backend architecture and hosting, since the stack stays static until AI-dependent features are actually built.

## Brand Commitments

- Name: MediStudy.
- Existing visual assets in place: caduceus logo (`caduceu.png`), heart illustration (`coracao.png`), custom SVG icons (ECG, email, person), Cinzel typeface for display type.
- Tone in current copy mixes formal medical framing (caduceus, Cinzel serif) with a casual, personal voice (e.g. login page footer joke about failing/"21K"; home greeting "Boa noite, Rebeca 🌙").

## Evidence on Hand

- `planejamento.md`: full feature backlog and planned AI-provider allocation, written by Rebeca as an open running list.
- `index.html` / `style.css` / `script.js`: working login/identification screen.
- `home.html` / `home.js`: working home screen with daily-mission section and animated ECG hero graphic.
- Presentation assets (`Apresentação MediStudy-1.webp`, `Apresentação MediStudy-2.png`) exist but were not opened as part of this record; treat their content as unconfirmed until reviewed.
- No user research, testimonials, or usage data exist beyond Rebeca's own intended use — do not fabricate them.

## Product Principles

1. Build for one real user (Rebeca) and her actual 4th-period coursework, not a generalized student persona.
2. Respond to emotional/performance state, not just academic content — anxiety, error patterns, and personal memory are first-class inputs, not afterthoughts.
3. Keep the stack as simple as the current feature actually needs; do not introduce a backend or framework ahead of a feature that requires it.
4. Preserve the daily-mission framing (a single focused task per day) as the organizing home-screen metaphor rather than a generic dashboard.
5. Treat the long feature backlog in `planejamento.md` as candidate scope, not a committed roadmap — confirm before building any single item.
