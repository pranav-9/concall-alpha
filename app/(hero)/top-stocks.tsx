import { Badge } from "@/components/ui/badge";
import React from "react";

const TopStocks = () => {
  const data = [
    {
      title: "Most Bullish Concalls",
      stocks: [
        {
          name: "Aarti Pharmalabs",
          score: 7.89,
          label: "Extremely Bullish",
        },
        {
          name: "Aarti ",
          score: 7.86,
          label: "Extremely Bullish",
        },
        {
          name: "Aarti sdas",
          score: 6.83,
          label: "Extremely Bullish",
        },
      ],
    },
    {
      title: "High Guidance",
      stocks: [
        {
          name: "Aarti Pharmalabs",
          score: 7.89,
          label: "Extremely Bullish",
        },
        {
          name: " Pharmalabs",
          score: 7.89,
          label: "Extremely Bullish",
        },
        {
          name: "ghjghj Pharmalabs",
          score: 7.89,
          label: "Extremely Bullish",
        },
      ],
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 sm:p-4 gap-8 sm:w-[80%] w-full">
      {data.map((list, i) => (
        <div key={i} className="flex flex-col rounded-xl border-2">
          <div className=" p-4 font-bold text-white text-2xl bg-black rounded-t-xl border-2">
            {list.title}
          </div>
          <div className="flex flex-col gap-4 pb-8 p-4">
            {list.stocks.map((s, index) => (
              <div
                key={index}
                className="flex gap-4 bg-gray-900 rounded-xl p-4"
              >
                <div className="flex w-full gap-2 ">
                  <p className="p-1">{index + 1 + "."}</p>

                  <div className="flex flex-col w-3/4">
                    <p className="font-medium text-xl">{s.name}</p>

                    <div>
                      <Badge className="bg-green-400">{s.label}</Badge>
                    </div>
                  </div>
                </div>
                <div>
                  <Badge
                    className="h-12 rounded-full px-1  bg-green-400"
                    variant="destructive"
                  >
                    <p className="text-lg font-extrabold  text-black">
                      {s.score}
                    </p>
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default TopStocks;
