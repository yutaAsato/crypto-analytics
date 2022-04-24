import { trpc } from "@/utils/trpc";
import type { NextPage } from "next";
import Head from "next/head";
import Image from "next/image";
import Link from "next/link";
import React from "react";
import { inferQueryResponse } from "./api/trpc/[trpc]";

export default function Home() {
  const binanceList = trpc.useQuery(["getBinanceList", { nullable: true }]);
  const binanceSortedByVolume = binanceList.data?.volSorted;
  const binanceSortedByChange = binanceList.data?.activeSorted;
  const categoriesVolList = trpc.useQuery([
    "getCategories",
    { nullable: true },
  ]);
  const binanceNewListing = trpc.useQuery([
    "getBinanceNewListing",
    { nullable: true },
  ]);

  // console.log("binaceNewListing", binanceNewListing);

  // console.log("binanceSortedByVolume", binanceSortedByVolume);
  // console.log("binanceSortedByChange", binanceSortedByChange);
  // console.log("categoriesVolList", categoriesVolList);

  return (
    <div className="h-full w-screen flex flex-col justify-center items-center">
      <div className="p-2" />
      <div className="font-extrabold italic text-3xl text-red-200">
        CRYPTO AVENGERS Ⓐ
      </div>

      <div className="w-full p-8 flex justify-between items-center max-w-4xl flex-col md:flex-row animate-fade-in">
        <RankingList
          title={"Ranking By Volume 💰"}
          data={binanceSortedByVolume}
        />
        <div className="p-8 italic text-xl">{"VS"}</div>
        <RankingList
          title={"Ranking By % Change 🚀"}
          data={binanceSortedByChange}
        />
      </div>

      <div className="w-full p-8 flex justify-center items-center max-w-4xl flex-col md:flex-row animate-fade-in">
        <Listing
          title={"Binance Latest Listings"}
          data={binanceNewListing.data}
        />
      </div>
    </div>
  );
}

type BinanceData = inferQueryResponse<"getBinanceList">["volSorted"];

//RankingList
const RankingList: React.FC<{ title: string; data: BinanceData }> = (props) => {
  const { title, data } = props;

  return (
    <div className="flex flex-col items-center transition-opacity p-1 min-w-[300px]">
      <div className="font-extrabold italic text-2xl">{title}</div>
      <div className="p-2" />
      <div className="h-full">
        {data?.map((coin: any, index: number) => {
          return (
            <div key={index} className="flex items-center p-1">
              {/* <div className="text-xl">{index + 1}</div> */}
              <Link
                href={`https://www.binance.com/en/trade/${coin.base}_USDT?layout=pro`}
                passHref={true}
              >
                <a target="_blank" rel="noopener noreferrer">
                  <div className="font-bold text-xl hover:text-red-200">
                    {coin.base}
                  </div>
                </a>
              </Link>
              {coin.new24hVol && (
                <div className="pl-2 italic text-green-200">
                  {convertToInternationalCurrencySystem(
                    coin.converted_volume.usd
                  )}
                </div>
              )}
              {coin.volume && !coin.new24hVol && (
                <div className="pl-2 italic text-green-200">
                  {convertToInternationalCurrencySystem(
                    coin.converted_volume.usd
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

//Listing
const Listing: React.FC<{ title: string; data: any }> = (props) => {
  const { title, data } = props;

  return (
    <div className="flex flex-col items-center transition-opacity p-1 min-w-[300px]">
      <div className="font-extrabold italic text-2xl">🚨 {title}</div>
      <div className="p-2" />
      <div className="h-full">
        {data?.map((list: any, index: number) => {
          return (
            <div key={index} className="flex items-center p-1">
              <Link
                href={`https://www.binance.com/en/support/announcement/c-48`}
                passHref={true}
              >
                <a target="_blank" rel="noopener noreferrer">
                  <div className="font-bold md:text-lg hover:text-red-200 text-center">
                    ⚡ {list.content} ({list.contentDate})
                  </div>
                </a>
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
};

function convertToInternationalCurrencySystem(labelValue: any) {
  // Nine Zeroes for Billions
  return Math.abs(Number(labelValue)) >= 1.0e9
    ? (Math.abs(Number(labelValue)) / 1.0e9).toFixed(2) + "B 💵 "
    : // Six Zeroes for Millions
    Math.abs(Number(labelValue)) >= 1.0e6
    ? (Math.abs(Number(labelValue)) / 1.0e6).toFixed(2) + "M"
    : // Three Zeroes for Thousands
    Math.abs(Number(labelValue)) >= 1.0e3
    ? (Math.abs(Number(labelValue)) / 1.0e3).toFixed(2) + "K"
    : Math.abs(Number(labelValue));
}
