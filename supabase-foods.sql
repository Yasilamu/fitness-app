create table if not exists public.foods (
  id text primary key,
  name text not null,
  protein numeric not null default 0,
  carbs numeric not null default 0,
  fat numeric not null default 0,
  calories numeric not null default 0,
  category text not null default 'other',
  is_active boolean not null default true,
  sort_order integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.foods enable row level security;

drop policy if exists "Public can read active foods" on public.foods;
create policy "Public can read active foods"
on public.foods
for select
to anon
using (is_active = true);

grant select on table public.foods to anon;

insert into public.foods (id, name, calories, protein, carbs, fat, category, sort_order)
values
  ('chicken-breast', '雞胸肉 熟', 165, 31, 0, 3.6, 'protein', 10),
  ('salmon', '鮭魚 熟', 206, 22, 0, 12.4, 'protein', 20),
  ('egg', '全蛋', 143, 12.6, 0.7, 9.5, 'protein', 30),
  ('tofu', '板豆腐', 76, 8.1, 1.9, 4.8, 'protein', 40),
  ('greek-yogurt', '希臘優格 無糖', 97, 9, 3.6, 5, 'protein', 50),
  ('white-rice', '白飯 熟', 130, 2.7, 28.2, 0.3, 'carb', 60),
  ('brown-rice', '糙米飯 熟', 123, 2.7, 25.6, 1, 'carb', 70),
  ('oats', '燕麥 乾', 389, 16.9, 66.3, 6.9, 'carb', 80),
  ('sweet-potato', '地瓜 熟', 90, 2, 20.7, 0.2, 'carb', 90),
  ('banana', '香蕉', 89, 1.1, 22.8, 0.3, 'carb', 100),
  ('apple', '蘋果', 52, 0.3, 13.8, 0.2, 'carb', 110),
  ('broccoli', '花椰菜 熟', 35, 2.4, 7.2, 0.4, 'veg', 120),
  ('spinach', '菠菜 熟', 23, 3, 3.8, 0.3, 'veg', 130),
  ('avocado', '酪梨', 160, 2, 8.5, 14.7, 'fat', 140),
  ('olive-oil', '橄欖油', 884, 0, 0, 100, 'fat', 150),
  ('almonds', '杏仁', 579, 21.2, 21.6, 49.9, 'fat', 160),
  ('milk', '牛奶 全脂', 61, 3.2, 4.8, 3.3, 'drink', 170),
  ('beef', '牛肉 瘦 熟', 217, 26.1, 0, 11.8, 'protein', 180),
  ('pork-loin', '豬里肌 熟', 196, 29, 0, 7.7, 'protein', 190),
  ('lentils', '扁豆 熟', 116, 9, 20.1, 0.4, 'carb', 200)
on conflict (id) do update set
  name = excluded.name,
  calories = excluded.calories,
  protein = excluded.protein,
  carbs = excluded.carbs,
  fat = excluded.fat,
  category = excluded.category,
  sort_order = excluded.sort_order,
  is_active = true,
  updated_at = now();
