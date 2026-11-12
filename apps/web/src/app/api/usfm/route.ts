import { NextRequest, NextResponse } from "next/server";
import { unzipSync } from "fflate";
import Z from "zod";
import { fetchSource } from "@/lib/bible-ingestion";
import { writeVerses } from "@/lib/bible"

const MAX_UPLOAD_BYTES = 100 * 1024 * 1024; // 100 MB
const MAX_TOTAL_UNCOMPRESSED_BYTES = 50 * 1024 * 1024;
const MAX_USFM_FILE_BYTES = 5 * 1024 * 1024;
const MAX_ARCHIVE_ENTRIES = 2_000;

interface ExtractedUsfmFile {
  filename: string;
  text: string;
}

function extractUsfmFiles(buffer: Buffer): ExtractedUsfmFile[] {
  // Decompress the ZIP archive in memory.
  const entries = unzipSync(new Uint8Array(buffer));

  const files: ExtractedUsfmFile[] = [];

  let entryCount = 0;
  let totalUncompressedBytes = 0;

  for (const [filename, content] of Object.entries(entries)) {
    entryCount++;

    if (entryCount > MAX_ARCHIVE_ENTRIES) {
      throw new Error("ZIP archive contains too many entries");
    }

    totalUncompressedBytes += content.byteLength;

    if (totalUncompressedBytes > MAX_TOTAL_UNCOMPRESSED_BYTES) {
      throw new Error("ZIP archive exceeds uncompressed size limit");
    }

    // Ignore directories and non-USFM files.
    if (filename.endsWith("/") || !filename.toLowerCase().endsWith(".usfm")) {
      continue;
    }

    if (content.byteLength > MAX_USFM_FILE_BYTES) {
      throw new Error(`USFM file is too large: ${filename}`);
    }

    let text: string;

    try {
      text = new TextDecoder("utf-8", {
        fatal: true,
      }).decode(content);
    } catch {
      throw new Error(`Invalid UTF-8 encoding in file: ${filename}`);
    }

    files.push({
      filename,
      text,
    });
  }

  if (files.length === 0) {
    throw new Error("No .usfm files found in the uploaded ZIP");
  }

  return files;
}

const requestBody = Z.object({
  url: Z.url(),
});

export async function GET(request: NextRequest) {
  const verses = await fetchSource("es-rv1909")
  await writeVerses(verses)
  return Response.json([verses[0], verses[Math.round(verses.length / 2)]])
}

export async function POST(request: NextRequest) {
  try {
    /*const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "A ZIP file is required in the 'file' field" },
        { status: 400 },
      );
    }

    if (!file.name.toLowerCase().endsWith(".zip")) {
      return NextResponse.json(
        { error: "Only ZIP files are accepted" },
        { status: 400 },
      );
    }

    if (file.size === 0 || file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { error: "ZIP file is empty or exceeds the upload size limit" },
        { status: 413 },
      );
    }*/

    const body = requestBody.parse(await request.json());
    const buffer = Buffer.from(
      await fetch(body.url).then((res) => res.bytes()),
    );
    const usfmFiles = extractUsfmFiles(buffer);

    // USFM contents are now available in memory.
    // Next step: parse the files and enqueue verse chunks.

    return NextResponse.json(usfmFiles.keys());
  } catch (error) {
    console.error("Bible ZIP upload failed:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to process ZIP file",
      },
      { status: 400 },
    );
  }
}
