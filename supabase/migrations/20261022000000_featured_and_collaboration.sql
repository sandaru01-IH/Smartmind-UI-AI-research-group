-- Smartmind: featured research (home page highlights) and the open invitation (collaboration projects).
--   * featured_research: key papers and projects such as Street Cloud, each with an admin-uploaded figure
--   * collab_projects: ongoing projects open to collaboration, each with a project contact (name, photo, details)
--   * three partners named by the team that were missing from the list
--   * the starting rows for both tables (inserted only while a table is empty, so re-running is safe)

create table public.featured_research (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'paper' check (kind in ('paper', 'project')),
  year integer not null check (year between 1900 and 2100),
  title text not null check (char_length(title) between 3 and 400),
  venue text not null default '' check (char_length(venue) <= 300),
  summary text not null default '' check (char_length(summary) <= 2000),
  key_partners text not null default '' check (char_length(key_partners) <= 600),
  href text check (href is null or href ~* '^https?://'),
  figure_path text,
  figure_caption text not null default '' check (char_length(figure_caption) <= 300),
  tbc boolean not null default false,
  visible boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.collab_projects (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 2 and 200),
  summary text not null default '' check (char_length(summary) <= 1500),
  contact_name text not null default '' check (char_length(contact_name) <= 120),
  contact_role text not null default '' check (char_length(contact_role) <= 200),
  contact_bio text not null default '' check (char_length(contact_bio) <= 600),
  contact_email text not null default '' check (char_length(contact_email) <= 200),
  contact_photo_path text,
  visible boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger featured_research_set_updated_at before update on public.featured_research
  for each row execute function public.set_updated_at();
create trigger collab_projects_set_updated_at before update on public.collab_projects
  for each row execute function public.set_updated_at();

alter table public.featured_research enable row level security;
alter table public.collab_projects enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['featured_research', 'collab_projects'] loop
    execute format('create policy "%1$s: public reads visible" on public.%1$s for select to anon, authenticated using (visible)', t);
    execute format('create policy "%1$s: admin reads all" on public.%1$s for select to authenticated using (public.is_admin())', t);
    execute format('create policy "%1$s: admin inserts" on public.%1$s for insert to authenticated with check (public.is_admin())', t);
    execute format('create policy "%1$s: admin updates" on public.%1$s for update to authenticated using (public.is_admin()) with check (public.is_admin())', t);
    execute format('create policy "%1$s: admin deletes" on public.%1$s for delete to authenticated using (public.is_admin())', t);
    execute format('revoke insert, update, delete, truncate on public.%1$s from anon', t);
  end loop;
end $$;

-- Partners the team named that the list did not have yet. Existing rows are left alone.
insert into public.partners (name, short, kind, place, url, sort_order)
select v.name, v.short, v.kind, v.place, v.url, v.sort_order
from (values
  ('National Transport Commission (NTC)', 'NTC', 'national', '', 'https://www.ntc.gov.lk', 100),
  ('CPCEC, Port City Colombo', 'Port City', 'national', '', null, 101),
  ('TU Dresden', 'TU Dresden', 'international', 'Germany', 'https://tu-dresden.de', 102)
) as v(name, short, kind, place, url, sort_order)
where not exists (select 1 from public.partners p where p.short = v.short);


-- ------------------------------------------------------------------ starting data
-- Loaded once, and only while the table is empty, so running this file again never duplicates rows.
-- Everything below is ordinary data: edit it, add to it or delete it from the admin (Site content).
-- Figures and contact photos are uploaded from the admin; none are stored here.

insert into public.featured_research
  (kind, year, title, venue, summary, key_partners, href, figure_caption, sort_order)
select * from (values
  ($q$project$q$, 2026, $q$Street Cloud: participatory street redesign$q$, $q$4th IOER Conference, Dresden$q$, $q$Citizens share ideas alongside street imagery. Generative and vision AI produce redesign scenarios, and planners and people iterate on them together. Presented at the 4th IOER Conference in Dresden, 22–24 September 2026, supported by the Alexander von Humboldt Foundation and DAAD and hosted by TU Dresden’s Chair of Mobility System Planning.$q$, $q$Sandaruwan Sankalpa Silva; Niroshan Sanjaya Bandara; Samith Madusanka — SmartMind, University of Moratuwa; TU Dresden$q$, null, '', 0),
  ($q$paper$q$, 2026, $q$Quantum-inspired pedestrian mobility modeling: Applying probabilistic spatial simulation to urban walkability and thermal comfort in Sri Lanka$q$, $q$PLOS ONE$q$, $q$This research introduces a quantum-inspired probabilistic approach to understanding and simulating pedestrian movement in complex urban environments. Combining spatial configuration, pedestrian infrastructure, connectivity, thermal comfort and crowding, the model predicts how walking patterns change across space and time. Applied to University Junction in Moratuwa, Sri Lanka, the research produces dynamic pedestrian probability maps and evaluates responses to barriers, congestion and environmental conditions. The framework offers an interpretable alternative to conventional pedestrian prediction techniques, supporting more effective street design, pedestrian infrastructure improvements and human-centred mobility planning. It demonstrates how interdisciplinary urban computing can translate sophisticated mathematical concepts into practical planning intelligence.$q$, $q$Malith Deshan; Chethika Abenayake — Urban Simulation Lab and SmartMind, University of Moratuwa$q$, $q$https://doi.org/10.1371/journal.pone.0348630$q$, $q$Figure 3 · Quantum-inspired modelling and validation workflow$q$, 1),
  ($q$paper$q$, 2026, $q$Data-driven framework for eco-sensitive planning and design: a game theory-enhanced LUCIS approach to human–elephant conflict in Sri Lanka$q$, $q$Frontiers in Sustainability$q$, $q$This study develops a data-driven spatial planning framework to address human–elephant conflict through ecological suitability analysis and game theory. Combining the Land Use Conflict Identification Strategy (LUCIS), geospatial datasets and stakeholder-informed criteria, the research evaluates competition between elephant habitats, agricultural activities and human settlements across Sri Lanka’s Dry Zone. The proposed approach identifies spatial conflict zones and simulates alternative land allocation strategies that balance conservation and development needs. The study demonstrates how urban informatics and spatial decision-making tools can support more responsible human–nature coexistence, offering planning insights for landscape conservation, regional development, ecological resilience and sustainable land management.$q$, $q$Lahiru Waduge; Gayesha Diwyanjali; Sandaruwan Sankalpa Silva; Chethika Abenayake; Chathura De Silva — SCREEN and Urban Simulation Lab, University of Moratuwa$q$, $q$https://doi.org/10.3389/frsus.2026.1838933$q$, $q$Figure 5 · Conflict-optimised land-use zoning map$q$, 2),
  ($q$paper$q$, 2025, $q$The Integration of IoT (Internet of Things) Sensors and Location-Based Services for Water Quality Monitoring: A Systematic Literature Review$q$, $q$Sensors$q$, $q$This research systematically reviews the integration of Internet of Things sensors and location-based services for monitoring urban water quality. It examines how IoT devices, GNSS positioning technologies, wireless communication and spatial data platforms can work together to provide continuous, geographically referenced environmental information. The review identifies technological advances, existing limitations and opportunities to develop affordable and accessible water monitoring systems. Particular attention is given to improving spatial and temporal data resolution, monitoring pollution, supporting early responses and facilitating collaborative environmental management. The study provides a foundation for future urban sensing platforms that connect real-time environmental observations with informed, location-specific planning decisions.$q$, $q$Niroshan Sanjaya Bandara; Günther Retscher — University of Moratuwa and TU Wien$q$, $q$https://doi.org/10.3390/s25061918$q$, $q$Figure 6 · Research-topic network linking IoT, positioning and water quality$q$, 3),
  ($q$paper$q$, 2024, $q$Real-Time Tracking Data and Machine Learning Approaches for Mapping Pedestrian Walking Behavior: A Case Study at the University of Moratuwa$q$, $q$Sensors$q$, $q$This research demonstrates how smartphone sensing and machine learning can reveal detailed pedestrian movement patterns in urban environments. Using location-based tracking data collected at the University of Moratuwa, the study analyses walking speeds, movement directions and temporal variations through unsupervised clustering techniques. The resulting maps identify pedestrian concentrations and variations in walking behaviour across the campus environment. By integrating real-time spatial data with advanced computational methods, the research offers a practical approach to identifying priority areas for pedestrian infrastructure improvements. It contributes to data-driven urban mobility planning by supporting safer, more accessible and pedestrian-friendly environments using widely available mobile technologies.$q$, $q$Harini Sawandi; Günther Retscher — University of Moratuwa and TU Wien$q$, $q$https://doi.org/10.3390/s24123822$q$, $q$Figure 7 · Morning pedestrian concentrations by walking-speed range$q$, 4),
  ($q$paper$q$, 2024, $q$Integrating Scientific and Stakeholder-Based Knowledge to Simulate Future Urban Growth Scenarios: Findings from Kurunegala and Galle, Sri Lanka$q$, $q$Sustainability$q$, $q$This study develops a participatory urban growth simulation framework that combines scientific analysis with stakeholder knowledge to explore alternative urban futures. Applied to Kurunegala and Galle in Sri Lanka, the research integrates open-source geospatial and simulation technologies, including GRASS GIS/FUTURES, cellular automata, agent-based modelling and land-use change simulation. Stakeholders participate in identifying development pressures, assessing suitability, defining alternative scenarios and evaluating simulation outputs. The research demonstrates how combining computational modelling with local knowledge can improve the relevance, transparency and acceptance of planning scenarios. It provides a practical pathway towards more collaborative, evidence-informed and inclusive urban development planning.$q$, $q$Farasath Hasan; Chethika Abenayake — University of Moratuwa; participating planning, environmental and community stakeholders$q$, $q$https://doi.org/10.3390/su162411161$q$, $q$Figure 10 · Six future-growth scenarios for Kurunegala and Galle$q$, 5),
  ($q$paper$q$, 2024, $q$A Game Theory-Based Decision-Making Framework for Sustainable Urban Planning: Optimizing Residential Density with the Aid of Machine Learning Techniques$q$, $q$FARU Journal$q$, $q$This research introduces a Game-Theoretic Interactive Decision-Making framework to support sustainable residential density planning. Combining machine learning, spatial suitability analysis and game theory, the study examines how developers and planning authorities make decisions within complex regulatory and economic environments. Applied to selected urban areas in Colombo and Dehiwala, the framework evaluates development suitability and alternative density decisions while considering competing stakeholder objectives. The research demonstrates how computational intelligence can improve the transparency and consistency of urban development decisions. It highlights the potential of integrating predictive models with interactive decision-making approaches to support practical, evidence-based planning and development management.$q$, $q$Tharindu Weragama; Farasath Hasan — University of Moratuwa; UDA experts and participating developers$q$, $q$https://doi.org/10.4038/faruj.v11i2.324$q$, $q$Figure 3 · Detailed game theory and machine learning research design$q$, 6),
  ($q$paper$q$, 2023, $q$Modelling vegetation land fragmentation in urban areas of Western Province, Sri Lanka using an Artificial Intelligence-based simulation technique$q$, $q$PLOS ONE$q$, $q$This study develops an artificial intelligence-based framework to understand and simulate vegetation fragmentation caused by urban development. Focusing on Sri Lanka’s Western Province, the research applies artificial neural networks and decision tree analysis to investigate the complex relationships between transportation accessibility, building density, vegetation patterns and landscape structure. The findings highlight accessibility growth as a major factor associated with vegetation fragmentation and identify vulnerable landscape characteristics. The developed model also simulates future fragmentation patterns, supporting spatially informed environmental management. The research demonstrates how GeoAI and landscape analysis can help planners anticipate ecological impacts and guide more sustainable urban development decisions.$q$, $q$Nesha Ranaweera; Chethika Abenayake; Niroshan Bandara; Chathura De Silva — Urban Simulation Lab, University of Moratuwa$q$, $q$https://doi.org/10.1371/journal.pone.0275457$q$, $q$Figure 14 · Predicted vegetation fragmentation across Western Province$q$, 7),
  ($q$paper$q$, 2023, $q$An Urban Density-Based Runoff Simulation Framework to Envisage Flood Resilience of Cities$q$, $q$Urban Science$q$, $q$This research explores how urban density and built-form characteristics influence surface runoff and flood vulnerability. Using three urban watershed case studies in Colombo, the study integrates urban form indicators, hydrological simulation, statistical analysis and AI-based decision trees to evaluate different development conditions. Thirteen urban density indicators are examined, with impervious surface coverage, open space ratios and road density emerging as important influences on runoff generation. The framework translates spatial modelling results into potential density-control and development interventions. It offers urban planners a systematic method for assessing flood risks, comparing development options and incorporating hydrological resilience into urban planning and design decisions.$q$, $q$Naduni Wijayawardana; Chethika Abenayake; Nuwan Dias — University of Moratuwa and University of Huddersfield$q$, $q$https://doi.org/10.3390/urbansci7010017$q$, $q$Figure 11 · Observed versus predicted urban flooding$q$, 8),
  ($q$paper$q$, 2022, $q$A Decision-Making Tool for Urban Planners: A Framework to Model the Interdependency among Land Use, Accessibility, Density, and Surface Runoff in Urban Areas$q$, $q$Sustainability$q$, $q$This study investigates the interconnected relationships among land use, transport accessibility, urban density and surface runoff to better understand the functioning of complex urban systems. Using four-dimensional analysis, decision trees and structural equation modelling, the research examines how changes in one urban characteristic influence other dimensions of the built environment. The framework moves beyond isolated planning indicators towards integrated spatial decision-making, revealing trade-offs between development intensity, accessibility and environmental performance. The research contributes to systems-based urban planning by demonstrating how computational approaches can support land-use decisions, zoning policy evaluation and climate-responsive development strategies that consider multiple interacting urban processes.$q$, $q$Samith Madusanka; Chethika Abenayake; Chaminda Perera — Urban Simulation Lab and University of Moratuwa$q$, $q$https://doi.org/10.3390/su14010522$q$, $q$Figure 11 · Four-dimensional relationships among urban variables$q$, 9),
  ($q$paper$q$, 2021, $q$Urban Boundary Demarcation—An iCN Model Approach$q$, $q$Social Sciences$q$, $q$This research presents an Intersection-Based Clustered Network (iCN) model for identifying urban boundaries through road network configuration. Rather than relying exclusively on administrative boundaries or conventional land-cover classifications, the approach examines how spatial connectivity and clustering reveal functional patterns of urban agglomeration. Applied to selected cities in Sri Lanka, the model identifies emerging urban clusters and demonstrates how network-based boundaries correspond with patterns derived from satellite imagery. Developed using open-source geospatial techniques, the approach offers a transparent and adaptable method for analysing urban expansion. It contributes to understanding the spatial organisation of cities and supports more realistic regional planning and urban growth assessment. i need to incoperate those research as key reseaches ( featured ones ) along with the streetcloud one, and make those highlight in like main page like that.$q$, $q$Hasintha Nawod Kalpana; Chethika Abenayake; P. K. S. Mahanama — Urban Simulation Lab, University of Moratuwa$q$, $q$https://doi.org/10.3390/socsci10120448$q$, $q$Figure 4 · Road intersection-based urban clusters at 400 m and 500 m$q$, 10)
) as v(kind, year, title, venue, summary, key_partners, href, figure_caption, sort_order)
where not exists (select 1 from public.featured_research);

insert into public.collab_projects
  (title, summary, contact_name, contact_role, contact_bio, contact_email, sort_order)
select * from (values
  ($q$Urban Digital Twins$q$, $q$Developing dynamic spatial representations of cities using geospatial data, urban sensing, modelling and simulation to inform master planning, scenario exploration and urban management.$q$, $q$Samith Madusanka$q$, $q$Project contact$q$, '', '', 1),
  ($q$Citizen Science Applications$q$, $q$Co-creating accessible tools through which residents can map local conditions, contribute observations and participate in understanding and improving their cities.$q$, $q$Niroshan Sanjaya Bandara$q$, $q$Project contact$q$, '', '', 2),
  ($q$Street Cloud · Participatory Street Redesign$q$, $q$Exploring AI-supported tools that enable communities and planning practitioners to visualise and evaluate alternative street designs and share ideas for more inclusive public spaces.$q$, $q$Sandaruwan Sankalpa$q$, $q$Project contact$q$, '', '', 3),
  ($q$Urban AI Chatbots$q$, $q$Exploring conversational AI interfaces that can make urban information, planning knowledge and digital research tools more understandable and accessible to diverse users.$q$, $q$Harini Sawandi$q$, $q$Project contact$q$, '', '', 4)
) as v(title, summary, contact_name, contact_role, contact_bio, contact_email, sort_order)
where not exists (select 1 from public.collab_projects);
