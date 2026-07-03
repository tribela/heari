import { ImageResponse } from "next/og";

export const alt = "헤아리 - 초성으로 단어를 헤아리기";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "linear-gradient(135deg, #1a1a2e 0%, #2d2d5e 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <span
        style={{
          fontSize: 120,
          fontWeight: 800,
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        헤아리
      </span>
      <span
        style={{
          fontSize: 36,
          color: "rgba(255,255,255,0.7)",
          fontFamily: "sans-serif",
          marginTop: 20,
        }}
      >
        초성으로 단어를 헤아리기
      </span>
    </div>,
    { ...size },
  );
}
