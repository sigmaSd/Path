# Path

Simple attempt to port Rust Path API to Deno

https://doc.rust-lang.org/std/path/struct.Path.html

# Usage

```ts
import { Path } from "https://deno.land/x/rustpath/path.ts";
const path = new Path("/hello");
console.log(path.join("world"));
```
