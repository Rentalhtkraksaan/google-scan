"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { sendWebPushToSuperAdmins } from "@/lib/web-push";

/**
 * Auto-seeds default products if database has none
 */
async function ensureDefaultProducts() {
  const count = await prisma.resellerProduct.count();
  if (count === 0) {
    await prisma.resellerProduct.createMany({
      data: [
        {
          name: "Kartu Akrilik Standar (c-Series)",
          description: "Kartu QR Akrilik Meja ukuran standar (8.5 x 5.5 cm) dengan chip NFC ntag213 & dynamic QR code anti air dan tahan gores.",
          price: 25000,
          retailPrice: 49000,
          minOrder: 8,
          unit: "pcs",
          isActive: true,
          sortOrder: 1,
          imageUrl: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=600&auto=format&fit=crop&q=80",
        },
        {
          name: "Kartu Akrilik Standee Besar",
          description: "Kartu QR Akrilik Standee Meja ukuran lebih besar (10 x 7 cm) dengan visibilitas ulasan lebih mencolok untuk meja kasir & resto ramai.",
          price: 28000,
          retailPrice: 55000,
          minOrder: 8,
          unit: "pcs",
          isActive: true,
          sortOrder: 2,
          imageUrl: "https://images.unsplash.com/photo-1556742049-0a67c5576839?w=600&auto=format&fit=crop&q=80",
        },
      ],
    });
  } else {
    // Pastikan produk yang sudah ada terisi retailPrice jika masih kosong
    await prisma.resellerProduct.updateMany({
      where: { retailPrice: null },
      data: { retailPrice: 49000 },
    }).catch(() => {});
  }
}

/**
 * 1. Ambil Katalog Produk Reseller
 */
export async function getResellerProductsAction(onlyActive: boolean = true) {
  try {
    await ensureDefaultProducts();

    const products = await prisma.resellerProduct.findMany({
      where: onlyActive ? { isActive: true } : undefined,
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });

    return { success: true, data: products };
  } catch (error) {
    console.error("getResellerProductsAction error:", error);
    return { success: false, message: "Gagal memuat katalog produk reseller.", data: [] };
  }
}

/**
 * 2. Super Admin 1: Tambah Produk Reseller Baru
 */
export async function createResellerProductAction(data: {
  name: string;
  description?: string;
  imageUrl?: string;
  price: number;
  retailPrice?: number;
  minOrder?: number;
  unit?: string;
}) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "SUPER_ADMIN" || !session.user.isSuperAdminMaster) {
      return { success: false, message: "Akses ditolak: Hanya Super Admin 1 (Master) yang dapat menambah produk." };
    }

    if (!data.name || !data.price) {
      return { success: false, message: "Nama produk dan harga wajib diisi." };
    }

    const maxSort = await prisma.resellerProduct.aggregate({ _max: { sortOrder: true } });
    const nextSort = (maxSort._max.sortOrder || 0) + 1;

    const product = await prisma.resellerProduct.create({
      data: {
        name: data.name.trim(),
        description: data.description?.trim() || "",
        imageUrl: data.imageUrl || null,
        price: Number(data.price),
        retailPrice: data.retailPrice !== undefined ? Number(data.retailPrice) : 49000,
        minOrder: Number(data.minOrder) || 8,
        unit: data.unit?.trim() || "pcs",
        sortOrder: nextSort,
        isActive: true,
      },
    });

    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        userName: session.user.name || "Super Admin 1",
        userRole: "SUPER_ADMIN",
        action: "CREATE",
        title: "Tambah Produk Reseller Baru 📦",
        description: `Super Admin 1 menambahkan produk baru "${product.name}" dengan harga Rp ${product.price.toLocaleString("id-ID")}/${product.unit} (Min. ${product.minOrder} ${product.unit}).`,
        targetId: product.id,
        targetName: product.name,
      },
    }).catch(() => {});

    revalidatePath("/super-admin");
    revalidatePath("/admin");

    return { success: true, message: `Produk "${product.name}" berhasil ditambahkan ke katalog.`, data: product };
  } catch (error) {
    console.error("createResellerProductAction error:", error);
    return { success: false, message: "Gagal menambahkan produk baru." };
  }
}

/**
 * 3. Super Admin 1: Update Produk Reseller
 */
export async function updateResellerProductAction(
  id: string,
  data: {
    name?: string;
    description?: string;
    imageUrl?: string;
    price?: number;
    retailPrice?: number;
    minOrder?: number;
    unit?: string;
    isActive?: boolean;
    sortOrder?: number;
  }
) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "SUPER_ADMIN" || !session.user.isSuperAdminMaster) {
      return { success: false, message: "Akses ditolak: Hanya Super Admin 1 (Master) yang dapat mengedit produk." };
    }

    const existing = await prisma.resellerProduct.findUnique({ where: { id } });
    if (!existing) {
      return { success: false, message: "Produk tidak ditemukan." };
    }

    const updated = await prisma.resellerProduct.update({
      where: { id },
      data: {
        name: data.name !== undefined ? data.name.trim() : undefined,
        description: data.description !== undefined ? data.description.trim() : undefined,
        imageUrl: data.imageUrl !== undefined ? data.imageUrl : undefined,
        price: data.price !== undefined ? Number(data.price) : undefined,
        retailPrice: data.retailPrice !== undefined ? Number(data.retailPrice) : undefined,
        minOrder: data.minOrder !== undefined ? Number(data.minOrder) : undefined,
        unit: data.unit !== undefined ? data.unit.trim() : undefined,
        isActive: data.isActive !== undefined ? Boolean(data.isActive) : undefined,
        sortOrder: data.sortOrder !== undefined ? Number(data.sortOrder) : undefined,
      },
    });

    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        userName: session.user.name || "Super Admin 1",
        userRole: "SUPER_ADMIN",
        action: "UPDATE",
        title: "Perbarui Produk Reseller ✏️",
        description: `Super Admin 1 memperbarui informasi produk "${updated.name}".`,
        targetId: updated.id,
        targetName: updated.name,
      },
    }).catch(() => {});

    revalidatePath("/super-admin");
    revalidatePath("/admin");

    return { success: true, message: `Produk "${updated.name}" berhasil diperbarui.`, data: updated };
  } catch (error) {
    console.error("updateResellerProductAction error:", error);
    return { success: false, message: "Gagal memperbarui produk." };
  }
}

/**
 * 4. Super Admin 1: Hapus Produk Reseller
 */
export async function deleteResellerProductAction(id: string) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "SUPER_ADMIN" || !session.user.isSuperAdminMaster) {
      return { success: false, message: "Akses ditolak: Hanya Super Admin 1 (Master) yang dapat menghapus produk." };
    }

    const existing = await prisma.resellerProduct.findUnique({ where: { id } });
    if (!existing) {
      return { success: false, message: "Produk tidak ditemukan." };
    }

    await prisma.resellerProduct.delete({ where: { id } });

    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        userName: session.user.name || "Super Admin 1",
        userRole: "SUPER_ADMIN",
        action: "DELETE",
        title: "Hapus Produk Reseller 🗑️",
        description: `Super Admin 1 menghapus produk "${existing.name}" dari katalog kemitraan.`,
        targetId: existing.id,
        targetName: existing.name,
      },
    }).catch(() => {});

    revalidatePath("/super-admin");
    revalidatePath("/admin");

    return { success: true, message: `Produk "${existing.name}" berhasil dihapus.` };
  } catch (error) {
    console.error("deleteResellerProductAction error:", error);
    return { success: false, message: "Gagal menghapus produk." };
  }
}

import bcrypt from "bcryptjs";

/**
 * Sanitasi string input untuk mencegah XSS, SQLi, PHP injection, dan phishing file payload.
 */
function sanitizeInputText(input?: string | null, maxLength: number = 255): string {
  if (!input) return "";
  let clean = input.trim();
  // Strip PHP tags and code execution blocks
  clean = clean.replace(/<\?php[\s\S]*?\?>/gi, "");
  clean = clean.replace(/<\?[\s\S]*?\?>/gi, "");
  clean = clean.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "");
  clean = clean.replace(/<[^>]+>/g, ""); // Strip all HTML tags
  // Remove dangerous executable / phishing strings & php function keywords
  clean = clean.replace(/(eval\s*\(|base64_decode|system\s*\(|exec\s*\(|passthru|shell_exec|phpinfo|popen|proc_open)/gi, "");
  // Remove executable extensions embedded in names or suspicious URLs
  clean = clean.replace(/\.(php|phtml|php3|php4|php5|phps|phar|exe|sh|bat|cmd|vbs|cgi|pl)\b/gi, "");
  return clean.slice(0, maxLength).trim();
}

/**
 * Validasi ketat foto struk bukti transfer untuk mencegah upload file PHP / script berbahaya
 */
function validateReceiptImage(receiptUrlOrBase64?: string | null): boolean {
  if (!receiptUrlOrBase64) return true; // Opsional jika belum diupload
  const str = receiptUrlOrBase64.trim().toLowerCase();
  
  // Cegah injeksi ekstensi PHP atau script di nama/URL file
  if (
    str.includes(".php") ||
    str.includes(".phtml") ||
    str.includes(".exe") ||
    str.includes(".sh") ||
    str.includes("<script") ||
    str.includes("<?php")
  ) {
    return false;
  }

  // Jika berupa data URL base64, pastikan hanya MIME image yang sah
  if (str.startsWith("data:")) {
    const validMime = /^data:image\/(jpeg|jpg|png|webp);base64,/i;
    return validMime.test(receiptUrlOrBase64.trim());
  }

  // Jika berupa URL (Cloudinary / CDN), pastikan protokol valid http/https
  if (str.startsWith("http://") || str.startsWith("https://")) {
    return true;
  }

  return false;
}

/**
 * Generator Kode Unik Pesanan 6 Karakter (contoh: AP2AC6, AP8K9Z)
 * Awalan 'AP' diikuti 4 karakter alfanumerik acak
 */
export async function generateUniqueOrderCode(): Promise<string> {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  for (let attempt = 0; attempt < 25; attempt++) {
    let suffix = "";
    for (let j = 0; j < 4; j++) {
      suffix += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const code = `AP${suffix}`;
    const existing = await prisma.resellerOrder.findUnique({
      where: { orderNumber: code },
      select: { id: true },
    });
    if (!existing) {
      return code;
    }
  }
  return `AP${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
}

/**
 * 5. Reseller / Mitra Lapangan: Checkout Keranjang Paket Grosir Reseller (Wajib Min 8 pcs)
 */
export async function createResellerOrderAction(data: {
  items: { productId: string; quantity: number }[];
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  shippingAddress?: string;
  notes?: string;
  paymentMethod: "MIDTRANS_QRIS" | "MANUAL_BANK_BNI";
  receiptImageUrl?: string;
  affiliateCode?: string;
}) {
  try {
    const session = await auth();
    const isAdminUser = session && session.user && (session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN");

    // Sanitasi input teks dari script injection / phishing PHP
    const sanitizedName = sanitizeInputText(data.customerName, 80);
    const sanitizedPhone = sanitizeInputText(data.customerPhone, 20).replace(/[^0-9+]/g, "");
    const sanitizedEmail = sanitizeInputText(data.customerEmail, 100).toLowerCase();
    const sanitizedAddress = sanitizeInputText(data.shippingAddress, 500);
    const sanitizedNotes = sanitizeInputText(data.notes, 300);

    if (data.receiptImageUrl && !validateReceiptImage(data.receiptImageUrl)) {
      return { success: false, message: "File struk bukti transfer tidak valid atau berbahaya. Gunakan file gambar JPG, PNG, atau WEBP." };
    }

    if (!data.items || data.items.length === 0) {
      return { success: false, message: "Keranjang belanja paket reseller masih kosong." };
    }

    const totalQuantity = data.items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
    if (totalQuantity < 8) {
      return { success: false, message: `Pemesanan paket reseller wajib minimal 8 pcs (saat ini ${totalQuantity} pcs).` };
    }

    if (!sanitizedName || !sanitizedPhone || !sanitizedEmail) {
      return { success: false, message: "Nama, No. WhatsApp, dan Email wajib diisi dengan lengkap dan valid." };
    }

    // Ambil produk dari database untuk kalkulasi harga akurat
    const productIds = data.items.map((i) => i.productId);
    const dbProducts = await prisma.resellerProduct.findMany({
      where: { id: { in: productIds } },
    });

    const productMap = new Map(dbProducts.map((p) => [p.id, p]));

    let calculatedSubtotal = 0;
    const orderItemsData: {
      productId: string;
      productName: string;
      productPrice: number;
      quantity: number;
      subtotal: number;
    }[] = [];

    for (const item of data.items) {
      const p = productMap.get(item.productId);
      if (!p) continue;
      const qty = Number(item.quantity) || 0;
      if (qty <= 0) continue;
      const lineTotal = p.price * qty;
      calculatedSubtotal += lineTotal;
      orderItemsData.push({
        productId: p.id,
        productName: p.name,
        productPrice: p.price,
        quantity: qty,
        subtotal: lineTotal,
      });
    }

    if (orderItemsData.length === 0) {
      return { success: false, message: "Produk yang dipilih tidak valid." };
    }

    const siteSetting = await prisma.siteSetting.findUnique({ where: { id: "default" } });
    const shippingFee = 0; // Bebas ongkir untuk pesanan grosir reseller (ongkir dibebankan / diurus sendiri oleh reseller)
    const vipDiscountPerCard = siteSetting?.resellerVipDiscountPerCard ?? 5000;

    // Verifikasi Kode Referral Affiliate jika ada (Pesanan Reseller mendapat komisi 50% dari rate normal)
    let validAffiliateCode: string | null = null;
    let affiliateCommission = 0;

    if (data.affiliateCode && data.affiliateCode.trim()) {
      const cleanRef = data.affiliateCode.trim().toUpperCase();
      const affiliate = await prisma.affiliateAccount.findUnique({
        where: { referralCode: cleanRef },
      });

      if (affiliate && affiliate.status === "ACTIVE") {
        validAffiliateCode = affiliate.referralCode;
        const rate = affiliate.commissionPerPcs || 15; // default 15%
        // Pembelian paket reseller mendapat komisi 50% (setengah) dari tarif per pcs / persentase normal
        if (rate <= 100) {
          const resellerRatePercent = rate / 2; // contoh: 15% / 2 = 7.5%
          affiliateCommission = Math.round((calculatedSubtotal * resellerRatePercent) / 100);
        } else {
          const resellerRateFlat = Math.round(rate / 2);
          affiliateCommission = totalQuantity * resellerRateFlat;
        }
      }
    }

    // Hitung diskon reward VIP jika reseller login
    let discountAmount = 0;
    if (isAdminUser && session?.user?.id) {
      const adminUser = await prisma.user.findUnique({
        where: { id: session.user.id },
      });

      const approvedPaidVipCount = await prisma.membershipPayment.count({
        where: {
          status: "APPROVED",
          outlet: {
            owner: {
              createdById: session.user.id,
            },
          },
        },
      });

      const claimedRewards = adminUser?.resellerVipRewardsClaimed || 0;
      const eligibleDiscountUnits = Math.max(0, approvedPaidVipCount - claimedRewards);

      if (eligibleDiscountUnits > 0) {
        const discountedCardsCount = Math.min(totalQuantity, eligibleDiscountUnits);
        discountAmount = discountedCardsCount * vipDiscountPerCard;
      }
    }

    const finalTotalAmount = Math.max(0, calculatedSubtotal - discountAmount + shippingFee);
    const orderNumber = await generateUniqueOrderCode(); // Format unik 6 karakter: A9PC1A

    // Handle Midtrans QRIS
    let midtransSnapToken: string | null = null;
    if (data.paymentMethod === "MIDTRANS_QRIS") {
      if (siteSetting?.midtransEnabled === false) {
        return {
          success: false,
          message: "Gateway pembayaran Midtrans QRIS sedang dinonaktifkan oleh Super Admin. Silakan pilih metode Transfer Bank BNI.",
        };
      }

      const serverKey = siteSetting?.midtransServerKey || process.env.MIDTRANS_SERVER_KEY || "";
      const isProduction = siteSetting?.midtransIsProduction ?? (process.env.MIDTRANS_IS_PRODUCTION === "true");

      if (!serverKey) {
        return {
          success: false,
          message: "Payment Gateway Midtrans QRIS belum dikonfigurasi oleh Super Admin. Silakan pilih metode Transfer Bank Manual BNI.",
        };
      }

      const snapEndpoint = isProduction
        ? "https://app.midtrans.com/snap/v1/transactions"
        : "https://app.sandbox.midtrans.com/snap/v1/transactions";

      const authHeader = "Basic " + Buffer.from(serverKey + ":").toString("base64");

      // Prepare valid Midtrans item_details (All prices must be positive and total sum must match gross_amount exactly)
      let itemDetails: Array<{ id: string; price: number; quantity: number; name: string }> = [];

      if (discountAmount > 0) {
        // If there is a VIP discount, provide a single clean package line item to ensure Midtrans sum matches gross_amount exactly
        itemDetails = [
          {
            id: `RESELLER-${orderNumber}`,
            price: Math.round(finalTotalAmount),
            quantity: 1,
            name: `Paket ${totalQuantity} Kartu Reseller (${orderNumber})`.slice(0, 50),
          },
        ];
      } else {
        itemDetails = [
          ...orderItemsData.map((item) => ({
            id: item.productId.slice(0, 45),
            price: Math.round(item.productPrice),
            quantity: item.quantity,
            name: item.productName.slice(0, 50),
          })),
          ...(shippingFee > 0
            ? [
                {
                  id: "SHIPPING-FEE",
                  price: Math.round(shippingFee),
                  quantity: 1,
                  name: "Biaya Ongkir & Packing",
                },
              ]
            : []),
        ];
      }

      const midtransPayload: Record<string, unknown> = {
        transaction_details: {
          order_id: orderNumber,
          gross_amount: Math.round(finalTotalAmount),
        },
        customer_details: {
          first_name: data.customerName.trim(),
          email: data.customerEmail.trim(),
          phone: data.customerPhone.trim(),
        },
        item_details: itemDetails,
      };

      const midtransRes = await fetch(snapEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "Authorization": authHeader,
        },
        body: JSON.stringify(midtransPayload),
      });

      const snapData = await midtransRes.json();
      if (!midtransRes.ok || !snapData.token) {
        console.error("[Midtrans Cart Order Error]:", snapData);
        return {
          success: false,
          message: snapData.error_messages?.[0] || "Gagal membuat invoice Snap Midtrans.",
        };
      }

      midtransSnapToken = snapData.token;
    }

    const order = await prisma.resellerOrder.create({
      data: {
        orderNumber,
        orderType: "RESELLER",
        adminId: isAdminUser ? session.user.id : null,
        customerName: data.customerName.trim(),
        customerPhone: data.customerPhone.trim(),
        customerEmail: data.customerEmail.trim(),
        shippingAddress: data.shippingAddress?.trim() || null,
        province: "Jawa Timur",
        notes: data.notes?.trim() || null,
        affiliateCode: validAffiliateCode,
        affiliateCommission: affiliateCommission,
        paymentMethod: data.paymentMethod,
        paymentStatus: "PENDING",
        orderStatus: "PENDING",
        totalQuantity,
        subtotal: calculatedSubtotal,
        discountAmount,
        shippingFee: 0,
        totalAmount: finalTotalAmount,
        receiptImageUrl: data.receiptImageUrl || null,
        midtransSnapToken: midtransSnapToken || null,
        midtransOrderId: orderNumber,
        items: {
          create: orderItemsData,
        },
      },
      include: {
        items: true,
      },
    });

    await prisma.activityLog.create({
      data: {
        userId: session?.user?.id || null,
        userName: session?.user?.name || data.customerName,
        userRole: (session?.user?.role as any) || "USER",
        action: "CREATE",
        title: "Pesanan Paket Reseller Masuk (Grosir) 📦",
        description: `Pesanan grosir baru #${order.orderNumber} oleh "${data.customerName}" (${data.customerPhone}) sebanyak ${totalQuantity} pcs total Rp ${finalTotalAmount.toLocaleString("id-ID")}.`,
        targetId: order.id,
        targetName: order.orderNumber,
      },
    }).catch(() => {});

    // Kirim Web Push Notification Realtime ke Super Admin
    await sendWebPushToSuperAdmins({
      title: "📦 Pesanan Paket Reseller Masuk (Grosir)!",
      body: `Pesanan #${order.orderNumber} dari "${data.customerName}" (${totalQuantity} pcs • Rp ${finalTotalAmount.toLocaleString("id-ID")}) via ${data.paymentMethod === "MIDTRANS_QRIS" ? "Midtrans QRIS" : "Transfer Bank BNI"}.`,
      url: "/super-admin",
      tag: `order-${order.id}`,
      action: "NEW_ORDER",
    }).catch((pushErr) => console.error("Push notification to super admin error:", pushErr));

    revalidatePath("/admin");
    revalidatePath("/super-admin");

    return {
      success: true,
      message: "Pesanan paket reseller berhasil dibuat!",
      order,
      snapToken: midtransSnapToken,
    };
  } catch (error) {
    console.error("createResellerOrderAction error:", error);
    return { success: false, message: "Gagal memproses pesanan." };
  }
}

/**
 * 5B. Pembeli Umum / Retail: Checkout Keranjang Belanja Satuan (Bisa beli mulai 1 pcs & Dukung Kode Referral Affiliate)
 */
export async function createRetailOrderAction(data: {
  items: { productId: string; quantity: number }[];
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  outletName?: string;
  googleMapsUrl?: string;
  shippingAddress?: string;
  province?: string;
  affiliateCode?: string;
  notes?: string;
  paymentMethod: "MIDTRANS_QRIS" | "MANUAL_BANK_BNI";
  receiptImageUrl?: string;
}) {
  try {
    const session = await auth();

    // Sanitasi input teks dari script injection / phishing PHP
    const sanitizedName = sanitizeInputText(data.customerName, 80);
    const sanitizedPhone = sanitizeInputText(data.customerPhone, 20).replace(/[^0-9+]/g, "");
    const sanitizedEmail = sanitizeInputText(data.customerEmail, 100).toLowerCase();
    const sanitizedOutlet = sanitizeInputText(data.outletName, 100);
    const sanitizedMaps = sanitizeInputText(data.googleMapsUrl, 300);
    const sanitizedAddress = sanitizeInputText(data.shippingAddress, 500);
    const sanitizedProvince = sanitizeInputText(data.province, 50);
    const sanitizedAffiliate = sanitizeInputText(data.affiliateCode, 30).toUpperCase();
    const sanitizedNotes = sanitizeInputText(data.notes, 300);

    if (data.receiptImageUrl && !validateReceiptImage(data.receiptImageUrl)) {
      return { success: false, message: "File struk bukti transfer tidak valid atau berbahaya. Gunakan file gambar JPG, PNG, atau WEBP." };
    }

    if (!data.items || data.items.length === 0) {
      return { success: false, message: "Keranjang belanja Anda masih kosong." };
    }

    const totalQuantity = data.items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
    if (totalQuantity < 1) {
      return { success: false, message: "Pilih minimal 1 unit produk." };
    }

    if (!sanitizedName || !sanitizedPhone || !sanitizedEmail) {
      return { success: false, message: "Nama, No. WhatsApp, dan Email wajib diisi dengan lengkap dan valid." };
    }

    // Ambil produk dari database
    const productIds = data.items.map((i) => i.productId);
    const dbProducts = await prisma.resellerProduct.findMany({
      where: { id: { in: productIds } },
    });

    const productMap = new Map(dbProducts.map((p) => [p.id, p]));

    let calculatedSubtotal = 0;
    const orderItemsData: {
      productId: string;
      productName: string;
      productPrice: number;
      quantity: number;
      subtotal: number;
    }[] = [];

    for (const item of data.items) {
      const p = productMap.get(item.productId);
      if (!p) continue;
      const qty = Number(item.quantity) || 0;
      if (qty <= 0) continue;
      const itemPrice = p.retailPrice || p.price; // Gunakan harga eceran outlet untuk beli 1 atau 2 pcs
      const lineTotal = itemPrice * qty;
      calculatedSubtotal += lineTotal;
      orderItemsData.push({
        productId: p.id,
        productName: p.name,
        productPrice: itemPrice,
        quantity: qty,
        subtotal: lineTotal,
      });
    }

    if (orderItemsData.length === 0) {
      return { success: false, message: "Produk yang dipilih tidak valid." };
    }

    const siteSetting = await prisma.siteSetting.findUnique({ where: { id: "default" } });
    let baseShippingFee = siteSetting?.resellerShippingFee ?? 20000;
    const shippingDiscountLimit = siteSetting?.affiliateShippingDiscount ?? 10000;

    // Verifikasi Kode Referral Affiliate jika ada
    let validAffiliateCode: string | null = null;
    let affiliateCommission = 0;
    let shippingDiscount = 0;

    if (data.affiliateCode && data.affiliateCode.trim()) {
      const cleanRef = data.affiliateCode.trim().toUpperCase();
      const affiliate = await prisma.affiliateAccount.findUnique({
        where: { referralCode: cleanRef },
      });

      if (affiliate && affiliate.status === "ACTIVE") {
        validAffiliateCode = affiliate.referralCode;
        const rate = affiliate.commissionPerPcs || 10;
        // Hitung komisi affiliate murni dari Subtotal Produk (kartu), TANPA melibatkan ongkos kirim
        if (rate <= 100) {
          // Jika rate <= 100 dianggap persentase (contoh: 10% atau 15% dari subtotal kartu)
          affiliateCommission = Math.round((calculatedSubtotal * rate) / 100);
        } else {
          // Jika rate > 100 dianggap nominal flat rupiah per pcs (contoh: Rp 5.000 / pcs)
          affiliateCommission = totalQuantity * rate;
        }
        // Potongan subsidi ongkir untuk pembeli max Rp 10.000
        shippingDiscount = Math.min(baseShippingFee, shippingDiscountLimit);
      }
    }

    const finalShippingFee = Math.max(0, baseShippingFee - shippingDiscount);
    const finalTotalAmount = calculatedSubtotal + finalShippingFee;
    const orderNumber = await generateUniqueOrderCode(); // Format 6 karakter: A9PC1A

    // Handle Midtrans QRIS
    let midtransSnapToken: string | null = null;
    if (data.paymentMethod === "MIDTRANS_QRIS") {
      if (siteSetting?.midtransEnabled === false) {
        return {
          success: false,
          message: "Gateway pembayaran Midtrans QRIS sedang dinonaktifkan. Silakan pilih metode Transfer Bank BNI.",
        };
      }

      const serverKey = siteSetting?.midtransServerKey || process.env.MIDTRANS_SERVER_KEY || "";
      const isProduction = siteSetting?.midtransIsProduction ?? (process.env.MIDTRANS_IS_PRODUCTION === "true");

      if (!serverKey) {
        return {
          success: false,
          message: "Payment Gateway Midtrans QRIS belum dikonfigurasi. Silakan pilih metode Transfer Bank BNI.",
        };
      }

      const snapEndpoint = isProduction
        ? "https://app.midtrans.com/snap/v1/transactions"
        : "https://app.sandbox.midtrans.com/snap/v1/transactions";

      const authHeader = "Basic " + Buffer.from(serverKey + ":").toString("base64");

      const midtransPayload: Record<string, unknown> = {
        transaction_details: {
          order_id: orderNumber,
          gross_amount: finalTotalAmount,
        },
        customer_details: {
          first_name: data.customerName.trim(),
          email: data.customerEmail.trim(),
          phone: data.customerPhone.trim(),
        },
        item_details: [
          ...orderItemsData.map((item) => ({
            id: item.productId,
            price: item.productPrice,
            quantity: item.quantity,
            name: item.productName.slice(0, 50),
          })),
          {
            id: "SHIPPING-FEE",
            price: finalShippingFee,
            quantity: 1,
            name: `Ongkir (${data.province || "Jawa Timur"})`,
          },
        ],
      };

      const midtransRes = await fetch(snapEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "Authorization": authHeader,
        },
        body: JSON.stringify(midtransPayload),
      });

      const snapData = await midtransRes.json();
      if (!midtransRes.ok || !snapData.token) {
        console.error("[Midtrans Retail Order Error]:", snapData);
        return {
          success: false,
          message: snapData.error_messages?.[0] || "Gagal membuat invoice pembayaran Midtrans.",
        };
      }

      midtransSnapToken = snapData.token;
    }

    const notesParts: string[] = [];
    if (data.outletName?.trim()) notesParts.push(`[Outlet: ${data.outletName.trim()}]`);
    if (data.googleMapsUrl?.trim()) notesParts.push(`[Maps/Review: ${data.googleMapsUrl.trim()}]`);
    if (data.notes?.trim()) notesParts.push(data.notes.trim());
    const finalNotes = notesParts.length > 0 ? notesParts.join(" ") : null;

    const order = await prisma.resellerOrder.create({
      data: {
        orderNumber,
        orderType: "RETAIL",
        customerName: data.customerName.trim(),
        customerPhone: data.customerPhone.trim(),
        customerEmail: data.customerEmail.trim(),
        shippingAddress: data.shippingAddress?.trim() || null,
        province: data.province?.trim() || "Jawa Timur",
        affiliateCode: validAffiliateCode,
        affiliateCommission,
        discountAmount: shippingDiscount,
        notes: finalNotes,
        paymentMethod: data.paymentMethod,
        paymentStatus: "PENDING",
        orderStatus: "PENDING",
        totalQuantity,
        subtotal: calculatedSubtotal,
        shippingFee: finalShippingFee,
        totalAmount: finalTotalAmount,
        receiptImageUrl: data.receiptImageUrl || null,
        midtransSnapToken: midtransSnapToken || null,
        midtransOrderId: orderNumber,
        items: {
          create: orderItemsData,
        },
      },
      include: {
        items: true,
      },
    });

    await prisma.activityLog.create({
      data: {
        userName: data.customerName,
        userRole: "USER",
        action: "CREATE",
        title: "Pesanan Pembeli Baru Masuk (Retail) 🛒",
        description: `Pesanan retail #${order.orderNumber} oleh "${data.customerName}" (${totalQuantity} pcs total Rp ${finalTotalAmount.toLocaleString("id-ID")})${validAffiliateCode ? ` via Referral Affiliate [${validAffiliateCode}]` : ""}.`,
        targetId: order.id,
        targetName: order.orderNumber,
      },
    }).catch(() => {});

    // Kirim Web Push Notification Realtime ke Super Admin
    await sendWebPushToSuperAdmins({
      title: "🛒 Pesanan Pembeli Baru Masuk (Retail)!",
      body: `Pesanan #${order.orderNumber} dari "${data.customerName}" (${totalQuantity} pcs • Subtotal Rp ${calculatedSubtotal.toLocaleString("id-ID")} • Total Rp ${finalTotalAmount.toLocaleString("id-ID")})${validAffiliateCode ? ` [Ref: ${validAffiliateCode}]` : ""}.`,
      url: "/super-admin",
      tag: `order-${order.id}`,
      action: "NEW_ORDER",
    }).catch((pushErr) => console.error("Push notification to super admin error:", pushErr));

    revalidatePath("/super-admin");

    return {
      success: true,
      message: "Pesanan berhasil dibuat!",
      order,
      snapToken: midtransSnapToken,
    };
  } catch (error) {
    console.error("createRetailOrderAction error:", error);
    return { success: false, message: "Gagal memproses pesanan retail." };
  }
}

/**
 * 6. Ambil Semua Pesanan Reseller (Untuk Super Admin & Reseller)
 */
export async function getResellerOrdersAction(adminIdFilter?: string) {
  try {
    const session = await auth();
    if (!session) {
      return { success: false, message: "Harap login terlebih dahulu.", data: [] };
    }

    const isSuperAdmin = session.user.role === "SUPER_ADMIN";
    const targetAdminId = isSuperAdmin ? adminIdFilter : session.user.id;

    const orders = await prisma.resellerOrder.findMany({
      where: targetAdminId ? { adminId: targetAdminId } : undefined,
      include: {
        admin: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
            whatsappNumber: true,
            avatarUrl: true,
            outlet: {
              select: {
                id: true,
                name: true,
                googleReviewUrl: true,
                qrCards: {
                  select: {
                    code: true,
                    status: true,
                  },
                },
              },
            },
          },
        },
        items: {
          include: {
            product: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return { success: true, data: orders };
  } catch (error) {
    console.error("getResellerOrdersAction error:", error);
    return { success: false, message: "Gagal memuat daftar pesanan.", data: [] };
  }
}

/**
 * 7. Super Admin: Update Form Data Pembeli / Penerima Pesanan (Nama, No Telp, Email, Alamat)
 */
export async function updateResellerOrderCustomerDataAction(
  orderId: string,
  data: {
    customerName: string;
    customerPhone: string;
    customerEmail: string;
    shippingAddress?: string;
    notes?: string;
  }
) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "SUPER_ADMIN") {
      return { success: false, message: "Akses ditolak: Khusus Super Admin." };
    }

    if (!data.customerName?.trim() || !data.customerPhone?.trim() || !data.customerEmail?.trim()) {
      return { success: false, message: "Nama, No. WhatsApp, dan Email tidak boleh kosong." };
    }

    const updated = await prisma.resellerOrder.update({
      where: { id: orderId },
      data: {
        customerName: data.customerName.trim(),
        customerPhone: data.customerPhone.trim(),
        customerEmail: data.customerEmail.trim(),
        shippingAddress: data.shippingAddress !== undefined ? data.shippingAddress.trim() : undefined,
        notes: data.notes !== undefined ? data.notes.trim() : undefined,
      },
    });

    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        userName: session.user.name || "Super Admin",
        userRole: "SUPER_ADMIN",
        action: "UPDATE",
        title: "Perbarui Data Penerima Pesanan 📝",
        description: `Super Admin memperbarui data pemesan untuk Order #${updated.orderNumber} (${updated.customerName}).`,
        targetId: updated.id,
        targetName: updated.orderNumber,
      },
    }).catch(() => {});

    revalidatePath("/super-admin");
    revalidatePath("/admin");

    return { success: true, message: `Data pemesan untuk Order #${updated.orderNumber} berhasil diperbarui.` };
  } catch (error) {
    console.error("updateResellerOrderCustomerDataAction error:", error);
    return { success: false, message: "Gagal memperbarui data pemesan." };
  }
}

/**
 * 8. Super Admin: Setujui / Konfirmasi Pembayaran Pesanan Reseller
 */
export async function approveResellerOrderAction(orderId: string) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "SUPER_ADMIN") {
      return { success: false, message: "Akses ditolak: Khusus Super Admin." };
    }

    const order = await prisma.resellerOrder.findUnique({
      where: { id: orderId },
      include: { admin: true },
    });

    if (!order) {
      return { success: false, message: "Pesanan tidak ditemukan." };
    }

    // Jika pesanan menggunakan diskon reward VIP, update klaim reward admin
    if (order.discountAmount > 0 && order.adminId) {
      const siteSetting = await prisma.siteSetting.findUnique({ where: { id: "default" } });
      const vipDiscountPerCard = siteSetting?.resellerVipDiscountPerCard || 5000;
      const claimedCards = Math.floor(order.discountAmount / vipDiscountPerCard);
      if (claimedCards > 0) {
        await prisma.user.update({
          where: { id: order.adminId },
          data: {
            resellerVipRewardsClaimed: { increment: claimedCards },
          },
        }).catch(() => {});
      }
    }

    await prisma.resellerOrder.update({
      where: { id: orderId },
      data: {
        paymentStatus: "PAID",
        orderStatus: "PROCESSING",
      },
    });

    // Jika pesanan berasal dari referral affiliate, tambahkan komisi ke saldo akun affiliate
    if (order.affiliateCode && order.affiliateCommission > 0) {
      await prisma.affiliateAccount.update({
        where: { referralCode: order.affiliateCode },
        data: {
          balance: { increment: order.affiliateCommission },
          totalEarned: { increment: order.affiliateCommission },
        },
      }).catch((affErr) => console.error("Error crediting affiliate commission:", affErr));
    }

    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        userName: session.user.name || "Super Admin",
        userRole: "SUPER_ADMIN",
        action: "UPDATE_STATUS",
        title: "Konfirmasi Pembayaran Pesanan ✅",
        description: `Super Admin menyetujui pembayaran Order #${order.orderNumber} sebesar Rp ${order.totalAmount.toLocaleString("id-ID")}. Status: Diproses.`,
        targetId: order.id,
        targetName: order.orderNumber,
      },
    }).catch(() => {});

    revalidatePath("/super-admin");
    revalidatePath("/admin");

    return { success: true, message: `Pesanan #${order.orderNumber} berhasil disetujui & berstatus Diproses.` };
  } catch (error) {
    console.error("approveResellerOrderAction error:", error);
    return { success: false, message: "Gagal menyetujui pesanan." };
  }
}

/**
 * 9. Super Admin: Tolak Pembayaran Pesanan Reseller
 */
export async function rejectResellerOrderAction(orderId: string, reason?: string) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "SUPER_ADMIN") {
      return { success: false, message: "Akses ditolak: Khusus Super Admin." };
    }

    const order = await prisma.resellerOrder.findUnique({ where: { id: orderId } });
    if (!order) {
      return { success: false, message: "Pesanan tidak ditemukan." };
    }

    await prisma.resellerOrder.update({
      where: { id: orderId },
      data: {
        paymentStatus: "REJECTED",
        orderStatus: "CANCELLED",
        notes: reason ? `Ditolak: ${reason}` : order.notes,
      },
    });

    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        userName: session.user.name || "Super Admin",
        userRole: "SUPER_ADMIN",
        action: "UPDATE_STATUS",
        title: "Tolak Pesanan Reseller ❌",
        description: `Super Admin menolak pesanan #${order.orderNumber}. ${reason ? `Alasan: ${reason}` : ""}`,
        targetId: order.id,
        targetName: order.orderNumber,
      },
    }).catch(() => {});

    revalidatePath("/super-admin");
    revalidatePath("/admin");

    return { success: true, message: `Pesanan #${order.orderNumber} ditolak.` };
  } catch (error) {
    console.error("rejectResellerOrderAction error:", error);
    return { success: false, message: "Gagal menolak pesanan." };
  }
}

/**
 * 10. Super Admin: Update Status Pengiriman / Proses Pesanan
 */
export async function updateResellerOrderStatusAction(
  orderId: string,
  status: "PENDING" | "PROCESSING" | "SHIPPED" | "COMPLETED" | "CANCELLED"
) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "SUPER_ADMIN") {
      return { success: false, message: "Akses ditolak: Khusus Super Admin." };
    }

    const updated = await prisma.resellerOrder.update({
      where: { id: orderId },
      data: { orderStatus: status },
    });

    revalidatePath("/super-admin");
    revalidatePath("/admin");

    return { success: true, message: `Status pesanan #${updated.orderNumber} diubah menjadi ${status}.` };
  } catch (error) {
    console.error("updateResellerOrderStatusAction error:", error);
    return { success: false, message: "Gagal memperbarui status pesanan." };
  }
}

/**
 * 11. Super Admin 1: Hapus Record Pesanan Reseller
 */
export async function deleteResellerOrderRecordAction(orderId: string) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "SUPER_ADMIN" || !session.user.isSuperAdminMaster) {
      return { success: false, message: "Akses ditolak: Hanya Super Admin 1 yang dapat menghapus pesanan." };
    }

    const order = await prisma.resellerOrder.findUnique({ where: { id: orderId } });
    if (!order) {
      return { success: false, message: "Pesanan tidak ditemukan." };
    }

    await prisma.resellerOrder.delete({ where: { id: orderId } });

    revalidatePath("/super-admin");
    revalidatePath("/admin");

    return { success: true, message: `Record pesanan #${order.orderNumber} berhasil dihapus.` };
  } catch (error) {
    console.error("deleteResellerOrderRecordAction error:", error);
    return { success: false, message: "Gagal menghapus pesanan." };
  }
}

/**
 * 12. Publik & Pembeli: Lacak Status Pesanan Berdasarkan Kode Pesanan (contoh: AP2AC6) atau Nomor WhatsApp
 */
export async function trackResellerOrderAction(query: string) {
  try {
    const cleanQuery = query.trim();
    if (!cleanQuery || cleanQuery.length < 3) {
      return { success: false, message: "Masukkan Kode Pesanan (contoh: AP2AC6) atau Nomor WhatsApp yang valid." };
    }

    const upperCode = cleanQuery.toUpperCase();
    let cleanPhone = cleanQuery.replace(/[^0-9]/g, "");
    if (cleanPhone.startsWith("08")) cleanPhone = "62" + cleanPhone.slice(1);

    const orders = await prisma.resellerOrder.findMany({
      where: {
        OR: [
          { orderNumber: { equals: upperCode } },
          { orderNumber: { equals: cleanQuery } },
          { customerPhone: { contains: cleanQuery } },
          ...(cleanPhone.length >= 8 ? [{ customerPhone: { contains: cleanPhone } }] : []),
        ],
      },
      include: {
        items: {
          include: { product: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    if (orders.length === 0) {
      return {
        success: false,
        message: `Pesanan dengan kata kunci "${cleanQuery}" tidak ditemukan. Pastikan kode pesanan atau no. WhatsApp sudah benar.`,
      };
    }

    return { success: true, data: orders };
  } catch (error) {
    console.error("trackResellerOrderAction error:", error);
    return { success: false, message: "Terjadi kesalahan saat melacak pesanan." };
  }
}

/**
 * 13. Super Admin: Ubah Calon Reseller / Data Pesanan Menjadi Akun Admin Lapangan Resmi
 */
export async function convertResellerOrderToAdminAction(orderId: string, customPassword?: string) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "SUPER_ADMIN") {
      return { success: false, message: "Akses ditolak: Khusus Super Admin." };
    }

    const order = await prisma.resellerOrder.findUnique({
      where: { id: orderId },
      include: { admin: true },
    });

    if (!order) {
      return { success: false, message: "Pesanan tidak ditemukan." };
    }

    const targetEmail = order.customerEmail.toLowerCase().trim();
    const existingUser = await prisma.user.findUnique({
      where: { email: targetEmail },
    });

    let assignedAdminId = order.adminId;
    const defaultPassword = customPassword?.trim() || "Reseller123!";

    if (existingUser) {
      // Jika akun sudah ada, pastikan rolenya ADMIN
      if (existingUser.role !== "ADMIN" && existingUser.role !== "SUPER_ADMIN") {
        await prisma.user.update({
          where: { id: existingUser.id },
          data: {
            role: "ADMIN",
            isResellerUnlocked: false, // Wajib bayar lisensi dulu saat masuk dashboard
          },
        });
      }
      assignedAdminId = existingUser.id;
    } else {
      // Buat akun Admin Lapangan baru
      const hashedPassword = await bcrypt.hash(defaultPassword, 10);
      let cleanWa = order.customerPhone.replace(/[^0-9]/g, "");
      if (cleanWa.startsWith("08")) cleanWa = "62" + cleanWa.slice(1);

      const newAdmin = await prisma.user.create({
        data: {
          email: targetEmail,
          password: hashedPassword,
          fullName: order.customerName.trim(),
          whatsappNumber: cleanWa,
          role: "ADMIN",
          isActive: true,
          isResellerUnlocked: false, // Akun terkunci, harus bayar lisensi/modul di dashboard
          createdById: session.user.id,
        },
      });

      assignedAdminId = newAdmin.id;
    }

    // Hubungkan order ke admin ini jika belum terhubung
    await prisma.resellerOrder.update({
      where: { id: orderId },
      data: {
        adminId: assignedAdminId,
      },
    });

    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        userName: session.user.name || "Super Admin",
        userRole: "SUPER_ADMIN",
        action: "CREATE",
        title: "Pembuatan Akun Admin Lapangan Reseller 👤",
        description: `Super Admin membuatkan akun Admin Lapangan untuk pemesan Order #${order.orderNumber} (${order.customerName} - ${targetEmail}).`,
        targetId: assignedAdminId,
        targetName: order.customerName,
      },
    }).catch(() => {});

    revalidatePath("/super-admin");
    revalidatePath("/admin");

    return {
      success: true,
      message: `Akun Admin Lapangan untuk ${order.customerName} (${targetEmail}) berhasil dibuat/dihubungkan!`,
      data: {
        email: targetEmail,
        password: defaultPassword,
        fullName: order.customerName,
        whatsappNumber: order.customerPhone,
      },
    };
  } catch (error) {
    console.error("convertResellerOrderToAdminAction error:", error);
    return { success: false, message: "Gagal membuat akun Admin Lapangan dari pesanan ini." };
  }
}

/**
 * 12. Super Admin: Ambil Seluruh Kartu Kosong (Belum Terhubung ke Outlet)
 */
export async function getAvailableBlankCardsAction() {
  try {
    const session = await auth();
    if (!session) {
      return { success: false, message: "Harap login terlebih dahulu.", data: [] };
    }

    const blankCards = await prisma.qrCard.findMany({
      where: {
        outletId: null,
      },
      select: {
        code: true,
        status: true,
        assignedAdminId: true,
      },
      orderBy: { code: "asc" },
    });

    return { success: true, data: blankCards };
  } catch (error) {
    console.error("getAvailableBlankCardsAction error:", error);
    return { success: false, message: "Gagal memuat daftar kartu kosong.", data: [] };
  }
}

/**
 * 13. Super Admin: Aktifkan Akun Outlet Pembeli Satuan / Retail & Pasangkan Kartu Kosong Sekaligus
 */
export async function activateRetailOrderAsOutletAction(data: {
  orderId: string;
  cardCodes: string[];
  outletName: string;
  googleReviewUrl: string;
  fullName: string;
  email: string;
  phone: string;
  password?: string;
  isAutoVip?: boolean;
}) {
  try {
    const session = await auth();
    if (!session || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "ADMIN")) {
      return { success: false, message: "Akses ditolak. Hanya Super Admin / Admin yang dapat mengaktifkan akun outlet." };
    }

    const order = await prisma.resellerOrder.findUnique({
      where: { id: data.orderId },
      include: {
        items: true,
      },
    });

    if (!order) {
      return { success: false, message: "Data pesanan tidak ditemukan." };
    }

    if (!data.cardCodes || data.cardCodes.length === 0) {
      return { success: false, message: "Pilih minimal 1 kartu kosong untuk dihubungkan ke outlet ini." };
    }

    const cleanCards = Array.from(new Set(data.cardCodes.map((c) => c.trim().toLowerCase())));

    // Periksa apakah kartu-kartu yang dipilih valid dan belum terpakai oleh outlet lain
    const targetCards = await prisma.qrCard.findMany({
      where: {
        code: { in: cleanCards },
      },
      include: {
        outlet: {
          select: { id: true, name: true, ownerId: true },
        },
      },
    });

    if (targetCards.length !== cleanCards.length) {
      const foundCodes = new Set(targetCards.map((c) => c.code.toLowerCase()));
      const missing = cleanCards.filter((c) => !foundCodes.has(c));
      return { success: false, message: `Kartu ${missing.join(", ")} tidak ditemukan di sistem.` };
    }

    const targetEmail = data.email.toLowerCase().trim();
    const existingUser = await prisma.user.findUnique({
      where: { email: targetEmail },
      include: { outlet: true },
    });

    // Validasi kartu apakah sudah dipakai outlet lain
    for (const card of targetCards) {
      if (card.outletId && existingUser?.outlet?.id !== card.outletId) {
        return {
          success: false,
          message: `Kartu "${card.code}" saat ini sudah terpasang di outlet "${card.outlet?.name || card.outletId}". Silakan pilih kartu kosong lainnya.`,
        };
      }
    }

    const defaultPassword = data.password?.trim() || "Outlet123!";
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);
    let cleanWa = data.phone.replace(/[^0-9]/g, "");
    if (cleanWa.startsWith("08")) cleanWa = "62" + cleanWa.slice(1);
    if (cleanWa.startsWith("8")) cleanWa = "62" + cleanWa;

    // Ambil setting trial VIP
    const siteSetting = await prisma.siteSetting.findUnique({ where: { id: "default" } });
    const isAutoVip = data.isAutoVip ?? (siteSetting ? (siteSetting.autoVipTrialOnActivation ?? true) : true);
    const trialDays = siteSetting?.trialDurationDays ?? 30;
    const trialExpiry = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000);

    let assignedUserId = "";
    let finalOutletId = "";

    if (existingUser) {
      assignedUserId = existingUser.id;
      // Update data user jika perlu
      await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          fullName: data.fullName.trim(),
          whatsappNumber: cleanWa,
          isActive: true,
        },
      });

      if (existingUser.outlet) {
        finalOutletId = existingUser.outlet.id;
        // Update data outlet
        await prisma.outlet.update({
          where: { id: existingUser.outlet.id },
          data: {
            name: data.outletName.trim(),
            googleReviewUrl: data.googleReviewUrl.trim(),
            ...(isAutoVip && !existingUser.outlet.isMember
              ? {
                  isMember: true,
                  membershipStartedAt: new Date(),
                  membershipExpiresAt: trialExpiry,
                }
              : {}),
          },
        });
      } else {
        // Buat outlet baru untuk user yang sudah ada
        const newOutlet = await prisma.outlet.create({
          data: {
            ownerId: existingUser.id,
            name: data.outletName.trim(),
            googleReviewUrl: data.googleReviewUrl.trim(),
            isMember: isAutoVip,
            membershipStartedAt: isAutoVip ? new Date() : null,
            membershipExpiresAt: isAutoVip ? trialExpiry : null,
          },
        });
        finalOutletId = newOutlet.id;
      }
    } else {
      // Buat akun User (Role: USER) baru
      const newUser = await prisma.user.create({
        data: {
          email: targetEmail,
          password: hashedPassword,
          fullName: data.fullName.trim(),
          whatsappNumber: cleanWa,
          role: "USER",
          isActive: true,
          createdById: session.user.id,
        },
      });
      assignedUserId = newUser.id;

      // Buat Outlet untuk user baru
      const newOutlet = await prisma.outlet.create({
        data: {
          ownerId: newUser.id,
          name: data.outletName.trim(),
          googleReviewUrl: data.googleReviewUrl.trim(),
          isMember: isAutoVip,
          membershipStartedAt: isAutoVip ? new Date() : null,
          membershipExpiresAt: isAutoVip ? trialExpiry : null,
        },
      });
      finalOutletId = newOutlet.id;
    }

    // Pasangkan semua kartu ke outlet ini
    await prisma.qrCard.updateMany({
      where: {
        code: { in: cleanCards },
      },
      data: {
        outletId: finalOutletId,
        status: "ACTIVE",
      },
    });

    // Hubungkan order ke akun user ini
    await prisma.resellerOrder.update({
      where: { id: data.orderId },
      data: {
        adminId: assignedUserId,
      },
    });

    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        userName: session.user.name || "Super Admin",
        userRole: session.user.role === "SUPER_ADMIN" ? "SUPER_ADMIN" : "ADMIN",
        action: "REGISTER_OUTLET",
        title: "Aktivasi Akun Outlet & Pemasangan Kartu 🏪",
        description: `Super Admin mengaktifkan akun Outlet "${data.outletName.trim()}" (${targetEmail}) dan memasangkan ${cleanCards.length} kartu (${cleanCards.join(", ")}) dari Order #${order.orderNumber}.`,
        targetId: finalOutletId,
        targetName: data.outletName.trim(),
        outletId: finalOutletId,
        superAdminId: session.user.id,
      },
    }).catch(() => {});

    revalidatePath("/super-admin");
    revalidatePath("/admin");
    revalidatePath("/portal");

    return {
      success: true,
      message: `Akun Portal Outlet "${data.outletName}" berhasil diaktifkan dan terhubung dengan ${cleanCards.length} kartu (${cleanCards.join(", ")})!`,
      data: {
        outletId: finalOutletId,
        outletName: data.outletName.trim(),
        googleReviewUrl: data.googleReviewUrl.trim(),
        fullName: data.fullName.trim(),
        email: targetEmail,
        password: defaultPassword,
        whatsappNumber: cleanWa,
        cardCodes: cleanCards,
        orderNumber: order.orderNumber,
      },
    };
  } catch (error) {
    console.error("activateRetailOrderAsOutletAction error:", error);
    return { success: false, message: "Gagal mengaktifkan akun outlet dan menghubungkan kartu." };
  }
}

