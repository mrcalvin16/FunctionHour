import { ImageResponse } from "next/og";
import { functionHourIconData } from "@/lib/functionHourIconData";

export const runtime = "edge";
export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    <img src={functionHourIconData} width="512" height="512" alt="Function Hour" />,
    { ...size },
  );
}
