# Static chapter summary JSON

The published series archive is `public/catalog/chapter-summaries.json`. It is bundled with the site and is read without Firestore or KV. Newer chapters are still loaded from Blogger S1/S2 and merged into the list.

To publish the static chapter archive:

1. In Admin settings, click **Export All Chapter JSON**. Admin scans every manga's `chapters` collection and excludes drafts.
2. Replace `public/catalog/chapter-summaries.json` with the downloaded `chapter-summaries-all.json`.
3. Review and deploy the updated JSON with the site.

Repeat the export and deploy after changing chapter numbers or deleting chapters. Static chapter links resolve to the reader route; loading the chapter content still uses its configured reader source. The scan reads all manga and chapter documents, so it requires Firestore read access while exporting.
