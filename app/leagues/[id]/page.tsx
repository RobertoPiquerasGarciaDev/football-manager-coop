import Dashboard from "@/components/dashboard"

type Params = { id: string }
type Search = { tab?: string }

export default async function LeaguePage({
  params,
  searchParams,
}: {
  params: Promise<Params>
  searchParams: Promise<Search>
}) {
  const { id } = await params
  const { tab } = await searchParams
  return <Dashboard initialLeagueId={id} initialTab={tab} />
}
