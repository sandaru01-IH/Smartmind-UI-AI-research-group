-- Smartmind: three partners the team named that the partners list did not have yet.
-- Existing rows are left alone, so running this twice adds nothing twice.
insert into public.partners (name, short, kind, place, url, sort_order)
select v.name, v.short, v.kind, v.place, v.url, v.sort_order
from (values
  ('National Transport Commission (NTC)', 'NTC', 'national', '', 'https://www.ntc.gov.lk', 100),
  ('CPCEC, Port City Colombo', 'Port City', 'national', '', null, 101),
  ('TU Dresden', 'TU Dresden', 'international', 'Germany', 'https://tu-dresden.de', 102)
) as v(name, short, kind, place, url, sort_order)
where not exists (select 1 from public.partners p where p.short = v.short);
