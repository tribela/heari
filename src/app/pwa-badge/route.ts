import { ImageResponse } from "next/og";
import { createElement } from "react";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const size = Math.min(Math.max(parseInt(searchParams.get("size") || "96"), 16), 1024);

  return new ImageResponse(
    createElement(
      "div",
      {
        style: {
          width: "100%",
          height: "100%",
          background: "transparent",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        },
      },
      createElement(
        "span",
        {
          style: {
            fontSize: size * 0.5,
            fontWeight: 800,
            color: "white",
            fontFamily: "sans-serif",
          },
        },
        "헤",
      ),
    ),
    { width: size, height: size },
  );
}
