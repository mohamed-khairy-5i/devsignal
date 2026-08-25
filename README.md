# DevSignal

> Turn GitHub work into a recruiter-ready developer card.

[![Live demo](https://img.shields.io/badge/Live%20demo-devsignal.netlify.app-D97845?style=flat-square)](https://devsignal.netlify.app)
[![License](https://img.shields.io/badge/License-MIT-1C221D?style=flat-square)](LICENSE)

**DevSignal** turns a public GitHub profile into a polished, editable developer card. It is designed for developers who want recruiters and clients to understand their best work faster than a repository list can communicate it.

## What you can do

- Pull in any public GitHub profile by handle or profile URL.
- Choose between Editorial, Terminal, and Paper card treatments.
- Curate highlighted projects manually instead of relying only on repository rankings.
- Add LinkedIn, portfolio, and X links to the card.
- Switch signal colors and light or dark interface modes.
- Export the finished card as PNG or PDF.
- Share a link that restores the selected profile, template, and accent color.

## Try it

Open the live application at **[devsignal.netlify.app](https://devsignal.netlify.app)**. No account or GitHub token is required for the first card; DevSignal uses publicly available GitHub profile and repository data.

## Local setup

```bash
git clone https://github.com/mohamed-khairy-5i/devsignal.git
cd devsignal
pnpm install
pnpm dev
```

The local application runs with Vite. Use `pnpm run check` for type checking and `pnpm run build` for a production build. GitHub Actions runs both checks automatically for every pull request and push to `main`.

## Product principles

DevSignal is not a GitHub statistics wall. It is a **presentation layer for proof of work**. The product should make it easier for a developer to choose the projects, skills, and links that fit a specific opportunity.

## Contributing

Contributions, design critiques, and issue reports are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request. If you use DevSignal to create a card, share the live link or a screenshot in a GitHub issue; that feedback helps prioritise the next templates and export formats.

## Roadmap

- [ ] A dedicated recruiter-view link with a distraction-free layout.
- [ ] Arabic and RTL card treatments.
- [ ] Role-aware card recommendations for job applications.
- [ ] Ready-made export dimensions for LinkedIn and resumes.
- [ ] GitLab import and verified skill evidence.

## License

DevSignal is available under the [MIT License](LICENSE).

---

Built by [Mohamed Khairy](https://github.com/mohamed-khairy-5i).
