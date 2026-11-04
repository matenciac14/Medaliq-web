Configura o verifica el entorno de staging de Medaliq.

## Arquitectura staging

```
develop branch → Vercel Preview → Neon staging branch → staging.medaliq.com
main branch    → Vercel Production → Neon main branch → medaliq.com
```

## Checklist de setup

### 1. Neon — Branch de staging
```
- Branch: `staging` (hijo de `main`)
- Endpoint: compute separado del de produccion
- Connection string en Vercel como `DATABASE_URL` del environment "Preview"
```

Verificar con MCP neon-db:
- `list_branches` → debe existir branch `staging`
- Si no existe: `create_branch` con nombre `staging` desde `main`
- `get_connection_string` del branch staging

### 2. Vercel — Environment Preview
```
- Environment: Preview
- Branch filter: `develop`
- Variables:
  - DATABASE_URL = connection string de Neon staging
  - BILLING_ENABLED = false
  - AUTH_SECRET = (misma que produccion o diferente para aislamiento)
  - NEXT_PUBLIC_SENTRY_DSN = (mismo DSN, diferente environment tag)
```

### 3. DNS (opcional)
- CNAME `staging.medaliq.com` → `cname.vercel-dns.com`
- O usar el URL automatico de Vercel Preview

### 4. Seed data
```bash
# Conectar a staging DB y correr seed
DATABASE_URL=<staging-url> pnpm prisma db push
DATABASE_URL=<staging-url> pnpm prisma db seed
```

## Verificacion
- [ ] `develop` push → Vercel deploy a Preview
- [ ] Preview URL carga sin errores
- [ ] Preview usa DB staging (no produccion)
- [ ] Seed data presente (usuarios de test)
- [ ] E2E pueden correr contra staging URL

## Estado actual
- Vercel preview deploys: activos per-PR (automatico)
- Neon staging branch: NO creado aun
- DNS staging: NO configurado
- Accion requerida: crear branch Neon + configurar DATABASE_URL en Vercel Preview env
