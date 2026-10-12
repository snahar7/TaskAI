/**
 * Demo mode: run Taflo with no accounts (no Firebase, no OpenAI, optionally no Postgres).
 *
 * DEMO_MODE=true|false forces it. Otherwise it turns on automatically when
 * OPENAI_API_KEY or the Firebase web config (VITE_FIREBASE_API_KEY) is missing.
 */
import type { AIBreakdown } from "./ai/gptAgent";

function parseFlag(value: string | undefined): boolean | undefined {
  if (value === undefined || value === "") return undefined;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

export function isDemoMode(): boolean {
  const explicit = parseFlag(process.env.DEMO_MODE);
  if (explicit !== undefined) return explicit;
  return !process.env.OPENAI_API_KEY || !process.env.VITE_FIREBASE_API_KEY;
}

export function demoModeReasons(): string[] {
  if (parseFlag(process.env.DEMO_MODE) === true) return ["DEMO_MODE=true"];
  const reasons: string[] = [];
  if (!process.env.OPENAI_API_KEY) reasons.push("OPENAI_API_KEY not set (canned AI breakdowns)");
  if (!process.env.VITE_FIREBASE_API_KEY) reasons.push("Firebase not configured (local demo login)");
  return reasons;
}

export const DEMO_USER = {
  email: "demo@taflo.local",
  firstName: "Demo",
  lastName: "User",
};

type Sub = [title: string, hours: number];
type Task = { title: string; description: string; urgency?: string; subtasks: Sub[] };
type Project = { title: string; description: string; urgency?: string; tasks: Task[] };
type Template = { keywords: RegExp; timeframe: string; projects: Project[] };

const TEMPLATES: Template[] = [
  {
    keywords: /newsletter|blog|podcast|content|substack|youtube|write|writing/,
    timeframe: "6 weeks",
    projects: [
      {
        title: "Positioning & audience",
        description: "Decide who it's for and why they'll subscribe.",
        urgency: "High",
        tasks: [
          { title: "Define the target reader", description: "Pick one audience and the problem you solve for them.", subtasks: [["Write a one-paragraph reader persona", 1], ["List 10 questions they ask", 1]] },
          { title: "Pick a name and promise", description: "A clear name plus a one-line value proposition.", subtasks: [["Brainstorm 20 names", 1], ["Test top 3 with 5 people", 2]] },
        ],
      },
      {
        title: "Setup & launch",
        description: "Get the publishing stack live with a landing page.",
        urgency: "Medium",
        tasks: [
          { title: "Choose a platform", description: "Compare Substack, Beehiiv and ConvertKit.", subtasks: [["Compare pricing and features", 1], ["Create account and brand settings", 1]] },
          { title: "Build the signup page", description: "Landing page with promise, sample and signup form.", subtasks: [["Write landing copy", 2], ["Add signup form and welcome email", 1]] },
        ],
      },
      {
        title: "First issues & growth",
        description: "Ship the first issues and get the first 100 subscribers.",
        urgency: "Medium",
        tasks: [
          { title: "Write issues #1-#3", description: "Batch the first three issues before launch.", subtasks: [["Outline 3 issues", 2], ["Draft and edit issue #1", 3], ["Draft issues #2-#3", 5]] },
          { title: "Launch to your network", description: "Announce on LinkedIn, X and by personal email.", subtasks: [["Write launch post", 1], ["DM 30 people who'd care", 2]] },
        ],
      },
    ],
  },
  {
    keywords: /launch|product|startup|app|saas|mvp|ship|website|side project/,
    timeframe: "8 weeks",
    projects: [
      {
        title: "Validate the problem",
        description: "Confirm people have the problem and would pay to solve it.",
        urgency: "High",
        tasks: [
          { title: "Customer interviews", description: "Talk to 10 potential users.", subtasks: [["Write an interview script", 1], ["Book 10 calls", 2], ["Synthesize findings", 2]] },
          { title: "Define the MVP scope", description: "The smallest version that solves the core problem.", subtasks: [["List must-have vs nice-to-have", 1], ["Write a one-page spec", 2]] },
        ],
      },
      {
        title: "Build the MVP",
        description: "Ship a working first version.",
        urgency: "High",
        tasks: [
          { title: "Core feature", description: "Build the one feature that delivers the value.", subtasks: [["Data model and API", 6], ["UI for the core flow", 8], ["Basic auth and onboarding", 4]] },
          { title: "Quality pass", description: "Make it reliable enough for real users.", subtasks: [["Fix top bugs", 4], ["Add analytics", 2]] },
        ],
      },
      {
        title: "Go to market",
        description: "Get the first users and learn from them.",
        urgency: "Medium",
        tasks: [
          { title: "Launch plan", description: "Landing page, waitlist and launch channels.", subtasks: [["Landing page", 4], ["Prepare Product Hunt / community posts", 2]] },
          { title: "First 20 users", description: "Onboard by hand and collect feedback.", subtasks: [["Personal onboarding calls", 4], ["Weekly feedback review", 1]] },
        ],
      },
    ],
  },
  {
    keywords: /learn|study|course|master|certif|language|skill|exam/,
    timeframe: "3 months",
    projects: [
      {
        title: "Plan the learning path",
        description: "Pick resources and set a weekly rhythm.",
        urgency: "High",
        tasks: [
          { title: "Choose resources", description: "One primary course plus one practice source.", subtasks: [["Shortlist 3 courses", 1], ["Pick one and enroll", 1]] },
          { title: "Set a schedule", description: "Block recurring study time.", subtasks: [["Block 4 sessions/week in calendar", 1]] },
        ],
      },
      {
        title: "Fundamentals",
        description: "Work through the core material.",
        urgency: "Medium",
        tasks: [
          { title: "Modules 1-4", description: "Cover the fundamentals with notes.", subtasks: [["Module 1-2 + notes", 6], ["Module 3-4 + notes", 6]] },
          { title: "Spaced review", description: "Flashcards and weekly recap.", subtasks: [["Create flashcards", 2], ["Weekly 30-min review", 2]] },
        ],
      },
      {
        title: "Apply it",
        description: "Prove the skill with a real project.",
        urgency: "Medium",
        tasks: [
          { title: "Capstone project", description: "Build or do something real with the skill.", subtasks: [["Pick a project", 1], ["Complete it", 10], ["Share what you learned", 2]] },
        ],
      },
    ],
  },
  {
    keywords: /marathon|run|fitness|gym|weight|health|workout|10k|5k/,
    timeframe: "12 weeks",
    projects: [
      {
        title: "Baseline & plan",
        description: "Know where you're starting and pick a plan.",
        urgency: "High",
        tasks: [
          { title: "Baseline assessment", description: "Measure current fitness.", subtasks: [["Timed test run / workout", 1], ["Log sleep and nutrition for a week", 1]] },
          { title: "Choose a training plan", description: "A progressive weekly plan.", subtasks: [["Pick a 12-week plan", 1], ["Schedule sessions", 1]] },
        ],
      },
      {
        title: "Training blocks",
        description: "Build up progressively.",
        urgency: "Medium",
        tasks: [
          { title: "Weeks 1-4: base", description: "Consistency over intensity.", subtasks: [["3-4 easy sessions/week", 12]] },
          { title: "Weeks 5-10: build", description: "Add intensity and long sessions.", subtasks: [["Weekly long session", 10], ["One interval session/week", 6]] },
          { title: "Weeks 11-12: taper", description: "Reduce volume, stay sharp.", subtasks: [["Taper plan", 4]] },
        ],
      },
    ],
  },
  {
    keywords: /job|career|interview|resume|promotion|hire|hiring|role/,
    timeframe: "6 weeks",
    projects: [
      {
        title: "Story & materials",
        description: "Sharpen your narrative and documents.",
        urgency: "High",
        tasks: [
          { title: "Update resume and LinkedIn", description: "Tailored to the target role.", subtasks: [["Rewrite resume bullets with results", 3], ["Refresh LinkedIn headline and about", 1]] },
          { title: "Target list", description: "Companies and roles worth pursuing.", subtasks: [["List 25 target companies", 2], ["Find a contact at each", 3]] },
        ],
      },
      {
        title: "Outreach & interviews",
        description: "Generate conversations and prepare.",
        urgency: "Medium",
        tasks: [
          { title: "Warm outreach", description: "Referrals beat cold applications.", subtasks: [["Send 5 messages/day", 5], ["Track replies", 1]] },
          { title: "Interview prep", description: "Stories and practice.", subtasks: [["Prepare 8 STAR stories", 3], ["2 mock interviews", 2]] },
        ],
      },
    ],
  },
];

const GENERIC: Template = {
  keywords: /.*/,
  timeframe: "4 weeks",
  projects: [
    {
      title: "Define success",
      description: "Make the goal concrete and measurable.",
      urgency: "High",
      tasks: [
        { title: "Clarify the outcome", description: "What does done look like?", subtasks: [["Write the outcome in one sentence", 1], ["Pick 2-3 success metrics", 1]] },
        { title: "Gather what you need", description: "Resources, people and constraints.", subtasks: [["List resources and blockers", 1], ["Ask one person for advice", 1]] },
      ],
    },
    {
      title: "Execute",
      description: "Do the work in focused steps.",
      urgency: "Medium",
      tasks: [
        { title: "First milestone", description: "The first visible step of progress.", subtasks: [["Plan the milestone", 1], ["Complete the milestone", 4]] },
        { title: "Second milestone", description: "Build on what worked.", subtasks: [["Adjust the plan", 1], ["Complete the milestone", 4]] },
      ],
    },
    {
      title: "Review & wrap up",
      description: "Check results and capture lessons.",
      urgency: "Low",
      tasks: [
        { title: "Review results", description: "Compare against your success metrics.", subtasks: [["Measure results", 1], ["Write a short retro", 1]] },
      ],
    },
  ],
};

function titleCase(s: string): string {
  const t = s.trim().replace(/\s+/g, " ");
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/** Canned, realistic goal -> project -> task -> subtask breakdown (no OpenAI). */
export function demoBreakdown(goalInput: string): AIBreakdown {
  const text = goalInput.toLowerCase();
  const template = TEMPLATES.find((t) => t.keywords.test(text)) ?? GENERIC;
  const today = new Date().toISOString().split("T")[0];
  return {
    goal: {
      title: titleCase(goalInput).slice(0, 120),
      description: `Demo breakdown for "${goalInput.trim()}". Add an OPENAI_API_KEY for a tailored AI plan.`,
      timeframe: template.timeframe,
    },
    projects: template.projects.map((p) => {
      const tasks = p.tasks.map((t) => {
        const subtasks = t.subtasks.map(([title, hours]) => ({
          title,
          description: title,
          urgency: t.urgency ?? p.urgency ?? "Medium",
          estimatedHours: hours,
          dueDate: today,
        }));
        return {
          title: t.title,
          description: t.description,
          urgency: t.urgency ?? p.urgency ?? "Medium",
          estimatedHours: subtasks.reduce((n, s) => n + s.estimatedHours, 0),
          dueDate: today,
          subtasks,
        };
      });
      return {
        title: p.title,
        description: p.description,
        urgency: p.urgency ?? "Medium",
        estimatedHours: tasks.reduce((n, t) => n + t.estimatedHours, 0),
        dueDate: today,
        tasks,
      };
    }),
  };
}

/** Canned "break this down further" response. */
export function demoBreakDownFurther(title: string, targetSubItems = 4) {
  const steps = ["Research and outline", "Draft a first version", "Review with someone", "Finalize and ship", "Follow up and measure"];
  const today = new Date().toISOString().split("T")[0];
  return {
    subItems: steps.slice(0, Math.max(2, Math.min(targetSubItems, steps.length))).map((s, i) => ({
      title: `${s}: ${title}`.slice(0, 120),
      description: `${s} for "${title}".`,
      urgency: i === 0 ? "High" : "Medium",
      estimatedHours: i === 1 ? 3 : 1,
      dueDate: today,
    })),
    analysis: {
      complexity: "medium",
      reasoning: "Demo mode: generic steps. Add an OPENAI_API_KEY for AI-tailored breakdowns.",
      suggestions: ["Timebox each step", "Share progress early"],
    },
  };
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------
import type { Express, Request, Response, NextFunction } from "express";
import { storage } from "./storage";

/**
 * - GET  /api/auth/config     -> { demoMode, reasons } (public; the client uses it to pick an auth mode)
 * - POST /api/auth/demo-login -> signs in as the shared Demo User. 404 unless demo mode is on.
 * - /api/ai-assist/*          -> 503 in demo mode (needs a real OpenAI key)
 */
export function registerDemoRoutes(app: Express) {
  app.get("/api/auth/config", (_req: Request, res: Response) => {
    res.json({ demoMode: isDemoMode(), reasons: isDemoMode() ? demoModeReasons() : [] });
  });

  app.post("/api/auth/demo-login", async (req: Request, res: Response, next: NextFunction) => {
    if (!isDemoMode()) {
      return res.status(404).json({ error: "Not found" });
    }
    try {
      let user = await storage.getUserByEmail(DEMO_USER.email);
      if (!user) {
        user = await storage.createUser({
          email: DEMO_USER.email,
          firstName: DEMO_USER.firstName,
          lastName: DEMO_USER.lastName,
          displayName: `${DEMO_USER.firstName} ${DEMO_USER.lastName}`,
          provider: "demo",
          emailVerified: true,
          inviteCode: `demo_${Date.now()}`,
          teamId: null,
        } as any);
        await storage.updateUser(user.id, { teamId: user.id } as any);
        user = (await storage.getUserById(user.id))!;
      }
      req.session.authenticated = true;
      (req.session as any).userId = user.id;
      (req.session as any).user = { id: user.id, email: user.email };
      req.session.save((err) => {
        if (err) return next(err);
        res.json({ user: { ...user, password: undefined }, demoMode: true });
      });
    } catch (error) {
      next(error);
    }
  });

  app.use("/api/ai-assist", (_req: Request, res: Response, next: NextFunction) => {
    if (!isDemoMode()) return next();
    res.status(503).json({ error: "AI Assist needs an OPENAI_API_KEY. It's disabled in demo mode." });
  });
}
