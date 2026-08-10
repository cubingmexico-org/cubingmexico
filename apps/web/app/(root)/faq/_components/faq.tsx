"use client";

import { useState } from "react";
import Link from "next/link";
import { buttonVariants } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@workspace/ui/components/accordion";
import { Search, ExternalLink, Mail, HelpCircle } from "lucide-react";
import { normalizeSearchText } from "@/lib/search";

const faqData = {
  general: [
    {
      question: "¿Qué es Cubing México?",
      answer:
        "Cubing México es un sitio dedicado a la comunidad de speedcubing en México. Aquí se recopilan rankings y récords estatales basados en los resultados de la World Cube Association.",
    },
    {
      question: "¿Cuál es la relación entre Cubing México y la WCA?",
      answer:
        "Cubing México es una organización independiente que trabaja en colaboración con la World Cube Association (WCA) para promover el speedcubing en México.",
    },
    {
      question:
        "¿Es Cubing México una organización regional reconocida por la WCA?",
      answer:
        "Cubing México no es una organización regional reconocida por la WCA y no busca serlo. La única organización regional reconocida por la WCA en México es la Asociación Mexicana de Speedcubing (AMS).",
    },
    {
      question: "¿Cómo puedo contactar a Cubing México?",
      answer:
        "Puedes contactarnos a través de nuestras redes sociales como Facebook o Instagram (@cubingmexico). Para consultas específicas sobre competencias, te recomendamos contactar directamente al organizador o delegado de la competencia en cuestión.",
    },
    {
      question: "¿Cubing México ofrece patrocinios o apoyo para competidores?",
      answer:
        "Actualmente, Cubing México no ofrece programas de apoyo para competidores.",
    },
  ],
  competitions: [
    {
      question: "¿Cómo puedo participar en una competencia oficial?",
      answer:
        "Para participar en una competencia oficial de la WCA, debes registrarte a través del sitio web oficial de la WCA (worldcubeassociation.org). Busca las competencias próximas en México, selecciona la que te interese y sigue el proceso de registro. Ten en cuenta que la mayoría de las competencias tienen un cupo limitado y una cuota de inscripción. Te recomendamos registrarte con anticipación ya que los lugares podrían agotarse.",
    },
    {
      question: "¿Cuánto cuesta participar en una competencia?",
      answer:
        "El costo de inscripción varía según la competencia, generalmente entre 100 y 300 pesos mexicanos, dependiendo de la duración del evento, la sede y los eventos en los que participes. Este costo ayuda a cubrir gastos como el alquiler de la sede, equipamiento, premios y otros gastos organizativos. La información específica sobre el costo puedes consultarla contactando con los organizadores de dicha competencia.",
    },
    {
      question: "¿Necesito tener experiencia previa para competir?",
      answer:
        "¡No! Las competencias de la WCA están abiertas a todos, independientemente de su nivel de habilidad o experiencia. No hay tiempos mínimos requeridos para participar. Sin embargo, ten en cuenta que hay límites de tiempo para cada evento (por ejemplo, 10 minutos para resolver un 3x3x3). Si eres principiante, te recomendamos familiarizarte con el reglamento de la WCA antes de tu primera competencia.",
    },
    {
      question: "¿Cómo puedo organizar una competencia oficial en mi ciudad?",
      answer:
        "Para organizar una competencia oficial de la WCA, necesitas trabajar con un delegado WCA. Contacta a Cubing México o directamente a un delegado WCA de México para expresar tu interés. El proceso generalmente implica encontrar una sede adecuada, establecer un presupuesto, formar un equipo organizador, y trabajar con el delegado para asegurar que la competencia cumpla con todos los requisitos de la WCA. Recomendamos comenzar este proceso al menos 3-4 meses antes de la fecha deseada.",
    },
    {
      question: "¿Qué debo llevar a una competencia?",
      answer:
        "Debes llevar tus propios cubos para competir (al menos uno para cada evento en el que estés registrado, aunque es recomendable llevar cubos de repuesto). También necesitarás el pago de la inscripción si no lo has realizado previamente, y una identificación si es tu primera competencia. Opcional pero recomendable: agua, snacks, un cronómetro para practicar, y un bolso para guardar tus pertenencias.",
    },
  ],
  beginners: [
    {
      question: "¿Cómo puedo empezar a practicar speedcubing?",
      answer:
        "Para empezar con el speedcubing, necesitarás un cubo de calidad (recomendamos marcas como GAN, MoYu, QiYi o YJ para principiantes). Luego, aprende un método básico como el método de principiantes o directamente CFOP. Hay muchos tutoriales en YouTube y recursos en internet. Practica regularmente, cronometra tus tiempos, y gradualmente aprende algoritmos más avanzados. ¡La constancia es clave!",
    },
    {
      question: "¿Qué cubo me recomiendan para empezar?",
      answer:
        "Para principiantes, recomendamos cubos económicos pero de buena calidad como el QiYi MS, RS3M 2020, o YJ YuLong V2M. Estos cubos ofrecen un buen rendimiento a un precio accesible (entre 150-300 pesos). Evita los cubos muy baratos de juguetería, ya que su mala calidad puede dificultar el aprendizaje. Si tienes un presupuesto mayor, cubos de marcas como MoYu o GAN son excelentes opciones.",
    },
    {
      question: "¿Cuál es el mejor método para resolver el cubo rápidamente?",
      answer:
        "El método más popular entre speedcubers avanzados es CFOP (también conocido como método Fridrich), que consiste en resolver la Cruz, las primeras dos capas (F2L), orientar la última capa (OLL) y permutar la última capa (PLL). Sin embargo, existen otros métodos competitivos como Roux, ZZ y Petrus. Para principiantes, recomendamos aprender primero un método básico por capas y luego transicionar a CFOP u otro método avanzado según tu preferencia.",
    },
    {
      question: "¿Cuánto tiempo toma llegar a un promedio de sub-20 segundos?",
      answer:
        "El tiempo varía enormemente según la persona, la frecuencia de práctica y el método de aprendizaje. En promedio, con práctica regular (30-60 minutos diarios), muchos cuberos pueden alcanzar tiempos sub-20 en 6-12 meses. Algunos aprenden más rápido, mientras que a otros les puede tomar más tiempo. Lo importante es disfrutar el proceso y no compararse constantemente con otros. Establecer metas pequeñas y alcanzables te ayudará a mantener la motivación.",
    },
    {
      question: "¿Dónde puedo comprar cubos de calidad en México?",
      answer:
        "Existen varias tiendas especializadas en México que ofrecen cubos de calidad y envíos nacionales. Alternativamente, tiendas internacionales como AliExpress, SpeedCubeShop, TheCubicle y ZiiCube envían a México, aunque debes considerar los tiempos de envío y posibles costos de importación.",
    },
  ],
  rules: [
    {
      question: "¿Cuáles son las reglas básicas en una competencia WCA?",
      answer:
        "Las competencias WCA siguen un reglamento estricto para garantizar la equidad. Algunas reglas básicas incluyen: los competidores tienen un tiempo límite para inspeccionar el cubo (15 segundos); tocar el cubo durante la inspección añade penalizaciones; soltar el cubo y detener el cronómetro correctamente; seguir el procedimiento de mezcla oficial; y mantener un comportamiento deportivo. El reglamento completo está disponible en el sitio web de la WCA.",
    },
    {
      question: "¿Qué son las penalizaciones +2 y DNF?",
      answer:
        "Una penalización +2 añade dos segundos a tu tiempo y ocurre en situaciones como: exceder el tiempo de inspección (15-17 segundos), realizar un movimiento después de detener el cronómetro, o terminar con el cubo a un movimiento de estar resuelto. Un DNF (Did Not Finish) significa que el intento no cuenta y ocurre cuando: el cubo queda a más de un movimiento de estar resuelto, se excede el tiempo límite del evento, se excede el tiempo de inspección (más de 17 segundos), o se comete alguna otra infracción grave del reglamento.",
    },
    {
      question: "¿Cómo se calculan los promedios en competencias?",
      answer:
        "En la mayoría de los eventos, se realizan 5 intentos y se calcula un 'promedio de 5' eliminando el mejor y peor tiempo, y promediando los 3 restantes. En algunos eventos como 6x6x6, 7x7x7 y 3x3x3 a ciegas, se realizan 3 intentos y se toma el mejor tiempo (single). Para eventos como Fewest Moves y Multi-Blind, existen formatos específicos detallados en el reglamento de la WCA.",
    },
    {
      question: "¿Qué cubos están permitidos en competencias oficiales?",
      answer:
        "Los cubos deben cumplir con el reglamento de la WCA: no pueden tener marcas, texturas o características que proporcionen ventajas injustas; deben ser comercialmente disponibles para todos los competidores; y deben estar en buenas condiciones de funcionamiento. Los jueces pueden inspeccionar los cubos antes de cada intento. Algunos eventos tienen requisitos específicos, como los cubos 3x3x3 para el evento de 3x3x3 a ciegas que no deben tener texturas distinguibles al tacto.",
    },
  ],
  community: [
    {
      question: "¿Cómo puedo unirme a un Team de speedcubing?",
      answer:
        "Para unirte a un Team existente, puedes contactar directamente a sus representantes en competencias o a través de redes sociales. Muchos Teams organizan reuniones abiertas. Alternativamente, puedes formar tu propio Team con amigos o cuberos de tu localidad. Registra tu Team en nuestro sitio para aparecer en el directorio oficial de Teams de Cubing México.",
    },
    {
      question: "¿Existen grupos de práctica o reuniones informales?",
      answer:
        "¡Sí! En muchas ciudades de México existen grupos que organizan reuniones informales (meetups) para practicar, intercambiar técnicas y socializar. Puedes encontrar estos grupos en redes sociales buscando términos como 'speedcubing' o 'cuberos' junto con el nombre de tu ciudad. También puedes consultar nuestra sección de comunidad donde listamos grupos activos o preguntar en nuestro servidor de Discord.",
    },
    {
      question: "¿Cómo puedo convertirme en un delegado WCA?",
      answer:
        "Para convertirte en delegado WCA, primero debes tener experiencia significativa en competencias, idealmente como competidor y como parte del staff organizador. Los delegados son seleccionados por otros delegados de la WCA basándose en su conocimiento del reglamento, habilidades organizativas, integridad y compromiso con la comunidad. Si estás interesado, comienza por involucrarte activamente en la organización de competencias y contacta a un delegado actual para expresar tu interés y recibir orientación.",
    },
    {
      question: "¿Existen becas o apoyos para competidores destacados?",
      answer:
        "Cubing México no ofrece becas o apoyos para competidores destacados.",
    },
  ],
};

type Tab = keyof typeof faqData;

export function FAQ() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<string>("general");

  // FAQ data organized by categories

  // Filter questions based on search query
  const filterQuestions = (
    questions: {
      question: string;
      answer: string;
    }[],
  ) => {
    if (!searchQuery) return questions;
    const q = normalizeSearchText(searchQuery);
    return questions.filter(
      (item) =>
        normalizeSearchText(item.question).includes(q) ||
        normalizeSearchText(item.answer).includes(q),
    );
  };

  // Get all questions if searching, otherwise get questions for the active tab
  const displayedQuestions = searchQuery
    ? Object.values(faqData).flat()
    : faqData[activeTab as Tab] || [];

  const filteredQuestions = filterQuestions(displayedQuestions);

  // Count total questions
  const totalQuestions = Object.values(faqData).reduce(
    (total, questions) => total + questions.length,
    0,
  );

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

        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground size-4" />
          <Input
            placeholder="Buscar preguntas..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <Tabs
          defaultValue="general"
          className="w-full"
          onValueChange={setActiveTab}
        >
          {!searchQuery && (
            <TabsList className="w-full justify-start mb-6 overflow-x-auto flex-nowrap">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="competitions">Competencias</TabsTrigger>
              <TabsTrigger value="beginners">Principiantes</TabsTrigger>
              <TabsTrigger value="rules">Reglamento WCA</TabsTrigger>
              <TabsTrigger value="community">Comunidad</TabsTrigger>
            </TabsList>
          )}

          {searchQuery ? (
            <div>
              {filteredQuestions.length > 0 ? (
                <Accordion type="single" collapsible className="w-full">
                  {filteredQuestions.map((faq, index) => (
                    <AccordionItem key={index} value={`item-${index}`}>
                      <AccordionTrigger className="text-left">
                        {faq.question}
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="prose max-w-none">
                          <p>{faq.answer}</p>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              ) : (
                <div className="text-center py-12">
                  <HelpCircle className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
                  <h3 className="mt-4 text-lg font-semibold">
                    No se encontraron resultados
                  </h3>
                  <p className="mt-2 text-muted-foreground">
                    No hay preguntas que coincidan con tu búsqueda. Intenta con
                    otros términos.
                  </p>
                </div>
              )}
            </div>
          ) : (
            Object.keys(faqData).map((category) => (
              <TabsContent key={category} value={category}>
                <Accordion type="single" collapsible className="w-full">
                  {(faqData[category as Tab] || []).map((faq, index) => (
                    <AccordionItem key={index} value={`item-${index}`}>
                      <AccordionTrigger className="text-left">
                        {faq.question}
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="prose max-w-none">
                          <p>{faq.answer}</p>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </TabsContent>
            ))
          )}
        </Tabs>

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

        <div className="mt-8 text-center text-sm text-muted-foreground">
          {!searchQuery && (
            <p>
              Actualmente mostrando {totalQuestions} preguntas frecuentes en{" "}
              {Object.keys(faqData).length} categorías.
            </p>
          )}
          <p className="mt-1">
            Última actualización:{" "}
            {new Date("2025-08-30T00:00:00").toLocaleDateString()}
          </p>
        </div>
      </div>
    </main>
  );
}
