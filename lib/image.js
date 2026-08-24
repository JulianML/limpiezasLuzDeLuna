import sharp from "sharp";

const THUMBNAIL_WIDTH = 480;
const THUMBNAIL_QUALITY = 62;

function parseDataUrl(dataUrl) {
  const match = /^data:([^;]+);base64,(.+)$/s.exec(String(dataUrl || ""));
  if (!match) return null;
  return { mime: match[1], buffer: Buffer.from(match[2], "base64") };
}

/**
 * Genera una miniatura ligera (ancho fijo, JPEG comprimido) a partir de un
 * data: URL de imagen. Se usa para los listados (público y backoffice), que
 * no pueden permitirse la imagen original completa sin superar el límite de
 * 6 MB de payload de las Netlify Functions cuando hay varias decenas de
 * entradas. Devuelve "" si la entrada no es una imagen válida.
 */
export async function generateThumbnailDataUrl(imageDataUrl) {
  const parsed = parseDataUrl(imageDataUrl);
  if (!parsed) return "";
  try {
    const out = await sharp(parsed.buffer)
      .resize({ width: THUMBNAIL_WIDTH, withoutEnlargement: true })
      .jpeg({ quality: THUMBNAIL_QUALITY })
      .toBuffer();
    return `data:image/jpeg;base64,${out.toString("base64")}`;
  } catch (err) {
    console.error("generateThumbnailDataUrl error:", err);
    return "";
  }
}
