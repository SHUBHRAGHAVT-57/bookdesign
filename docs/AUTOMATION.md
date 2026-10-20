# KeyTurn automation guide

## CI checks

The `.github/workflows/ci.yml` workflow runs for pushes to `main`, pull requests targeting `main`, and manual dispatch. It runs the existing unit tests, TypeScript/production build, and Playwright end-to-end tests. It does not push code, merge pull requests, or deploy the app.

**Lockfile follow-up:** the current root `package-lock.json` contains an empty `packages` map, despite the dependencies in `package.json`. CI temporarily uses `npm install --no-package-lock` so it does not rely on this invalid/incomplete lockfile. Regenerate and review a real lockfile before switching CI to `npm ci`.

## LinkedIn post drafts

1. Open **Actions → Draft KeyTurn LinkedIn Post → Run workflow**.
2. Enter a real milestone and verified changes, plus a genuine challenge and lesson. Avoid unsupported metrics or features.
3. Download the `keyturn-linkedin-draft` artifact from the completed run.
4. Check every claim, edit into your own voice, then publish manually if you want to.

The workflow requires an `OPENAI_API_KEY` Actions secret. Add it at **Settings → Secrets and variables → Actions → New repository secret**. Never commit the key or paste it into workflow inputs. The workflow does not publish to LinkedIn and does not automate likes, comments, follows, or connection requests.

## Reviewable development workflow

- Work on a feature branch.
- Open a pull request and let CI run.
- Review the diff and test results before merging.
- Vercel deployment depends on the existing Vercel/GitHub integration and project configuration; this automation does not change deployment settings.
