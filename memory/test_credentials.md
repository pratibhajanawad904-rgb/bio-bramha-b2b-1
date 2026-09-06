# Test credentials
- Secrets live in /app/.env.local (gitignored): Supabase URL/anon/service-role, MSG91, SESSION_SECRET
- Dealer (buyer) test phone: 8618734070 (real OTP via MSG91; ask the owner for the code)
- Seed roles (real OTP required): super_admin 8050946969, warehouse 7975158924
- Preview env: run `nohup npx next start -p 3000 -H 0.0.0.0 &` and `node /tmp/proxy8001.js` (proxy 8001->3000 for /api)
