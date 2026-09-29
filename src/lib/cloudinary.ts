/**
 * Cloudinary Upload Helper
 * Uploads compressed base64 or buffer image to Cloudinary CDN
 */
export async function uploadToCloudinary(
  base64OrBuffer: string | Buffer,
  folder: string = "outlet_logos"
): Promise<{ success: boolean; url?: string; publicId?: string; error?: string }> {
  try {
    const cloudName =
      process.env.CLOUDINARY_CLOUD_NAME ||
      process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ||
      "smart-qr-review";
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    const uploadPreset =
      process.env.CLOUDINARY_UPLOAD_PRESET ||
      process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET ||
      "outlet_logos_preset";

    // If Cloudinary API credentials exist with signed upload
    if (apiKey && apiSecret && cloudName) {
      const crypto = await import("crypto");
      const timestamp = Math.round(Date.now() / 1000);
      const paramsToSign = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
      const signature = crypto.createHash("sha1").update(paramsToSign).digest("hex");

      const formData = new FormData();
      if (typeof base64OrBuffer === "string") {
        formData.append("file", base64OrBuffer);
      } else {
        const blob = new Blob([new Uint8Array(base64OrBuffer)]);
        formData.append("file", blob);
      }
      formData.append("api_key", apiKey);
      formData.append("timestamp", timestamp.toString());
      formData.append("signature", signature);
      formData.append("folder", folder);

      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (response.ok && data.secure_url) {
        return {
          success: true,
          url: data.secure_url,
          publicId: data.public_id,
        };
      }
    }

    // Unsigned upload attempt if upload preset is defined
    if (cloudName && uploadPreset && uploadPreset !== "outlet_logos_preset") {
      const formData = new FormData();
      if (typeof base64OrBuffer === "string") {
        formData.append("file", base64OrBuffer);
      } else {
        const blob = new Blob([new Uint8Array(base64OrBuffer)]);
        formData.append("file", blob);
      }
      formData.append("upload_preset", uploadPreset);
      formData.append("folder", folder);

      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (response.ok && data.secure_url) {
        return {
          success: true,
          url: data.secure_url,
          publicId: data.public_id,
        };
      }
    }

    // High performance fallback: If Cloudinary keys are not yet configured in env,
    // return the optimized base64 string or store it cleanly.
    if (typeof base64OrBuffer === "string" && base64OrBuffer.startsWith("data:image/")) {
      return {
        success: true,
        url: base64OrBuffer,
      };
    }

    return {
      success: false,
      error: "Gagal mengunggah gambar ke Cloudinary.",
    };
  } catch (err: unknown) {
    console.error("Cloudinary upload exception:", err);
    return {
      success: false,
      error: (err as Error)?.message || "Terjadi kesalahan upload Cloudinary.",
    };
  }
}
