# AutoAccessories website

Static site built with [Eleventy](https://www.11ty.dev/) and published to GitHub Pages.
The output is plain HTML, one CSS file and one small JS file.
The Inter font is self-hosted (from the `@fontsource-variable/inter` package, SIL Open Font
License). The site makes no requests to other servers apart from the quote form going to Formspree.

## Editing content

| What | File |
|---|---|
| Business name, phone, email, address, hours, town, site URL, Formspree form ID | `src/_data/site.json` |
| Recent work slideshow cards | `src/_data/jobs.json` |
| Services and prices | `src/_data/services.json` |
| Page copy | `src/index.njk`, `src/services.njk`, `src/thanks.njk` |
| Shared head, header and footer | `src/_includes/base.njk` |
| Styles / slideshow and form script | `src/css/styles.css`, `src/js/main.js` |

Placeholders are in square brackets, e.g. `[YOUR PHONE]`. A few notes:

- `phone` is what visitors see; `phoneLink` is used for tap-to-call and must have no spaces (e.g. `+6491234567`).
- `url` is the live address with no trailing slash, e.g. `https://example.co.nz` or `https://username.github.io/repo`.
- Prices in `services.json` show muted until they no longer contain `[` (or say `quote`), then they show in bold white.
- Job photos: put the image in `src/img/work/` and set `"photo": "file.jpg"` and a short `"photoAlt"` on that job.

## SEO checklist (before and after launch)

The site already outputs page titles and descriptions, canonical links, a `sitemap.xml`,
`robots.txt`, social share tags with a share image, and schema.org `AutoRepair` data
(including services and starting prices). For it to work properly:

1. **Set `url`** in `site.json` to the live address. Canonical links, the sitemap,
   robots.txt and the share image all build from it.
2. **Fill in `[TOWN]`** and the other contact placeholders. The town appears in the home
   page title and description and in the business data; it's the main local-search signal.
3. **Google Search Console** (search.google.com/search-console): add the site, choose the
   "HTML tag" method, paste just the `content="..."` value into `googleVerification` in
   `site.json`, push, then verify. Then submit `sitemap.xml` under **Sitemaps**.
4. **Google Business Profile**: create or claim the listing and add the website URL. For
   a local workshop this matters more than anything on the site itself. Keep the name,
   address and phone exactly the same as on the site.
5. **Business name changed?** Update `site.json`, then run `npm run images` to redraw the
   share image and home-screen icon.
6. **Job photos**: give each one a short, specific `photoAlt`, such as "Boost and oil pressure
   gauges in an A-pillar pod on a Subaru WRX".

On a GitHub project site (`username.github.io/repo`), search engines don't read
`robots.txt` from a subfolder. Submit the sitemap in Search Console instead, or use a custom domain.

## Running locally

```bash
npm install
npm start        # preview at http://localhost:8080
npm run build    # writes the site to _site/
npm test         # browser/device compatibility + SEO checks (Playwright)
npm run images   # redraw the share image and home-screen icon from site.json
```

`npm test` builds the site and checks it in Chrome, Firefox and Safari (WebKit) on desktop,
plus iPhone, Pixel, Galaxy and iPad emulation. Full-page screenshots for each device land in
`screenshots/`. First run only: `npx playwright install chromium firefox webkit`.

## Deploying

Pushing to `main` builds and publishes automatically (`.github/workflows/deploy.yml`).
One-time setup: in the GitHub repo go to **Settings → Pages** and set **Source** to **GitHub Actions**.
