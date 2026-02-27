# Frontend Development (Windows + VS Code Remote SSH)

## One-time setup

1. Connect to your Linux host from VS Code using Remote SSH.
2. Open the `tacticalrmm-web` folder.
3. Run `npm install` if dependencies are not already installed.

## Daily workflow

1. Start the task `Frontend: Dev Server` from **Terminal → Run Task**.
2. VS Code auto-forwards port `9000` from the remote host.
3. Open `http://localhost:9000` on your Windows machine.

Hot module replacement is enabled by default via `npm run dev`.

## Optional reset

- If the port is stuck, run task: `Frontend: Stop Dev Server (9000)`.

## Fallback (outside Remote SSH)

If you are using a regular terminal SSH session instead of VS Code Remote SSH:

```bash
ssh -L 9000:localhost:9000 tacadmin@<server>
```

Then open `http://localhost:9000`.
