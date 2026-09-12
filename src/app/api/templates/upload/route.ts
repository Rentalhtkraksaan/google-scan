import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { Role } from "@prisma/client";
import { promises as fs } from "fs";
import path from "path";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== Role.SUPER_ADMIN) {
      return NextResponse.json(
        { success: false, message: "Akses ditolak: Hanya Super Admin yang diizinkan mengunggah template." },
        { status: 403 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const sizeKey = (formData.get("sizeKey") as string) || "template";

    if (!file) {
      return NextResponse.json(
        { success: false, message: "File gambar template tidak ditemukan." },
        { status: 400 }
      );
    }

    // Validate mime type
    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, message: "Format file tidak didukung. Harap gunakan file PNG, JPG, atau WEBP." },
        { status: 400 }
      );
    }

    // Limit size to 10MB
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, message: "Ukuran file terlalu besar. Maksimal 10MB." },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Convert to Base64 to bypass Vercel read-only file system
    const base64Data = buffer.toString("base64");
    const mimeType = file.type;
    const publicUrl = `data:${mimeType};base64,${base64Data}`;

    return NextResponse.json({
      success: true,
      message: "Template background berhasil diunggah!",
      url: publicUrl,
    });
  } catch (error) {
    console.error("Upload template error:", error);
    const msg = error instanceof Error ? error.message : "Gagal mengunggah file template.";
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}
