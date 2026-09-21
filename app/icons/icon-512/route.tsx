import { ImageResponse } from "next/og";

export const runtime = "edge";
export const contentType = "image/png";
export const size = { width: 512, height: 512 };

export function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#07041a",
        }}
      >
        <div
          style={{
            width: 400,
            height: 400,
            borderRadius: 999,
            background:
              "radial-gradient(circle at 32% 28%, #ffffff 0%, #f3e8ff 35%, #e8b4d8 70%, #c83cd3 100%)",
            boxShadow: "0 0 0 20px #160b36",
          }}
        />
      </div>
    ),
    { ...size },
  );
}
