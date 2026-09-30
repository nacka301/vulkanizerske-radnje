import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Vulkanizer - online naručivanje termina za zamjenu guma";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Slika za pregled linka (WhatsApp, Messenger, Facebook...) kad se /login
// dijeli vulkanizerima. Zamjenjuje default Vercel/Next prazan pregled
// jednostavnom grafikom gume + naslovom, da se odmah vidi o čemu se radi
// bez otvaranja linka.
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 80px",
          background:
            "radial-gradient(circle at 15% 50%, #27150a 0%, #0a0a0a 55%)",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", maxWidth: 640 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              marginBottom: 28,
            }}
          >
            <div
              style={{
                width: 14,
                height: 14,
                borderRadius: "50%",
                background: "#ea580c",
                display: "flex",
              }}
            />
            <div
              style={{
                fontSize: 30,
                color: "#f97316",
                fontWeight: 700,
                letterSpacing: -0.5,
                display: "flex",
              }}
            >
              Vulkanizer online
            </div>
          </div>
          <div
            style={{
              fontSize: 60,
              fontWeight: 800,
              color: "#fafafa",
              lineHeight: 1.15,
              display: "flex",
              marginBottom: 22,
            }}
          >
            Naručivanje termina za zamjenu guma
          </div>
          <div
            style={{
              fontSize: 30,
              color: "#d4d4d8",
              lineHeight: 1.4,
              display: "flex",
            }}
          >
            Klijent bira termin online - bez telefona koji zvoni cijeli dan
          </div>
        </div>

        <div
          style={{
            width: 380,
            height: 380,
            borderRadius: "50%",
            background: "#0a0a0a",
            border: "26px solid #e4e4e7",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: 210,
              height: 210,
              borderRadius: "50%",
              background: "#27272a",
              border: "10px solid #71717a",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                width: 70,
                height: 70,
                borderRadius: "50%",
                background: "#ea580c",
                display: "flex",
              }}
            />
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
