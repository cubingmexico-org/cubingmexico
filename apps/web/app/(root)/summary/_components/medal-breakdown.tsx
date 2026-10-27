import { Stat } from "./summary-stat";

export function MedalBreakdown({
  gold,
  silver,
  bronze,
}: {
  gold: number;
  silver: number;
  bronze: number;
}) {
  return (
    <>
      <Stat tone="gold">{gold}</Stat> {gold === 1 ? "oro" : "oros"},{" "}
      <Stat tone="silver">{silver}</Stat> {silver === 1 ? "plata" : "platas"} y{" "}
      <Stat tone="bronze">{bronze}</Stat> {bronze === 1 ? "bronce" : "bronces"}
    </>
  );
}
