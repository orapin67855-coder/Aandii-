import assert from "node:assert/strict";
import test from "node:test";
import { ageError, codeError, confirmPasswordError, educationError, passwordError, usernameError } from "../src/lib/auth/rules.ts";
import { minutesFromSeconds, weekDateKeys } from "../src/lib/study/stats.ts";

test("password needs 8 chars, uppercase, lowercase, and a digit", () => {
  assert.equal(passwordError("short1A"), "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร");
  assert.match(passwordError("longpassword") ?? "", /พิมพ์ใหญ่/);
  assert.match(passwordError("LONGPASS1") ?? "", /พิมพ์เล็ก/);
  assert.match(passwordError("Longpassword") ?? "", /ตัวเลข/);
  assert.equal(passwordError("Longpass1"), null);
  assert.equal(codeError("12345"), "กรอกรหัส 6 หลักที่เป็นตัวเลข");
  assert.equal(codeError("123456"), null);
  assert.equal(confirmPasswordError("Longpass1", "Longpass2"), "รหัสยืนยันไม่ตรงกับรหัสใหม่");
});

test("username, age, and education stay within the account rules", () => {
  assert.equal(usernameError("ไข่"), null);
  assert.equal(usernameError("a"), "ชื่อผู้ใช้ต้องมี 2–24 ตัว");
  assert.equal(ageError(15), null);
  assert.ok(ageError(9));
  assert.equal(educationError("ม.6"), null);
  assert.ok(educationError("ปริญญา"));
});

test("a Bangkok Monday starts the recorded week", () => {
  const keys = weekDateKeys(new Date("2026-10-21T02:00:00Z"));
  assert.equal(keys[0], "2026-10-19");
  assert.equal(keys[2], "2026-10-21");
  assert.equal(minutesFromSeconds(125), 2);
});
