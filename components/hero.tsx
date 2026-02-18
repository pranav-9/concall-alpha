import Image from "next/image";

export function Hero() {
  return (
    <div className="relative min-h-[70vh] sm:min-h-screen w-full justify-items-start px-[8%] py-[14%] sm:py-[2%] overflow-hidden">
      <Image
        src="/hero-2.jpg"
        alt="Story of a Stock hero background"
        fill
        priority
        sizes="100vw"
        className="object-contain object-bottom sm:object-cover sm:object-top"
      />
      <div className="relative z-10 flex flex-col gap-5 sm:gap-8 sm:w-3/4">
        <p className="text-3xl sm:text-5xl lg:text-7xl font-extrabold !leading-tight">
          Insight from Conference Calls
        </p>
        <p className="text-lg sm:text-3xl lg:text-4xl !leading-tight">
          Presenting <span className="font-bold">New Signals</span> <br></br>for
          the
          <br></br>serious retail investor{" "}
        </p>
      </div>
    </div>
  );
}
