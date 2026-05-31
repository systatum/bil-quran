#!/usr/bin/env ruby

# This script applies vowel marking to initial alif (ا)
# ONLY when the word is the START of a verse.
#
# Verse start is detected by a change in the "id" field:
# a new chapter:verse combination is treated as verse start.
#
# At verse start:
#
#   - transliteration starts with "u" -> add ḍammah (ُ)
#   - transliteration starts with "i" -> add kasrah (ِ)
#   - otherwise -> add fatḥah (َ)
#
# Conditions:
#
#   - word must start with plain alif (ا)
#   - alif must not already have a vowel mark
#
# Additional exclusion:
#
#   - skip if transliteration starts with "alif-"
#     (e.g. "alif-lam-meem-ra") to avoid incorrect assignment
#
# Examples:
#
#   12:9  اقْتُلُوا -> اُقْتُلُوا
#   2:1   الم        (alif-lam-meem) -> unchanged
#
# The file is rewritten as compact JSON:
# one object per line, no pretty-print formatting.

require "json"

FILE_TO_READ = "standard.json"

content = File.read(FILE_TO_READ, encoding: "UTF-8")
data = JSON.parse(content)

unless data.is_a?(Array)
  abort("Expected top-level JSON array")
end

def starts_with_vowel?(word)
  word.match?(/\Aا[َُِ]/u)
end

def skip_alif_sequence?(trans)
  trans.to_s.start_with?("alif-")
end

changed = 0
skipped = 0

changed_log = []
skipped_log = []

prev_id = nil

data.each do |entry|
  next unless entry.is_a?(Hash)

  id    = entry["id"].to_s
  word  = entry["word"].to_s
  trans = entry["trans"].to_s

  is_verse_start = (id != prev_id)
  prev_id = id

  unless is_verse_start
    skipped += 1
    skipped_log << "skipped #{id} #{word}"
    next
  end

  next if skip_alif_sequence?(trans)

  next unless word.start_with?("ا")
  next if starts_with_vowel?(word)

  vowel =
    if trans.start_with?("u")
      "اُ"
    elsif trans.start_with?("i")
      "اِ"
    else
      "اَ"
    end

  new_word = vowel + word[1..]

  entry["word"] = new_word

  changed += 1
  changed_log << "changed #{id} #{word} -> #{new_word}"
end

json =
  "[\n" +
  data.map { |obj| "  #{JSON.generate(obj)}" }.join(",\n") +
  "\n]\n"

File.write(FILE_TO_READ, json)

puts
puts "=== CHANGED ==="
changed_log.each { |line| puts line }

puts
puts "=== SKIPPED ==="
skipped_log.each { |line| puts line }

puts
puts "Total changed: #{changed}"
puts "Total skipped: #{skipped}"
