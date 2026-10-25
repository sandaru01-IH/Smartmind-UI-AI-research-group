import type { Sourced } from './types';

export interface Partner extends Sourced {
  name: string;
  kind: 'national' | 'international';
  place?: string;
  /** Partner website. Left out when it has not been checked, and the tile then is not a link. */
  url?: string;
  /** Optional logo under public/partners/, once the partner gives permission. Shown in grey. */
  logo?: string;
  /** Short mark for the grey tile while there is no logo file. */
  short: string;
}

const SRC = 'Partners (table)';

// Source: this.md > "Partners". Text only. Logo use needs permission from each partner.
export const PARTNERS: Partner[] = [
  {
    name: 'Urban Development Authority (UDA)',
    short: 'UDA',
    url: 'https://www.uda.gov.lk',
    kind: 'national',
  },
  {
    name: 'National Building Research Organization (NBRO)',
    short: 'NBRO',
    url: 'https://www.nbro.gov.lk',
    kind: 'national',
  },
  { name: 'Sri Lanka Land Development Corporation (SLLDC)', short: 'SLLDC', kind: 'national' },
  {
    name: 'National Transport Commission (NTC)',
    short: 'NTC',
    url: 'https://www.ntc.gov.lk',
    kind: 'national',
  },
  { name: 'CPCEC, Port City Colombo', short: 'Port City', kind: 'national' },
  {
    name: 'Mahaweli Authority of Sri Lanka',
    short: 'MASL',
    url: 'https://www.mahaweli.gov.lk',
    kind: 'national',
  },
  {
    name: 'OSGeo Sri Lanka Chapter and the National Spatial Data Infrastructure (NSDI) Program',
    short: 'OSGeo LK',
    url: 'https://www.osgeo.org/local-chapters/osgeo-sri-lanka-lk-chapter',
    kind: 'national',
  },
  {
    name: 'Gampaha Municipal Council',
    short: 'GMC',
    url: 'http://gampaha.mc.gov.lk',
    kind: 'national',
  },
  {
    name: 'Faculty of Technology, University of Sri Jayewardenepura',
    short: 'USJ',
    url: 'https://tech.sjp.ac.lk',
    kind: 'national',
  },
  {
    name: 'Osaka City University',
    short: 'OCU',
    url: 'https://www.omu.ac.jp',
    kind: 'international',
    place: 'Japan',
  },
  {
    name: 'Nagaoka University of Technology',
    short: 'NUT',
    url: 'https://www.nagaokaut.ac.jp',
    kind: 'international',
    place: 'Japan',
  },
  {
    name: 'TU Dresden',
    short: 'TU Dresden',
    url: 'https://tu-dresden.de',
    kind: 'international',
    place: 'Germany',
  },
  { name: 'OSGeo Foundation', short: 'OSGeo', url: 'https://www.osgeo.org', kind: 'international' },
  {
    name: 'Global Disaster Resilience Centre, University of Huddersfield',
    short: 'GDRC',
    url: 'https://www.hud.ac.uk',
    kind: 'international',
    place: 'UK',
  },
  {
    name: 'Indian Institute of Technology Kharagpur',
    short: 'IIT KGP',
    url: 'https://www.iitkgp.ac.in',
    kind: 'international',
    place: 'India',
  },
  {
    name: 'Department of Geodesy and Geoinformation, Vienna University of Technology',
    short: 'TU Wien',
    url: 'https://www.geo.tuwien.ac.at',
    kind: 'international',
    place: 'Austria',
  },
  {
    name: 'Sustainable Places Research Institute, Cardiff University',
    short: 'SPRI',
    url: 'https://www.cardiff.ac.uk',
    kind: 'international',
    place: 'UK',
  },
].map((p) => ({ ...p, confirmation: 'confirmed' as const, source: SRC })) as Partner[];

// Source: this.md > "Partners", closing paragraph. Named in project news, not in the lab's partner list.
export const ALSO_NAMED: { name: string; context: string }[] = [
  { name: 'SUPSI, Switzerland', context: 'Named on the department’s research page (4ONSE)' },
  { name: 'University of Manchester, UK', context: 'Grant for the NBRO landslide chatbot' },
  { name: 'TU Dresden', context: 'Host of the Street Cloud presentation' },
  {
    name: 'Alexander von Humboldt Foundation and DAAD',
    context: 'Supporters of the Street Cloud presentation',
  },
];
