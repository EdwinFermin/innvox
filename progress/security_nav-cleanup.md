# Security Review — nav-cleanup

Reviewed file: `src/components/ui/app-sidebar.tsx`
Spec: `specs/nav-cleanup/requirements.md`
Reviewer: security-reviewer
Verdict: APPROVED

## Automated checks

- `npx reins verify --only security`: PASS
  - Dependency audit: no vulnerabilities >= high.
  - Secret scan: no secrets found.
- No new dependencies introduced (only swaps `LifeBuoy`/`Send` lucide imports for `CircleUser`, and adds existing `react-icons/lib` type import).

## Security

No blocking or non-blocking security findings.

### Role resolution (R2) — verified, no boundary widened

`resolvedRole` (app-sidebar.tsx:208-212):
```
canManageSettings ? "admin"
  : user?.type === "ACCOUNTANT" ? "accountant"
  : "user"
```
This mirrors the prior render-time selector exactly
(`canManageSettings ? data.navAdmin : user?.type === "ACCOUNTANT" ? data.navAccountant : data.navMain`).
Precedence admin -> accountant -> user is identical; `canManageSettings` is
`can(user?.type, PERMISSIONS.settingsManage)`, which is true only for the ADMIN
role (`src/lib/auth/roles.ts:6-13`). Accountant branch is gated on
`user?.type === "ACCOUNTANT"` and only reached when not admin. No widening.

### Per-role visibility — verified against prior arrays

Item-by-item comparison of the new `masterNav` `roles` arrays vs. the old
`navAdmin` / `navAccountant` / `navMain`:

- Admin-only items keep `roles: ["admin"]` or are absent for lower roles:
  - Configuración group (General/Usuarios/Sucursales): `["admin"]` only. Not visible to accountant/user.
- Accountant+admin items (`["admin","accountant"]`), matching prior accountant nav:
  - Cuentas financieras, Costos operativos, Parámetros (+ both sub-items),
    Reportes > Utilidades, Reportes > Formulario DGII.
  - None of these include `user`; user previously had none of them. No widening.
- User-visible items (`["admin","accountant","user"]` or `["admin","user"]`):
  - Dashboard, Transacciones (6 sub-items), Facturación, Clientes,
    Fidelidad (Tarjetas/Scanner), Reportes > Cuadre del día.
  - Fidelidad is `["admin","user"]` — accountant correctly excluded (matches prior,
    accountant had no Fidelidad). No widening.

No admin-only nav item (Configuración/Usuarios/Sucursales, Cuentas financieras,
Costos operativos, Utilidades, Formulario DGII, Parámetros) became visible to a
lower-privilege role.

### Presentation-only / not an access-control boundary

- `filterNavForRole` (app-sidebar.tsx:174-197) is a pure function that only
  decides which links are *rendered*. It performs no navigation, fetch, or
  authorization.
- The resolved role is derived from the NextAuth server session via
  `useAuthStore` -> `useSession` (`src/store/auth.ts`), not from arbitrary client
  input. The change does not introduce a new trust source.
- IMPORTANT: sidebar nav visibility is NOT an access-control boundary. Hiding a
  link does not prevent a user from navigating to the URL directly. Route- and
  server-side authorization (route guards / server actions / RLS) remain the
  enforcement layer and are unchanged by this diff. This refactor neither adds
  nor removes any server-side gate, so it does not weaken enforcement — but it
  also must not be relied upon as a security control. No regression here.

### Input handling / IO / secrets

- No untrusted input reaches a shell, query, file path, or deserializer.
- No file/network IO added; no logging of secrets.
- Static URLs only; no string interpolation into routes from user data.
- `roles` is an internal field stripped by `filterNavForRole` before items reach
  `NavMain` (R28); no sensitive data leaks into props.

## Conclusion

APPROVED — presentation-only refactor, role precedence preserved, no role
boundary widened, automated security checks clean.
