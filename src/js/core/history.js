const MAX = 50;
const stack = [];
let pos = -1;

export function pushState(snap) {
  stack.length = pos + 1;
  stack.push(snap);
  if (stack.length > MAX) stack.shift();
  pos = stack.length - 1;
}

export function undo() {
  if (pos <= 0) return null;
  pos--;
  return stack[pos];
}

export function redo() {
  if (pos >= stack.length - 1) return null;
  pos++;
  return stack[pos];
}

export function canUndo() {
  return pos > 0;
}

export function canRedo() {
  return pos < stack.length - 1;
}

export function resetHistory(snap) {
  stack.length = 0;
  stack.push(snap);
  pos = 0;
}
