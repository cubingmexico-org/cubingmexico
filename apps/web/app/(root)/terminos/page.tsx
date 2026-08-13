import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Términos de uso | Cubing México",
  description:
    "Términos de uso de Cubing México: reglas del sitio, cuenta WCA, contenido de usuario y limitaciones de responsabilidad.",
};

const LAST_UPDATED = "13 de agosto de 2026";

export default function Page(): React.JSX.Element {
  return (
    <main className="grow container mx-auto px-4 py-8 max-w-3xl">
      <h1 className="text-center text-4xl pb-2 font-semibold">
        Términos de uso
      </h1>
      <p className="text-center text-sm text-muted-foreground pb-8">
        Última actualización: {LAST_UPDATED}
      </p>

      <div className="space-y-8 text-sm leading-relaxed">
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">1. Aceptación</h2>
          <p>
            Al acceder o usar{" "}
            <Link
              href="https://www.cubingmexico.net"
              className="underline hover:text-primary"
            >
              cubingmexico.net
            </Link>{" "}
            (el “Sitio”), aceptas estos términos de uso. Si no estás de acuerdo,
            no uses el Sitio.
          </p>
          <p>
            Cubing México es un sitio comunitario independiente dedicado al
            speedcubing en México. No es la World Cube Association (WCA) ni una
            organización regional reconocida por la WCA.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">2. Cuenta y autenticación</h2>
          <p>
            Algunas funciones requieren iniciar sesión con tu cuenta de la WCA
            (OAuth). Eres responsable de la actividad realizada con tu sesión y
            de usar solo la cuenta que te corresponde.
          </p>
          <p>
            Si tienes roles de administración o de gestión de un team estatal,
            debes usar esos permisos de forma responsable y únicamente para los
            fines propios del Sitio (por ejemplo, actualizar información del
            team o contenido autorizado).
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">3. Contenido de usuario</h2>
          <p>
            Cuando subes imágenes u otro contenido (por ejemplo, logos o portadas
            de teams, o imágenes de competencias), declaras que tienes derecho a
            hacerlo y nos otorgas una licencia limitada, no exclusiva y
            revocable para alojar, mostrar y distribuir ese contenido en el
            Sitio y canales relacionados con Cubing México.
          </p>
          <p>No debes subir contenido que:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Infrinja derechos de terceros (incluyendo propiedad intelectual).</li>
            <li>Sea ilegal, abusivo, engañoso o inapropiado.</li>
            <li>Contenga malware u otros materiales dañinos.</li>
          </ul>
          <p>
            Podemos retirar o restringir contenido que incumpla estos términos o
            que sea necesario retirar por razones operativas o legales.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">4. Datos de resultados y WCA</h2>
          <p>
            Gran parte de la información de resultados, rankings y perfiles se
            basa en datos publicados por la WCA. Puede haber desfases,
            omisiones o errores de sincronización o presentación.
          </p>
          <p>
            Cubing México no garantiza la exactitud, integridad o actualidad
            absoluta de esa información. Para datos oficiales o correcciones a
            registros WCA, debes acudir a los canales correspondientes de la
            WCA.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">
            5. Uso permitido del Sitio
          </h2>
          <p>Te comprometes a no:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              Intentar acceder a áreas o funciones sin autorización, ni abusar
              de roles administrativos.
            </li>
            <li>
              Interferir con el funcionamiento del Sitio, automatizar scrapeo
              agresivo o sobrecargar de forma indebida los servicios.
            </li>
            <li>
              Usar el Sitio de forma que vulnere la ley o los derechos de otras
              personas.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">
            6. Limitación de responsabilidad
          </h2>
          <p>
            El Sitio se ofrece “tal cual”, como proyecto comunitario, sin
            garantías expresas o implícitas de disponibilidad ininterrumpida,
            ausencia de errores o idoneidad para un propósito particular.
          </p>
          <p>
            En la medida permitida por la ley aplicable, Cubing México y las
            personas que lo mantienen no serán responsables por daños
            indirectos, incidentales o consecuentes derivados del uso o la
            imposibilidad de uso del Sitio.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">7. Privacidad</h2>
          <p>
            El tratamiento de datos personales se describe en nuestro{" "}
            <Link
              href="/aviso-de-privacidad"
              className="underline hover:text-primary"
            >
              aviso de privacidad
            </Link>
            .
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">8. Cambios</h2>
          <p>
            Podemos modificar estos términos en cualquier momento. La versión
            vigente se publicará en esta página con la fecha de última
            actualización. El uso continuado del Sitio después de un cambio
            implica la aceptación de los términos actualizados.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">9. Contacto</h2>
          <p>
            Para dudas sobre estos términos, contáctanos por{" "}
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
            o{" "}
            <Link
              href="https://discord.gg/N9KcpWngz7"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-primary"
            >
              Discord
            </Link>
            .
          </p>
          <p className="text-muted-foreground">
            Estos términos son un aviso informativo de buena fe; no constituyen
            asesoría legal.
          </p>
        </section>
      </div>
    </main>
  );
}
