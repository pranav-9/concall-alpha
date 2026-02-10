export function Hero() {
  return (
    // <div className="flex gap-16 items-center w-full">
    <div className="bg-[url(/hero-2.jpg)] bg-contain bg-bottom sm:bg-top sm:bg-cover bg-no-repeat min-h-[70vh] sm:min-h-screen w-full justify-items-start px-[8%] py-[14%] sm:py-[2%]">
      <div className="flex flex-col gap-5 sm:gap-8 sm:w-3/4">
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

    // {/* <Image src="/hero-1.jpg" width={500} height={500} alt="hero"></Image> */}
    // {/* </div> */}
  );
}
