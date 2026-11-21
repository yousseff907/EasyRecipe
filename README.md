# EasyRecipe

EasyRecipe turns cooking videos into written recipes. Paste a TikTok or Facebook link and it downloads the video, transcribes the audio with Whisper, and has Gemini write out the ingredients, steps, cooking times and an estimated nutrition breakdown per serving.

It ran as a public website at easyrecipe.online from January to June 2026. It is no longer hosted, but you can run it yourself with one command (see [Running it locally](#running-it-locally)).

## What it does

- Extracts recipes from TikTok videos, TikTok photo slideshows and Facebook videos. You can add up to 300 characters of extra instructions, like "make it vegan". Instagram links are not supported.
- Builds a recipe from a list of ingredients you already have.
- Lets you write recipes by hand and edit any recipe you own.
- Keeps recipes private until you make them public. A public recipe gets a share link at `/r/<id>` that works without an account, and anyone can download it as a PDF.
- Lets you save other people's public recipes to your favorites, search recipes and users, and browse profiles at `/user/<username>`.
- Installs as a web app on phones, and the service worker keeps recipes you've opened available offline.

You sign in with a 6-digit code sent by email, or with Google. A code expires after 20 minutes, each email can request 3 codes a day, and each code allows 5 attempts. Recipes, usernames and bios go through OpenAI's moderation API before they are saved.

## How it's built

`backend/` is a FastAPI app using SQLAlchemy with SQLite. yt-dlp downloads the videos, Whisper (the `base` model) transcribes them, and Gemini writes the recipe. TikTok slideshow images come from the tikwm.com API. WeasyPrint renders the PDFs and Resend sends the login emails.

`frontend/` is static HTML and plain JavaScript styled with Tailwind. `output.css` is the compiled Tailwind build.

`nginx/` serves the frontend and proxies `/api/` and `/r/` to the backend. The static pages contain placeholders such as `__SITE_DOMAIN__`, and nginx fills them in from environment variables as it serves each page, so the domain, contact email, Google client ID and Turnstile site key are never hardcoded.

## Running it locally

You need Docker with Compose v2.

```bash
make dev
```

Then open <http://localhost:8080>. The first build takes a while because Whisper pulls in PyTorch.

The local setup needs no domain, certificate or email account. Login codes are printed to the backend logs instead of being emailed, so run `make dev-logs` and look for a line starting with `[DEV_MODE] Login code`. The captcha uses Cloudflare's Turnstile test keys, which always pass. Data is stored in `backend/database.dev.db`, separate from production.

A `.env` file is optional in local mode. The site runs without one, but extracting recipes and generating them from ingredients need a real `GEMINI_API_KEY`, and moderation needs an `OPENAI_API_KEY`. Copy `.env.example` to `.env` and fill in those two. Google sign-in only works if `GOOGLE_CLIENT_ID` is set to a client that lists `http://localhost:8080` as an authorized JavaScript origin; email login works either way.

The backend restarts when you edit Python files. The frontend is served straight from `frontend/`, but the service worker caches static files, so tick "Bypass for network" under Application > Service workers in your browser's dev tools to see your changes on reload. Stop everything with `make dev-down`.

## Deploying

1. Point your domain and its `www` subdomain at the server, then get a Let's Encrypt certificate with certbot so the files exist under `/etc/letsencrypt/live/<your-domain>/`. Renewing it is up to you.
2. Copy `.env.example` to `.env` and fill in every value (see [Configuration](#configuration)).
3. Run `make`. It builds the images and starts the backend and nginx on ports 80 and 443.

The backend refuses to start if a required variable is missing and prints which ones. The Makefile's production targets call `docker-compose`; if you only have Compose v2, run `docker compose up -d --build` instead.

The privacy policy, terms and contact pages in `frontend/` were written for the original hosted site. Read them before running your own instance. Downloading videos may also be restricted by TikTok's and Facebook's terms of service.

## Configuration

All settings come from `.env` in the project root. `.env.example` lists every variable.

| Variable | Required | Purpose |
| --- | --- | --- |
| `GEMINI_API_KEY` | yes | Writing recipes with Gemini |
| `OPENAI_API_KEY` | yes | Content moderation |
| `RESEND_API_KEY` | yes, except in local mode | Sending login codes |
| `JWT_SECRET_KEY` | yes | Signing login tokens. Use a long random string. |
| `DATABASE_URL` | yes | SQLAlchemy database URL, for example `sqlite:///./database.db` |
| `GOOGLE_CLIENT_ID` | yes | Google sign-in. This is the OAuth client ID ending in `.apps.googleusercontent.com`, not the `GOCSPX-` client secret. |
| `TURNSTILE_SITE_KEY` | yes | The captcha widget on the login page |
| `TURNSTILE_SECRET_KEY` | yes | Verifying the captcha |
| `SITE_DOMAIN` | yes | Your domain without `https://`. Used for the nginx server name, the certificate path, links in pages and PDFs, and the default email sender. |
| `CONTACT_EMAIL` | yes | Shown on the about, contact, privacy and terms pages and in `security.txt` |
| `EMAIL_FROM` | no | Sender for login emails. Defaults to `EasyRecipe <noreply@SITE_DOMAIN>`. |
| `GEMINI_MODEL` | no | Defaults to `gemini-3.1-flash-lite-preview` |
| `CORS_ORIGINS` | no | Comma-separated origins allowed to call the API. Leave empty when nginx serves the frontend, which is the default setup. |
| `SQL_ECHO` | no | Set to `1` to log every SQL query. The logs will contain user data. |

Local mode sets `DEV_MODE=1` for you. Don't set it in production.

## Make commands

| Command | What it does |
| --- | --- |
| `make` | Build the images and start production |
| `make up` / `make down` | Start or stop production |
| `make restart` | Stop and start again |
| `make logs` | Follow all logs (`backend-logs` and `nginx-logs` for one service) |
| `make shell-backend` / `make shell-nginx` | Open a shell in a container |
| `make clean` | Stop production and remove its volumes |
| `make fclean` | Remove this project's containers, volumes and images, then run `docker system prune -af --volumes` |
| `make re` | `fclean`, then build and start again |
| `make dev` / `make dev-down` / `make dev-logs` | The local setup described above |

`make fclean` and `make re` delete every unused Docker image, container and volume on the machine, including ones from other projects.

## Changing the styles

The pages use Tailwind CSS v3. `frontend/output.css` is built from `frontend/input.css` and `frontend/tailwind.config.js`, which scans the HTML pages, the scripts in `frontend/js/` and the backend's public recipe template for class names. After adding or changing classes, rebuild it and commit the new `output.css`:

```bash
npx tailwindcss@3.4.1 -c frontend/tailwind.config.js -i frontend/input.css -o frontend/output.css --minify
```

The standalone Tailwind CLI from Tailwind's GitHub releases takes the same arguments if you'd rather not use npm.

## Linting

Python is formatted and linted with ruff, configured in `ruff.toml`:

```bash
ruff check .
ruff format backend
```

## License

MIT. See [LICENSE](LICENSE).
