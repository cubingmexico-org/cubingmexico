const DEFAULT_TEST_DATABASE_URL =
  "postgresql://postgres:postgres@localhost:5432/cubing_mexico_test";

/**
 * `<name>_organizer_test` next to the web suite's TEST_DATABASE_URL. Turbo runs both
 * suites at once, and each truncates every table before each test.
 */
export function organizerTestDatabaseUrl(): string {
  const url = new URL(
    process.env.TEST_DATABASE_URL ?? DEFAULT_TEST_DATABASE_URL,
  );
  const name = url.pathname.slice(1);
  if (!name.endsWith("_test")) {
    throw new Error(
      `Refusing to run integration tests against "${name}": the database name must end with "_test" because every table is truncated.`,
    );
  }
  url.pathname = `/${name.slice(0, -"_test".length)}_organizer_test`;
  return url.toString();
}
