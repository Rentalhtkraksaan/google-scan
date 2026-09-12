import { z } from "zod";

// ─── Auth ───────────────────────────────────────────────────────────────────

export const loginSchema = z.union([
  z.object({
    loginType: z.literal("recovery"),
    email: z
      .string()
      .email("Email tidak valid")
      .max(30, "Email maksimal 30 karakter")
      .refine(
        (val) => !/[<>"'`;%${}()[\]\\]/.test(val) && !val.toLowerCase().includes(".php"),
        { message: "Format email tidak valid atau mengandung karakter dilarang" }
      ),
    fullName: z
      .string()
      .min(2, "Nama lengkap minimal 2 karakter")
      .max(50, "Nama lengkap maksimal 50 karakter")
      .regex(/^[a-zA-Z0-9\s.,'-]+$/, "Nama hanya boleh mengandung huruf, spasi, dan tanda baca nama")
      .refine(
        (val) =>
          !val.toLowerCase().includes("<?") &&
          !val.toLowerCase().includes("php") &&
          !val.includes("$") &&
          !val.includes(";"),
        { message: "Karakter atau format nama tidak diizinkan" }
      ),
    whatsappNumber: z
      .string()
      .min(8, "Nomor WhatsApp minimal 8 digit")
      .max(16, "Nomor WhatsApp maksimal 16 digit")
      .regex(/^[0-9+]+$/, "Nomor WhatsApp hanya boleh berisi angka dan tanda +"),
  }),
  z.object({
    loginType: z.literal("password").optional(),
    email: z.string().email("Email tidak valid").max(30, "Email maksimal 30 karakter"),
    password: z.string().min(1, "Password wajib diisi").max(15, "Password maksimal 15 karakter"),
  }),
]);

export type LoginInput = z.infer<typeof loginSchema>;

// ─── Admin Creation ─────────────────────────────────────────────────────────

export const createAdminSchema = z.object({
  email: z.string().email("Format email tidak valid").max(30, "Email maksimal 30 karakter"),
  password: z
    .string()
    .min(6, "Password minimal 6 karakter")
    .max(15, "Password maksimal 15 karakter"),
  fullName: z.string().min(2, "Nama minimal 2 karakter").max(100),
  whatsappNumber: z
    .string()
    .min(8, "Nomor WhatsApp minimal 8 digit")
    .max(20, "Nomor WhatsApp terlalu panjang")
    .regex(/^[0-9+ ]+$/, "Nomor WA hanya boleh angka dan tanda +"),
  cardCount: z.coerce.number().min(0).max(1000).default(0),
  cardPrefix: z.string().optional().default("c-"),
});

export type CreateAdminInput = z.infer<typeof createAdminSchema>;

export const createSuperAdminSchema = z.object({
  email: z.string().email("Format email tidak valid").max(30, "Email maksimal 30 karakter"),
  password: z.string().min(6, "Password minimal 6 karakter").max(15, "Password maksimal 15 karakter"),
  fullName: z.string().min(2, "Nama minimal 2 karakter").max(100),
  whatsappNumber: z
    .string()
    .min(8, "Nomor WhatsApp minimal 8 digit")
    .max(20, "Nomor WhatsApp terlalu panjang")
    .regex(/^[0-9+ ]+$/, "Nomor WA hanya boleh angka dan tanda +")
    .optional()
    .or(z.literal("")),
  canEditLandingPage: z.boolean().default(false),
  canManagePrintTemplates: z.boolean().default(false),
});

export type CreateSuperAdminInput = z.infer<typeof createSuperAdminSchema>;

// ─── Outlet & User Registration (Claim / Field Register) ───────────────────

export const registerOutletSchema = z.object({
  code: z.string().min(1, "Kode kartu wajib diisi"),
  fullName: z.string().min(2, "Nama lengkap pemilik minimal 2 karakter").max(100),
  whatsappNumber: z
    .string()
    .min(8, "Nomor WhatsApp minimal 8 digit")
    .max(20, "Nomor WhatsApp terlalu panjang")
    .regex(/^[0-9+ ]+$/, "Nomor WA hanya boleh angka dan tanda +"),
  email: z.string().email("Format email tidak valid").max(30, "Email maksimal 30 karakter"),
  password: z.string().min(6, "Password akun minimal 6 karakter").max(15, "Password maksimal 15 karakter"),
  outletName: z.string().min(2, "Nama outlet minimal 2 karakter").max(200),
  googleReviewUrl: z
    .string()
    .min(5, "Link Google Review wajib diisi")
    .transform((val) => {
      let trimmed = val.trim();
      if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
        trimmed = "https://" + trimmed;
      }
      return trimmed;
    })
    .refine((val) => {
      try {
        new URL(val);
        return true;
      } catch {
        return false;
      }
    }, {
      message: "Format URL Google Review tidak valid",
    }),
});

export type RegisterOutletInput = z.infer<typeof registerOutletSchema>;

// ─── Direct Card Creation ───────────────────────────────────────────────────

export const createCardSchema = z.object({
  code: z
    .string()
    .min(1, "Kode kartu wajib diisi")
    .regex(/^[a-zA-Z0-9-_]+$/, "Kode hanya boleh huruf, angka, tanda hubung (-) dan garis bawah (_)"),
  fallbackUrl: z.string().url("URL fallback tidak valid").default("http://localhost:3000"),
  assignedAdminId: z.string().optional().nullable(),
});

export type CreateCardInput = z.infer<typeof createCardSchema>;

export const generateCardsSchema = z.object({
  count: z.coerce.number().min(1, "Minimal 1 kartu").max(500, "Maksimal 500 kartu sekaligus"),
  prefix: z.string().default("c-"),
  assignedAdminId: z.string().optional().nullable(),
  fallbackUrl: z.string().default("http://localhost:3000"),
});

export type GenerateCardsInput = z.infer<typeof generateCardsSchema>;
