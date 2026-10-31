# EasyPixCart

Photo ordering system for photographers, in the style of gotphoto.com. Clients open a gallery,
pick photos and products, and pay. Photographers manage galleries, price lists and orders.

Stack: Next.js (App Router) · Supabase (Postgres, Auth, Storage) · Stripe · Tailwind.

## Roadmap

1. **Foundation** — schema (`supabase/migrations`), photographer auth, env setup
2. **Rosters and galleries** — create gallery, import roster (CSV), bulk photo upload, watermarked previews
3. **Reference capture** — mobile page to snap a reference photo of each child, with consent flag
4. **Photo Match** — face matching of gallery photos against references, review queue for low confidence
5. **Family storefront** — family code opens that child's photos, lightbox, favorites
6. **Cart and checkout** — price lists, packages, Stripe checkout and webhook
7. **Orders** — admin dashboard, status flow, digital delivery, lab export
8. **Privacy** — purge references and face vectors when a gallery closes

Photo Match processes children's biometric data. Consent must be recorded before matching runs,
and reference photos and face vectors are deleted when the gallery closes.

## Develop

```bash
cp .env.example .env.local   # fill in Supabase + Stripe keys
npm run dev
```
