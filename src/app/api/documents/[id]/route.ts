import { NextResponse, type NextRequest } from "next/server";
import { getDocumentForDownload } from "@/lib/services/document.service";
import { readFile } from "@/lib/storage";
import { toErrorResponse } from "@/lib/api/errors";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const document = await getDocumentForDownload(id);
    const buffer = await readFile(document.filePath);

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": document.fileType,
        "Content-Disposition": `inline; filename="${document.fileName.replace(/"/g, "")}"`,
        "Content-Length": String(document.fileSizeBytes),
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}
