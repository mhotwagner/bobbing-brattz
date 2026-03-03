// 4-char uppercase alpha codes, excluding ambiguous letters I/L/O
const CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ";

export function generateRoomCode() {
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return code;
}

export function isValidRoomCode(code) {
  if (typeof code !== "string") return false;
  if (code.length !== 4) return false;
  return /^[ABCDEFGHJKMNPQRSTUVWXYZ]{4}$/.test(code);
}
