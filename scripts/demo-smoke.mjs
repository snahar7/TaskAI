// Smoke test for demo mode: boots nothing itself; point it at a running server.
//   BASE_URL=http://localhost:5000 node scripts/demo-smoke.mjs
const BASE = process.env.BASE_URL ?? `http://localhost:${process.env.PORT ?? 5000}`;
let cookie = "";

async function call(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: { "content-type": "application/json", ...(cookie && { cookie }) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const set = res.headers.get("set-cookie");
  if (set) cookie = set.split(";")[0];
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = undefined; }
  return { status: res.status, json, text };
}

function check(name, ok, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
  if (!ok) process.exitCode = 1;
}

async function waitForServer() {
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(BASE + "/api/auth/config")).ok) return; } catch {}
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`Server at ${BASE} did not come up`);
}

await waitForServer();

const page = await call("GET", "/");
check("GET / serves the app", page.status === 200 && page.text.includes('id="root"'));

const config = await call("GET", "/api/auth/config");
check("demo mode is on", config.json?.demoMode === true, JSON.stringify(config.json));

check("unauthenticated API is rejected", (await call("GET", "/api/goals")).status === 401);
check("dev-login stays disabled", (await call("POST", "/api/auth/dev-login", { userId: 1 })).status === 404);

const login = await call("POST", "/api/auth/demo-login");
check("demo login", login.status === 200 && login.json?.user?.email === "demo@taflo.local");

const me = await call("GET", "/api/auth/user");
check("session works", me.status === 200 && me.json?.email === "demo@taflo.local");

const bd = await call("POST", "/api/goals/breakdown", { goalInput: "Launch a newsletter in 6 weeks" });
const projects = bd.json?.breakdown?.projects ?? [];
check("canned goal breakdown", bd.status === 200 && projects.length >= 2, projects.map((p) => p.title).join(" | "));

const generic = await call("POST", "/api/goals/breakdown", { goalInput: "Organize the garage" });
check("generic fallback breakdown", generic.status === 200 && generic.json?.breakdown?.projects?.length >= 2);

const approve = await call("POST", "/api/goals/approve", { pendingId: bd.json?.pendingId, approved: true });
check("approve breakdown", approve.status === 200, approve.status !== 200 ? approve.text.slice(0, 200) : "");

const goals = await call("GET", "/api/goals");
check("goal saved", goals.status === 200 && goals.json?.some((g) => g.title?.includes("newsletter")));

const tasks = await call("GET", "/api/tasks/all");
const taskList = Array.isArray(tasks.json) ? tasks.json : tasks.json?.tasks ?? [];
check("tasks saved", tasks.status === 200 && taskList.length > 0, `${taskList.length} tasks`);

if (taskList[0]) {
  const further = await call("POST", `/api/tasks/${taskList[0].id}/breakdown`, {});
  check("break a task down further", further.status === 200, further.status !== 200 ? further.text.slice(0, 200) : "");
}

check("AI Assist explains it needs a key", (await call("POST", "/api/ai-assist/suggestions", {})).status === 503);

if (process.exitCode) console.log("\nDemo smoke test FAILED");
else console.log("\nDemo smoke test passed");
