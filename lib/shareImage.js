"use client";

// Client-side only — builds a shareable PNG (card art + reading text +
// branding) on a canvas, then opens the native share sheet on mobile or
// downloads the file directly on desktop. No server involved: nothing to
// pay for, no image-generation service, matches the "keep it free" call.

const WIDTH = 1080;
const HEIGHT = 1350; // Instagram-portrait-friendly aspect ratio

function wrapText(ctx, text, maxWidth) {
  const words = text.split(/\s+/);
  const lines = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export async function buildShareImage({ cardSrc, cardName, text }) {
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext("2d");

  // Background — the same warm gold-on-near-black used throughout the chat
  const bg = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  bg.addColorStop(0, "#0d0b09");
  bg.addColorStop(1, "#0a0908");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  const glow = ctx.createRadialGradient(WIDTH / 2, 0, 0, WIDTH / 2, 0, WIDTH);
  glow.addColorStop(0, "rgba(230,178,60,0.18)");
  glow.addColorStop(1, "rgba(230,178,60,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.textAlign = "center";
  ctx.fillStyle = "#e3c98a";
  ctx.font = "600 44px Georgia, serif";
  ctx.fillText("Ginni Ki Baatein", WIDTH / 2, 100);

  let cardBottom = 220;
  try {
    const img = await loadImage(cardSrc);
    const cardW = 340;
    const cardH = cardW * (img.height / img.width);
    const cardX = (WIDTH - cardW) / 2;
    const cardY = 150;
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.55)";
    ctx.shadowBlur = 40;
    ctx.drawImage(img, cardX, cardY, cardW, cardH);
    ctx.restore();
    ctx.strokeStyle = "rgba(230,178,60,0.4)";
    ctx.lineWidth = 3;
    ctx.strokeRect(cardX, cardY, cardW, cardH);
    cardBottom = cardY + cardH;
  } catch {
    // Card art failed to load (shouldn't happen for a same-origin image,
    // but never let that block the share) — just skip straight to text.
  }

  let y = cardBottom + 70;
  ctx.fillStyle = "#c9a24d";
  ctx.font = "italic 38px Georgia, serif";
  ctx.fillText(cardName, WIDTH / 2, y);

  y += 60;
  ctx.fillStyle = "#f4ede0";
  ctx.font = "30px Georgia, serif";
  ctx.textAlign = "left";
  const maxWidth = WIDTH - 160;
  const lineHeight = 44;
  const maxLines = Math.floor((HEIGHT - y - 110) / lineHeight);
  const lines = wrapText(ctx, text, maxWidth);
  const shown = lines.slice(0, maxLines);
  for (const line of shown) {
    ctx.fillText(line, 80, y);
    y += lineHeight;
  }
  if (lines.length > shown.length) ctx.fillText("…", 80, y);

  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(230,178,60,0.6)";
  ctx.font = "24px Georgia, serif";
  ctx.fillText("thedivinetarotonline.com", WIDTH / 2, HEIGHT - 50);

  return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
}

export async function shareOrDownloadImage(blob, filename = "ginni-reading.png") {
  if (typeof File !== "undefined" && navigator.canShare) {
    const file = new File([blob], filename, { type: "image/png" });
    if (navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: "My Ginni Ki Baatein reading" });
        return;
      } catch {
        // Cancelled or unsupported mid-call — fall through to a direct download.
      }
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
