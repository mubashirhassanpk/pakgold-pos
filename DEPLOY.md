# Deploying PakGold POS to a server (GitHub → live hosting)

PakGold POS is a **Node.js app** (Next.js server + SQLite). It must run on a host
that can run a long-lived Node process. It will **not** work on plain PHP/shared
hosting or on serverless platforms (Vercel/Netlify) because it uses a local
SQLite file and native modules.

## Where it can run
- ✅ A **VPS** (DigitalOcean, Contabo, Hetzner, AWS Lightsail, etc.)
- ✅ **cPanel “Setup Node.js App”** (if your host offers it, Node 20+)
- ✅ **Render / Railway / Fly.io** (Node service with a persistent disk)
- ❌ Vercel/Netlify serverless, ❌ shared PHP hosting

> ⚠️ **Hardware note:** the weighing scale, ESC/POS printer, and cash drawer only
> work when the server runs **on the shop PC** (it needs the local COM ports).
> On remote hosting, set **Settings → Hardware → Printer = Off** and use the
> browser/A4 printing. Remote hosting gives you access-from-anywhere but loses
> offline + hardware. Many shops run it **locally** (see `PACKAGING.md`) and only
> host remotely for multi-branch/owner-remote access.

## 1. Push to GitHub
```bash
git init
git add .
git commit -m "PakGold POS"
git branch -M main
git remote add origin https://github.com/<you>/pakgold-pos.git
git push -u origin main
```
(`.gitignore` already excludes `node_modules`, `.next`, `data/`, `backups/`, `*.db`.)

## 2. On the server
```bash
git clone https://github.com/<you>/pakgold-pos.git
cd pakgold-pos
npm ci
npm run build

# Persistent DB location (outside the repo so deploys don't wipe it):
export DATABASE_PATH=/var/data/pakgold.db
npm run db:migrate
npm run db:seed        # first time only

# Start (foreground test):
PORT=3000 DATABASE_PATH=/var/data/pakgold.db npm start
```

## 3. Keep it running (pm2)
```bash
npm i -g pm2
DATABASE_PATH=/var/data/pakgold.db PORT=3000 pm2 start "npm start" --name pakgold
pm2 save
pm2 startup        # follow the printed command to auto-start on boot
```

## 4. Domain + HTTPS (nginx reverse proxy)
```nginx
server {
  server_name pos.yourdomain.com;
  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  }
}
```
Then run `certbot --nginx -d pos.yourdomain.com` for a free SSL certificate.

## 5. After login
Default: `owner` / `owner123` → change it immediately in **Settings → Users**.
Set your shop name, NTN/STRN, and tax rule in **Settings**.

## Environment variables
| Var | Purpose | Example |
|---|---|---|
| `PORT` | server port | `3000` |
| `DATABASE_PATH` | SQLite file path (persist this!) | `/var/data/pakgold.db` |
| `BACKUP_DIR` | where backups are written | `/var/data/backups` |

## Updating a live deployment
```bash
cd pakgold-pos
# Back up first: Settings → Backup & Restore (download a copy)
git pull
npm ci
npm run build
npm run db:migrate     # applies any new migrations
pm2 restart pakgold
```
Your data in `DATABASE_PATH` is untouched by updates.
