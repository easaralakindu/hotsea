# HOTSEA — Cloudflare Pages (full replacement)

This is a complete replacement of the existing HOTSEA Cloudflare project. It includes the existing responsive HOTSEA front-end and new Pages Functions. No Netlify files and no build dependencies.

## GitHub deployment with your existing repository

1. Extract this ZIP. Inside it is **HOTSEA_CLOUDFLARE** with **public** and **functions** folders.
2. On GitHub, replace the contents of the existing `HOTSEA_CLOUDFLARE` folder with this package (overwrite same-path files), including the new `functions/api/health.js`.
3. Keep your Cloudflare Pages settings: Git repository `easaralakindu/hotsea`, root directory `HOTSEA_CLOUDFLARE`, build output directory `public`, build command `exit 0`, production branch `main`.
4. Ensure Cloudflare builds the *latest commit*. If automatic deployment does not start, use your deploy hook with a POST request (never expose the hook URL). **Uploading files to GitHub alone does not replace the live site.**
5. Visit `/api/health`. The response must include `hotsea-rebuild-2026-10-03-v1`. This verifies the exact new backend is live.
6. Visit `/api/catalog` to test the video provider response.

## Environment variables (Cloudflare Production)

- `HOTSEA_FEED_URL`: an HTTPS JSON feed URL supplied by an authorized provider. Required for live video listings.
- `HOTSEA_APPROVED_VIDEO_IDS`: comma-separated IDs of videos individually reviewed for publication rights, age and consent. Until listed, videos fetched from Eporner are not published.
- `HOTSEA_FEED_TOKEN`: optional Bearer token, store as a secret.
- `HOTSEA_ALLOWED_FEED_HOSTS`: comma-separated approved hostname(s) when using a non-Eporner JSON feed.

Production variables are read by Pages Functions at runtime. Keep the provider URL and token private when applicable.

## API behavior

- `/api/health` -> returns exact backend build version, no upstream dependency.
- `/api/catalog` -> normalized `{status,items,received,published,build}` JSON.
- `status:upstream_error` / `responseType:HTML` means the provider returned HTML and did not serve a usable JSON feed to the Cloudflare function. Changing ZIP packages will **not** circumvent provider access controls. Arrange authorized server-side access or use another approved provider/feed.
- `status:ok,published:0` means the provider is reachable but no returned videos are independently approved.

The 18+ confirmation is an interface notice, not legally sufficient age verification. Replace the legal/privacy templates and implement jurisdiction-appropriate verification and moderation before public release of explicit content.
HOTSEA automatic video feed configuration update.