# Quran audio uploader

This folder contains scripts to be used to upload verse recitation to Cloudflare R2 or such kind of storage.

To do:

1. Run the `hasher.rb` first, which will generate the checksum data for each recitation files.

Running this file should produce this kind of output:

```
HASH    ayats/shahtree/114003.mp3
HASH    ayats/shahtree/114004.mp3
HASH    ayats/shahtree/114005.mp3
HASH    ayats/shahtree/114006.mp3
HASH    ayats/shahtree/Audhubillah_Bismillah.mp3
HASH    ayats/shahtree/audhubillah.mp3
HASH    ayats/shahtree/bismillah.mp3
WRITE   ayats/shahtree/signatures.json
ALL DONE
```

1. Install npm and pnpx because we upload to R2 using `wrangler` tools.
1. Execute `pnpx wrangler login`
1. Run the `sync.rb`. It will produce a file like `except_shahtree.txt` which contains files to 'exclude' so that the next time we run `sync.rb`, it only sync audio files that have not been synced yet.
