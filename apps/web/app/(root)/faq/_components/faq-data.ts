export type FaqItem = {
  question: string;
  answer: string;
};

export const faqData = {
  general: [
    {
      question: "¿Qué es Cubing México?",
      answer:
        "Es un sitio de la comunidad de speedcubing en México: rankings estatales, récords, Teams y calendario, con datos de la World Cube Association.",
    },
    {
      question: "¿Cuál es la relación entre Cubing México y la WCA?",
      answer:
        "Somos independientes. Usamos los resultados oficiales de la WCA para armar rankings y récords mexicanos; no formamos parte de la WCA.",
    },
    {
      question:
        "¿Es Cubing México una organización regional reconocida por la WCA?",
      answer:
        "No, y no buscamos serlo. La organización regional reconocida en México es la Asociación Mexicana de Speedcubing (AMS).",
    },
    {
      question: "¿Cómo puedo contactar a Cubing México?",
      answer:
        "Por Instagram o Facebook (@cubingmexico). Si la duda es de una competencia concreta, mejor escribe al organizador o al delegado de esa competencia.",
    },
    {
      question: "¿Cubing México ofrece patrocinios o apoyo para competidores?",
      answer:
        "No damos apoyo económico a competidores. El sitio se mantiene con patrocinadores, que aparecen aquí con rankings y récords. Si quieres sumarte, escríbenos por Instagram (@cubingmexico).",
    },
  ],
  competitions: [
    {
      question: "¿Cómo puedo participar en una competencia oficial?",
      answer:
        "Regístrate en worldcubeassociation.org: busca una competencia en México, elige eventos y completa el registro. Casi todas tienen cupo y cuota; conviene anotarse pronto.",
    },
    {
      question: "¿Cuánto cuesta participar en una competencia?",
      answer:
        "Depende de la competencia (sede, duración y eventos). Suele andar entre 100 y 300 pesos. El detalle exacto lo publican los organizadores.",
    },
    {
      question: "¿Necesito tener experiencia previa para competir?",
      answer:
        "No. No hay tiempos mínimos. Sí hay límites de tiempo por evento (por ejemplo, 10 minutos en 3x3x3). Si es tu primera vez, dale una leída al reglamento de la WCA.",
    },
    {
      question: "¿Cómo puedo organizar una competencia oficial en mi ciudad?",
      answer:
        "Necesitas un delegado WCA. Contáctanos o habla con un delegado en México: sede, presupuesto, staff y fechas. Conviene empezar con varios meses de anticipación.",
    },
    {
      question: "¿Qué debo llevar a una competencia?",
      answer:
        "Tus cubos (mejor con repuesto), el pago de inscripción si no lo diste antes, e identificación si es tu primera competencia. Agua, snacks y un bolso también ayudan.",
    },
  ],
  beginners: [
    {
      question: "¿Cómo puedo empezar a practicar speedcubing?",
      answer:
        "Consigue un cubo decente (GAN, MoYu, QiYi, YJ, etc.), aprende un método básico o CFOP con tutoriales, cronometra y practica un poco seguido. Con el tiempo vas sumando algoritmos.",
    },
    {
      question: "¿Qué cubo me recomiendan para empezar?",
      answer:
        "Uno magnético de entrada de marca conocida (QiYi, MoYu, YJ, etc.), no de juguetería. Los precios cambian; busca opciones de principiante en tiendas especializadas. Si puedes gastar más, MoYu o GAN suelen ir muy bien.",
    },
    {
      question: "¿Cuál es el mejor método para resolver el cubo rápidamente?",
      answer:
        "CFOP (Fridrich) es el más usado: cruz, F2L, OLL y PLL. También hay Roux, ZZ y Petrus. Empieza con un método por capas y pasa a uno avanzado cuando te sientas listo.",
    },
    {
      question: "¿Cuánto tiempo toma llegar a un promedio de sub-20 segundos?",
      answer:
        "Depende de la persona y de cuánto practiques. Con práctica regular, a muchos les toma entre varios meses y un año. Ve a tu ritmo y disfruta el proceso.",
    },
    {
      question: "¿Dónde puedo comprar cubos de calidad en México?",
      answer:
        "Hay tiendas mexicanas con envío nacional. También AliExpress, SpeedCubeShop, TheCubicle o ZiiCube, tomando en cuenta tiempos y posibles costos de importación.",
    },
  ],
  rules: [
    {
      question: "¿Cuáles son las reglas básicas en una competencia WCA?",
      answer:
        "Inspección de 15 segundos, no tocar el cubo en inspección sin penalización, soltar y detener el cronómetro bien, mezclas oficiales y buen comportamiento. El detalle completo está en el reglamento de la WCA.",
    },
    {
      question: "¿Qué son las penalizaciones +2 y DNF?",
      answer:
        "Un +2 suma dos segundos (por ejemplo, inspección entre 15 y 17 s, o el cubo a un movimiento de resuelto). Un DNF anula el intento (más de un movimiento, tiempo límite, inspección > 17 s u otras faltas graves).",
    },
    {
      question: "¿Cómo se calculan los promedios en competencias?",
      answer:
        "En la mayoría de eventos son 5 intentos: se quitan el mejor y el peor y se promedian los tres del medio (Ao5). En 6x6, 7x7 y 3x3 a ciegas suele ser el mejor de 3 (single). FMC y Multi-Blind tienen formatos propios en el reglamento.",
    },
    {
      question: "¿Qué cubos están permitidos en competencias oficiales?",
      answer:
        "Deben ser comerciales, sin marcas o texturas que den ventaja injusta, y en buen estado. En 3x3 a ciegas no pueden distinguirse caras al tacto. El juez puede revisar el cubo antes del intento.",
    },
  ],
  community: [
    {
      question: "¿Cómo puedo unirme a un Team de speedcubing?",
      answer:
        "Habla con gente del Team en competencias o redes. Si tu estado aún no tiene uno, puedes armarlo con cuberos locales y pedirnos que lo registremos en el directorio.",
    },
    {
      question: "¿Existen grupos de práctica o reuniones informales?",
      answer:
        "Sí, en varias ciudades hay meetups. Busca “speedcubing” o “cuberos” + tu ciudad en redes, revisa las comunidades locales del sitio si están publicadas, o pregunta en nuestro Discord.",
    },
    {
      question: "¿Cómo puedo convertirme en un delegado WCA?",
      answer:
        "Hace falta experiencia como competidor y, idealmente, como staff. Los eligen otros delegados por conocimiento del reglamento, organización e integridad. Involúcrate en competencias y platica con un delegado actual.",
    },
    {
      question: "¿Existen becas o apoyos para competidores destacados?",
      answer:
        "Cubing México no ofrece becas ni apoyos económicos para competidores.",
    },
  ],
};

export type FaqCategory = keyof typeof faqData;

export const FAQ_CATEGORY_LABELS: Record<FaqCategory, string> = {
  general: "General",
  competitions: "Competencias",
  beginners: "Principiantes",
  rules: "Reglamento WCA",
  community: "Comunidad",
};
