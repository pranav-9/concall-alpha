import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  Card,
  CardContent,
} from "concall-alpha";

// Carousel is embla-backed and context-driven: Carousel > CarouselContent >
// CarouselItem is the minimum that renders, and CarouselPrevious /
// CarouselNext sit absolutely OUTSIDE the track (-left-12 / -right-12), so
// the surrounding element needs horizontal room for them. The homepage uses
// it for the feature strip (app/(hero)/carousal-2.tsx).

const RECENT = [
  { code: "NEULANDLAB", name: "Neuland Laboratories", score: 8.2, band: "Strongly Bullish", quarter: "Q1 FY27" },
  { code: "MTARTECH", name: "MTAR Technologies", score: 7.3, band: "Bullish", quarter: "Q1 FY27" },
  { code: "HFCL", name: "HFCL", score: 6.9, band: "Mildly Bullish", quarter: "Q1 FY27" },
  { code: "FEDFINA", name: "Fedbank Financial", score: 6.6, band: "Mildly Bullish", quarter: "Q1 FY27" },
  { code: "PRICOLLTD", name: "Pricol", score: 5.8, band: "Neutral", quarter: "Q4 FY26" },
  { code: "SOLARA", name: "Solara Active Pharma", score: 4.2, band: "Mildly Bearish", quarter: "Q4 FY26" },
];

export const ScoreCards = () => (
  <div className="px-14">
    <Carousel opts={{ align: "start" }} className="w-full">
      <CarouselContent>
        {RECENT.map((company) => (
          <CarouselItem key={company.code} className="basis-1/2 md:basis-1/3">
            <Card className="h-full gap-3 py-5">
              <CardContent className="space-y-2 px-5">
                <div className="text-[11px] font-medium uppercase tracking-[0.09em] text-muted-foreground">
                  {company.quarter}
                </div>
                <div className="text-sm font-semibold text-foreground">
                  {company.name}
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-semibold tabular-nums">
                    {company.score.toFixed(1)}
                  </span>
                  <span className="text-[11px] font-medium text-muted-foreground">
                    {company.band}
                  </span>
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {company.code}
                </div>
              </CardContent>
            </Card>
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious />
      <CarouselNext />
    </Carousel>
  </div>
);

export const OneSlideAtATime = () => (
  <div className="px-14">
    <Carousel className="w-full">
      <CarouselContent>
        {[
          {
            title: "The CDMO ramp is the swing factor",
            body: "Neuland's management spent most of the Q1 FY27 call on validation batches for two commercial molecules, and almost none on the base generics business.",
            company: "Neuland Laboratories · Q1 FY27",
          },
          {
            title: "Order book converted, margin did not",
            body: "MTAR shipped against the clean-energy backlog but held the FY27 margin guide flat, which is the third quarter running that execution has led profitability.",
            company: "MTAR Technologies · Q1 FY27",
          },
          {
            title: "Guidance withdrawn, not missed",
            body: "Solara stopped quantifying the API volume target it had carried for four quarters. Nothing was restated — the number simply stopped being said.",
            company: "Solara Active Pharma · Q4 FY26",
          },
        ].map((slide) => (
          <CarouselItem key={slide.title}>
            <Card className="py-6">
              <CardContent className="space-y-3">
                <div className="text-[11px] font-medium uppercase tracking-[0.09em] text-muted-foreground">
                  {slide.company}
                </div>
                <div className="text-lg font-semibold text-foreground">
                  {slide.title}
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {slide.body}
                </p>
              </CardContent>
            </Card>
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious />
      <CarouselNext />
    </Carousel>
  </div>
);

export const Vertical = () => (
  <div className="py-14">
    <Carousel orientation="vertical" opts={{ align: "start" }} className="mx-auto w-full max-w-sm">
      <CarouselContent className="h-[300px]">
        {RECENT.slice(0, 5).map((company) => (
          <CarouselItem key={company.code} className="basis-1/3">
            <Card className="h-full justify-center py-4">
              <CardContent className="flex items-baseline justify-between px-5">
                <div>
                  <div className="text-sm font-medium text-foreground">
                    {company.name}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {company.quarter} · {company.band}
                  </div>
                </div>
                <span className="text-2xl font-semibold tabular-nums">
                  {company.score.toFixed(1)}
                </span>
              </CardContent>
            </Card>
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious />
      <CarouselNext />
    </Carousel>
  </div>
);
