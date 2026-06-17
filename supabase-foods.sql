create table if not exists public.foods (
  id text primary key,
  name text not null,
  serving_amount numeric not null default 100,
  serving_unit text not null default 'g',
  serving_weight_g numeric not null default 100,
  serving_calories numeric not null default 0,
  serving_protein numeric not null default 0,
  serving_carbs numeric not null default 0,
  serving_fat numeric not null default 0,
  protein numeric not null default 0,
  carbs numeric not null default 0,
  fat numeric not null default 0,
  calories numeric not null default 0,
  category text not null default 'other',
  is_active boolean not null default true,
  sort_order integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.foods
  add column if not exists serving_amount numeric not null default 100,
  add column if not exists serving_unit text not null default 'g',
  add column if not exists serving_weight_g numeric not null default 100,
  add column if not exists serving_calories numeric not null default 0,
  add column if not exists serving_protein numeric not null default 0,
  add column if not exists serving_carbs numeric not null default 0,
  add column if not exists serving_fat numeric not null default 0;

create or replace function public.set_foods_per_100_from_serving()
returns trigger
language plpgsql
as $$
begin
  if new.serving_amount is null or new.serving_amount <= 0 then
    raise exception 'serving_amount must be greater than 0';
  end if;

  if new.serving_weight_g is null or new.serving_weight_g <= 0 then
    raise exception 'serving_weight_g must be greater than 0';
  end if;

  new.serving_unit := coalesce(nullif(trim(new.serving_unit), ''), 'g');
  new.calories := round((coalesce(new.serving_calories, 0) * 100 / new.serving_weight_g)::numeric, 1);
  new.protein := round((coalesce(new.serving_protein, 0) * 100 / new.serving_weight_g)::numeric, 1);
  new.carbs := round((coalesce(new.serving_carbs, 0) * 100 / new.serving_weight_g)::numeric, 1);
  new.fat := round((coalesce(new.serving_fat, 0) * 100 / new.serving_weight_g)::numeric, 1);
  new.updated_at := now();

  return new;
end;
$$;

drop trigger if exists foods_set_per_100_from_serving on public.foods;
create trigger foods_set_per_100_from_serving
before insert or update of serving_amount, serving_unit, serving_weight_g, serving_calories, serving_protein, serving_carbs, serving_fat
on public.foods
for each row
execute function public.set_foods_per_100_from_serving();

alter table public.foods enable row level security;

drop policy if exists "Public can read active foods" on public.foods;
create policy "Public can read active foods"
on public.foods
for select
to anon
using (is_active = true);

grant select on table public.foods to anon;

insert into public.foods (
  id,
  name,
  serving_amount,
  serving_unit,
  serving_weight_g,
  serving_calories,
  serving_protein,
  serving_carbs,
  serving_fat,
  category,
  sort_order
)
values
  ('chicken-breast', '雞胸肉 熟', 100, 'g', 100, 165, 31, 0, 3.6, 'protein', 10),
  ('salmon', '鮭魚 熟', 100, 'g', 100, 206, 22, 0, 12.4, 'protein', 20),
  ('egg', '全蛋', 1, '顆', 50, 72, 6.3, 0.4, 4.8, 'protein', 30),
  ('tofu', '板豆腐', 100, 'g', 100, 76, 8.1, 1.9, 4.8, 'protein', 40),
  ('greek-yogurt', '希臘優格 無糖', 100, 'g', 100, 97, 9, 3.6, 5, 'protein', 50),
  ('white-rice', '白飯 熟', 100, 'g', 100, 130, 2.7, 28.2, 0.3, 'carb', 60),
  ('brown-rice', '糙米飯 熟', 100, 'g', 100, 123, 2.7, 25.6, 1, 'carb', 70),
  ('oats', '燕麥 乾', 100, 'g', 100, 389, 16.9, 66.3, 6.9, 'carb', 80),
  ('sweet-potato', '地瓜 熟', 100, 'g', 100, 90, 2, 20.7, 0.2, 'carb', 90),
  ('banana', '香蕉', 1, '根', 118, 105, 1.3, 26.9, 0.4, 'carb', 100),
  ('apple', '蘋果', 1, '顆', 182, 95, 0.5, 25.1, 0.3, 'carb', 110),
  ('broccoli', '花椰菜 熟', 100, 'g', 100, 35, 2.4, 7.2, 0.4, 'veg', 120),
  ('spinach', '菠菜 熟', 100, 'g', 100, 23, 3, 3.8, 0.3, 'veg', 130),
  ('avocado', '酪梨', 100, 'g', 100, 160, 2, 8.5, 14.7, 'fat', 140),
  ('olive-oil', '橄欖油', 1, '湯匙', 15, 133, 0, 0, 15, 'fat', 150),
  ('almonds', '杏仁', 1, '份', 28, 162, 5.9, 6, 14, 'fat', 160),
  ('milk', '牛奶 全脂', 240, 'ml', 240, 146, 7.7, 11.5, 7.9, 'drink', 170),
  ('beef', '牛肉 瘦 熟', 100, 'g', 100, 217, 26.1, 0, 11.8, 'protein', 180),
  ('pork-loin', '豬里肌 熟', 100, 'g', 100, 196, 29, 0, 7.7, 'protein', 190),
  ('lentils', '扁豆 熟', 100, 'g', 100, 116, 9, 20.1, 0.4, 'carb', 200)
on conflict (id) do update set
  name = excluded.name,
  serving_amount = excluded.serving_amount,
  serving_unit = excluded.serving_unit,
  serving_weight_g = excluded.serving_weight_g,
  serving_calories = excluded.serving_calories,
  serving_protein = excluded.serving_protein,
  serving_carbs = excluded.serving_carbs,
  serving_fat = excluded.serving_fat,
  category = excluded.category,
  sort_order = excluded.sort_order,
  is_active = true,
  updated_at = now();
