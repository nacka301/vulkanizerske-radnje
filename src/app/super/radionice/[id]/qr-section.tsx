"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Check, Copy, ExternalLink, Link as LinkIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { hr } from "@/messages/hr";

export function QrSection({ slug }: { slug: string }) {
  const [url, setUrl] = useState("");
  const [pngDataUrl, setPngDataUrl] = useState<string | null>(null);
  const [svgMarkup, setSvgMarkup] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

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

  async function handleCopy() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard API moze biti nedostupna (http, dozvole) — tiho ignoriraj.
    }
  }

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

      <div className="mt-3 flex items-center gap-2 rounded-lg border border-border/60 bg-muted/40 px-3 py-2.5">
        <LinkIcon className="size-4 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1 truncate font-mono text-sm">{url || "…"}</span>
        <Button type="button" variant="outline" size="sm" onClick={() => void handleCopy()} disabled={!url}>
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          {copied ? hr.admin.settings.linkCopied : hr.admin.settings.linkCopy}
        </Button>
      </div>

      <Button
        type="button"
        variant="secondary"
        className="mt-3"
        disabled={!url}
        onClick={() => window.open(url, "_blank", "noopener,noreferrer")}
      >
        <ExternalLink className="size-4" />
        {hr.admin.settings.viewAsClient}
      </Button>

      {pngDataUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={pngDataUrl} alt={hr.super.qr.title} className="mt-4 size-48" />
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
