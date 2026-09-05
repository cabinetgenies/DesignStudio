"use client";

import * as pdfjsLib from "pdfjs-dist";

let workerReady = false;

function ensureWorker() {
  if (workerReady || typeof window === "undefined") {
    return;
  }
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();
  workerReady = true;
}

export type PdfDocument = pdfjsLib.PDFDocumentProxy;

export async function loadPdfDocument(
  data: ArrayBuffer,
): Promise<PdfDocument> {
  ensureWorker();
  return pdfjsLib.getDocument({ data }).promise;
}

export interface PageMeta {
  pageNumber: number;
  widthPt: number;
  heightPt: number;
}

export async function getPageMeta(
  pdf: PdfDocument,
  pageNumber: number,
): Promise<PageMeta> {
  const page = await pdf.getPage(pageNumber);
  const viewport = page.getViewport({ scale: 1, rotation: 0 });
  return {
    pageNumber,
    widthPt: viewport.width,
    heightPt: viewport.height,
  };
}

export interface RenderedPage {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
}

export async function renderPage(
  pdf: PdfDocument,
  pageNumber: number,
  scale: number,
  rotation = 0,
): Promise<RenderedPage> {
  const page = await pdf.getPage(pageNumber);
  const viewport = page.getViewport({ scale, rotation });
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Could not create a canvas context.");
  }
  await page.render({ canvas, viewport }).promise;
  return { canvas, width: viewport.width, height: viewport.height };
}

export interface RawPdfTextItem {
  str: string;
  transform: number[];
  width: number;
  height: number;
  fontSize: number | null;
  fontName: string;
  hasEOL: boolean;
}

export async function extractPageText(
  pdf: PdfDocument,
  pageNumber: number,
): Promise<RawPdfTextItem[]> {
  const page = await pdf.getPage(pageNumber);
  const content = await page.getTextContent();
  const items: RawPdfTextItem[] = [];

  for (const item of content.items) {
    if (!("str" in item)) {
      continue;
    }
    const str = typeof item.str === "string" ? item.str : "";
    if (!str.trim()) {
      continue;
    }
    const transform = Array.isArray(item.transform)
      ? item.transform.map((value) => Number(value))
      : [];
    const width = Number(item.width ?? 0);
    const height = Number(item.height ?? 0);
    const fontSize =
      transform.length >= 2
        ? Math.hypot(transform[0], transform[1]) || null
        : null;
    items.push({
      str,
      transform,
      width,
      height,
      fontSize,
      fontName: typeof item.fontName === "string" ? item.fontName : "",
      hasEOL: Boolean(item.hasEOL),
    });
  }

  return items;
}
