export function Hero() {
  return (
    // <div className="flex gap-16 items-center w-full">
    <div className="bg-[url(/hero-2.jpg)] bg-contain bg-bottom sm:bg-top sm:bg-cover bg-no-repeat h-screen w-full justify-items-start px-[10%] py-[20%] sm:py-[2%]">
      <div className="flex flex-col gap-8 sm:w-3/4">
        <p className="text-5xl lg:text-7xl font-extrabold !leading-tight  ">
          Insight from Conference Calls
        </p>
        <p className="text-3xl lg:text-4xl !leading-tight ">
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
