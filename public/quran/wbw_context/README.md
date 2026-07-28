Contains context of a word used uniquely that additional context will help explain further about the word.

So, user would tap on a word they want to know about, and be given some interesting info/story/context about it. Not all words need this context because some words are clear or "consistent" enough in meaning.

Data is in JSON format with this specification:

- The key is the word, the value is the explanation
- Please always use proper markdown as your explanation.
- Explanation needs to be succinct yet broad. Do not use list.
- Markdown can't have table.
- Never use heading mark ie ##, do not use \*\* aka bold mark, but italic is fine.
- When explaining, no need "The word ... means" just directly say "Meaning 'xyz', it comes from" kind of direct style. Try to be succinct and less chatty, but cover and score all the points.
- If you have concluding paragraph like thus, just combine it with the earlier paragraph if possible
