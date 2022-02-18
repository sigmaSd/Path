import * as path from "https://deno.land/std@0.126.0/path/mod.ts";

declare global {
  interface String {
    asPath(): Path;
  }
}
String.prototype.asPath = function (): Path {
  return new Path(this.toString());
};

export class Path {
  private path: string;
  constructor(path: string) {
    this.path = path;
  }
  toString(): string {
    return this.path;
  }
  isAbsoulte(): boolean {
    return path.isAbsolute(this.path);
  }
  isRelative(): boolean {
    return !this.isAbsoulte();
  }
  hasRoot(): boolean {
    return this.parent() !== undefined;
  }
  parent(): Path | undefined {
    const parsedPath = path.parse(this.path);
    if (parsedPath.base === "") {
      return undefined;
    }
    return new Path(parsedPath.dir);
  }
  ancestors(): Ancestors {
    return new Ancestors(this);
  }
  fileName(): string | undefined {
    const base = path.parse(this.path).base;
    if (base === "" || base === "..") {
      // Rust does this
      return undefined;
    }
    return path.basename(path.resolve(this.path));
  }
  isDir(): boolean {
    try {
      return Deno.statSync(this.path).isDirectory;
    } catch {
      return false;
    }
  }
  isFile(): boolean {
    try {
      return Deno.statSync(this.path).isFile;
    } catch {
      return false;
    }
  }
  join(otherPath: Path | string): Path {
    if (typeof otherPath === "string") {
      return new Path(customJoin(this.path, otherPath));
    } else {
      return new Path(customJoin(this.path, otherPath.path));
    }
  }
  iter(): string[] {
    const ancestors = this.ancestors();
    const iterArray = [];
    const valName = (val: Path) => {
      const n = path.basename(val.toString());
      if (n === "") {
        if (path.dirname(val.toString()) === ".") {
          return undefined;
        }
        return path.dirname(val.toString());
      } else {
        return n;
      }
    };
    while (true) {
      const next = ancestors.next();
      if (!next.done) {
        const maybePath = valName(next.value);
        if (maybePath) {
          iterArray.push(maybePath);
        }
      } else {
        break;
      }
    }
    return iterArray.reverse();
  }
  stripPrefix(argPath: Path | string): Path | undefined {
    if (!this.startsWith(argPath)) {
      return undefined;
    }
    const otherPath = (typeof argPath === "string")
      ? new Path(argPath)
      : argPath;
    const me = [...this.iter()];
    const other = [...otherPath.iter()];
    if (me.every((v, i) => v === other[i])) {
      return new Path("");
    }
    return new Path(
      me.slice(other.length).reduce((p, c) => {
        return customJoin(p, c);
      }),
    );
  }
  equals(otherPath: Path): boolean {
    const me = path.parse(this.path);
    const other = path.parse(otherPath.path);
    return me.root === other.root && me.dir === other.dir &&
      me.base === other.base && me.ext === other.ext && me.name === other.name;
  }
  startsWith(argPath: Path | string): boolean {
    const otherPath = (typeof argPath === "string")
      ? new Path(argPath)
      : argPath;
    const me = [...this.iter()];
    const other = [...otherPath.iter()];
    for (const i of [...Array(other.length).keys()]) {
      if (!new Path(me[i]).equals(new Path(other[i]))) {
        return false;
      }
    }
    return true;
  }
  endsWith(argPath: Path | string): boolean {
    const otherPath = (typeof argPath === "string")
      ? new Path(argPath)
      : argPath;
    const me = [...this.iter()].reverse();
    const other = [...otherPath.iter()].reverse();
    for (const i of [...Array(other.length).keys()]) {
      if (!new Path(me[i]).equals(new Path(other[i]))) {
        return false;
      }
    }
    return true;
  }
  fileStem(): string | undefined {
    const split = this.fileName()?.split(".");
    if (split) {
      return split.slice(0, split?.length - 1).join(".");
    }
  }
  extension(): string | undefined {
    const split = this.fileName()?.split(".");
    if (split) {
      return split.slice(split?.length - 1)[0];
    }
  }
  metaData(): Deno.FileInfo | undefined {
    try {
      return Deno.statSync(this.path);
    } catch {
      undefined;
    }
  }
  canonicalize(): Path {
    return new Path(path.resolve(this.path));
  }
  readLink(): Path {
    return new Path(Deno.readLinkSync(this.path));
  }
  readDir(): Iterable<Deno.DirEntry> {
    return Deno.readDirSync(this.path);
  }
  exists(): boolean {
    if (this.metaData()) {
      return true;
    } else return false;
  }
  isSymlink(): boolean {
    return Deno.statSync(this.path).isSymlink;
  }
  withFileName(name: string): Path {
    return this.parent() ? this.parent()!.join(name) : name.asPath();
  }
  withExtension(ext: string): Path {
    if (this.fileStem()) {
      const base = this.fileStem()!.toString();
      return ext ? new Path(base + "." + ext) : base.asPath();
    } else {
      return "".asPath();
    }
  }
}

export class Ancestors implements Iterator<Path> {
  startPath: Path | undefined;
  constructor(startPath: Path) {
    this.startPath = startPath;
  }
  next(): IteratorResult<Path, undefined> {
    const nextPath = this.startPath;
    if (this.startPath) {
      this.startPath = this.startPath.parent();
      return { done: false, value: nextPath! }; //nextPath is defined
    } else {
      return { done: true, value: undefined };
    }
  }
  *[Symbol.iterator]() {
    const next = this.next();
    if (!next.done) {
      yield next.value;
    }
  }
}

function customJoin(...paths: string[]): string {
  if (paths.length === 0) return ".";
  let joined: string | undefined;
  for (let i = 0, len = paths.length; i < len; ++i) {
    const path = paths[i];
    if (path.length > 0) {
      if (!joined) joined = path;
      else joined += `/${path}`;
    }
  }
  if (!joined) return ".";
  return joined;
}

export const MAIN_SEPARATOR = path.SEP;
