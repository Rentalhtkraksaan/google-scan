import { NextRequest, NextResponse } from "next/server";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { image, folder } = body;

    if (!image) {
      return NextResponse.json({ success: false, message: "File gambar tidak ditemukan." }, { status: 400 });
    }

    const result = await uploadToCloudinary(image, folder || "outlet_logos");

    if (!result.success || !result.url) {
      return NextResponse.json({ success: false, message: result.error || "Gagal mengupload logo." }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      url: result.url,
      publicId: result.publicId,
    });
  } catch (error: unknown) {
    console.error("API Cloudinary Upload error:", error);
    return NextResponse.json(
      { success: false, message: (error as Error)?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
