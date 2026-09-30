import { ImageResponse } from "next/og";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

// Favicon: jednostavna guma (crni prsten + narančasto središte, brend boja
// iz globals.css --primary) umjesto default Next.js/Vercel trokuta, da se
// link razlikuje od "genericke" aplikacije u pregledima (WhatsApp,
// Messenger...).
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#18181b",
          borderRadius: "50%",
        }}
      >
        <div
          style={{
            width: 46,
            height: 46,
            borderRadius: "50%",
            background: "#0a0a0a",
            border: "6px solid #e4e4e7",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: 16,
              height: 16,
              borderRadius: "50%",
              background: "#ea580c",
            }}
          />
        </div>
      </div>
    ),
    { ...size }
  );
}
