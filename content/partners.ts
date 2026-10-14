import type { Sourced } from './types';

export interface Partner extends Sourced {
  name: string;
  kind: 'national' | 'international';
  place?: string;
}

const SRC = 'Partners (table)';

// Source: this.md > "Partners". Text only. Logo use needs permission from each partner.
export const PARTNERS: Partner[] = [
  { name: 'Urban Development Authority (UDA)', kind: 'national' },
  { name: 'National Building Research Organization (NBRO)', kind: 'national' },
  { name: 'Sri Lanka Land Development Corporation (SLLDC)', kind: 'national' },
  { name: 'Mahaweli Authority of Sri Lanka', kind: 'national' },
  {
    name: 'OSGeo Sri Lanka Chapter and the National Spatial Data Infrastructure (NSDI) Program',
    kind: 'national',
  },
  { name: 'Gampaha Municipal Council', kind: 'national' },
  { name: 'Faculty of Technology, University of Sri Jayewardenepura', kind: 'national' },
  { name: 'Osaka City University', kind: 'international', place: 'Japan' },
  { name: 'Nagaoka University of Technology', kind: 'international', place: 'Japan' },
  { name: 'OSGeo Foundation', kind: 'international' },
  {
    name: 'Global Disaster Resilience Centre, University of Huddersfield',
    kind: 'international',
    place: 'UK',
  },
  { name: 'Indian Institute of Technology Kharagpur', kind: 'international', place: 'India' },
  {
    name: 'Department of Geodesy and Geoinformation, Vienna University of Technology',
    kind: 'international',
    place: 'Austria',
  },
  {
    name: 'Sustainable Places Research Institute, Cardiff University',
    kind: 'international',
    place: 'UK',
  },
].map((p) => ({ ...p, confirmation: 'confirmed' as const, source: SRC })) as Partner[];

// Source: this.md > "Partners", closing paragraph. Named in project news, not in the lab's partner list.
export const ALSO_NAMED: { name: string; context: string }[] = [
  { name: 'SUPSI, Switzerland', context: 'Named on the department’s research page (4ONSE)' },
  { name: 'University of Manchester, UK', context: 'Grant for the NBRO landslide chatbot' },
  { name: 'TU Dresden', context: 'Host of the Street Cloud presentation' },
  { name: 'Alexander von Humboldt Foundation and DAAD', context: 'Supporters of the Street Cloud presentation' },
];

export const LOGO_NOTE = 'Partner logos need permission from each partner. Names only for now.';
