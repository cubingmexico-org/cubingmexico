import { getNumberOfCompetitions, getNumberOfPersons } from "./_lib/queries";

export default async function Page(): Promise<React.JSX.Element> {
  const competitions = await getNumberOfCompetitions();

  const persons = await getNumberOfPersons();

  return (
    <p className="pb-2">
      Desde el año 2008, hemos sido testigos de un crecimiento fenomenal en la
      comunidad de speedcubing en México. ¡Un asombroso total de{" "}
      <b>{persons} mexicanos</b> han participado en nada menos que{" "}
      <b>{competitions} competencias oficiales</b> celebradas en todo el
      país! Estos números son un testimonio del compromiso y la pasión que los
      speedcubers mexicanos tienen por su deporte, y estamos orgullosos de ser
      parte de esta emocionante travesía.
    </p>
  );
}
