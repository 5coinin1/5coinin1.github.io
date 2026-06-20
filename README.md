# 5coinin1.github.io

Terminal-style personal site for a CTF player.
**Astro + TypeScript + Tailwind v4 + MDX.** Static, fast, zero-JS except the
interactive terminal island.

## ✏️ Customize

| What | Where |
| --- | --- |
| Your info (name, skills, projects, ctf, socials) | [`src/data/site.ts`](src/data/site.ts) — **edit this one file** |
| Colors / theme | CSS variables at top of [`src/styles/global.css`](src/styles/global.css) |
| ASCII banner | `banner` const in [`src/components/Terminal.astro`](src/components/Terminal.astro) (generate at patorjk.com/software/taag) |
| Writeups / blog | add `.mdx` files in [`src/content/writeups/`](src/content/writeups) |

Both the static sections **and** the terminal commands read from `site.ts`,
so editing it updates everything.

## 🧞 Local dev

```bash
npm install      # first time only
npm run dev      # http://localhost:4321
npm run build    # output to ./dist
npm run preview  # preview the production build
```

## 🚀 Deploy to GitHub Pages

A GitHub Actions workflow is already included at
[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml).

1. Create a repo named **exactly** `5coinin1.github.io`.
2. Push this project to `main`:
   ```bash
   git init
   git add .
   git commit -m "init terminal site"
   git branch -M main
   git remote add origin https://github.com/5coinin1/5coinin1.github.io.git
   git push -u origin main
   ```
3. In the repo: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
4. The workflow builds and deploys on every push. Site goes live at
   **https://5coinin1.github.io**.

> No `base` path needed — a user page is served at the domain root.

## ⌨️ Terminal commands

`help · whoami · about · skills · projects · ctf · writeups · socials ·
contact · banner · clear` — plus hidden: `ls`, `cat flag.txt`, `sudo`, `echo`,
`date`. ↑/↓ history · Tab autocomplete · Ctrl+L clear.
