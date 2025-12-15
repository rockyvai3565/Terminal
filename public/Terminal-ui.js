// Terminal UI rendering + commands (no frameworks)
export function bootTerminalUI({ root, onReadyText }) {
  const state = {
    tasks: loadTasks(),
    history: [],
    isMini: false
  };

  root.innerHTML = `
    <div class="wrap">
      <div class="top">
        <div class="badge" id="envBadge">WEB</div>
        <div class="title">
          <div class="name">Terminal List</div>
          <div class="sub">Type <span class="kw">help</span> to begin</div>
        </div>
      </div>

      <div class="screen" id="screen" role="region" aria-label="Terminal output"></div>

      <div class="inputRow">
        <span class="prompt">&gt;</span>
        <input id="cmd" class="cmd" inputmode="text" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="add: buy milk" />
        <span class="cursor" aria-hidden="true"></span>
      </div>

      <div class="hint">
        <span class="chip">add: text</span>
        <span class="chip">x: n</span>
        <span class="chip">undo</span>
        <span class="chip">export</span>
        <span class="chip">clear</span>
      </div>
    </div>
  `;

  const screen = root.querySelector("#screen");
  const cmd = root.querySelector("#cmd");
  const badge = root.querySelector("#envBadge");

  function setEnv(isMini) {
    state.isMini = !!isMini;
    badge.textContent = state.isMini ? "MINI" : "WEB";
    badge.classList.toggle("mini", state.isMini);
  }

  function print(line, cls="") {
    const div = document.createElement("div");
    div.className = `line ${cls}`.trim();
    div.textContent = line;
    screen.appendChild(div);
    screen.scrollTop = screen.scrollHeight;
  }

  function renderTasks() {
    if (!state.tasks.length) {
      print("no tasks yet — try: add: your next tiny win", "dim");
      return;
    }
    state.tasks.forEach((t, i) => {
      const mark = t.done ? "[x]" : "[ ]";
      const txt = `${i+1} ${mark} ${t.text}`;
      print(txt, t.done ? "done" : "");
    });
  }

  function help() {
    print("commands:", "dim");
    print("  help               show this");
    print("  add: <text>        add a task");
    print("  x: <n>             toggle done for item n");
    print("  del: <n>           delete item n");
    print("  clear              clear screen (keeps tasks)");
    print("  reset              delete ALL tasks");
    print("  export             copy tasks JSON to clipboard");
    print("  import: <json>     import tasks JSON");
    print("  today              add today's date as a divider");
    print("tips:", "dim");
    print("  press ↑ to recall last command");
  }

  function snapshot() {
    state.history.push(JSON.stringify(state.tasks));
    if (state.history.length > 50) state.history.shift();
  }

  function save() {
    localStorage.setItem("terminal_list_tasks_v1", JSON.stringify(state.tasks));
  }

  function loadTasks() {
    try {
      const raw = localStorage.getItem("terminal_list_tasks_v1");
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.map(t => ({ text: String(t.text ?? ""), done: !!t.done })).filter(t => t.text.length);
    } catch {
      return [];
    }
  }

  function clearScreen() {
    screen.innerHTML = "";
  }

  function addTask(text) {
    const t = text.trim();
    if (!t) return print("error: empty task", "err");
    snapshot();
    state.tasks.push({ text: t, done: false });
    save();
    clearScreen();
    renderTasks();
  }

  function toggle(n) {
    const i = n - 1;
    if (!Number.isFinite(i) || i < 0 || i >= state.tasks.length) return print("error: invalid index", "err");
    snapshot();
    state.tasks[i].done = !state.tasks[i].done;
    save();
    clearScreen();
    renderTasks();
  }

  function del(n) {
    const i = n - 1;
    if (!Number.isFinite(i) || i < 0 || i >= state.tasks.length) return print("error: invalid index", "err");
    snapshot();
    state.tasks.splice(i, 1);
    save();
    clearScreen();
    renderTasks();
  }

  function resetAll() {
    snapshot();
    state.tasks = [];
    save();
    clearScreen();
    renderTasks();
  }

  async function exportTasks() {
    const payload = JSON.stringify({ v: 1, tasks: state.tasks }, null, 0);
    try {
      await navigator.clipboard.writeText(payload);
      print("exported to clipboard ✓", "ok");
    } catch {
      print("copy failed — here is your JSON:", "err");
      print(payload);
    }
  }

  function importTasks(jsonText) {
    try {
      const obj = JSON.parse(jsonText);
      const arr = Array.isArray(obj) ? obj : obj.tasks;
      if (!Array.isArray(arr)) throw new Error("bad");
      snapshot();
      state.tasks = arr.map(t => ({ text: String(t.text ?? ""), done: !!t.done })).filter(t => t.text.length);
      save();
      clearScreen();
      renderTasks();
      print("imported ✓", "ok");
    } catch {
      print("error: invalid JSON for import", "err");
    }
  }

  function todayDivider() {
    const d = new Date();
    const label = d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
    addTask(`— ${label} —`);
  }

  let lastCmd = "";

  async function run(raw) {
    const input = raw.trim();
    if (!input) return;

    // echo command
    print(`> ${input}`, "dim");

    if (input === "help") return help();
    if (input === "clear") return clearScreen(), renderTasks();
    if (input === "reset") return resetAll();
    if (input === "undo") {
      const prev = state.history.pop();
      if (!prev) return print("nothing to undo", "dim");
      state.tasks = JSON.parse(prev);
      save();
      clearScreen();
      renderTasks();
      return print("undone ✓", "ok");
    }
    if (input === "export") return exportTasks();
    if (input === "today") return todayDivider();

    const addMatch = input.match(/^add:\s*(.+)$/i);
    if (addMatch) return addTask(addMatch[1]);

    const xMatch = input.match(/^x:\s*(\d+)$/i);
    if (xMatch) return toggle(parseInt(xMatch[1], 10));

    const delMatch = input.match(/^del:\s*(\d+)$/i);
    if (delMatch) return del(parseInt(delMatch[1], 10));

    const importMatch = input.match(/^import:\s*(.+)$/i);
    if (importMatch) return importTasks(importMatch[1]);

    print("unknown command — type help", "err");
  }

  // Initial render
  clearScreen();
  renderTasks();
  print(onReadyText || "ready ✓", "ok");

  // Focus + handlers
  root.addEventListener("pointerdown", () => cmd.focus());
  cmd.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const val = cmd.value;
      lastCmd = val.trim() || lastCmd;
      cmd.value = "";
      run(val);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      cmd.value = lastCmd;
      setTimeout(() => cmd.setSelectionRange(cmd.value.length, cmd.value.length), 0);
    }
  });

  return { setEnv };
}