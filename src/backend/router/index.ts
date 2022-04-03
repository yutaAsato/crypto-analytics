import * as trpc from "@trpc/server";
import { z } from "zod";

const CoinGecko = require("coingecko-api");

const HUNDRED_MILLION = 100000000;

const excludeList = ["BTC", "ETH", "BUSD", "USDC", "UST", "BNB"];

export const appRouter = trpc
  .router()
  .query("getBinanceList", {
    input: z.object({
      nullable: z.boolean(),
    }),
    async resolve({ input }) {
      const CoinGeckoClient = new CoinGecko();
      const binanceTopCoins = await CoinGeckoClient.exchanges.fetch("binance");

      const sortedByVol = binanceTopCoins.data.tickers
        .filter((coin: any) => {
          return (
            coin.target === "USDT" &&
            coin.converted_volume.usd > HUNDRED_MILLION &&
            !excludeList.includes(coin.base)
          );
        })
        .sort((a: any, b: any) => {
          return b.converted_volume.btc - a.converted_volume.btc;
        });

      const coinIds = sortedByVol
        .map((coin: any) => {
          return coin.coin_id;
        })
        .toString()
        .replace(/,/g, "%2C");

      // Endpoint for 24hr data, pass in string array of coin ids
      const fetchActive = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${coinIds}&vs_currencies=usd&include_market_cap=true&include_24hr_vol=true&include_24hr_change=true&include_last_updated_at=true`
      );

      const data = await fetchActive.json();

      const sortedByChange = Object.keys(data).sort((a: any, b: any) => {
        return data[b].usd_24h_change - data[a].usd_24h_change;
      });

      // sort original list with the names from sortedByChange
      const newSortedChange = [...sortedByVol]
        .sort((a: any, b: any) => {
          return (
            sortedByChange.indexOf(a.coin_id) -
            sortedByChange.indexOf(b.coin_id)
          );
        })
        .map((coin: any) => {
          return {
            ...coin,
            new24hVol: data[coin.coin_id].usd_24h_vol,
          };
        });

      return {
        volSorted: sortedByVol,
        activeSorted: newSortedChange,
      };
    },
  })
  .query("getCategories", {
    input: z.object({
      nullable: z.boolean(),
    }),
    async resolve({ input }) {
      const fetchCategories = await fetch(
        "https://api.coingecko.com/api/v3/coins/categories"
      );
      const data = await fetchCategories.json();
      const sortedByVol = data.sort((a: any, b: any) => {
        return b.volume_24h - a.volume_24h;
      });
      return sortedByVol;
    },
  });

// export type definition of API
export type AppRouter = typeof appRouter;
