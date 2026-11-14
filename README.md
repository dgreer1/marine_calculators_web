# Marine Calculators Web

A browser-based collection of coastal and marine engineering calculators. The application is being migrated incrementally from a separate R Shiny reference implementation, with numerical parity tests for every calculator.

The implemented calculators are Linear Wave Theory and Wave Shoaling and Refraction. BEWARE reef setup/runup is intentionally excluded from the initial static migration because its fitted R GAM model requires a separate deployment design.

## Technology

- Vue 3 and TypeScript
- Vite
- Plotly.js
- Vitest
- GitHub Actions and GitHub Pages

All normal calculations run locally in the browser. There is no application server or user session to expire.

## Local development

Requirements: Node.js 24 and pnpm 10.

```sh
pnpm install
pnpm dev
```

Run numerical tests and create a production build:

```sh
pnpm test
pnpm build
```

## Architecture

- `src/engineering/` contains framework-independent numerical functions.
- `src/calculators/` contains calculator UI, defaults, plot-series builders, and display behaviour.
- `src/components/` contains shared presentation components.
- `tests/` contains numerical parity and boundary tests.

Plots call the same engineering functions as headline results. Browser inputs are saved in namespaced local storage and may be reset or exported as versioned JSON.

## Deployment

`.github/workflows/deploy-pages.yml` tests and builds every pull request. A successful push to `main` deploys `dist/` to GitHub Pages using GitHub's official deployment actions.

In the GitHub repository settings, set **Pages → Build and deployment → Source** to **GitHub Actions** once. The published site will then be available under the repository's GitHub Pages URL.

## Scope

The R Shiny source is a local numerical reference and is not part of this repository. Cnoidal/nonlinear wave modules are not present in that source. Solitary-wave calculations may be considered as future, separately specified work.

## Licence and use

This is proprietary software, not an open-source project. The hosted calculators may be used for their intended calculation functions, and users may use results and spreadsheets generated from their own inputs. The source code may not be copied, modified, redistributed, incorporated into another product, or used to create derivative works without prior written permission. See [LICENSE](LICENSE) for the complete notice.

Third-party material remains subject to its own terms. In particular, the experimental John D. Fenton FOURIER adaptation remains attributed to John D. Fenton, is not relicensed by this repository, and is included while redistribution permission is being sought.
