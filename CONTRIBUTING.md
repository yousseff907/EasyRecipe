# Contributing

## Setting up

Follow "Running it locally" in the [README](README.md). `make dev` starts everything on <http://localhost:8080>, and `make dev-logs` shows the login codes.

## Before you open a pull request

Run ruff and fix anything it reports:

```bash
ruff check .
ruff format backend
```

If you added or changed Tailwind classes, rebuild `frontend/output.css` as described in the README's "Changing the styles" section and commit it with your change.

Try the flow you changed in `make dev`. If you changed something users see, add a screenshot to the pull request.

## Code conventions

Python uses tabs, as configured in `ruff.toml`.

The frontend is plain HTML and JavaScript with no build step apart from Tailwind. Anything that comes from the server, such as recipe titles, ingredients or usernames, goes through `escapeHtml()` before it is inserted with `innerHTML`, and values put into URLs go through `encodeURIComponent()`.

A new setting belongs in `.env.example` and in the configuration table in the README. If the backend can't run without it, add it to the required list in `backend/config.py`.

## Pull requests

Keep each pull request to one change, and say what it changes and how you tested it.

Security problems don't belong in issues or pull requests. See [SECURITY.md](SECURITY.md).

## License

By contributing, you agree that your contributions are licensed under the [MIT License](LICENSE).
