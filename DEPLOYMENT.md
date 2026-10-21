# Deploying Calendr (Raspberry Pi)

## TL;DR (Normal deploy)

From the repo root, on any machine on the tailnet:

```bash
./deploy.sh
```

And you're good to go!

## One-time setup (per machine you deploy from)

1. Be on the tailnet: `tailscale status` should list `tavla`.
2. Log in with a key instead of a password:

   ```bash
   ssh-copy-id draugmood@tavla
   ```

3. Put the frontend build secrets in `frontend/.env.production.local` (gitignored).
   The deploy refuses to run if any of them is missing:

   ```bash
   VITE_GOOGLE_CLIENT_ID=...
   VITE_TRELLO_KEY=...
   VITE_TRELLO_TOKEN=...
   ```

Override settings per run, e.g. `PI_HOST=raspberrypi.local ./deploy.sh` on the home LAN,
or `DEBUG=1 ./deploy.sh` to trace every command.

## What deploy.sh does

1. Checks that the Pi is reachable
2. Builds frontend, refusing to if a required `VITE_*` var resolves empty (writes `version.txt` with the commit)
3. Uploads the build plus the backend files git knows about (no `.venv`, caches or `.env`)
4. Updates backend code, and backend deps only if `requirements.txt` changed
5. Restarts the backend and waits for it to answer through nginx
6. Swaps the new frontend into the nginx web root (old one kept in `/var/www/html.old`)

If the backend doesn't come up, the frontend is not swapped and the last log lines are printed.

## What's deployed?

```bash
curl http://tavla/version.txt
```

## Rolling back

Redeploy an older commit (`git checkout <sha> && ./deploy.sh`), or swap the
previous frontend back in:

```bash
ssh draugmood@tavla 'sudo mv /var/www/html /var/www/html.bad && sudo mv /var/www/html.old /var/www/html'
```

## If something breaks

Backend logs:

```bash
ssh draugmood@tavla sudo journalctl -u calendr-backend -n 100
```

nginx:

```bash
ssh draugmood@tavla 'sudo nginx -t && sudo tail -n 100 /var/log/nginx/error.log'
```

## Notes (don’t forget)

- SQLite DB lives outside repo → not redeployed
- Backend `.venv` and `.env*` files live only on the Pi → never overwritten
- Backend runs via systemd, not manually
- Frontend is static → nginx serves
