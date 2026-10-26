import Link from "next/link";
import { ExternalLink, Mail } from "lucide-react";
import { buttonVariants } from "@workspace/ui/components/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs";
import { FaqAccordion } from "./faq-accordion";
import { FAQ_CATEGORY_LABELS, faqData, type FaqCategory } from "./faq-data";
import { FaqSearch } from "./faq-search";

const CATEGORIES = Object.keys(faqData) as FaqCategory[];

export function FAQ() {
  return (
    <main className="grow container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2 text-center">
          Preguntas Frecuentes
        </h1>
        <p className="text-center text-muted-foreground mb-8">
          Encuentra respuestas a las preguntas más comunes sobre speedcubing y
          competencias en México
        </p>

        <FaqSearch
          questions={Object.values(faqData).flat()}
          categoryCount={CATEGORIES.length}
          footer={<ContactCard />}
        >
          <Tabs defaultValue="general" className="w-full">
            <TabsList className="w-full justify-start mb-6 overflow-x-auto flex-nowrap">
              {CATEGORIES.map((category) => (
                <TabsTrigger key={category} value={category}>
                  {FAQ_CATEGORY_LABELS[category]}
                </TabsTrigger>
              ))}
            </TabsList>
            {CATEGORIES.map((category) => (
              <TabsContent key={category} value={category}>
                <FaqAccordion items={faqData[category]} />
              </TabsContent>
            ))}
          </Tabs>
        </FaqSearch>
      </div>
    </main>
  );
}

function ContactCard() {
  return (
    <div className="mt-12 bg-muted/30 rounded-lg p-6">
      <h2 className="text-xl font-bold mb-4">
        ¿No encontraste lo que buscabas?
      </h2>
      <p className="mb-4">
        Si tienes alguna pregunta que no esté respondida aquí, no dudes en
        contactarnos. Estamos aquí para ayudarte.
      </p>
      <div className="flex flex-col sm:flex-row gap-4">
        <Link
          href="https://www.facebook.com/cubingmexico"
          className={buttonVariants({ variant: "outline" })}
        >
          <Mail />
          Contactar
        </Link>

        <Link
          className={buttonVariants({ variant: "default" })}
          href="https://www.worldcubeassociation.org/regulations/"
          target="_blank"
          rel="noopener noreferrer"
        >
          <ExternalLink />
          Reglamento WCA Oficial
        </Link>
      </div>
    </div>
  );
}
