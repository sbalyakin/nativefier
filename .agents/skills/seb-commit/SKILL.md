---
name: seb-commit
description: Perform the full guarded git commit workflow for this repository. Use when the user asks to commit current work, save changes to git, or run a commit flow that stages changes, proposes a commit message, waits for explicit approval, runs ByteRover curation, and creates the commit. Also use when the user wants a commit message generated from the exact staged or to-be-staged snapshot while enforcing `.agents/rules/commit-messages.md`.
---

# Commit Workflow

Run a guarded commit flow. Use the git index as the commit source of truth.

## Required Inputs

Read `.agents/rules/commit-messages.md` before generating any commit message.

Inspect git state first:

```bash
git status --short
```

Treat status codes as:
- first column: staged state
- second column: unstaged state

## Workflow

### 1. Check for changes

If there are no staged changes and no unstaged changes, tell the user there are no changes to commit and stop.

### 2. Handle unstaged changes

If any unstaged changes exist, stop before staging anything.

Tell the user:
- this command will stage all current changes before commit
- the approved commit will use that fully staged snapshot

Ask for confirmation with exactly these options:
- `1` continue
- `2` cancel

Accept only `1` or `2` at this step.

If the user says `2`, stop without making changes.

If the user says `1`, stage everything:

```bash
git add -A
```

After staging, use the fully staged index as the selected commit scope.

### 3. Use staged snapshot directly

If there are no unstaged changes but staged changes already exist, do not restage or widen scope.

Use the current staged index as the selected commit scope.

### 4. Analyze selected scope

Inspect only the selected staged snapshot:

```bash
git diff --cached --stat
git diff --cached
git diff --cached --name-only
```

Generate one commit message for that exact snapshot. Follow `.agents/rules/commit-messages.md` exactly.
Display the commit message wrapped in triple backticks.

Do not commit in the same reply where you first propose the message.

### 5. Get approval

Show the single proposed commit message and ask for approval.

Accept only:
- `1` to approve
- `2` to generate a new commit message for the same selected scope
- a custom commit message from the user

If the user says `2`, regenerate one new message for the same selected scope and ask again.

If the user provides a custom message, use it exactly. Do not rewrite it unless the user explicitly asks.

### 6. Run ByteRover curation before commit

Do not create the commit until ByteRover curation succeeds.

Curate the exact selected commit scope:
- use a short factual summary
- focus on behavioral or architectural outcome
- prefer `-f` with up to 5 most relevant changed files
- if the change is broad but concentrated in one subsystem, use `-d` with one dominant folder instead
- prefer `--format json`

Pick the files or folder from the selected staged snapshot, not from unstaged workspace state.

Example patterns:

```bash
brv curate "Improve input replacement reliability" --format json -f path/a -f path/b
brv curate "Refine runtime event pipeline behavior" --format json -d src/SwitchyOneCore/Runtime
```

If curation fails, stop and tell the user curation failed. Do not create the commit.

### 7. Create the commit

If curation succeeds, create the git commit with the approved message.

After commit, report:
- the final commit message
- confirmation that curation succeeded
- the created commit hash

## Guardrails

- Do not skip the approval step.
- Do not auto-approve the commit message.
- Commit only the exact staged snapshot that was approved.
- Do not stage more changes after message approval.
- Do not include extra explanation in the final success message unless needed.
- If user approval is required, stop and wait.
- If the user gives an invalid numeric response at either approval gate, restate the allowed options and wait.
