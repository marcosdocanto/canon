# Releasing Canon

The public repository is [`marcosdocanto/canon`](https://github.com/marcosdocanto/canon). The npm package is `canon-ds`; its CLI is `canon`. Maintainers use Node.js 24 from [`.nvmrc`](../.nvmrc), while consumers can use Node.js 22.18 or newer. [`package.json`](../package.json) owns the version; `src/version.ts` reads it directly.

## One-time hosting setup

In the repository's **Settings → Pages**, choose **GitHub Actions** as the source. The [`CI workflow`](../.github/workflows/ci.yml) tests Node 22.18 and 24, runs Chromium checks, builds `site/` and uploads the Pages artifact. Only successful pushes or manual runs on this repository's `main` branch deploy to the `github-pages` environment. Pull requests build and test without deploying. If environment rules restrict deployments, allow `main`. See [GitHub's Pages workflow documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

The expected catalog URL is [marcosdocanto.github.io/canon](https://marcosdocanto.github.io/canon/). It serves a static catalog and downloadable package archive; editable Studio runs locally in each project. The site build uses generated sample data and needs no private credentials or personal design directory.

## Check a release locally

Use a clean checkout of the intended release commit. Run from the repository root:

```sh
npm ci
npx playwright install chromium
npm run test:ci
npm run build
npm run release:check
npm run build:site
```

On Linux, use `npx playwright install --with-deps chromium` when browser system libraries are needed. Inspect the package contents, generated catalog and downloadable archive. Ensure the MIT [`LICENSE`](../LICENSE) and [`THIRD_PARTY_NOTICES.md`](../THIRD_PARTY_NOTICES.md) are included. `lib/`, `site/` and generated design output are build artifacts, not release source changes.

## First npm publication

The first publication establishes `canon-ds` on npm so its trusted publisher can be configured. A maintainer with the intended npm account must sign in locally and complete any requested authentication. Run the local checks above, then:

```sh
npm login --registry=https://registry.npmjs.org/
npm whoami --registry=https://registry.npmjs.org/
npm publish --ignore-scripts --access public
```

Confirm `npm whoami` shows the account that should own the package before publishing. The final command publishes the checked version; package versions cannot be replaced. `--ignore-scripts` avoids rerunning lifecycle hooks because tests, the build and release checks have already completed. A local first publication does not carry GitHub Actions provenance. See [npm's publishing documentation](https://docs.npmjs.com/cli/v11/commands/npm-publish/) and [provenance requirements](https://docs.npmjs.com/generating-provenance-statements/).

For the initial `0.1.0` release, tag the exact published commit as `v0.1.0` and push that tag after publication succeeds. Do not dispatch the publish workflow for a version already on npm.

## Configure npm trusted publishing

In the npm package's **Settings → Trusted Publisher**, add GitHub Actions with these values:

| Setting | Value |
| --- | --- |
| Organization or user | `marcosdocanto` |
| Repository | `canon` |
| Workflow filename | `publish.yml` |
| Environment name | Leave blank; the publish job does not declare one. |
| Allowed actions | Enable direct `npm publish`. |

New trusted-publisher configurations default to staged publishing, so direct publication must be allowed explicitly. No `NPM_TOKEN` secret is needed. The workflow uses GitHub-hosted Ubuntu, Node 24 and npm 11 with OIDC and provenance; npm requires at least Node 22.14 and npm 11.5.1 for this authentication. See [npm's trusted publishing guide](https://docs.npmjs.com/trusted-publishers/).

The [`publish workflow`](../.github/workflows/publish.yml) runs only when manually dispatched. Creating a tag or GitHub Release does not publish a package.

## Subsequent releases

1. Prepare release notes and migration guidance for changed tokens, props, schemas or generated interfaces. On the release branch, use `npm version patch --no-git-tag-version` (or `minor`/`major`) to update `package.json` and `package-lock.json` together. Review and merge the version change through the normal pull request flow.
2. Wait for CI on the intended `main` commit. Create and push the matching stable version tag from that commit. For example, a `0.1.1` release uses `git tag -a v0.1.1 -m 'Release 0.1.1'`, then `git push origin v0.1.1`.
3. Dispatch from the existing tag, passing the same tag as input. Replace both example values with the release version:

   ```sh
   gh workflow run publish.yml --repo marcosdocanto/canon --ref v0.1.1 -f tag=v0.1.1
   ```

4. Confirm the workflow succeeds and inspect the published package version and provenance on npm. Attach the release notes to the matching GitHub tag when publishing the GitHub Release.

The workflow verifies that the tag matches `package.json` and that the checkout matches the dispatch commit, then installs dependencies, runs all tests, builds and checks the package before publishing. Running the workflow from the same tag keeps provenance aligned with the released source. The workflow must exist on the repository's default branch and in the selected tag; see [GitHub's manual workflow documentation](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/manually-run-a-workflow).

This workflow accepts stable `vX.Y.Z` tags and publishes to npm's default `latest` tag. Prereleases need an intentional workflow change and a separate npm distribution tag. If publication fails, inspect the logs and registry before retrying: a version may have published successfully before a later reporting error. Fixes to an already published package require a new version.
