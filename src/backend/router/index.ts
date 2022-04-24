import * as trpc from "@trpc/server";
import { z } from "zod";

const CoinGecko = require("coingecko-api");
const puppeteer = require("puppeteer");
const chrome = require("chrome-aws-lambda");

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
  })
  .query("getBinanceNewListing", {
    input: z.object({
      nullable: z.boolean(),
    }),
    async resolve({ input }) {
      try {
        const URL = "https://www.binance.com/en/support/announcement/c-48";
        // const browser = await puppeteer.launch();

        const browser = await puppeteer.launch({
          args: chrome.args,
          executablePath: await chrome.executablePath,
          headless: chrome.headless,
        });
        const page = await browser.newPage();

        await page.goto(URL);

        // check if the annoying banner at bottom is there
        const isBanner = await page.evaluate(() => {
          return !!document.querySelector("#onetrust-accept-btn-handler"); // !! converts anything to boolean
        });

        //click on the button if there is
        // if (await isBanner) await page.click("#onetrust-accept-btn-handler");

        await page.click("#onetrust-accept-btn-handler");

        // wait for first list element to show
        await page.waitForSelector(".css-f94ykk");

        let data = await page.evaluate(() => {
          let results: any = [];
          const data = document.querySelectorAll(".css-f94ykk");

          data.forEach((item) => {
            results.push({
              content: item.textContent,
            });
          });

          const filteredData = results
            .filter((item: any) => {
              return item.content.split("").includes("("); //filter only "List' notifications"
            })
            .map((item: any) => {
              // remove date at the end
              return {
                content: item.content
                  .split("")
                  .slice(0, item.content.indexOf("2"))
                  .join(""),
                contentDate: item.content
                  .split("")
                  .slice(item.content.indexOf("2"))
                  .join(""),
              };
            });
          return filteredData;
        });

        console.log("======DATA========", data);
        await browser.close();
        return data;
      } catch (error) {
        console.error(error);
      }
    },
  });

// export type definition of API
export type AppRouter = typeof appRouter;
