import { ImageResponse } from "next/og";

import {
  BRAND_MARK_BAR,
  BRAND_MARK_BAR_STROKE,
  BRAND_MARK_PATH_FORWARD,
  BRAND_MARK_PATH_MIRROR,
  BRAND_MARK_S_STROKE,
  BRAND_MARK_VIEWBOX,
} from "@/components/brand/logo";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Story of a Stock — research platform";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          padding: "80px",
          backgroundImage:
            "linear-gradient(135deg, #0f172a 0%, #064e3b 55%, #0c4a6e 100%)",
          color: "#f8fafc",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 132,
            height: 132,
            borderRadius: 28,
            backgroundColor: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.18)",
          }}
        >
          <svg width="100" height="100" viewBox={BRAND_MARK_VIEWBOX}>
            <g
              fill="none"
              stroke="#f8fafc"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line
                x1={BRAND_MARK_BAR.x}
                y1={BRAND_MARK_BAR.y1}
                x2={BRAND_MARK_BAR.x}
                y2={BRAND_MARK_BAR.y2}
                strokeWidth={BRAND_MARK_BAR_STROKE}
              />
              <path
                d={BRAND_MARK_PATH_FORWARD}
                strokeWidth={BRAND_MARK_S_STROKE}
              />
              <path
                d={BRAND_MARK_PATH_MIRROR}
                strokeWidth={BRAND_MARK_S_STROKE}
              />
            </g>
          </svg>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: "auto",
          }}
        >
          <div
            style={{
              fontSize: 22,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.16em",
              color: "#94a3b8",
            }}
          >
            Research platform
          </div>
          <div
            style={{
              fontSize: 104,
              fontWeight: 900,
              letterSpacing: "-0.04em",
              lineHeight: 1,
              marginTop: 18,
            }}
          >
            Story of a Stock
          </div>
          <div
            style={{
              fontSize: 30,
              color: "#cbd5e1",
              marginTop: 24,
              maxWidth: 880,
            }}
          >
            Extracting the best signals from concalls.
          </div>
        </div>
      </div>
    ),
    size,
  );
}
