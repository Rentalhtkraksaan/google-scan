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
          minOrder: 8,
          unit: "pcs",
          isActive: true,
          sortOrder: 2,
          imageUrl: "https://images.unsplash.com/photo-1556742049-0a67c5576839?w=600&auto=format&fit=crop&q=80",
        },
      ],
    });
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
 * 5. Reseller / Calon Reseller Baru: Checkout Keranjang Belanja Produk (Midtrans QRIS / Transfer Manual BNI)
 * Mendukung pemesanan oleh Reseller yang sudah login maupun Calon Reseller Baru dari Landing Page Publik.
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
}) {
  try {
    const session = await auth();
    const isAdminUser = session && session.user && (session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN");

    if (!data.items || data.items.length === 0) {
      return { success: false, message: "Keranjang belanja Anda masih kosong." };
    }

    const totalQuantity = data.items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
    if (totalQuantity < 8) {
      return { success: false, message: `Minimal total pembelian adalah 8 pcs (saat ini ${totalQuantity} pcs).` };
    }

    if (!data.customerName?.trim() || !data.customerPhone?.trim() || !data.customerEmail?.trim()) {
      return { success: false, message: "Nama, No. WhatsApp, dan Email wajib diisi dengan lengkap." };
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
    const shippingFee = siteSetting?.resellerShippingFee ?? 20000;
    const vipDiscountPerCard = siteSetting?.resellerVipDiscountPerCard ?? 5000;

    // Hitung diskon reward VIP: HANYA DIBERIKAN DARI OUTLET YANG SUDAH MEMBAYAR PERPANJANGAN VIP RESMI (BUKAN FREE TRIAL PERTAMA)
    let discountAmount = 0;
    if (isAdminUser && session?.user?.id) {
      const adminUser = await prisma.user.findUnique({
        where: { id: session.user.id },
      });

      // Hitung total pembayaran VIP yang APPROVED dari outlet binaan admin ini
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
    const orderNumber = `RSLORD-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    // Handle Midtrans QRIS
    let midtransSnapToken: string | null = null;
    if (data.paymentMethod === "MIDTRANS_QRIS") {
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
            price: shippingFee,
            quantity: 1,
            name: "Biaya Ongkir & Packing Tetap",
          },
        ],
      };

      if (discountAmount > 0) {
        (midtransPayload.item_details as Array<Record<string, unknown>>).push({
          id: "DISCOUNT-VIP",
          price: -discountAmount,
          quantity: 1,
          name: "Diskon Reward Outlet VIP Berbayar",
        });
      }

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
        adminId: isAdminUser ? session.user.id : null,
        customerName: data.customerName.trim(),
        customerPhone: data.customerPhone.trim(),
        customerEmail: data.customerEmail.trim(),
        shippingAddress: data.shippingAddress?.trim() || null,
        notes: data.notes?.trim() || null,
        paymentMethod: data.paymentMethod,
        paymentStatus: "PENDING",
        orderStatus: "PENDING",
        totalQuantity,
        subtotal: calculatedSubtotal,
        discountAmount,
        shippingFee,
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
        title: "Pesanan Paket Reseller Masuk 🛒",
        description: `Pesanan baru #${order.orderNumber} oleh "${data.customerName}" (${data.customerPhone}) sebanyak ${totalQuantity} pcs total Rp ${finalTotalAmount.toLocaleString("id-ID")} via ${data.paymentMethod === "MIDTRANS_QRIS" ? "Midtrans QRIS" : "Transfer Bank BNI"}.`,
        targetId: order.id,
        targetName: order.orderNumber,
      },
    }).catch(() => {});

    // Kirim Web Push Notification Realtime ke Super Admin (HP berdering meskipun dikunci / di background)
    await sendWebPushToSuperAdmins({
      title: "🛍️ Pesanan Baru Masuk!",
      body: `Pesanan #${order.orderNumber} dari "${data.customerName}" (${totalQuantity} pcs • Rp ${finalTotalAmount.toLocaleString("id-ID")}) via ${data.paymentMethod === "MIDTRANS_QRIS" ? "Midtrans QRIS" : "Transfer Bank BNI"}.`,
      url: "/super-admin",
      tag: `order-${order.id}`,
      action: "NEW_ORDER",
    }).catch((pushErr) => console.error("Push notification to super admin error:", pushErr));

    revalidatePath("/admin");
    revalidatePath("/super-admin");

    return {
      success: true,
      message: "Pesanan berhasil dibuat!",
      order,
      snapToken: midtransSnapToken,
    };
  } catch (error) {
    console.error("createResellerOrderAction error:", error);
    return { success: false, message: "Gagal memproses pesanan." };
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
            whatsappNumber: true,
            avatarUrl: true,
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

    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        userName: session.user.name || "Super Admin",
        userRole: "SUPER_ADMIN",
        action: "UPDATE_STATUS",
        title: "Konfirmasi Pembayaran Pesanan Reseller ✅",
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
 * 12. Publik: Lacak Status Pesanan Berdasarkan Nomor Pesanan atau Nomor WhatsApp
 */
export async function trackResellerOrderAction(query: string) {
  try {
    const cleanQuery = query.trim();
    if (!cleanQuery || cleanQuery.length < 3) {
      return { success: false, message: "Masukkan Nomor Pesanan (RSLORD-xxx) atau Nomor WhatsApp yang valid." };
    }

    let cleanPhone = cleanQuery.replace(/[^0-9]/g, "");
    if (cleanPhone.startsWith("08")) cleanPhone = "62" + cleanPhone.slice(1);

    const orders = await prisma.resellerOrder.findMany({
      where: {
        OR: [
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
        message: `Pesanan dengan kata kunci "${cleanQuery}" tidak ditemukan. Pastikan nomor pesanan atau no. WhatsApp sudah benar.`,
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
