import { ImageResponse } from "next/og";

import {
  BRAND_MARK_BAR,
  BRAND_MARK_BAR_STROKE,
  BRAND_MARK_PATH_FORWARD,
  BRAND_MARK_PATH_MIRROR,
  BRAND_MARK_S_STROKE,
  BRAND_MARK_VIEWBOX,
} from "@/components/brand/logo";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundImage:
            "linear-gradient(135deg, #0f172a 0%, #064e3b 55%, #0c4a6e 100%)",
        }}
      >
        <svg width="120" height="120" viewBox={BRAND_MARK_VIEWBOX}>
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
    ),
    size,
  );
}
