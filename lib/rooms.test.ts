/// <reference types="node" />
import { test } from "node:test";
import assert from "node:assert/strict";
import { mySubjectId, normRoomCode } from "./rooms.ts";

const mine = [{ id: "s1", code: "CS102" }, { id: "s2", code: null }];

test("mySubjectId: วิชาของเรา / จับคู่รหัสวิชา / ไม่เจอ", () => {
  assert.equal(mySubjectId({ subject_id: "s1", course_code: "X" }, mine), "s1");
  assert.equal(mySubjectId({ subject_id: "friend", course_code: " cs102 " }, mine), "s1");
  assert.equal(mySubjectId({ subject_id: "friend", course_code: "MA101" }, mine), null);
  assert.equal(mySubjectId({ subject_id: null, course_code: null }, mine), null);
});

test("normRoomCode", () => {
  assert.equal(normRoomCode(" abcd-2345 "), "ABCD2345");
  assert.equal(normRoomCode("abc"), null);
});
