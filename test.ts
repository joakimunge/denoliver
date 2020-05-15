import { assertEquals } from "https://deno.land/std/testing/asserts.ts";
import { isRoute, contentType } from "./utils.ts";

/* Utils */

Deno.test("isRoute", () => {
  const isRouteRequest = isRoute("/route/goes/here");
  assertEquals(isRouteRequest, true);
});

Deno.test("isRoute", () => {
  const isRouteRequest = isRoute("http://www.someurl.com/test");
  assertEquals(isRouteRequest, true);
});

Deno.test("isRoute", () => {
  const isRouteRequest = isRoute("http://www.someurl.com/main.js");
  assertEquals(isRouteRequest, false);
});

Deno.test("contentType", () => {
  const type = contentType("/path/to/image.jpg");
  assertEquals(type, "image/jpg");
});

Deno.test("contentType", () => {
  const type = contentType("/path/to/dataset.json");
  assertEquals(type, "application/json");
});

Deno.test("contentType", () => {
  const type = contentType("/path/to/app.exe");
  assertEquals(type, "application/octet-stream");
});
