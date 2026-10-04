---
title: Code on slides
layout: cover
---

# Code on slides

Highlighting, line numbers, steps and diffs

---

# A code block

Name the language after the fence. Colours come from the theme.

```ts
export async function getUser(id: string): Promise<User> {
  const response = await fetch(`/api/users/${id}`);
  if (!response.ok) throw new Error(`No user ${id}`);
  return response.json();
}
```

---

# Titles and line numbers

```py lines title="report.py"
from collections import Counter

def top_words(text: str, count: int = 3) -> list[str]:
    words = Counter(text.lower().split())
    return [word for word, _ in words.most_common(count)]
```

`lines=10` starts counting at 10.

---

# A static highlight

One stage in `{…}` marks lines and takes no steps.

```ts {2,4}
const config = {
  port: 3030,
  host: "localhost",
  open: true,
};
```

---

# Walk through, one step at a time

```ts {1|2|3|all} lines
const user = await getUser(id);
const orders = await getOrders(user);
return summarize(orders);
```

<!-- notes
First we load the user.
[step]
Then the orders for that user.
[step]
Then we turn them into a summary.
[step]
Three lines, three requests: this is the part to make faster.
-->

---

# Code and text together

```sh {1|2}
npm install --save-dev @slidewright/cli
npx slidewright
```

Install the command once…

<!-- step 1 -->

…then present the deck from any folder.

<!-- notes
The second stage of the code takes step 1, and `step 1` shows the second
line of text with it.
-->


---

# What changed

```ts diff title="greet.ts"
export function greet(name: string) {
-  return "Hello " + name;
+  return `Hello, ${name}!`;
}
```

A `+` or `-` at the start of a line marks it added or removed.

---

# Paste from git diff

```css diff lines
 [data-deck] {
-  --deck-accent: #2563eb;
+  --deck-accent: #e11d48;
+  --deck-radius: 4px;
 }
```

When every unchanged line starts with a space, the space comes out too.

---
layout: two-cols
---

# Side by side

:::left
**Callbacks**

```js
read(file, (error, data) => {
  if (error) return fail(error);
  parse(data, done);
});
```
:::

:::right
**Async**

```js
const data = await read(file);
const result = parse(data);
```
:::
