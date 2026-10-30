// Source: update content.txt, the research group lead's text on philosophy, approach and vision.
export const IDENTITY = {
  short: 'UI & SI',
  full: 'Urban Informatics & Super Intelligence',
  line: 'Understanding Complex Cities and Designing Adaptive, Dynamic Systems & applications for Sustainable Cities and Livable Communities — with Super Intelligence + Great Love.',
  intro:
    'SmartMind is a collaborative research network bringing together undergraduate and postgraduate candidates, alumni, and researchers from the Department of Town & Country Planning, University of Moratuwa, Sri Lanka, alongside industry partners and local communities.',
  explore:
    'We explore cities as complex, adaptive, and dynamic systems, integrating urban science, urban data, urban sensing, urban computing, spatial intelligence, artificial intelligence, and collective human intelligence to transform how we understand, simulate, manage, design, and plan urban futures.',
  mindset:
    'Guided by the ORS Mindset — Open, Reproducible, and Simple, we envision Super Intelligence as the synergy of advanced technologies, human creativity, collective knowledge, and collaboration, grounded in empathy, compassion, and care for people, communities, and nature.',
} as const;

export const PILLARS = {
  philosophy: {
    key: 'philosophy',
    label: 'Our Philosophy',
    headline: 'Intelligence + Love',
    body: [
      'At SmartMind, we believe that intelligence alone is not enough to shape better cities. Truly meaningful urban innovation emerges when scientific knowledge, technological intelligence, and human creativity are combined with compassion, empathy, and responsibility towards people and nature.',
      'Our aspiration for Super Intelligence goes beyond the capabilities of artificial intelligence. It represents a collective vision in which human intelligence, advanced technologies, and diverse perspectives work together to understand urban complexity and address real-world challenges.',
    ],
  },
  approach: {
    key: 'approach',
    label: 'Our Approach',
    headline: 'Open · Reproducible · Simple',
    body: ['We embrace the ORS Mindset as the foundation of our research and innovation.'],
  },
  vision: {
    key: 'vision',
    label: 'Our Vision',
    headline: 'The Highest Intelligence, the Deepest Love',
    body: [
      'We aspire to advance Super Intelligence that combines the greatest potential of science, technology, and collective human wisdom with the deepest compassion for humanity and nature.',
      'Through this vision, we seek to make urban innovation not only more intelligent, but also more inclusive, responsible, sustainable, and meaningful for everyone.',
    ],
  },
} as const;

export const ORS = [
  {
    key: 'open',
    letter: 'O',
    label: 'Open',
    body: 'Making urban knowledge, methods, data, and tools accessible and encouraging collaboration and knowledge sharing.',
  },
  {
    key: 'reproducible',
    letter: 'R',
    label: 'Reproducible',
    body: 'Developing transparent, verifiable, and transferable research methods that others can understand, validate, adapt, and build upon.',
  },
  {
    key: 'simple',
    letter: 'S',
    label: 'Simple',
    body: 'Transforming complex urban science and advanced technologies into understandable, practical, and accessible solutions for planners, decision-makers, and communities.',
  },
] as const;

export const TEAM_CONTACTS = [
  { name: 'Amila Jayasinghe', phone: '0772777236', email: 'amilabj@uom.lk' },
  { name: 'Samith Madusanka', phone: '0714953771', email: 'nbsamith.madusanka@gmail.com' },
  { name: 'Sandaruwan Sankalpa', phone: '0776187852', email: 'silvawss.primary@gmail.com' },
] as const;

/** "0772777236" -> "077 277 7236" */
export const formatLkPhone = (p: string) => p.replace(/^(\d{3})(\d{3})(\d{4})$/, '$1 $2 $3');
/** "0772777236" -> "+94772777236" */
export const telHref = (p: string) => `tel:+94${p.replace(/^0/, '')}`;

export const COLLAB_INTRO = {
  eyebrow: 'An open invitation · Local & international partners',
  title: 'Collaborate With Us',
  lead: 'Co-creating intelligent, sustainable and livable cities through open urban technologies and citizen participation.',
  body: 'SmartMind UI & SI welcomes local and international researchers, undergraduate and postgraduate candidates, universities, public institutions, industry professionals, civil society organisations and local communities to collaborate with our ongoing projects in Urban Digital Twins, Citizen Science, Street Cloud and Urban AI Chatbots.',
  ways: {
    title: 'Ways to participate',
    body: [
      'We welcome joint research, international partnerships, research internships, urban pilot projects, open methods development, collaborative sensing, co-design workshops, field observations and participatory testing.',
      'Contributions may include research ideas, technical expertise, pilot locations, institutionally shareable data, community perspectives or opportunities to apply findings in real planning processes.',
    ],
  },
  principles: {
    title: 'Our shared principles',
    closing:
      'We aim to make urban research transparent, accessible, reproducible and useful to people and nature.',
  },
  cta: {
    title: 'Interested in collaborating?',
    body: 'Tell us which project interests you, include a brief collaboration idea, and mention the relevant project contact. Individual email addresses can be added after confirmation.',
    label: 'Connect via SmartMind website',
  },
} as const;
