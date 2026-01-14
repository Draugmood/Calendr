# Deploying Calendr (Raspberry Pi)

## TL;DR (Normal deploy)

From the repo root:

```bash
./deploy.sh
```

And you're good to go!

## What deploy.sh does

1. Builds frontend
2. Copies frontend to nginx web root
3. Updates backend code
4. Restarts backend service
5. Reloads nginx

## If something breaks

Backend logs:

```bash
sudo journalctl -u calendr-backend -n 100
```

nginx:

```bash
sudo nginx -t
sudo tail -n 100 /var/log/nginx/error.log
```

## Notes (don’t forget)

- SQLite DB lives outside repo → not redeployed
- Backend runs via systemd, not manually
- Frontend is static → nginx serves
