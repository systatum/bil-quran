# Paginations

This folder contains paginations data, in this format:

```json
[
  {
    "part": 1,
    "chapterIds": [1],
    "verseNumbers": [[1, 7]]
  },
  {
    "part": 1,
    "chapterIds": [2],
    "verseNumbers": [[1, 5]]
  },
```

Each array item represents a page. In that page, you can see what are the Quranic chapters on that page, and for each chapter in that page, exactly from which verse to which verse?

This data allows us to do paginations. Name of the file indicates the pagination names.
