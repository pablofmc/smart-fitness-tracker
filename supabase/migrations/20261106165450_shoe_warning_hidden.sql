-- "Ocultar 7 días" on the shoe warning in Hoy (#47). Equipo always shows the warning.
alter table public.shoes add column warning_hidden_until date;

comment on column public.shoes.warning_hidden_until is 'Hoy hides the 90 % warning for this shoe until this day, inclusive.';
