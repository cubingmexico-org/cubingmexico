import { CreateGroupForm } from "./_components/create-group-form";

export default function Page() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Grupos</h1>
        <p className="text-sm text-muted-foreground">
          Crear comunidades y equipos patrocinados. La activación de patrocinio
          y publicidad se hace desde Administrar del grupo.
        </p>
      </div>
      <CreateGroupForm />
    </div>
  );
}
