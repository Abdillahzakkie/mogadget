import { getProducts } from "@/lib/publicApi";
import HomeWrapper from "@/libs/HomeWrapper";

export default async function Home() {
  // Featured = newest-first (spec §12.3: admin "feature" toggle deferred for v1).
  const products = (await getProducts("sort=newest")).slice(0, 8);
  return <HomeWrapper products={products} />;
}
