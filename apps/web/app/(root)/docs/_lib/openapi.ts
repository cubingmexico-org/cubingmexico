type Ref = { $ref: string };

type Parameter = {
  name: string;
  in: "path" | "query";
  description: string;
  example?: string | number;
  "x-aliases"?: string[];
};

type Operation = {
  tags: string[];
  summary: string;
  description: string;
  parameters?: (Parameter | Ref)[];
  responses: Record<
    string,
    { content?: { "application/json"?: { example?: unknown } } } | Ref
  >;
};

export type OpenApiSpec = {
  info: { title: string; description: string };
  servers: { url: string }[];
  tags: { name: string; description: string }[];
  paths: Record<string, { get: Operation }>;
  components: { parameters: Record<string, Parameter> };
};

export type Param = {
  name: string;
  description: string;
};

export type Endpoint = {
  method: "GET";
  path: string;
  title: string;
  description: string;
  pathParams: Param[];
  queryParams: Param[];
  curl: string;
  sampleResponse: string | null;
};

export type Category = {
  id: string;
  label: string;
  endpoints: Endpoint[];
};

function isRef(value: object): value is Ref {
  return "$ref" in value;
}

function resolveParameter(spec: OpenApiSpec, param: Parameter | Ref) {
  if (!isRef(param)) return param;
  const name = param.$ref.replace("#/components/parameters/", "");
  const resolved = spec.components.parameters[name];
  if (!resolved) throw new Error(`Unknown parameter ${param.$ref}`);
  return resolved;
}

function toParam(param: Parameter): Param {
  return {
    name: [param.name, ...(param["x-aliases"] ?? [])].join(" / "),
    description: param.description,
  };
}

/** Example request: path parameters and query parameters that have an `example`. */
function curlFor(baseUrl: string, path: string, params: Parameter[]): string {
  let url = path;
  const query = new URLSearchParams();
  for (const param of params) {
    if (param.example === undefined) continue;
    if (param.in === "path") {
      url = url.replace(`{${param.name}}`, String(param.example));
    } else {
      query.set(param.name, String(param.example));
    }
  }
  const search = query.toString();
  return `curl "${baseUrl}${url}${search ? `?${search}` : ""}"`;
}

function sampleResponse(operation: Operation): string | null {
  const ok = operation.responses["200"];
  if (!ok || isRef(ok)) return null;
  const example = ok.content?.["application/json"]?.example;
  return example === undefined ? null : JSON.stringify(example, null, 2);
}

export function baseUrl(spec: OpenApiSpec): string {
  const server = spec.servers[0];
  if (!server) throw new Error("The spec has no server");
  return server.url;
}

/** Endpoints grouped by tag, in the spec's tag and path order. */
export function categories(spec: OpenApiSpec): Category[] {
  const url = baseUrl(spec);
  return spec.tags.map((tag) => ({
    id: tag.name,
    label: tag.description,
    endpoints: Object.entries(spec.paths)
      .filter(([, item]) => item.get.tags.includes(tag.name))
      .map(([path, { get: operation }]) => {
        const params = (operation.parameters ?? []).map((param) =>
          resolveParameter(spec, param),
        );
        return {
          method: "GET",
          path,
          title: operation.summary,
          description: operation.description,
          pathParams: params.filter((p) => p.in === "path").map(toParam),
          queryParams: params.filter((p) => p.in === "query").map(toParam),
          curl: curlFor(url, path, params),
          sampleResponse: sampleResponse(operation),
        };
      }),
  }));
}
