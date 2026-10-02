// Seed content: the Abide series and Week 3, taken from the reference index.html so the first
// render can be checked against it line for line.
import type { FooterSettings, ScheduleRow, WeekInput } from "./types";

export const SEED_FOOTER: FooterSettings = {
  address: "499 West US 61 Bypass,\nMuscatine, IA 52761",
  contact_heading: "Questions? Contact Tanner",
  email: "tanner@calvaryonline.org",
  phone: "(563) 316-2919",
  org_line: "Calvary Church, Muscatine",
};

const row = (id: string, band: string, time: string, item: string, item_note: string, detail: string, highlight = false): ScheduleRow => ({
  id,
  band,
  time,
  item,
  item_note,
  detail,
  highlight,
});

export const SEED_TEMPLATE: ScheduleRow[] = [
  row("arrive", "Setup", "5:30 PM", "Nexus Leaders Arrive", "15 min", "Food prep in the kitchen. Pray. Quick overview and Question of the Day. Break!", true),
  row(
    "doors",
    "Setup",
    "5:45 PM",
    "Doors Open",
    "",
    "Direct students to C2 (placemats for drawing, card games out).\nRegistration table and sign-in table set.\n**Small group leaders:** intentional connection time.",
  ),
  row("welcome", "Program", "6:00 PM", "Welcome / Prayer", "", "Welcome, brief overview and announcements, opening prayer.", true),
  row("dinner", "Program", "6:03 PM", "Dinner Served", "C2", "{meal}. Focus on intentional connection time (buffer)."),
  row("game", "Program", "6:35 PM", "Large Group Game", "Gym, until 7:05", "Small group rotation for dinner cleanup."),
  row("worship", "Program", "7:10 PM", "Worship", "", "2 to 3 songs, alternating between video and live worship each week (flexible)."),
  row("message", "Program", "7:25 PM", "Message", "", "15 to 20 mins (flexible).", true),
  row("smallgroup", "Program", "7:45 PM", "Small Group / Questions", "", "15 to 30 mins. Release groups to open gym once finished (flexible). Questions are listed below.", true),
  row("opengym", "Program", "8:00 PM", "Open Gym Until Close", "", "Some small groups might go longer (buffer)."),
  row("serves", "Close", "8:30 PM", "Nexus SERVES!", "", "Team helps with cleanup and closing down."),
];

export const SEED_SERIES = { name: "Abide", reference: "John 15", schedule_template: SEED_TEMPLATE };

export const DEFAULT_WELCOME_BLOCKS = [
  {
    heading: "Direct Students to C2",
    body: "Doors open at 5:45. **Direct students to C2.** Placemats for drawing and card games are out, and the registration and sign-in tables are set.",
    callouts: false,
  },
  { heading: "Intentional Connection Time", body: "", callouts: true },
];

export const DEFAULT_GLANCE_ROWS = [
  { label: "Leaders Arrive", time: "5:30 PM", detail: "Kitchen" },
  { label: "Night Starts", time: "6:00 PM", detail: "Welcome and prayer" },
  { label: "Small Group", time: "7:45 PM", detail: "Questions listed below" },
  { label: "Night Ends", time: "8:30 PM", detail: "Nexus SERVES! cleanup until 8:45" },
];

export const DEFAULT_HERO_TAGLINE = "Leaders arrive 5:30 PM";
export const DEFAULT_SMALL_GROUP_NOTE = "7:45 PM, 15 to 30 mins. Release groups to open gym once finished.";

// Nexus meets Sunday nights (the brief's example date, 2026-09-28, is a Monday).
export const SEED_WEEK: Omit<WeekInput, "series_id"> = {
  week_number: 3,
  service_date: "2026-09-27",
  hero_tagline: DEFAULT_HERO_TAGLINE,
  theme_verse_text: "As the Father has loved me, so have I loved you. Abide in my love.",
  theme_verse_reference: "John 15:9 (ESV)",
  main_idea: "Obedience is our response to abiding in Jesus, and joy is what he produces in us.",
  question_of_the_day: "What is one way you have abided the last two weeks?",
  meal: "Cereal bar",
  welcome_blocks: DEFAULT_WELCOME_BLOCKS,
  glance_rows: DEFAULT_GLANCE_ROWS,
  schedule_overrides: { rows: {}, added: [] },
  extra_sections: [],
  small_group_note: DEFAULT_SMALL_GROUP_NOTE,
  small_group_questions: [
    "Jesus says the whole reason he told them all of this was so their joy would be full. Does that surprise you? Why?",
    '"As the Father has loved me, so have I loved you." Already past tense. What does that change about the verse right after it?',
    "Jesus obeyed his Father, but the Father loved him before the world existed. So what was his obedience actually for?",
    'When you hear "keep my commandments," what\'s the first feeling that comes up?',
    "Where are you obeying God to earn something, instead of because you're already loved?",
    "Jesus' one command is to love each other. Who is hard for you to love right now?",
    "What's one way you can stay in his love this week?",
  ],
};
