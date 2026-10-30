/**
 * DRAFT legal text for the community blog. It describes what the site actually does, in plain words,
 * but it has not been reviewed by a lawyer or by the Smartmind team. It must be read and approved
 * before the community blog goes live. Both pages show the draft notice until this is changed.
 */
export interface LegalSection {
  heading: string;
  body: string[];
}

export interface LegalDocument {
  title: string;
  lead: string;
  draftNotice: string;
  updated: string;
  sections: LegalSection[];
}

const DRAFT_NOTICE =
  'Draft: this text still needs to be reviewed by the Smartmind team before the community blog launches.';

export const TERMS: LegalDocument = {
  title: 'Terms of use',
  lead: 'The simple rules for writing, commenting and liking on the Smartmind community blog.',
  draftNotice: DRAFT_NOTICE,
  updated: '30 October 2026',
  sections: [
    {
      heading: 'Who can join',
      body: [
        'Anyone can register with a working email address. You need to confirm that address before you can write, comment or like.',
        'You are responsible for what happens under your account. Keep your password private.',
      ],
    },
    {
      heading: 'What you write',
      body: [
        'You keep the rights to what you write. By publishing a post or comment you let Smartmind show it on this website, in its lists, search and social previews, for as long as it stays published.',
        'Only write about things you have the right to share. Credit your sources. Do not copy other people’s work.',
      ],
    },
    {
      heading: 'What is not allowed',
      body: [
        'No hate, harassment, threats or personal attacks. No spam, adverts or scams. No private information about other people. Nothing unlawful.',
        'Posts and comments appear as soon as you publish them. Smartmind does not read them first.',
      ],
    },
    {
      heading: 'Moderation',
      body: [
        'A Smartmind administrator can hide a post or a comment that breaks these rules, and can block an account. Hiding does not change your words and does not delete them: a hidden post stays in your list, marked as hidden.',
        'Administrators cannot edit what you wrote. If you think something was hidden by mistake, contact the team.',
      ],
    },
    {
      heading: 'Your content and your account',
      body: [
        'You can edit, unpublish or delete your own posts and comments at any time.',
        'You can delete your account from your account page. Your posts and comments then stay on the site under the name Former member, unless you delete them first.',
      ],
    },
    {
      heading: 'No guarantees',
      body: [
        'Posts are the views of their writers, not of Smartmind or the University of Moratuwa. The site is provided as it is, and may change or be unavailable from time to time.',
      ],
    },
    {
      heading: 'Contact',
      body: [
        'Questions about these terms or a request to review a moderation decision: use the Contact page.',
      ],
    },
  ],
};

export const PRIVACY: LegalDocument = {
  title: 'Privacy notice',
  lead: 'What we keep about people who register, who can see it, and how to remove it.',
  draftNotice: DRAFT_NOTICE,
  updated: '30 October 2026',
  sections: [
    {
      heading: 'What we collect',
      body: [
        'When you register: your email address, a password (stored only in a scrambled form), and the name you choose.',
        'Later, if you add them: a photo and a short bio. Everything you write: posts, comments and likes.',
        'We also keep a login session so you stay signed in. The site remembers your light or dark theme choice in your browser.',
      ],
    },
    {
      heading: 'Who can see it',
      body: [
        'Public: your name, photo and bio, your published posts and your comments. Anyone on the internet can read them.',
        'Not public: your email address. Only the Smartmind administrators can see it, to spot spam and handle problems.',
        'Your likes are counted on posts but nobody sees who liked what.',
      ],
    },
    {
      heading: 'Why we use it',
      body: [
        'To run your account, show your writing, send the emails you ask for (confirming your address and resetting your password), and keep the site safe.',
        'We do not sell your data and we do not send marketing email.',
      ],
    },
    {
      heading: 'Who else handles it',
      body: [
        'The site’s database and file storage are provided by Supabase. Confirmation and password emails are sent through an email service provider chosen by the team. They handle your data only to provide these services.',
      ],
    },
    {
      heading: 'Deleting your account',
      body: [
        'You can delete your account at any time from your account page. We then remove your login, your email address, your name, photo and bio, and your likes.',
        'Your posts and comments stay on the site under the name Former member. If you want them gone, delete them before you delete your account, or ask us.',
      ],
    },
    {
      heading: 'Hidden content',
      body: [
        'If an administrator hides your post or comment, it stays in our database but is no longer shown to the public. You can still see your own hidden posts.',
      ],
    },
    {
      heading: 'Contact',
      body: ['To ask a question or make a request about your data, use the Contact page.'],
    },
  ],
};
