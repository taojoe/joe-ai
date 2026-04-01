import { drizzle } from 'drizzle-orm/d1';
import { eq, desc } from 'drizzle-orm';
import { phProducts, phDates } from '../db/schema';

export type Db = ReturnType<typeof drizzle>;

export async function getProductsByDate(db: Db, date: string) {
  return db.select().from(phProducts)
    .where(eq(phProducts.date, date))
    .orderBy(phProducts.rank);
}

export async function getLatestDate(db: Db) {
  const result = await db.select({ date: phDates.date })
    .from(phDates)
    .where(eq(phDates.source, 'producthunt'))
    .orderBy(desc(phDates.date))
    .limit(1);
  return result[0]?.date ?? null;
}

export async function getAvailableDates(db: Db) {
  return db.select({
    date: phDates.date,
    productCount: phDates.productCount,
  }).from(phDates)
    .where(eq(phDates.source, 'producthunt'))
    .orderBy(desc(phDates.date));
}
