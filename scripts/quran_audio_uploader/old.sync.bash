cd /home/adam.noto.hakarsa@edgecortix.local/Music/quran_audio_data/audio

find ayats -type f -print0 | while IFS= read -r -d '' file; do
  pnpx wrangler r2 object put "bilquran/$file" --file "$file" --remote
done
