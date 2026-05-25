import Dashboard from "@/components/dashboard"

type Search = { tab?: string }

export default async function Home({ searchParams }: { searchParams: Promise<Search> }) {
  const { tab } = await searchParams
  return <Dashboard initialTab={tab} />
}
