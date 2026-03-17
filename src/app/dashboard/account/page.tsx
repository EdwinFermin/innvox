import { requireAuth } from "@/lib/auth/guards";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChangePasswordCard } from "./components/change-password-card";

function initials(name?: string | null, email?: string | null) {
  const source = (name || email || "U").trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

export default async function AccountPage() {
  const session = await requireAuth();
  const user = session.user;

  return (
    <div className="mx-auto w-full max-w-2xl">
      <h3 className="text-2xl font-semibold">Cuenta</h3>
      <p className="text-sm text-muted-foreground">Informacion basica de tu perfil.</p>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Perfil</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14 rounded-xl">
              <AvatarImage src={user.image ?? undefined} alt={user.name ?? "Usuario"} />
              <AvatarFallback className="rounded-xl">
                {initials(user.name, user.email)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-base font-medium">{user.name ?? "Usuario"}</p>
              <p className="text-sm text-muted-foreground">{user.email ?? "Sin correo"}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Rol</p>
              <p className="text-sm font-medium">{user.role}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Sucursales asignadas</p>
              <p className="text-sm font-medium">{user.branchIds?.length ?? 0}</p>
            </div>
            <div className="rounded-lg border p-3 sm:col-span-2">
              <p className="text-xs text-muted-foreground">ID de usuario</p>
              <p className="text-sm font-medium break-all">{user.id}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <ChangePasswordCard />
    </div>
  );
}
