const CLOUD = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

/** Perkecil gambar di sisi klien sebelum diunggah agar hemat kuota. */
async function downscale(file: File, maxSide = 1280, quality = 0.85): Promise<Blob> {
  if (!file.type.startsWith("image/")) return file;
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
    if (scale === 1 && file.size < 600_000) return file;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob: Blob | null = await new Promise((res) => canvas.toBlob(res, "image/jpeg", quality));
    return blob ?? file;
  } catch {
    return file;
  }
}

export async function uploadImage(file: File): Promise<string> {
  if (!CLOUD || !PRESET) throw new Error("Cloudinary belum dikonfigurasi.");
  const body = new FormData();
  body.append("file", await downscale(file));
  body.append("upload_preset", PRESET);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/image/upload`, { method: "POST", body });
  if (!res.ok) {
    let msg = "Gagal mengunggah foto.";
    try {
      const j = await res.json();
      if (j?.error?.message) msg = `Gagal mengunggah foto: ${j.error.message}`;
    } catch {}
    throw new Error(msg);
  }
  const json = await res.json();
  return json.secure_url as string;
}
