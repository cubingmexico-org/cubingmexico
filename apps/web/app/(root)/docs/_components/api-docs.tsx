import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@workspace/ui/components/accordion";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs";
import spec from "@workspace/public-api/openapi.json";
import {
  baseUrl,
  categories,
  type Endpoint,
  type OpenApiSpec,
  type Param,
} from "../_lib/openapi";

const publicApi = spec as unknown as OpenApiSpec;
const BASE_URL = baseUrl(publicApi);
const CATEGORIES = categories(publicApi);

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs font-mono leading-relaxed">
      <code>{children}</code>
    </pre>
  );
}

function ParamsList({ title, params }: { title: string; params: Param[] }) {
  return (
    <div>
      <h4 className="text-sm font-semibold mb-2">{title}</h4>
      <ul className="space-y-2 text-sm">
        {params.map((param) => (
          <li key={param.name}>
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">
              {param.name}
            </code>
            <span className="text-muted-foreground">
              {" "}
              — {param.description}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function EndpointDoc({ endpoint }: { endpoint: Endpoint }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{endpoint.description}</p>

      {endpoint.pathParams.length > 0 ? (
        <ParamsList title="Parámetros de ruta" params={endpoint.pathParams} />
      ) : null}

      {endpoint.queryParams.length > 0 ? (
        <ParamsList
          title="Parámetros de consulta"
          params={endpoint.queryParams}
        />
      ) : null}

      <div>
        <h4 className="text-sm font-semibold mb-2">Ejemplo</h4>
        <CodeBlock>{endpoint.curl}</CodeBlock>
      </div>

      {endpoint.sampleResponse ? (
        <div>
          <h4 className="text-sm font-semibold mb-2">Respuesta de ejemplo</h4>
          <CodeBlock>{endpoint.sampleResponse}</CodeBlock>
        </div>
      ) : null}
    </div>
  );
}

export function ApiDocs(): React.JSX.Element {
  return (
    <main className="grow container mx-auto px-4 py-8 max-w-4xl">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-4">API pública</h1>
          <p className="mb-4 text-muted-foreground">
            Documentación de la API de lectura de Cubing México. Expone datos de
            competencias, personas, teams, rankings y récords enfocados en
            México.
          </p>
        </div>

        <div className="rounded-lg border p-4 space-y-3 text-sm">
          <div>
            <span className="font-semibold">URL base: </span>
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
              {BASE_URL}
            </code>
          </div>
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            <li>Las respuestas son JSON con claves en camelCase.</li>
            <li>Los endpoints listados aquí no requieren autenticación.</li>
            <li>
              Las respuestas se pueden guardar en caché hasta una hora (los
              datos se actualizan una vez al día); /competitor-states, hasta 5
              minutos.
            </li>
            <li>
              Hay un límite aproximado de 60 solicitudes por minuto por IP; al
              superarlo, la API responde 429 con el encabezado Retry-After.
            </li>
            <li>
              Las fechas de competencias y teams usan el formato HTTP (por
              ejemplo &quot;Sat, 01 Jun 2024 00:00:00 GMT&quot;).
            </li>
            <li>
              Los endpoints de escritura o administración (cron) no forman parte
              de la API pública.
            </li>
            <li>
              Especificación OpenAPI 3.1:{" "}
              <a href="/docs/openapi.json" className="underline">
                /docs/openapi.json
              </a>
              .
            </li>
            <li>
              Los datos están centrados en la comunidad de speedcubing en
              México.
            </li>
          </ul>
        </div>

        <Tabs defaultValue={CATEGORIES[0]?.id} className="w-full">
          <TabsList className="w-full justify-start mb-6 overflow-x-auto flex-nowrap h-auto">
            {CATEGORIES.map((category) => (
              <TabsTrigger key={category.id} value={category.id}>
                {category.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {CATEGORIES.map((category) => (
            <TabsContent key={category.id} value={category.id}>
              <Accordion type="single" collapsible className="w-full">
                {category.endpoints.map((endpoint) => (
                  <AccordionItem
                    key={`${endpoint.method}-${endpoint.path}`}
                    value={`${endpoint.method}-${endpoint.path}`}
                  >
                    <AccordionTrigger className="text-left">
                      <span className="flex flex-wrap items-center gap-2">
                        <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono font-semibold text-emerald-700 dark:text-emerald-400">
                          {endpoint.method}
                        </code>
                        <code className="font-mono text-sm">
                          {endpoint.path}
                        </code>
                        <span className="text-muted-foreground font-normal">
                          — {endpoint.title}
                        </span>
                      </span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <EndpointDoc endpoint={endpoint} />
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </main>
  );
}
