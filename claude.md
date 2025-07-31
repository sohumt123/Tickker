# claude.md — Workflow & Quality Guard-rails
You are in **Claude Code** interactive mode.

---

## 1 Incremental GitHub workflow

1. **Clone the existing repo**  
   `git clone https://github.com/sohumt123/Stock-Visualizer-Fidelity.git`

2. **Create a working branch** off `main` called  
   `feature/portfolio-vs-spy`.

3. **Commit early & often**  
   * After every meaningful step (CSV parser, price fetch, first chart, styling pass, etc.)  
   * Clear, imperative commit messages — e.g. `Add position-rebuild helper`.

4. **Push after each commit** to the remote branch so progress is visible.

5. Open a **draft pull request** from `feature/portfolio-vs-spy` into `main` immediately; keep pushing to update it.

---

## 2 Focus areas while coding

| Dimension          | Expectations                                                    |
|--------------------|-----------------------------------------------------------------|
| **UI / UX polish** | Smooth interactions, balanced layout, mobile-first flow.        |
| **Code clarity**   | Self-documenting names, concise doc-strings / JSDoc.            |
| **Tests**          | Unit tests for all core data functions; aim for 90 % coverage.  |
| **Security**       | No secrets committed; load API keys from `.env.example`.        |
| **Accessibility**  | WCAG-AA color contrast, keyboard-navigable components.          |
| **Docs**           | Keep the README current; include setup, usage & design notes.   |

---

## 3 Definition of “done”

* App runs locally with `npm run dev` (frontend) and `uvicorn main:app` (backend).  
* Dropping the Fidelity CSV into `/data` parses without errors.  
* “Growth of $10 k” chart correctly overlays Portfolio vs SPY.  
* Weight donut, recent-trades table, and performance badges render.  
* All tests pass: `pytest -q && npm test --silent`.  
* README and `/docs` explain architecture, API routes, and design tokens.  
* CI (GitHub Actions) runs lint → test → build and passes.

---

## 4 Communication

* Post a short status update in the PR description after each major feature.  
* Mention any blockers immediately in a separate PR comment.
