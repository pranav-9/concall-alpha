// Server wrapper for the Exchange Desk feed: fetches the classified BSE
// announcement data and hands it to the client filter component. Self-fetching +
// Suspense-wrapped (same shape as DeskHotThemes) so it streams independently and
// returns nothing until the feed has material rows.

import { getExchangeDeskData } from "@/lib/exchange-desk";
import DeskExchangeUpdates from "./desk-exchange-updates";

export default async function DeskExchangeSection() {
  const data = await getExchangeDeskData();
  return <DeskExchangeUpdates data={data} />;
}
