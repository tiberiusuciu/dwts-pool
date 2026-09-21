import { ImageResponse } from "next/og";

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
          background: "#07041a",
        }}
      >
        <div
          style={{
            width: 132,
            height: 132,
            borderRadius: 999,
            background:
              "radial-gradient(circle at 32% 28%, #ffffff 0%, #f3e8ff 35%, #e8b4d8 70%, #c83cd3 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 0 0 6px #160b36",
          }}
        />
      </div>
    ),
    { ...size },
  );
}
