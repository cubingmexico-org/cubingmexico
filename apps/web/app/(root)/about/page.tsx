import { getNumberOfCompetitions, getNumberOfPersons } from "./_lib/queries";

export default async function Page(): Promise<React.JSX.Element> {
  const competitions = await getNumberOfCompetitions();

  const persons = await getNumberOfPersons();

  return (
    <p className="pb-2">
      Desde 2008,{" "}
      <b>{persons.toLocaleString("es-MX")} competidores mexicanos</b> han
      participado en{" "}
      <b>{competitions.toLocaleString("es-MX")} competencias oficiales</b> en el
      país. Esos números cuentan la historia de una comunidad que no ha dejado
      de crecer.
    </p>
  );
}
