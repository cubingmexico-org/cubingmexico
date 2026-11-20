import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@workspace/db";
import { certificateShare } from "@workspace/db/schema";
import { getCompetitionById } from "@/db/queries";
import { ClaimCertificate } from "@/components/claim/claim-certificate";

export default async function ClaimPage({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<React.JSX.Element> {
  const { token } = await params;
  if (!token || token.length > 64) {
    notFound();
  }

  const [share] = await db
    .select({
      competitionId: certificateShare.competitionId,
    })
    .from(certificateShare)
    .where(eq(certificateShare.token, token))
    .limit(1);

  if (!share) {
    notFound();
  }

  const competition = await getCompetitionById({ id: share.competitionId });
  if (!competition) {
    notFound();
  }

  return <ClaimCertificate competitionName={competition.name} token={token} />;
}
