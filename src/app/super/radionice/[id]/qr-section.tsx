"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { hr } from "@/messages/hr";

export function QrSection({ slug }: { slug: string }) {
  const [url, setUrl] = useState("");
  const [pngDataUrl, setPngDataUrl] = useState<string | null>(null);
  const [svgMarkup, setSvgMarkup] = useState<string | null>(null);

  useEffect(() => {
    async function run() {
      const bookingUrl = `${window.location.origin}/r/${slug}`;
      setUrl(bookingUrl);
      const [png, svg] = await Promise.all([
        QRCode.toDataURL(bookingUrl, { width: 512, margin: 2 }),
        QRCode.toString(bookingUrl, { type: "svg", width: 512, margin: 2 }),
      ]);
      setPngDataUrl(png);
      setSvgMarkup(svg);
    }

    void run();
  }, [slug]);

  function downloadSvg() {
    if (!svgMarkup) return;
    const blob = new Blob([svgMarkup], { type: "image/svg+xml" });
    downloadBlob(blob, `${slug}-qr.svg`);
  }

  function downloadPng() {
    if (!pngDataUrl) return;
    const link = document.createElement("a");
    link.href = pngDataUrl;
    link.download = `${slug}-qr.png`;
    link.click();
  }

  function openPrintSticker() {
    if (!svgMarkup) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`<!doctype html>
<html><head><title>${slug}</title>
<style>
  @page { size: A5; margin: 0; }
  body { margin: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; font-family: sans-serif; text-align: center; }
  svg { width: 60vw; max-width: 400px; }
  p { font-size: 1.4rem; margin-top: 1.5rem; }
</style>
</head><body>${svgMarkup}<p>${hr.super.qr.printCta}</p></body></html>`);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold">{hr.super.qr.title}</h2>
      <p className="mt-1 break-all text-sm text-muted-foreground">{url}</p>

      {pngDataUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={pngDataUrl} alt={hr.super.qr.title} className="mt-3 size-48" />
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="outline" onClick={downloadSvg} disabled={!svgMarkup}>
          {hr.super.qr.downloadSvg}
        </Button>
        <Button variant="outline" onClick={downloadPng} disabled={!pngDataUrl}>
          {hr.super.qr.downloadPng}
        </Button>
        <Button onClick={openPrintSticker} disabled={!svgMarkup}>
          {hr.super.qr.printSticker}
        </Button>
      </div>
    </Card>
  );
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
