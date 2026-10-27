import { getLastCollection } from "@/lib/data/collection";

export default async function Home() {
  const last = await getLastCollection();
  return (
    <main>
      <p>마지막 수집: {last?.startedAt ?? "없음"}</p>
      <p>실패 소스: {last?.failed.join(", ") || "없음"}</p>
    </main>
  );
}
