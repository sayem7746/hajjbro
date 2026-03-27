# Railway Deployment

## Environment Variables

Set these in the Railway dashboard (**Project → Variables**) or via CLI:

### Required

| Variable     | Description                    | Example                    |
|-------------|--------------------------------|----------------------------|
| `JWT_SECRET` | Secret for signing JWT tokens | `openssl rand -base64 32`  |

### Auto-set by Railway

- `DATABASE_URL` – Set when you add PostgreSQL
- `PORT` – Set automatically

### Optional

| Variable            | Default   | Description                          |
|---------------------|-----------|--------------------------------------|
| `NODE_ENV`          | production| Environment mode                     |
| `CORS_ORIGINS`      | `*`       | Allowed origins (comma-separated)    |
| `RATE_LIMIT_MAX`    | `100`     | API requests per 15 min per IP       |
| `RATE_LIMIT_AUTH_MAX` | `10`   | Auth attempts per 15 min per IP      |
| `JWT_EXPIRES_IN`    | `15m`     | Access token expiry                  |
| `JWT_REFRESH_EXPIRES_IN` | `7d` | Refresh token expiry                 |
| `LOG_LEVEL`         | `info`    | Logging level                        |

## Set via CLI

```bash
# Link to your Railway project first
railway link

# Required
railway variable set JWT_SECRET="$(openssl rand -base64 32)"

# Optional
railway variable set NODE_ENV=production
railway variable set RATE_LIMIT_MAX=100
railway variable set RATE_LIMIT_AUTH_MAX=10
```

Or use the script:

```bash
export JWT_SECRET=$(openssl rand -base64 32)
./scripts/set-railway-vars.sh
```
