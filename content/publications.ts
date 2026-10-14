import type { Sourced } from './types';

export interface Publication extends Sourced {
  id: string;
  year: number;
  title: string;
  venue: string;
  href?: string;
  /** Authors are listed only where this.md names them. */
  authors?: string;
}

const LIST = 'Publications (table of twelve lab-page papers)';

// Source: this.md > "Publications". The lab page lists twelve papers from 2019 to 2021.
export const LAB_PAPERS: Publication[] = [
  {
    id: 'sustainability-2021-accessibility',
    year: 2021,
    title:
      'A Modeling Framework: To analyze the Relationship between Accessibility, Land Use and Densities in Urban Areas',
    venue: 'Sustainability 13(2), 467',
    href: 'https://www.mdpi.com/2071-1050/13/2/467',
    confirmation: 'confirmed',
    source: LIST,
  },
  {
    id: 'ijsdp-2021-agglomeration',
    year: 2021,
    title: 'A Novel Approach to Measure the Pattern of Urban Agglomeration Based on the Road Network',
    venue: 'Int. J. of Sustainable Development and Planning 16(2)',
    href: 'https://www.iieta.org/journals/ijsdp/paper/10.18280/ijsdp.160205',
    confirmation: 'confirmed',
    source: LIST,
  },
  {
    id: 'jsalt-2021-nca',
    year: 2021,
    title: 'Network Centrality Assessment (NCA): Assessing the Transport Network Resilience to Urban Flooding',
    venue: 'Journal of South Asian Logistics and Transport 1(1)',
    href: 'https://slstl.lk/wp-content/uploads/2021/03/JSALT-1.1.6.pdf',
    confirmation: 'confirmed',
    source: LIST,
  },
  {
    id: 'jsalt-2021-bypass',
    year: 2021,
    title: 'An Investigation of the Effects of New Bypass Roads on Build Form in Small Towns in Sri Lanka',
    venue: 'Journal of South Asian Logistics and Transport 1(1)',
    href: 'https://slstl.lk/wp-content/uploads/2021/03/JSALT-1.1.1.pdf',
    confirmation: 'confirmed',
    source: LIST,
  },
  {
    id: 'faru-2020-population-resilience',
    year: 2020,
    title: 'An Alternative Approach to Assess the Residential Population Resilience to Urban Flooding',
    venue: 'FARU Journal 7',
    href: 'https://faruj.sljol.info/articles/10.4038/faruj.v7i0.30/galley/29/download/',
    confirmation: 'confirmed',
    source: LIST,
  },
  {
    id: 'ijitee-2020-spatial-population',
    year: 2020,
    title: 'A Novel Method to Model Spatial Distribution of Population',
    venue: 'IJITEE 9(3S)',
    href: 'https://www.ijitee.org/wp-content/uploads/papers/v9i3s/C10070193S20.pdf',
    confirmation: 'confirmed',
    source: LIST,
  },
  {
    id: 'jeasts-2019-population-centrality',
    year: 2019,
    title: 'Road Network Centrality based Model to Simulate Population Distribution',
    venue: 'Journal of the Eastern Asia Society for Transportation Studies 13',
    href: 'https://trid.trb.org/view/1681041',
    confirmation: 'confirmed',
    source: LIST,
  },
  {
    id: 'jeasts-2019-accessibility',
    year: 2019,
    title: 'Accessibility Assessment of Cities Based on Network Analysis and Centrality',
    venue: 'Journal of the Eastern Asia Society for Transportation Studies 13',
    href: 'https://trid.trb.org/view/1681034',
    confirmation: 'confirmed',
    source: LIST,
  },
  {
    id: 'secm-2019-flood-built-form',
    year: 2019,
    title: 'Scenario Analysis for Flood Resilient Built Form: Case of Colombo, Sri Lanka',
    venue: '10th Int. Conf. on Structural Engineering and Construction Management',
    href: 'https://www.researchgate.net/publication/344787436_SCENARIO_ANALYSIS_FOR_FLOOD_RESILIENT_BUILT_FORM-CASE_OF_COLOMBO_SRI_LANKA',
    confirmation: 'confirmed',
    source: LIST,
  },
  {
    id: 'ijitee-2019-population-growth',
    year: 2019,
    title: 'Simulation of Population Growth and Distribution based on Centrality of Road Network',
    venue: 'IJITEE 8(10S)',
    href: 'https://www.researchgate.net/publication/335813002_Simulation_of_Population_Growth_and_Distribution_based_on_Centrality_of_Road_Network',
    confirmation: 'confirmed',
    source: LIST,
  },
  {
    id: 'ijitee-2019-public-transport',
    year: 2019,
    title:
      'Network Centrality Analysis of Public Transport Systems: Developing a Strategic Planning Tool to Assess Passenger Attraction',
    venue: 'IJITEE 8(10S)',
    href: 'https://www.researchgate.net/publication/335812904_Network_Centrality_Analysis_of_Public_Transport_Systems_Developing_a_Strategic_Planning_Tool_to_Assess_Passenger_Attraction',
    confirmation: 'confirmed',
    source: LIST,
  },
  {
    id: 'methodsx-2019-traffic',
    year: 2019,
    title: 'A novel approach to model traffic on road segments of large-scale urban road networks',
    venue: 'MethodsX 6',
    href: 'https://www.sciencedirect.com/science/article/pii/S2215016119301128',
    confirmation: 'confirmed',
    source: LIST,
  },
];

// Source: this.md > "Chatbot journey", 20–22 May 2026 row, and "Sources" (opened in full).
export const CHATBOT_PAPERS: Publication[] = [
  {
    id: 'sciforum-2026-participatory-chatbot',
    year: 2026,
    title: 'A Participatory Chatbot for Strengthening Urban Flood and Landslide Resilience',
    venue: '1st International Online Conference on Urban Sciences (Sciforum)',
    href: 'https://sciforum.net/paper/31118',
    authors: 'Harini Sawandi, Sachin Mamoru and co-authors including Amila Jayasinghe',
    confirmation: 'confirmed',
    source: 'Chatbot journey; Sources (opened in full)',
  },
];

// Source: this.md > "Publications", closing paragraph. Seen in a staff profile snippet only.
export const UNVERIFIED_PAPERS: Publication[] = [
  {
    id: 'plos-one-2023-vegetation-fragmentation',
    year: 2023,
    title:
      'Modelling vegetation land fragmentation in the Western Province with AI-based simulation',
    venue: 'PLoS ONE',
    authors: 'Jayasinghe, Ranaweera, Abenayake, Bandara, De Silva',
    confirmation: 'tbc',
    source: 'Publications, paragraph after the table (staff profile snippet; verify before listing)',
  },
];

export const ALL_PUBLICATIONS: Publication[] = [
  ...CHATBOT_PAPERS,
  ...LAB_PAPERS,
  ...UNVERIFIED_PAPERS,
].sort((a, b) => b.year - a.year);

export const LISTED_PAPER_COUNT = LAB_PAPERS.length;
