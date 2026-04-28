"use client";

import React from "react";
import Button from "@mui/material/Button";

import Image from "next/image";

const HeroSectionV3 = () => {
  return (
    <section className="w-full bg-white py-16 md:py-24">
      <div className="mx-auto max-w-[1440px] px-6 sm:px-12 lg:px-24">
        <div className="bg-white rounded-[24px] shadow-[0_14px_74px_rgba(0,0,0,0.07)] p-8 md:p-12 lg:p-16 flex flex-col lg:flex-row items-center gap-12">
          {/* Left Content */}
          <div className="flex-1 text-center lg:text-left">
            <h2 className="text-[32px] md:text-[42px] lg:text-[56px] font-bold leading-[1.2] mb-6 font-['Open_Sauce_One_Bold']">
              <span className="text-[#484848]">Not sure what </span>
              <br className="hidden md:block" />
              <span className="text-[#45A735]">you need?</span>
            </h2>

            <p className="text-[18px] md:text-[24px] text-[#636363] leading-[1.5] mb-10 max-w-[500px] mx-auto lg:mx-0 font-['Open_Sauce_One_Regular']">
              Tell us what you're trying to build or fix, and we'll match you
              with the right expert.
            </p>

            <Button
              variant="contained"
              className=" px-[24px]! py-[18px]!"
              sx={{
                position: "relative",
                overflow: "hidden",
                backgroundColor: "#45A735",
                textTransform: "none",
                fontFamily: "'Open Sauce One Regular'",
                fontWeight: 700,
                fontSize: { xs: "10px", md: "16px" },
                lineHeight: "100%",
                letterSpacing: "0px",
                textAlign: "center",
                borderRadius: "12px",
                boxShadow: "none",
                "&::before": {
                  content: '""',
                  position: "absolute",
                  top: 0,
                  left: "-100%",
                  width: "100%",
                  height: "100%",
                  backgroundColor: "#26472B",
                  transition: "left 0.5s ease",
                  zIndex: 0,
                },
                "&:hover": {
                  boxShadow: "0px 14px 34px 0px #78EB5473",
                },
                "&:hover::before": {
                  left: 0,
                },
              }}
            >
              <span style={{ position: "relative", zIndex: 1 }}>
                Find Right Experts
              </span>
            </Button>
          </div>

          {/* Right Visual */}
          <div className="flex-1 flex justify-center w-full">
            <div className="relative w-full max-w-[500px] aspect-square rounded-[20px] overflow-hidden">
              <Image
                src="/images/resource-services/bookexpert.png"
                alt="Find Experts"
                fill
                className="object-contain"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSectionV3;
