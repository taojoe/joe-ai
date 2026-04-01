import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const phProducts = sqliteTable('ph_products', {
  id: text('id').primaryKey(),
  date: text('date').notNull(),
  rank: integer('rank').notNull(),
  slug: text('slug').notNull(),
  title: text('title').notNull(),
  taglineZh: text('tagline_zh'),
  votes: integer('votes').default(0),
  url: text('url'),
  website: text('website'),
  topicsZh: text('topics_zh'), // JSON stringified array
  isAi: integer('is_ai', { mode: 'boolean' }).default(false),
  thumbnail: text('thumbnail'),
  descriptionHtml: text('description_html'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const phDates = sqliteTable('ph_dates', {
  date: text('date').primaryKey(),
  source: text('source').notNull().default('producthunt'),
  productCount: integer('product_count').default(0),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});
