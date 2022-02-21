import { MAIN_SEPARATOR, Path } from "./path.ts";
import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.126.0/testing/asserts.ts";

Deno.test("intro", () => {
  // Note: this example does work on Windows
  const path = new Path("./foo/bar.txt");

  const parent = path.parent();
  assertEquals!(parent, new Path("./foo"));

  const file_stem = path.fileStem();
  assertEquals!(file_stem, "bar");

  const extension = path.extension();
  assertEquals!(extension, "txt");
});

Deno.test("constructor", () => {
  const string = "foo.txt";
  const fromString = new Path(string);
  const formPath = new Path(fromString.toString());
  assertEquals(fromString, formPath);
});
Deno.test("toString", () => {
  const path = new Path("foo.txt");
  assertEquals(path.toString(), "foo.txt");
});
Deno.test("isAbsoulte", () => {
  const path = new Path("foo.txt");
  assert(!path.isAbsoulte());
});
Deno.test("isRelative", () => {
  const path = new Path("foo.txt");
  assert(path.isRelative());
});
Deno.test("hasRoot", () => {
  const path = new Path("/etc/passwd");
  assert(path.hasRoot());
});
Deno.test("parent", () => {
  const path = new Path("/foo/bar");
  const parent = path.parent()!;
  assertEquals(parent, new Path("/foo"));

  const grandParent = parent.parent()!;
  assertEquals(grandParent, new Path("/"));
  assertEquals(grandParent.parent(), undefined);
});
Deno.test("ancestors", () => {
  {
    const ancestors = new Path("/foo/bar").ancestors();
    assertEquals(ancestors.next().value, new Path("/foo/bar"));
    assertEquals(ancestors.next().value, new Path("/foo"));
    assertEquals(ancestors.next().value, new Path("/"));
    assertEquals(ancestors.next().value, undefined);
  }
  {
    const ancestors = (new Path("../foo/bar")).ancestors();
    assertEquals(ancestors.next().value, new Path("../foo/bar"));
    assertEquals(ancestors.next().value, new Path("../foo"));
    assertEquals(ancestors.next().value, new Path(".."));
    assertEquals(ancestors.next().value, new Path(""));
    assertEquals(ancestors.next().value, undefined);
  }
});
Deno.test("fileName", () => {
  assertEquals("bin", new Path("/usr/bin/").fileName());
  assertEquals("foo.txt", new Path("tmp/foo.txt").fileName());
  assertEquals("foo.txt", new Path("foo.txt/.").fileName());
  assertEquals("foo.txt", new Path("foo.txt/.//").fileName());
  assertEquals(undefined, new Path("foo.txt/..").fileName());
  assertEquals(undefined, new Path("/").fileName());
});

Deno.test("startsWith", () => {
  const path = new Path("/etc/passwd");
  assert(path.startsWith("/etc"));
  assert(path.startsWith("/etc/"));
  assert(path.startsWith("/etc/passwd"));
  assert(path.startsWith("/etc/passwd/")); // extra slash is okay
  assert(path.startsWith("/etc/passwd///")); // multiple extra slashes are okay

  assert(!path.startsWith("/e"));
  assert(!path.startsWith("/etc/passwd.txt"));

  assert(!new Path("/etc/foo.rs").startsWith("/etc/foo"));
});

Deno.test("stripPrefix", () => {
  const path = new Path("/test/haha/foo.txt");

  assertEquals(path.stripPrefix("/"), new Path("test/haha/foo.txt"));
  assertEquals(path.stripPrefix("/test"), new Path("haha/foo.txt"));
  assertEquals(path.stripPrefix("/test/"), new Path("haha/foo.txt"));
  assertEquals(path.stripPrefix("/test/haha/foo.txt"), new Path(""));
  assertEquals(path.stripPrefix("/test/haha/foo.txt/"), new Path(""));

  assert(path.stripPrefix("test") === undefined);
  assert(path.stripPrefix("/haha") === undefined);

  const prefix = new Path("/test/");
  assertEquals(path.stripPrefix(prefix), new Path("haha/foo.txt"));
});

Deno.test("endsWith", () => {
  const path = new Path("/etc/resolv.conf");

  assert(path.endsWith("resolv.conf".asPath()));
  assert(path.endsWith("etc/resolv.conf"));
  assert(path.endsWith("/etc/resolv.conf"));

  assert(!path.endsWith("/resolv.conf"));
  assert(!path.endsWith("conf")); // use .extension() instead
});

Deno.test("fileStem", () => {
  assertEquals("foo", new Path("foo.rs").fileStem());
  assertEquals("foo.tar", new Path("foo.tar.gz").fileStem());
  assertEquals(undefined, new Path("foo.rs/..").fileStem());
});
Deno.test("extension", () => {
  assertEquals("rs", new Path("foo.rs").extension());
  assertEquals("gz", new Path("foo.tar.gz").extension());
  assertEquals(undefined, new Path("foo.rs/..").extension());
});
Deno.test("join", () => {
  assertEquals(new Path("/etc").join("passwd"), new Path("/etc/passwd"));
  assertEquals(
    new Path("").join("passwd".asPath()),
    new Path("passwd"),
  );
});
Deno.test("withFileName", () => {
  {
    const path = new Path("/tmp/foo.txt");
    assertEquals!(path.withFileName("bar.txt"), new Path("/tmp/bar.txt"));
  }

  const path = new Path("/tmp");
  assertEquals!(path.withFileName("var"), new Path("//var")); // NOTE: Rust strips consecutive slashes
});
Deno.test("withExtension", () => {
  {
    const path = new Path("foo.rs");
    assertEquals!(path.withExtension("txt"), new Path("foo.txt"));
  }

  const path = new Path("foo.tar.gz");
  assertEquals!(path.withExtension(""), new Path("foo.tar"));
  assertEquals!(path.withExtension("xz"), new Path("foo.tar.xz"));
  assertEquals!(
    path.withExtension("").withExtension("txt"),
    new Path("foo.txt"),
  );
});
Deno.test("iter", () => {
  const it = new Path("/tmp/foo.txt").iter();
  assertEquals!(it.next().value, MAIN_SEPARATOR);
  assertEquals!(it.next().value, "tmp");
  assertEquals!(it.next().value, "foo.txt");
  assertEquals!(it.next().value, undefined);
});
Deno.test("canonicalize", () => {
  const path = new Path("/foo/test/../test/bar.rs");
  assertEquals!(path.canonicalize(), "/foo/test/bar.rs".asPath());
});
Deno.test("isDir", () => {
  assert(Deno.makeTempDirSync().asPath().isDir());
  assert(!Deno.makeTempFileSync().asPath().isDir());
  assert(!"".asPath().isDir());
});
Deno.test("isFile", () => {
  assert(Deno.makeTempFileSync().asPath().isFile());
  assert(!Deno.makeTempDirSync().asPath().isFile());
  assert(!"".asPath().isFile());
});
Deno.test("metaData", () => {
  assert(Deno.makeTempFileSync().asPath().metaData()?.isFile);
  assertEquals("".asPath().metaData(), undefined);
});
Deno.test("exists", () => {
  assert(Deno.makeTempFileSync().asPath().exists());
  assert(!"".asPath().exists());
});
Deno.test("readDir", () => {
  assertEquals([...Deno.makeTempDirSync().asPath().readDir()], []);
});
Deno.test("symLink", () => {
  const f = Deno.makeTempFileSync();
  Deno.symlinkSync(f, f + ".link");
  assert(new Path(f + ".link").isSymlink());
});
Deno.test("readLink", () => {
  const f = Deno.makeTempFileSync();
  Deno.symlinkSync(f, f + ".link");
  assertEquals(new Path(f + ".link").readLink(), f.asPath());
});
