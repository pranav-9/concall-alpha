import React from "react";
import { CarouselSize } from "./carousal-2";

const FeatureOne = () => {
  return (
    <div className="flex flex-col items-center gap-8 pb-16">
      <p className="text-5xl lg:text-7xl font-extrabold !leading-tight  ">
        Our Features
      </p>
      {/* <div>Our Features</div> */}
      <CarouselSize></CarouselSize>
    </div>
  );
};

export default FeatureOne;
