export function k(l, w, r) {
  return { l: l, w: w || 1, r: r || "a" };
}

function mainRows() {
  return [
    [
      k("Esc", 1, "x"),
      k("!\n1"),
      k("@\n2"),
      k("#\n3"),
      k("$\n4"),
      k("%\n5"),
      k("^\n6"),
      k("&\n7"),
      k("*\n8"),
      k("(\n9"),
      k(")\n0"),
      k("_\n-"),
      k("+\n="),
      k("Backspace", 2, "m"),
    ],
    [
      k("Tab", 1.5, "m"),
      k("Q"),
      k("W"),
      k("E"),
      k("R"),
      k("T"),
      k("Y"),
      k("U"),
      k("I"),
      k("O"),
      k("P"),
      k("{\n["),
      k("}\n]"),
      k("|\n\\", 1.5, "m"),
    ],
    [
      k("Caps Lock", 1.75, "m"),
      k("A"),
      k("S"),
      k("D"),
      k("F"),
      k("G"),
      k("H"),
      k("J"),
      k("K"),
      k("L"),
      k(":\n;"),
      k("\"\n'"),
      k("Enter", 2.25, "x"),
    ],
    [
      k("Shift", 2.25, "m"),
      k("Z"),
      k("X"),
      k("C"),
      k("V"),
      k("B"),
      k("N"),
      k("M"),
      k("<\n,"),
      k(">\n."),
      k("?\n/"),
      k("Shift", 1.75, "m"),
      k("\u2191", 1, "m"),
    ],
    [
      k("Ctrl", 1.25, "m"),
      k("Win", 1.25, "m"),
      k("Alt", 1.25, "m"),
      k("", 6.25, "a"),
      k("Fn", 1, "m"),
      k("Ctrl", 1, "m"),
      k("\u2190", 1, "m"),
      k("\u2193", 1, "m"),
      k("\u2192", 1, "m"),
    ],
  ];
}

function rowsWithSide() {
  const r = mainRows();
  r[1].push(Object.assign(k("Del", 1, "m"), { x: 15.25 }));
  r[2].push(Object.assign(k("PgUp", 1, "m"), { x: 15.25 }));
  r[3].push(Object.assign(k("PgDn", 1, "m"), { x: 15.25 }));
  return r;
}

function rows60() {
  const r = mainRows();
  r[3] = [
    k("Shift", 2.25, "m"),
    k("Z"),
    k("X"),
    k("C"),
    k("V"),
    k("B"),
    k("N"),
    k("M"),
    k("<\n,"),
    k(">\n."),
    k("?\n/"),
    k("Shift", 1.75, "m"),
    k("Fn", 1, "m"),
  ];
  r[4] = [
    k("Ctrl", 1.25, "m"),
    k("Win", 1.25, "m"),
    k("Alt", 1.25, "m"),
    k("", 6.25, "a"),
    k("Alt", 1.25, "m"),
    k("Fn", 1.25, "m"),
    k("Menu", 1.25, "m"),
    k("Ctrl", 1.25, "m"),
  ];
  return r;
}

export const LAYOUTS = {
  60: {
    pct: "60%",
    name: "60% Compact",
    knob: false,
    total: 15,
    rows: rows60,
    tag: "No arrows, pure minimal",
  },
  65: {
    pct: "65%",
    name: "65% Standard",
    knob: false,
    total: 16.25,
    rows: rowsWithSide,
    tag: "Arrows and nav column",
  },
  75: {
    pct: "75%",
    name: "75% Pro",
    knob: true,
    total: 16.25,
    rows: rowsWithSide,
    tag: "Nav column and rotary knob",
  },
};
