import { Calendar, Clock, Mail, Users } from "lucide-react";
import ReactMarkdown, { type Components } from "react-markdown";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import type { Competition } from "@/types/wca";
import { extractEmail, formatDate } from "../_lib/format";

const markdownComponents: Components = {
  h1: ({ children, ...props }) => (
    <h1 {...props} className="text-2xl font-bold mt-6 mb-4">
      {children}
    </h1>
  ),
  h2: ({ children, ...props }) => (
    <h2 {...props} className="text-xl font-bold mt-5 mb-3">
      {children}
    </h2>
  ),
  h3: ({ children, ...props }) => (
    <h3 {...props} className="text-lg font-bold mt-4 mb-2">
      {children}
    </h3>
  ),
  h4: ({ children, ...props }) => (
    <h4 {...props} className="text-base font-bold mt-3 mb-2">
      {children}
    </h4>
  ),
  h5: ({ children, ...props }) => (
    <h5 {...props} className="text-sm font-semibold mt-2 mb-1">
      {children}
    </h5>
  ),
  h6: ({ children, ...props }) => (
    <h6 {...props} className="text-xs font-semibold mt-2 mb-1">
      {children}
    </h6>
  ),
  p: ({ ...props }) => <p {...props} className="mb-4" />,
  ul: ({ ...props }) => <ul {...props} className="list-disc ml-6 mb-4" />,
  ol: ({ ...props }) => <ol {...props} className="list-decimal ml-6 mb-4" />,
  a: ({ children, ...props }) => (
    <a
      {...props}
      className="text-blue-600 hover:underline"
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
    </a>
  ),
};

export function InfoTab({ competition }: { competition: Competition }) {
  return (
    <div className="grid gap-6 md:grid-cols-3">
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Sobre esta competencia</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="prose max-w-none">
            <ReactMarkdown components={markdownComponents}>
              {competition.information}
            </ReactMarkdown>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Detalles de inscripción</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-2">
              <Calendar className="h-4 w-4 mt-0.5 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm font-medium">Abre</p>
                <p className="text-sm text-muted-foreground">
                  {formatDate(competition.registration_open)}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Clock className="h-4 w-4 mt-0.5 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm font-medium">Cierra</p>
                <p className="text-sm text-muted-foreground">
                  {formatDate(competition.registration_close)}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Users className="h-4 w-4 mt-0.5 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm font-medium">Límite</p>
                <p className="text-sm text-muted-foreground">
                  {competition.competitor_limit} competidores
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contacto</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <a
                href={`mailto:${extractEmail(competition.contact) ?? ""}`}
                className="text-sm text-blue-600 hover:underline"
              >
                {extractEmail(competition.contact) ?? ""}
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
