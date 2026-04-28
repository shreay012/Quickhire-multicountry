"use client";

import Image from "next/image";
import { useState } from "react";
import Link from "next/link";

const VibeCoding = () => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <section className="py-12 px-4 sm:py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-lg p-6 sm:p-8 md:p-12 flex flex-col lg:flex-row items-center justify-between gap-8 sm:gap-12">
          {/* Left Content */}
          <div className="flex-1 text-center lg:text-left">
            <h2
              style={{
                color: "#404040",
                fontWeight: "var( --font-weight-700)",
                fontSize: "clamp(28px, 6vw, 58px)",
              }}
            >
              Not sure what
            </h2>
            <h2
              style={{
                color: "var(--quickhire-green)",
                fontWeight: "var( --font-weight-700)",
                fontSize: "clamp(28px, 6vw, 58px)",
              }}
              className="mb-1 sm:mb-4"
            >
              you need?
            </h2>
            <p
              className="mb-6 sm:mb-8 max-w-md mx-auto lg:mx-0"
              style={{
                color: "#636363",
                fontWeight: 400,
                fontSize: "clamp(14px, 3vw, 23px)",
              }}
            >
              Tell us what you're trying to build or fix, and we'll match you
              with the right expert.
            </p>

            <Link href="/book-your-resource" style={{ textDecoration: "none" }}>
              <button
                className="text-white font-semibold px-6 sm:px-8 py-2.5 sm:py-3 rounded-lg"
                style={{
                  background:
                    "linear-gradient(to right, #26472B 50%, #45A735 50%)",
                  backgroundSize: "200% 100%",
                  backgroundPosition: "right bottom",
                  // boxShadow: "0px 14px 34px 0px #78EB5473",
                  transition:
                    "background-position 0.3s ease-out, box-shadow 0.3s ease",
                  border: "none",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundPosition = "left bottom";
                  e.currentTarget.style.boxShadow =
                    "0px 14px 34px 0px #78EB5473";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundPosition = "right bottom";
                  e.currentTarget.style.boxShadow = "";
                }}
              >
                Find Right Expert
              </button>
            </Link>
          </div>

          {/* Right Content - Profile Images */}
          <div className="flex-1 relative w-full min-h-[250px] sm:min-h-[300px] md:min-h-[400px]">
            <Image
              src="/images/vibe-coding.png"
              alt="Vibe Coding Team - Rohan and Akansha"
              width={600}
              height={400}
              className="w-full h-auto object-contain"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default VibeCoding;
