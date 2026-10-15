// Source: this.md > "What SmartMind is" (table) and "Suggested site map".
// Brand spelling is the client's answer to the spelling question: "Smartmind".
export const BRAND = {
  name: 'Smartmind',
  lab: 'Urban Simulation Lab',
  department: 'Department of Town & Country Planning',
  faculty: 'Faculty of Architecture',
  university: 'University of Moratuwa',
  country: 'Sri Lanka',
  /** Lab tagline, quoted exactly from the lab page. */
  tagline: 'Envisaging Cities: Makes Simulation Simplified',
  /** Page title suffix. Keeps the site distinct from other organisations named SmartMind. */
  titleSuffix: 'Smartmind, Urban Simulation Lab, University of Moratuwa',
  // Source: "Core idea" row, paraphrased.
  pitch:
    'Cities are now systems of systems. Conventional simulation reaches its limits there. Smartmind simplifies and reimagines how future cities are simulated.',
  callToAction: 'Join Smartmind on its journey',
} as const;

// Source: "University contact" row.
export const UNIVERSITY_CONTACT = {
  addressLines: ['Bandaranayake Mawatha', 'Moratuwa 10400', 'Sri Lanka'],
  phones: ['+94 11 2640051', '+94 11 2650301'],
  email: 'info@uom.lk',
} as const;

// Source: "Social" row and "Sources".
export const LINKS = {
  facebook: 'https://www.facebook.com/share/12KWJGHiFm3/?mibextid=wwXIfr',
  labPage: 'https://uom.lk/tcp/urban-simulation-lab',
  departmentResearch: 'https://uom.lk/tcp/research/ongoing-research',
} as const;

/** The address every "contact us" action opens. */
export const CONTACT_EMAIL = 'info@smartminduiai.com';
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL?.trim() || 'http://localhost:3000'
).replace(/\/$/, '');
