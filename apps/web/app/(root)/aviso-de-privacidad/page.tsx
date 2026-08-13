import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Aviso de privacidad | Cubing México",
  description:
    "Aviso de privacidad de Cubing México: qué datos personales tratamos, para qué, con quién y cómo ejercer tus derechos ARCO.",
};

const LAST_UPDATED = "13 de agosto de 2026";

export default function Page(): React.JSX.Element {
  return (
    <main className="grow container mx-auto px-4 py-8 max-w-3xl">
      <h1 className="text-center text-4xl pb-2 font-semibold">
        Aviso de privacidad
      </h1>
      <p className="text-center text-sm text-muted-foreground pb-8">
        Última actualización: {LAST_UPDATED}
      </p>

      <div className="space-y-8 text-sm leading-relaxed">
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">1. Identidad del responsable</h2>
          <p>
            El responsable del tratamiento de los datos personales es{" "}
            <strong>Cubing México</strong>, sitio comunitario independiente
            disponible en{" "}
            <Link
              href="https://www.cubingmexico.net"
              className="underline hover:text-primary"
            >
              cubingmexico.net
            </Link>
            . Cubing México no es la World Cube Association (WCA) ni una
            organización regional reconocida por la WCA.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">2. Datos personales que tratamos</h2>
          <p>Podemos tratar las siguientes categorías de datos:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong>Datos de cuenta vía WCA OAuth:</strong> identificador WCA
              (WCA ID), nombre y avatar asociados a tu perfil WCA.
            </li>
            <li>
              <strong>Datos de sesión:</strong> cookies y tokens necesarios para
              mantener tu sesión autenticada.
            </li>
            <li>
              <strong>Datos de perfil y comunidad:</strong> afiliación estatal,
              membresía o roles en teams estatales, y permisos de administración
              cuando apliquen.
            </li>
            <li>
              <strong>Contenido que subes:</strong> imágenes de teams o
              competencias cargadas por usuarios autorizados.
            </li>
            <li>
              <strong>Datos técnicos y de uso:</strong> información agregada o
              identificadores técnicos relacionados con el uso y el rendimiento
              del sitio (por ejemplo, a través de analytics).
            </li>
            <li>
              <strong>Datos públicos derivados de la WCA:</strong> resultados,
              rankings y perfiles de competidores que ya son públicos en la WCA
              y que se muestran o enriquecen en este sitio.
            </li>
          </ul>
          <p>
            No solicitamos de forma intencional datos personales sensibles (por
            ejemplo, datos de salud, ideología u origen racial o étnico).
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">3. Finalidades del tratamiento</h2>
          <p>Tratamos tus datos para:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Autenticarte y mantener tu sesión en el sitio.</li>
            <li>
              Gestionar tu perfil, afiliación estatal y participación en teams.
            </li>
            <li>
              Permitir funciones de administración y gestión de contenido
              (incluyendo imágenes) a usuarios con los permisos correspondientes.
            </li>
            <li>
              Mostrar rankings, récords, estadísticas y otra información útil
              para la comunidad de speedcubing en México.
            </li>
            <li>
              Medir el uso y el rendimiento del sitio para mejorarlo (analytics
              e insights).
            </li>
          </ul>
          <p>
            Las finalidades necesarias para prestar el servicio (autenticación,
            perfil y funciones del sitio) no requieren un consentimiento
            adicional más allá del uso del servicio. El uso de herramientas de
            medición puede implicar el tratamiento de datos técnicos de
            navegación; puedes limitar cookies o el seguimiento desde tu
            navegador cuando esté disponible.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">
            4. Cookies y tecnologías similares
          </h2>
          <p>Utilizamos, entre otras:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong>Cookies de sesión / autenticación</strong> para iniciar y
              mantener tu sesión de forma segura.
            </li>
            <li>
              <strong>Vercel Analytics</strong> y{" "}
              <strong>Vercel Speed Insights</strong> para entender el uso y el
              rendimiento del sitio.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">5. Terceros y encargados</h2>
          <p>
            Para operar el sitio podemos compartir o permitir el acceso a datos
            con proveedores que nos ayudan a prestar el servicio, por ejemplo:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong>World Cube Association (WCA):</strong> autenticación OAuth
              y datos públicos de competidores.
            </li>
            <li>
              <strong>Vercel:</strong> alojamiento, analytics e insights.
            </li>
            <li>
              <strong>UploadThing:</strong> almacenamiento y entrega de archivos
              subidos (por ejemplo, imágenes).
            </li>
          </ul>
          <p>
            Estos terceros tratan la información conforme a sus propias
            políticas y en la medida necesaria para prestar sus servicios.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">6. Derechos ARCO</h2>
          <p>
            En los términos aplicables de la legislación mexicana en materia de
            protección de datos personales, puedes solicitar el acceso,
            rectificación, cancelación u oposición (derechos ARCO) respecto de
            tus datos personales, así como limitar el uso o divulgación cuando
            proceda.
          </p>
          <p>
            Para ejercer estos derechos, contáctanos a través de nuestras redes
            sociales{" "}
            <Link
              href="https://facebook.com/cubingmexico"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-primary"
            >
              Facebook
            </Link>
            ,{" "}
            <Link
              href="https://instagram.com/cubingmexico"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-primary"
            >
              Instagram (@cubingmexico)
            </Link>{" "}
            o nuestro{" "}
            <Link
              href="https://discord.gg/N9KcpWngz7"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-primary"
            >
              servidor de Discord
            </Link>
            . Indica tu WCA ID (si aplica) y describe claramente tu solicitud
            para que podamos atenderla.
          </p>
          <p>
            Nota: parte de la información mostrada en el sitio proviene de datos
            públicos de la WCA. Las correcciones a esos datos oficiales deben
            gestionarse ante la WCA cuando corresponda.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">7. Cambios a este aviso</h2>
          <p>
            Podemos actualizar este aviso de privacidad cuando cambien las
            finalidades, los proveedores o la forma en que operamos el sitio. La
            versión vigente se publicará en esta página con la fecha de última
            actualización.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">8. Vigencia</h2>
          <p>
            Este aviso es vigente a partir de la fecha de última actualización
            indicada arriba. Es un aviso informativo de buena fe para la
            comunidad; no constituye asesoría legal.
          </p>
          <p>
            También puedes consultar nuestros{" "}
            <Link href="/terminos" className="underline hover:text-primary">
              términos de uso
            </Link>
            .
          </p>
        </section>
      </div>
    </main>
  );
}
