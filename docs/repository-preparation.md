# Independent repository setup

This project was prepared from reviewed current source files, without the original `.git` directory. No historical commits, branches or remotes were copied. Application source and tests are unchanged. `node_modules/` and `dist/` are generated locally for verification and ignored by Git.

Included: `src/`, `server/`, `shared/`, `scripts/`, `tests/`, the SVG favicon under `public/`, package manifests, Vite configuration, `index.html`, `.env.example`, `.gitignore`, deployment examples, the proposal and current technical documentation.

Excluded: original Git history, `.env`, `.data/`, private submissions, photo backups, personal photographs, screenshots, logs, temporary files, original dependencies/build output, `CLAUDE_PROMPT.md`, historical handoff/review notes, `preview.html`, `design-reference.png` and the private photo inventory. Excluded material remains in the original private project. Dependencies/build output in this copy are freshly generated, not copied.

The unused `src/data.js` is retained because the existing syntax-check script checks it. It is not the live event catalog. Preserve course-required disclosures; see [provenance](project-provenance.md).

## Commands for later use

No Git commands below have been executed during preparation. Run these only after reviewing and approving the file inventory and initial commit. The repository should be private.

```bash
cd /path/to/254-mass-connect-aws
git init -b main
git status --short --untracked-files=all
# Review the files and ensure no private data or credentials are included.
git add .
git diff --cached --stat
git diff --cached --check
git commit -m "Initialize AWS-oriented copy of existing 254 Mass Connect application"
# Requires GitHub CLI authentication and approval to create/push the private repo.
gh repo create 254-mass-connect-aws --private --source=. --remote=origin --push
```

Alternatively, create an empty private GitHub repository manually after approval, add its URL with `git remote add origin <private-repository-url>`, then run `git push -u origin main`. Do not point this directory at the original project's remote.
