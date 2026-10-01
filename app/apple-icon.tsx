import { ImageResponse } from "next/og";
import { functionHourIconData } from "@/lib/functionHourIconData";

export const runtime = "edge";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    <img src={functionHourIconData} width="180" height="180" alt="Function Hour" />,
    { ...size },
  );
}
