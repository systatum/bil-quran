#!/usr/bin/env ruby

# This script can be used to normalize this kind of behavior:
#
# "6:157:34": "adalah mereka",
# "6:157:35": "mereka berpaling",
# "7:163:26": "adalah mereka",
# "7:163:27": "mereka berbuat fasik",
#
# So the last word is written, and then showing again as the
# first word on the next verse. It's unnecessary. In such
# occurrence, we remove any word preceding the first verse's
# and then remove the repeated word from the start of the next
# verse, thus, it becomes:
#
# "6:157:34": "mereka",
# "6:157:35": "berpaling",
#
# Also, we check that if there's a word in parantheses of
# the current word, and if it appears on the previous word
# but not in parentheses, then the word in parentheses needs
# to be removed as well, for example:
#
# "7:170:1": "dan mereka yang",
# "7:170:2": "(mereka) berpegang teguh",
#
# Should be:
#
# "7:170:1": "dan mereka yang",
# "7:170:2": "berpegang teguh",

require "json"

puts "Path to JSON file:"
path = STDIN.gets&.strip

abort("No file specified.") if path.nil? || path.empty?

data = JSON.parse(File.read(path))

keys = data.keys.sort_by { |k| k.split(":").map(&:to_i) }

SPECIAL_LEADING_WORDS = %w[
  sesungguhnya
  sungguh
].freeze

def first_word_ignoring_parentheses(text)
  first = text.strip.split(/\s+/, 2).first
  return nil if first.nil? || first.empty?

  if first.match?(/^\([^)]+\)$/)
    first[1..-2]
  else
    first
  end
end

def remove_first_word(text)
  words = text.strip.split(/\s+/)
  words.shift
  words.join(" ")
end

(0...(keys.length - 1)).each do |i|
  prev_key = keys[i]
  curr_key = keys[i + 1]

  prev_text = data[prev_key].to_s.strip
  curr_text = data[curr_key].to_s.strip

  prev_words = prev_text.split(/\s+/)
  curr_words = curr_text.split(/\s+/)

  next if prev_words.empty? || curr_words.empty?

  prev_last = prev_words.last
  curr_first = first_word_ignoring_parentheses(curr_text)

  # No overlap
  next unless prev_last.casecmp?(curr_first)

  #
  # Case 1:
  #
  #   sesungguhnya B
  #   B
  #
  # =>
  #
  #   sesungguhnya
  #   B
  #
  # and
  #
  #   sesungguhnya B
  #   B C...
  #
  # =>
  #
  #   sesungguhnya
  #   B C...
  #
  if prev_words.length == 2 &&
     SPECIAL_LEADING_WORDS.any? { |w| w.casecmp?(prev_words.first) }

    data[prev_key] = prev_words.first
    next
  end

  #
  # Case 2:
  #
  #   A B
  #   B
  #
  # =>
  #
  #   A
  #   B
  #
  if prev_words.length == 2 && curr_words.length == 1
    data[prev_key] = prev_words.first
    next
  end

  #
  # Case 3:
  #
  #   adalah B
  #   B C...
  #
  # =>
  #
  #   B
  #   C...
  #
  # But never if it would make the current
  # entry empty.
  #
  if prev_words.length == 2 &&
     prev_words.first.casecmp?("adalah")

    next if curr_words.length == 1

    data[prev_key] = prev_words.last
    data[curr_key] = remove_first_word(curr_text)
    next
  end

  #
  # Case 4 (default):
  #
  #   A B
  #   B C...
  #
  # =>
  #
  #   A B
  #   C...
  #
  # But never if it would make the current
  # entry empty.
  #
  next if curr_words.length == 1

  data[curr_key] = remove_first_word(curr_text)
end

output_path =
  if path.downcase.end_with?(".json")
    path.sub(/\.json\z/i, ".json")
  else
    "#{path}.normalized.json"
  end

File.write(output_path, JSON.pretty_generate(data))

puts "Normalized file written to:"
puts output_path
