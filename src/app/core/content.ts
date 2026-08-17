/**
 * Static marketing copy, structured from the prototype's DOCTORS / GROUPS /
 * CONDITIONS / DETAILS constants (Awesome Skin Clinic.dc.html). Doctor names,
 * bios and clinic contact details are placeholder-but-plausible content
 * standing in for what the clinic will eventually supply — replace with the
 * real details before launch. Every page pulls from these fields (rather
 * than hardcoding copy per-template) so there's one place to update.
 */

export interface Doctor {
  id: string;
  name: string;
  role: string;
  qualifications: string;
  /** Used in the booking wizard's doctor-picker card. */
  focus: string;
  /** Short teaser bio for the home page's "The doctor" section. */
  homeBio: string;
  /** Full bio for the /doctors page — one or two paragraphs. */
  bioParagraphs: readonly string[];
  /** Tag chips shown under the home page teaser. */
  homeTags: readonly string[];
  /** Fuller tag list shown under "Areas of expertise" on /doctors. */
  expertiseTags: readonly string[];
  /** One-line description used in the compact "also practising" card (home + /doctors). */
  cardBlurb: string;
}

export const DOCTORS: readonly Doctor[] = [
  {
    id: 'd1',
    name: 'Dr. Ishita Kulkarni',
    role: 'Consultant Dermatologist · Founder',
    qualifications: 'MBBS, MD (Dermatology, Venereology & Leprosy)',
    focus: 'Medical and aesthetic dermatology, acne, pigmentation, hair and scalp.',
    homeBio:
      "Dr. Kulkarni trained in dermatology at St. John's Medical College and has practised for over twelve years, with a particular interest in acne, pigmentation and hair loss. She founded Awesome Skin Clinic to offer unhurried, evidence-based care in a setting patients feel comfortable returning to.",
    bioParagraphs: [
      'Dr. Ishita Kulkarni completed her MBBS and MD in Dermatology, Venereology & Leprosy, followed by further training in laser and aesthetic procedures. Over more than twelve years of practice, she has treated a wide range of medical and cosmetic skin conditions, with particular expertise in acne, pigmentation, and hair and scalp disorders.',
      'She founded Awesome Skin Clinic with a simple aim: consultations that take the time to explain a diagnosis and the reasoning behind a treatment plan. Patients see her for the full course of their care rather than being passed between providers.',
    ],
    homeTags: ['Acne & acne scars', 'Pigmentation', 'Hair & scalp', 'Aesthetic dermatology'],
    expertiseTags: [
      'Acne & acne scars',
      'Pigmentation',
      'Eczema & psoriasis',
      'Hair loss & scalp care',
      'Chemical peels',
      'Laser treatments',
    ],
    cardBlurb: 'MBBS, MD (Dermatology). Founder of the clinic; leads on medical and aesthetic dermatology.',
  },
  {
    id: 'd2',
    name: 'Dr. Arjun Nair',
    role: 'Dermatologist',
    qualifications: 'MBBS, MD (Dermatology, Venereology & Leprosy)',
    focus: 'Acne, eczema and contact dermatitis, with a focus on paediatric and adolescent skin.',
    homeBio:
      'Dr. Nair joined the clinic after his residency and focuses on acne, eczema and contact dermatitis, seeing a number of younger patients and first-time visits. He works alongside Dr. Kulkarni on the clinic\'s broader treatment plans.',
    bioParagraphs: [
      'Dr. Arjun Nair completed his MBBS and MD in Dermatology, Venereology & Leprosy, and joined Awesome Skin Clinic after his residency. His practice is centred on acne, eczema and contact dermatitis, with a particular interest in paediatric and adolescent skin conditions.',
      'He works closely with Dr. Kulkarni on shared treatment plans, and is usually the first point of contact for younger patients and straightforward first consultations.',
    ],
    homeTags: ['Acne', 'Eczema & contact dermatitis', 'Paediatric dermatology'],
    expertiseTags: ['Acne', 'Eczema & contact dermatitis', 'Paediatric dermatology', 'Skin infections'],
    cardBlurb: 'MBBS, MD (Dermatology). Focuses on acne, eczema and contact dermatitis, including paediatric cases.',
  },
];

/** Whether the second doctor is shown on the site. Toggle when the clinic confirms staffing. */
export const SECOND_DOCTOR_ENABLED = true;

export interface TreatmentGroup {
  key: 'clinical' | 'aesthetic' | 'hair' | 'laser';
  title: string;
  blurb: string;
  items: string[];
}

export const GROUPS: readonly TreatmentGroup[] = [
  { key: 'clinical', title: 'Clinical Dermatology', blurb: 'Diagnosis and medical treatment of skin, hair and nail conditions.', items: ['Acne', 'Acne Scars', 'Pigmentation', 'Eczema', 'Psoriasis', 'Fungal Infections', 'Skin Infections', 'Sensitive Skin'] },
  { key: 'aesthetic', title: 'Aesthetic Dermatology', blurb: 'Treatments that improve skin texture, tone and signs of ageing.', items: ['Chemical Peels', 'Skin Rejuvenation', 'Anti-Ageing Treatments', 'Injectables', 'Skin Boosters', 'Open Pores'] },
  { key: 'hair', title: 'Hair & Scalp', blurb: 'Assessment and treatment of hair loss and scalp conditions.', items: ['Hair Loss', 'PRP', 'Scalp Treatments', 'Dandruff / Scalp Care'] },
  { key: 'laser', title: 'Laser Treatments', blurb: 'Laser-based care for hair reduction, pigment and skin resurfacing.', items: ['Laser Hair Reduction', 'Pigment Laser', 'Laser Resurfacing', 'Excessive Hair'] },
];

export interface ConditionEntry {
  name: string;
  group: string;
}

export const CONDITIONS: readonly ConditionEntry[] = [
  { name: 'Acne & Breakouts', group: 'Clinical Dermatology' },
  { name: 'Acne Scars', group: 'Clinical Dermatology' },
  { name: 'Pigmentation', group: 'Clinical Dermatology' },
  { name: 'Uneven Skin Tone', group: 'Aesthetic Dermatology' },
  { name: 'Hair Loss', group: 'Hair & Scalp' },
  { name: 'Dandruff', group: 'Hair & Scalp' },
  { name: 'Fine Lines & Wrinkles', group: 'Aesthetic Dermatology' },
  { name: 'Open Pores', group: 'Aesthetic Dermatology' },
  { name: 'Sensitive Skin', group: 'Clinical Dermatology' },
  { name: 'Skin Infections', group: 'Clinical Dermatology' },
  { name: 'Excessive Hair', group: 'Laser Treatments' },
  { name: 'Dry / Irritated Skin', group: 'Clinical Dermatology' },
];

export interface TreatmentStep {
  n: string;
  title: string;
  body: string;
}

export interface TreatmentDetail {
  group: string;
  name: string;
  intro: string;
  steps: TreatmentStep[];
}

export const DETAILS: Readonly<Record<TreatmentGroup['key'], TreatmentDetail>> = {
  clinical: {
    group: 'Clinical Dermatology', name: 'Acne & acne scars',
    intro: 'Acne is assessed by type, severity and what is driving it, then treated with a plan you can actually follow. Scarring is treated separately, once active acne is under control.',
    steps: [
      { n: '01', title: 'Consultation', body: 'The doctor examines the skin, reviews history, medication and skincare, and identifies the type of acne.' },
      { n: '02', title: 'Treatment plan', body: 'A written plan covering topical or oral treatment, skincare and, where indicated, in-clinic procedures.' },
      { n: '03', title: 'Review', body: 'Progress is reviewed at set intervals and the plan is adjusted rather than restarted.' },
      { n: '04', title: 'Scar treatment', body: 'Once acne is controlled, scarring is treated with the appropriate resurfacing or subcision approach.' },
    ],
  },
  aesthetic: {
    group: 'Aesthetic Dermatology', name: 'Chemical peels & rejuvenation',
    intro: 'Peels and rejuvenation are chosen for your skin type and concern, at a strength that is safe for it. Everything is explained before it is done.',
    steps: [
      { n: '01', title: 'Skin assessment', body: 'Skin type, sensitivity and current products are reviewed before anything is selected.' },
      { n: '02', title: 'Prep', body: 'Where needed, the skin is prepared for a period before the first session.' },
      { n: '03', title: 'Session', body: 'The procedure is carried out in clinic; you are told what to expect during and after.' },
      { n: '04', title: 'Aftercare & review', body: 'Written aftercare, then a review to decide whether further sessions are useful.' },
    ],
  },
  hair: {
    group: 'Hair & Scalp', name: 'Hair loss & scalp care',
    intro: 'Hair loss has several causes, and treatment only works when the cause is right. Assessment comes first, treatment second.',
    steps: [
      { n: '01', title: 'Diagnosis', body: 'Pattern, scalp condition and relevant history are examined; tests are advised only when they change the plan.' },
      { n: '02', title: 'Treatment plan', body: 'Medical treatment, in-clinic procedures such as PRP, or both, with a realistic timeline.' },
      { n: '03', title: 'Review', body: 'Response is reviewed over months, not weeks, with the plan adjusted as needed.' },
      { n: '04', title: 'Maintenance', body: 'What to continue, and for how long, is set out clearly.' },
    ],
  },
  laser: {
    group: 'Laser Treatments', name: 'Laser treatments',
    intro: 'Laser treatment is selected by skin type and target — hair, pigment or texture — and always begins with a patch assessment where appropriate.',
    steps: [
      { n: '01', title: 'Suitability check', body: 'The doctor confirms the laser is appropriate for your skin and concern.' },
      { n: '02', title: 'Test patch', body: 'Where indicated, a test area is treated before a full session.' },
      { n: '03', title: 'Session', body: 'Sessions are spaced at set intervals; the number depends on the area and response.' },
      { n: '04', title: 'Aftercare', body: 'Sun protection and aftercare are explained, with a review between sessions.' },
    ],
  },
};

/** Clinic contact details — placeholder-but-plausible; replace with the real details before launch. */
export const CLINIC = {
  name: 'Awesome Skin Clinic',
  addressLine1: '14, 2nd Cross, Indiranagar 100 Feet Road',
  addressLine2: 'Bengaluru, Karnataka — 560038',
  phoneDisplay: '+91 98450 12345',
  phoneHref: 'tel:+919845012345',
  emailDisplay: 'hello@awesomeskinclinic.in',
  emailHref: 'mailto:hello@awesomeskinclinic.in',
  hoursShort: 'Monday – Saturday · 9:00 AM – 1:00 PM, 4:00 PM – 8:00 PM',
  hoursShortSunday: 'Sunday · Closed',
  hoursTable: [
    ['Monday – Friday', '9:00 – 13:00 · 16:00 – 20:00'],
    ['Saturday', '9:00 – 13:00'],
    ['Sunday', 'Closed'],
  ] as const,
};
