import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const size = Math.min(512, Math.max(48, parseInt(searchParams.get("size") ?? "192", 10)));

  return new ImageResponse(
    (
      <div
        style={{
          width: size,
          height: size,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#FAF7F2",
          borderRadius: size * 0.22,
        }}
      >
        <div
          style={{
            width: size * 0.55,
            height: size * 0.55,
            borderRadius: "50%",
            border: `${Math.max(2, size * 0.04)}px solid #C47D2A`,
            background: "transparent",
          }}
        />
      </div>
    ),
    { width: size, height: size }
  );
}
