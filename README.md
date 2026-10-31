# EasyPixCart

Photo ordering system for photographers, in the style of gotphoto.com. Clients open a gallery,
pick photos and products, and pay. Photographers manage galleries, price lists and orders.

Stack: Next.js (App Router) · Supabase (Postgres, Auth, Storage) · Stripe · Tailwind.

## Roadmap

1. **Foundation** — schema (`supabase/migrations`), photographer auth, env setup
2. **Galleries** — create gallery, bulk upload, watermarked previews and thumbnails
3. **Storefront** — gallery access by link or code, photo grid, lightbox, favorites
4. **Cart and checkout** — price lists, products, cart, Stripe checkout and webhook
5. **Orders** — admin dashboard, status flow, digital download delivery
6. **School/team workflow** — subjects, per-family codes, class rosters, packages
7. **Lab fulfillment** — export or API integration with a print lab

## Develop

```bash
cp .env.example .env.local   # fill in Supabase + Stripe keys
npm run dev
```
