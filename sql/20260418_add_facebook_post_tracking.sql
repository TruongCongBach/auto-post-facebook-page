alter table public.products
  add column if not exists posted_face_at timestamptz;

create table if not exists public.facebook_post_history (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  facebook_post_id text,
  status text not null check (status in ('posted', 'failed', 'skipped')),
  message text,
  images jsonb,
  posted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  error_message text
);

create index if not exists idx_products_posted_face_at
  on public.products (posted_face_at, created_at);

create index if not exists idx_facebook_post_history_product_created_at
  on public.facebook_post_history (product_id, created_at desc);
