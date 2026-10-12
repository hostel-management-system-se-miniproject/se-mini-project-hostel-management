# Hostel Management System (HMS)

A Software Engineering mini-project developed by **Team 3 --- Class
5-J**.

The goal of this project is to design and implement a Hostel Management
System that supports student registration and login, room allocation,
fee tracking, complaint handling, leave requests, visitor logging, and
administrative reporting, as defined in the approved Software
Requirements Specification (SRS).

> **Important:** The submitted SRS, Software Architecture Document
> (SAD), and Test Plan are the baseline for implementation. Any
> deviation must be recorded in `DEVIATIONS.md` and explained during the
> final demonstration.

------------------------------------------------------------------------

## Team Members and Responsibilities

  -----------------------------------------------------------------------
  Team member             Project role            Primary
                                                  responsibilities
  ----------------------- ----------------------- -----------------------
  **Chiranthan            Project Manager /       Project board, backlog
  Sathrasala**            Repository Coordinator  coordination,
                                                  story-point
                                                  coordination, merge
                                                  coordination,
                                                  `DEVIATIONS.md`,
                                                  submission coordination

  **Harsh**               Technical Lead          Technology-stack
                                                  decision, SAD, CI
                                                  workflow, database
                                                  schema, technical
                                                  coordination

  **Raiesh**              QA Lead                 Test Plan, test
                                                  execution, bug
                                                  tracking, recording
                                                  actual results and
                                                  pass/fail status

  **Neha**                Documentation and Demo  SRS, Requirements
                          Lead                    Traceability Matrix
                                                  (RTM), sprint demo
                                                  videos, final
                                                  documentation
  -----------------------------------------------------------------------

All members are expected to contribute to implementation, testing,
integration, code reviews, and defect resolution. These are project
responsibilities; GitHub permissions are managed separately by the
organization/repository administrators.

------------------------------------------------------------------------

## Project Deliverables and Workflow

The project is organized around the professor's deliverable schedule:

-   **12--16 October 2026 --- Dry run/practice:** Prepare the
    repository, backlog, story points, workflow, CI, scaffolding, and
    documentation corrections.
-   **19--23 October 2026 --- Sprint 1:** Deliver the agreed
    first-sprint stories, a working product, and a one-minute demo video
    uploaded to the repository.
-   **26--30 October 2026 --- Sprint 2:** Deliver the remaining agreed
    stories, a working product, a two-minute demo video, completed
    documentation, and a development freeze.

The team should use the GitHub Project board as the source of truth for
backlog items, assignees, story points, status, and sprint.

------------------------------------------------------------------------

## Repository Structure

The structure may evolve as the technology stack and implementation are
finalized.

``` text
.
├── .github/
│   ├── workflows/          # GitHub Actions CI workflows
│   ├── ISSUE_TEMPLATE/     # Issue templates, if configured
│   ├── pull_request_template.md
│   └── CODEOWNERS           # If configured
├── docs/
│   ├── SRS.md
│   ├── SAD.md
│   ├── TEST_PLAN.md
│   ├── RTM.md
│   ├── DEVIATIONS.md
│   └── ADR-001.md
├── src/                     # Application source code
├── tests/                   # Automated tests, if applicable
├── videos/                  # Sprint demo videos
└── README.md
```

Use the filenames already agreed by the team if they differ from those
above. Keep submitted v1.0 documents and revised v1.1 documents clearly
distinguishable; do not silently overwrite the submitted baseline.

------------------------------------------------------------------------

## Git and GitHub Collaboration Rules

### 1. The main branch is protected

-   `main` is the shared, stable branch.
-   **Do not work directly on `main`.**
-   Every change must be made on a separate branch.
-   Push your branch to GitHub and open a Pull Request (PR) targeting
    `main`.
-   A PR must receive approval from **at least one eligible teammate
    other than its author**.
-   **The PR author must not review or approve their own PR.**
-   Required CI checks must pass before merging.
-   Only the designated merge coordinators, **Chiranthan and Harsh**,
    merge approved PRs, subject to repository permissions and
    branch-protection rules.
-   Never merge your own PR, even if you have repository permissions
    that technically allow it.

### 2. Review rotation

Use this rotation so that each member's work is reviewed by someone
else:

  PR author    Assigned reviewer
  ------------ -------------------
  Chiranthan   Harsh
  Harsh        Raiesh
  Raiesh       Neha
  Neha         Chiranthan

If the assigned reviewer is unavailable or has contributed substantially
to the same change, coordinate with another teammate who did not author
the PR. The author must never approve their own PR.

### 3. Branch naming convention

Create one branch per issue or logically separate task.

Use:

``` text
feature/<issue-number>-short-description
fix/<issue-number>-short-description
docs/<issue-number>-short-description
test/<issue-number>-short-description
chore/<issue-number>-short-description
```

Examples:

``` text
feature/12-user-registration
feature/18-room-allocation
fix/24-fee-balance-validation
docs/31-update-test-plan
test/35-room-capacity-tests
chore/7-configure-ci
```

Replace the example issue numbers with real GitHub Issue numbers. Use
lowercase words separated by hyphens.

### 4. Commit message convention

Make small, meaningful commits. Use this format:

``` text
type(#issue-number): short description
```

Examples:

``` text
feat(#12): add student registration endpoint
fix(#24): reject negative fee payments
test(#35): add room capacity validation tests
docs(#31): update test plan traceability
chore(#7): configure GitHub Actions
```

Useful types: `feat`, `fix`, `test`, `docs`, `refactor`, and `chore`.

------------------------------------------------------------------------

## Essential Git Commands

Run these commands in a terminal opened in your local project folder.
Replace example branch names and issue numbers with the task you are
actually working on.

### 1. Clone the repository (first-time setup)

Copy the repository's HTTPS or SSH URL from GitHub, then run:

``` bash
git clone <repository-url>
cd <repository-folder>
```

Check the remote and current branch:

``` bash
git remote -v
git status
git branch
```

### 2. Start a new task from the latest `main`

First switch to `main`, then download the latest changes:

``` bash
git switch main
git pull origin main
```

Create and switch to your own branch:

``` bash
git switch -c feature/12-user-registration
```

The `-c` option creates the branch and switches to it. Do not create
your feature branch from an old or unrelated feature branch.

### 3. Check your branch before making changes

``` bash
git branch --show-current
git status
```

The branch name should be your task branch, **not `main`**.

### 4. Stage and commit your changes

Review the changed files:

``` bash
git status
git diff
```

Stage specific files (recommended when practical):

``` bash
git add path/to/file
```

Or stage all intended changes:

``` bash
git add .
```

Commit:

``` bash
git commit -m "feat(#12): add student registration endpoint"
```

Do not commit secrets, `.env` files, passwords, API keys, database
credentials, or real student data. Use `.env.example` with placeholder
values where appropriate.

### 5. Push to the correct remote branch

For the first push of a new branch:

``` bash
git push -u origin feature/12-user-registration
```

For later pushes to the same branch:

``` bash
git push
```

**Check the branch name before pushing.** The command above pushes to
`origin/feature/12-user-registration`, not to `main`.

If you are unsure:

``` bash
git branch --show-current
git status
```

### 6. Keep your branch updated with `main`

Before opening a PR, or when `main` has moved ahead, fetch the latest
remote state:

``` bash
git fetch origin
git switch main
git pull origin main
git switch feature/12-user-registration
git merge main
```

Resolve any conflicts carefully. After resolving a conflict, stage and
commit the resolution, run the relevant tests, then push your branch:

``` bash
git add <resolved-file>
git commit
git push
```

If the team has agreed to use rebase instead of merge for updating
feature branches, follow that shared convention consistently. Do not
force-push shared branches without coordinating with the team.

### 7. Open a Pull Request

On GitHub:

1.  Open the repository and select **Pull requests → New pull request**.
2.  Set the **base** to `main` and the **compare/head** to your feature
    branch.
3.  Review the changed files and confirm that no unrelated files or
    secrets are included.
4.  Use a clear title and description.
5.  Include `Closes #<issue-number>` when the PR completes that issue.
6.  Mention the SRS requirement IDs and test case IDs covered by the
    change.
7.  Request the reviewer specified in the review rotation.
8.  Wait for review comments and required CI checks.
9.  Make requested changes on the same branch, commit, and push. The PR
    updates automatically.
10. Merge only after approval and required checks pass. Chiranthan or
    Harsh performs the merge according to the team's rule.

Example PR description:

``` markdown
## Summary
- Implemented student registration validation.

## Traceability
- SRS requirement: FR-001
- Test cases: UT-01 to UT-05

## Verification
- [ ] Relevant tests run
- [ ] CI checks pass
- [ ] No secrets or unrelated files included

Closes #12
```

Do not claim tests passed unless they were actually executed
successfully.

### 8. Delete a branch after its PR is merged

After confirming the PR has been merged, switch away from the branch
first:

``` bash
git switch main
git pull origin main
```

Delete the local branch:

``` bash
git branch -d feature/12-user-registration
```

Delete the remote branch on GitHub:

``` bash
git push origin --delete feature/12-user-registration
```

GitHub may also offer a **Delete branch** button after merging a PR. If
you use it, you still need to delete the local branch if you no longer
need it.

Use `git branch -D <branch-name>` only when you intentionally want to
force-delete an unmerged local branch and have confirmed that its work
is no longer needed. Do not use it as the normal cleanup command.

### 9. Useful everyday commands

``` bash
git status                   # Show working-tree state
git branch                   # List local branches
git branch -a                # List local and remote-tracking branches
git switch main              # Switch to main
git fetch origin             # Fetch remote updates
git pull origin main         # Update local main from origin
git diff                     # Review unstaged changes
git diff --staged            # Review staged changes
git log --oneline -10        # Show the last 10 commits
git stash                    # Temporarily save uncommitted changes
git stash pop                # Restore stashed changes
```

Avoid `git reset --hard`, force-push commands, or deleting branches
unless you understand the consequences and have coordinated with the
team.

------------------------------------------------------------------------

## Definition of Done

A task is complete only when all applicable checks below are satisfied:

-   [ ] The work maps to a GitHub Issue and an agreed requirement or
    documentation task.
-   [ ] The change is committed on a task-specific branch.
-   [ ] Relevant tests have been run and their results recorded.
-   [ ] The PR targets `main`, references the issue, and lists the
    relevant SRS/test case IDs.
-   [ ] A teammate other than the PR author has reviewed and approved
    the PR.
-   [ ] Required CI checks pass.
-   [ ] The designated merge coordinator merges the PR.
-   [ ] Related documentation and the RTM are updated where needed.
-   [ ] Any deviation from the submitted SRS, SAD, or Test Plan is
    recorded in `DEVIATIONS.md`.

For test cases, record the **actual result** and **Pass/Fail** status
only after execution. Do not mark unexecuted tests as passed.

------------------------------------------------------------------------

## Security and Repository Hygiene

-   Never commit `.env` files, passwords, API keys, database
    credentials, tokens, or real student information.
-   Commit `.env.example` with placeholder values, not working
    credentials.
-   Keep local environment files out of Git using `.gitignore`.
-   Do not bypass branch protection or required reviews to save time.
-   Use test data for development and demonstrations.
-   Report accidentally committed secrets immediately; deleting them in
    a later commit may not remove them from Git history.

------------------------------------------------------------------------

## Project Documentation

Keep the following project artifacts in the agreed `docs/` location:

-   Software Requirements Specification (SRS)
-   Software Architecture Document (SAD)
-   Test Plan
-   Requirements Traceability Matrix (RTM)
-   `DEVIATIONS.md`
-   `ADR-001.md` documenting the technology-stack decision

The exact filenames and versions should be agreed by the team. Keep the
originally submitted documents available as the baseline and make
revisions traceable.

------------------------------------------------------------------------

**Team:** Team 3 --- Class 5-J\
**Project:** Hostel Management System\
**Project Manager:** Chiranthan Sathrasala
