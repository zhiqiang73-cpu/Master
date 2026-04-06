/**
 * walletDb.ts — 账户余额系统数据库操作
 * 余额单位：分（1元 = 100分），避免浮点误差
 */
import { and, desc, eq, sql } from "drizzle-orm";
import { getDb } from "./db";
import {
  Coupon,
  Wallet,
  WalletTransaction,
  couponUsages,
  coupons,
  walletTransactions,
  wallets,
} from "../drizzle/schema";

// ─── Wallet ───────────────────────────────────────────────────────────────────

/** 获取或创建用户钱包 */
export async function getOrCreateWallet(userId: number): Promise<Wallet | null> {
  const db = await getDb();
  if (!db) return null;
  const existing = await db.select().from(wallets).where(eq(wallets.userId, userId)).limit(1);
  if (existing.length > 0) return existing[0];
  await db.insert(wallets).values({ userId, balance: 0, frozenBalance: 0, totalCharged: 0, totalSpent: 0 });
  const created = await db.select().from(wallets).where(eq(wallets.userId, userId)).limit(1);
  return created[0] ?? null;
}

/** 获取用户钱包（不创建） */
export async function getWallet(userId: number): Promise<Wallet | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(wallets).where(eq(wallets.userId, userId)).limit(1);
  return rows[0] ?? null;
}

/** 充值（管理员赠送或用户充值） */
export async function rechargeWallet(
  userId: number,
  amount: number,
  description: string,
  type: "recharge" | "admin_grant" = "recharge"
): Promise<{ success: boolean; newBalance: number }> {
  const db = await getDb();
  if (!db) return { success: false, newBalance: 0 };
  const wallet = await getOrCreateWallet(userId);
  if (!wallet) return { success: false, newBalance: 0 };

  const newBalance = wallet.balance + amount;
  await db.update(wallets).set({
    balance: newBalance,
    totalCharged: wallet.totalCharged + amount,
  }).where(eq(wallets.userId, userId));

  await db.insert(walletTransactions).values({
    userId,
    type,
    amount,
    balanceBefore: wallet.balance,
    balanceAfter: newBalance,
    description,
  });

  return { success: true, newBalance };
}

/** 扣款（消费） */
export async function deductWallet(
  userId: number,
  amount: number,
  description: string,
  relatedId?: string,
  type: "spend" | "admin_deduct" = "spend"
): Promise<{ success: boolean; newBalance: number; error?: string }> {
  const db = await getDb();
  if (!db) return { success: false, newBalance: 0, error: "DB unavailable" };
  const wallet = await getOrCreateWallet(userId);
  if (!wallet) return { success: false, newBalance: 0, error: "Wallet not found" };
  if (wallet.balance < amount) return { success: false, newBalance: wallet.balance, error: "余额不足" };

  const newBalance = wallet.balance - amount;
  await db.update(wallets).set({
    balance: newBalance,
    totalSpent: wallet.totalSpent + amount,
  }).where(eq(wallets.userId, userId));

  await db.insert(walletTransactions).values({
    userId,
    type,
    amount: -amount,
    balanceBefore: wallet.balance,
    balanceAfter: newBalance,
    description,
    relatedId,
  });

  return { success: true, newBalance };
}

/** 获取交易记录 */
export async function getWalletTransactions(
  userId: number,
  limit = 20,
  offset = 0
): Promise<WalletTransaction[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(walletTransactions)
    .where(eq(walletTransactions.userId, userId))
    .orderBy(desc(walletTransactions.createdAt))
    .limit(limit)
    .offset(offset);
}

// ─── Coupons ──────────────────────────────────────────────────────────────────

/** 创建优惠券 */
export async function createCoupon(data: {
  code: string;
  type: "fixed" | "percent";
  value: number;
  minSpend?: number;
  maxDiscount?: number;
  totalCount?: number;
  perUserLimit?: number;
  targetUserId?: number;
  description?: string;
  expiresAt?: Date;
  createdBy: number;
}): Promise<Coupon | null> {
  const db = await getDb();
  if (!db) return null;
  await db.insert(coupons).values({
    ...data,
    usedCount: 0,
    isActive: true,
  });
  const rows = await db.select().from(coupons).where(eq(coupons.code, data.code)).limit(1);
  return rows[0] ?? null;
}

/** 验证并使用优惠券 */
export async function applyCoupon(
  code: string,
  userId: number,
  spendAmount: number
): Promise<{ success: boolean; discountAmount: number; coupon?: Coupon; error?: string }> {
  const db = await getDb();
  if (!db) return { success: false, discountAmount: 0, error: "DB unavailable" };

  const couponRows = await db.select().from(coupons).where(
    and(eq(coupons.code, code), eq(coupons.isActive, true))
  ).limit(1);
  const coupon = couponRows[0];
  if (!coupon) return { success: false, discountAmount: 0, error: "优惠券不存在或已失效" };

  // 检查过期
  if (coupon.expiresAt && coupon.expiresAt < new Date()) {
    return { success: false, discountAmount: 0, error: "优惠券已过期" };
  }

  // 检查总量
  if (coupon.totalCount !== null && coupon.usedCount >= coupon.totalCount) {
    return { success: false, discountAmount: 0, error: "优惠券已用完" };
  }

  // 检查最低消费
  if (spendAmount < coupon.minSpend) {
    return { success: false, discountAmount: 0, error: `最低消费 ${coupon.minSpend / 100} 元才可使用` };
  }

  // 检查指定用户
  if (coupon.targetUserId && coupon.targetUserId !== userId) {
    return { success: false, discountAmount: 0, error: "该优惠券不适用于您的账户" };
  }

  // 检查每人限用
  const usageCount = await db.select({ cnt: sql<number>`count(*)` })
    .from(couponUsages)
    .where(and(eq(couponUsages.couponId, coupon.id), eq(couponUsages.userId, userId)));
  if ((usageCount[0]?.cnt ?? 0) >= coupon.perUserLimit) {
    return { success: false, discountAmount: 0, error: "您已达到该优惠券的使用上限" };
  }

  // 计算折扣
  let discountAmount = 0;
  if (coupon.type === "fixed") {
    discountAmount = Math.min(coupon.value, spendAmount);
  } else {
    discountAmount = Math.floor(spendAmount * coupon.value / 100);
    if (coupon.maxDiscount) discountAmount = Math.min(discountAmount, coupon.maxDiscount);
  }

  return { success: true, discountAmount, coupon };
}

/** 列出所有优惠券（管理员） */
export async function listCoupons(): Promise<Coupon[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(coupons).orderBy(desc(coupons.createdAt)).limit(100);
}

/** 停用优惠券 */
export async function deactivateCoupon(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(coupons).set({ isActive: false }).where(eq(coupons.id, id));
}

/** 管理员查看所有用户钱包 */
export async function listWallets(limit = 50, offset = 0): Promise<Wallet[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(wallets).orderBy(desc(wallets.totalCharged)).limit(limit).offset(offset);
}
