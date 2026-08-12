"use client";

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

const BASE_URL = "https://api.cubingmexico.net";

type Param = {
  name: string;
  description: string;
};

type Endpoint = {
  method: "GET";
  path: string;
  title: string;
  description: string;
  pathParams?: Param[];
  queryParams?: Param[];
  curl: string;
  sampleResponse: string;
};

type Category = "competitions" | "persons" | "teams" | "ranks";

const endpoints: Record<Category, Endpoint[]> = {
  competitions: [
    {
      method: "GET",
      path: "/competitions",
      title: "Listar competencias",
      description:
        "Lista competencias en México con paginación y filtros opcionales.",
      queryParams: [
        {
          name: "page",
          description: "Número de página (entero, mínimo 1). Por defecto: 1.",
        },
        {
          name: "size",
          description:
            "Resultados por página (entero, 1–100). Por defecto: 100.",
        },
        {
          name: "stateId / state_id",
          description: "Filtrar por id de estado mexicano.",
        },
        {
          name: "eventId / event_id",
          description:
            "Incluir solo competencias que contengan el evento indicado.",
        },
        {
          name: "year",
          description: "Filtrar por año de startDate.",
        },
        {
          name: "start_date",
          description: "Fecha mínima de inicio (YYYY-MM-DD).",
        },
        {
          name: "end_date",
          description: "Fecha máxima de inicio (YYYY-MM-DD).",
        },
        {
          name: "search",
          description:
            "Búsqueda de texto (sin distinguir mayúsculas) en nombre y ciudad.",
        },
        {
          name: "cancelled",
          description: "Filtrar canceladas: true/false, 1/0 o yes/no.",
        },
      ],
      curl: `curl "${BASE_URL}/competitions?page=1&size=10"`,
      sampleResponse: `{
  "pagination": { "page": 1, "size": 10 },
  "total": 120,
  "items": [
    {
      "id": "MexicoCityOpen2024",
      "name": "Mexico City Open 2024",
      "city": "Ciudad de México",
      "stateId": "CMX",
      "stateName": "Ciudad de México",
      "startDate": "2024-06-01",
      "endDate": "2024-06-02"
    }
  ]
}`,
    },
    {
      method: "GET",
      path: "/competitions/:id",
      title: "Obtener una competencia",
      description:
        "Devuelve una competencia en México con eventos, organizadores, delegados y campeonatos relacionados. Si no existe o no está disponible para México, responde con success: false.",
      pathParams: [
        {
          name: "id",
          description: "Id de la competencia (por ejemplo MexicoCityOpen2024).",
        },
      ],
      curl: `curl "${BASE_URL}/competitions/MexicoCityOpen2024"`,
      sampleResponse: `{
  "id": "MexicoCityOpen2024",
  "name": "Mexico City Open 2024",
  "city": "Ciudad de México",
  "stateId": "CMX",
  "stateName": "Ciudad de México",
  "events": [{ "eventId": "333", "eventName": "3x3x3 Cube" }],
  "organizers": [],
  "delegates": [],
  "championships": []
}`,
    },
    {
      method: "GET",
      path: "/competitor-states/:id",
      title: "Estados de competidores",
      description:
        "Obtiene el estado mexicano asociado a cada competidor de una competencia, a partir del WCIF público de la WCA.",
      pathParams: [
        {
          name: "id",
          description: "Id de la competencia.",
        },
      ],
      curl: `curl "${BASE_URL}/competitor-states/MexicoCityOpen2024"`,
      sampleResponse: `[
  { "wcaId": "2015EXAM01", "stateId": "CMX" },
  { "wcaId": "2018TEST02", "stateId": "JAL" }
]`,
    },
  ],
  persons: [
    {
      method: "GET",
      path: "/persons",
      title: "Listar personas",
      description:
        "Lista personas con paginación. Cada elemento incluye competencias, campeonatos y rankings resumidos.",
      queryParams: [
        {
          name: "page",
          description: "Número de página (entero, mínimo 1). Por defecto: 1.",
        },
        {
          name: "size",
          description:
            "Resultados por página (entero, 1–100). Por defecto: 100.",
        },
        {
          name: "stateId / state_id",
          description: "Filtrar por id de estado.",
        },
      ],
      curl: `curl "${BASE_URL}/persons?page=1&size=10&stateId=CMX"`,
      sampleResponse: `{
  "pagination": { "page": 1, "size": 10 },
  "total": 500,
  "items": [
    {
      "id": "2015EXAM01",
      "name": "Ejemplo Cubero",
      "state": "CMX",
      "numberOfCompetitions": 12,
      "competitionIds": ["MexicoCityOpen2024"],
      "numberOfChampionships": 1,
      "championshipIds": ["national_Mexico_2024"],
      "rank": {
        "singles": [],
        "averages": []
      }
    }
  ]
}`,
    },
    {
      method: "GET",
      path: "/persons/:wcaId",
      title: "Obtener una persona",
      description:
        "Devuelve el perfil de una persona por WCA ID, con competencias, campeonatos y rankings.",
      pathParams: [
        {
          name: "wcaId",
          description: "WCA ID de la persona (por ejemplo 2015EXAM01).",
        },
      ],
      curl: `curl "${BASE_URL}/persons/2015EXAM01"`,
      sampleResponse: `{
  "id": "2015EXAM01",
  "name": "Ejemplo Cubero",
  "state": "CMX",
  "numberOfCompetitions": 12,
  "competitionIds": ["MexicoCityOpen2024"],
  "numberOfChampionships": 1,
  "championshipIds": ["national_Mexico_2024"],
  "rank": {
    "singles": [
      {
        "eventId": "333",
        "best": 850,
        "rank": {
          "world": 1000,
          "continent": 50,
          "country": 10,
          "state": 1
        }
      }
    ],
    "averages": []
  }
}`,
    },
  ],
  teams: [
    {
      method: "GET",
      path: "/teams",
      title: "Listar teams",
      description: "Devuelve todos los teams estatales.",
      curl: `curl "${BASE_URL}/teams"`,
      sampleResponse: `[
  {
    "name": "Team Ciudad de México",
    "description": null,
    "image": null,
    "coverImage": null,
    "stateId": "CMX",
    "founded": null,
    "socialLinks": null,
    "isActive": true
  }
]`,
    },
    {
      method: "GET",
      path: "/teams/:stateId",
      title: "Obtener un team",
      description:
        "Devuelve el team asociado a un estado. Responde 404 si no existe.",
      pathParams: [
        {
          name: "stateId",
          description: "Id del estado (por ejemplo CMX, JAL).",
        },
      ],
      curl: `curl "${BASE_URL}/teams/CMX"`,
      sampleResponse: `{
  "name": "Team Ciudad de México",
  "description": null,
  "image": null,
  "coverImage": null,
  "stateId": "CMX",
  "founded": null,
  "socialLinks": null,
  "isActive": true
}`,
    },
    {
      method: "GET",
      path: "/states",
      title: "Listar estados",
      description: "Devuelve la lista de estados mexicanos disponibles.",
      curl: `curl "${BASE_URL}/states"`,
      sampleResponse: `[
  { "id": "CMX", "name": "Ciudad de México" },
  { "id": "JAL", "name": "Jalisco" }
]`,
    },
  ],
  ranks: [
    {
      method: "GET",
      path: "/rank/:stateId/:type/:eventId",
      title: "Rankings por estado",
      description:
        "Devuelve los rankings de un estado para un evento y tipo (single o average).",
      pathParams: [
        {
          name: "stateId",
          description: "Id del estado.",
        },
        {
          name: "type",
          description: "Tipo de ranking: single o average.",
        },
        {
          name: "eventId",
          description: "Id del evento WCA (por ejemplo 333, 333oh).",
        },
      ],
      curl: `curl "${BASE_URL}/rank/CMX/single/333"`,
      sampleResponse: `[
  {
    "rankType": "single",
    "personId": "2015EXAM01",
    "personName": "Ejemplo Cubero",
    "eventId": "333",
    "best": 850,
    "rank": {
      "world": 1000,
      "continent": 50,
      "country": 10,
      "state": 1
    }
  }
]`,
    },
    {
      method: "GET",
      path: "/records/:stateId",
      title: "Récords estatales",
      description:
        "Devuelve los récords estatales (rank 1) de single y average para un estado.",
      pathParams: [
        {
          name: "stateId",
          description: "Id del estado.",
        },
      ],
      curl: `curl "${BASE_URL}/records/CMX"`,
      sampleResponse: `{
  "single": [
    {
      "personId": "2015EXAM01",
      "personName": "Ejemplo Cubero",
      "eventId": "333",
      "eventName": "3x3x3 Cube",
      "best": 850,
      "rank": {
        "world": 1000,
        "continent": 50,
        "country": 10,
        "state": 1
      }
    }
  ],
  "average": []
}`,
    },
  ],
};

const categoryLabels: Record<Category, string> = {
  competitions: "Competencias",
  persons: "Personas",
  teams: "Teams y estados",
  ranks: "Rankings y récords",
};

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

      {endpoint.pathParams && endpoint.pathParams.length > 0 ? (
        <ParamsList title="Parámetros de ruta" params={endpoint.pathParams} />
      ) : null}

      {endpoint.queryParams && endpoint.queryParams.length > 0 ? (
        <ParamsList
          title="Parámetros de consulta"
          params={endpoint.queryParams}
        />
      ) : null}

      <div>
        <h4 className="text-sm font-semibold mb-2">Ejemplo</h4>
        <CodeBlock>{endpoint.curl}</CodeBlock>
      </div>

      <div>
        <h4 className="text-sm font-semibold mb-2">Respuesta de ejemplo</h4>
        <CodeBlock>{endpoint.sampleResponse}</CodeBlock>
      </div>
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
              Los endpoints de escritura o administración (cron) no forman parte
              de la API pública.
            </li>
            <li>
              Los datos están centrados en la comunidad de speedcubing en
              México.
            </li>
          </ul>
        </div>

        <Tabs defaultValue="competitions" className="w-full">
          <TabsList className="w-full justify-start mb-6 overflow-x-auto flex-nowrap h-auto">
            {(Object.keys(endpoints) as Category[]).map((category) => (
              <TabsTrigger key={category} value={category}>
                {categoryLabels[category]}
              </TabsTrigger>
            ))}
          </TabsList>

          {(Object.keys(endpoints) as Category[]).map((category) => (
            <TabsContent key={category} value={category}>
              <Accordion type="single" collapsible className="w-full">
                {endpoints[category].map((endpoint) => (
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
