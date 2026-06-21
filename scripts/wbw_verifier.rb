# scripts/wbw_verifier.rb

require "json"
require "set"

WBW_DIR = File.expand_path("../public/quran/wbw_translations", __dir__)

def load_entries(path)
  JSON.parse(File.read(path))
end

def parse_key(key)
  key.split(":").map(&:to_i)
end

# Detects a verse-ending marker, e.g. "(181)".
def verse_end_marker?(value)
  value.is_a?(String) && value.match?(/^\(\d+\)$/)
end

# Extracts the verse number encoded inside "(N)".
def extract_marker_verse(value)
  value[/\d+/].to_i if verse_end_marker?(value)
end

# Groups entries by chapter and verse.
def build_verse_structure(entries)
  verses = Hash.new do |hash, key|
    hash[key] = {
      words: Set.new,
      marker_word: nil
    }
  end

  entries.each do |key, value|
    chapter, verse, word = parse_key(key)

    data = verses[[chapter, verse]]
    data[:words] << word

    next unless (marker_verse = extract_marker_verse(value))

    if marker_verse != verse
      raise <<~MSG
        Incorrect marker at #{chapter}:#{verse}:#{word}
        Expected (#{verse})
        Found #{value}
      MSG
    end

    if data[:marker_word] && data[:marker_word] != word
      raise <<~MSG
        Multiple end markers for #{chapter}:#{verse}
        Existing marker word: #{data[:marker_word]}
        New marker word: #{word}
      MSG
    end

    data[:marker_word] = word
  end

  verses
end

# Validates the word sequence within each verse.
def validate_verse_sequences(verses)
  errors = []

  verses.sort.each do |(chapter, verse), data|
    words = data[:words].to_a.sort

    if data[:marker_word]
      expected_last_word = data[:marker_word]
      extra_words = words.select { |word| word > expected_last_word }

      unless extra_words.empty?
        errors << "#{chapter}:#{verse} contains words past its end marker: #{extra_words.join(', ')}"
      end
    else
      errors << "#{chapter}:#{verse} has no end marker"
      # Fall back to the largest observed word so we can still detect gaps.
      expected_last_word = words.max
    end

    (1..expected_last_word).each do |word|
      unless data[:words].include?(word)
        errors << "#{chapter}:#{verse}:#{word} is missing"
      end
    end
  end

  errors
end

# Produces a normalized shape for cross-file comparison.
def shape_from_verses(verses)
  verses.transform_values do |data|
    {
      marker_word: data[:marker_word],
      words: data[:words].to_a.sort
    }
  end
end

# Validates one file and returns its normalized shape.
def validate_file(path)
  puts "\nChecking #{File.basename(path)}..."

  entries = load_entries(path)
  verses = build_verse_structure(entries)
  errors = validate_verse_sequences(verses)

  if errors.empty?
    puts "  OK"
  else
    puts "  #{errors.size} error(s):"

    errors.each do |error|
      puts "    #{error}"
    end
  end

  shape_from_verses(verses)
end

# Compares two file shapes.
def compare_shapes(reference_shape, shape)
  errors = []

  all_verses = (reference_shape.keys | shape.keys).sort

  all_verses.each do |verse_key|
    chapter, verse = verse_key

    reference_data = reference_shape[verse_key]
    current_data = shape[verse_key]

    if reference_data.nil?
      errors << "Extra verse #{chapter}:#{verse}"
      next
    end

    if current_data.nil?
      errors << "Missing verse #{chapter}:#{verse}"
      next
    end

    if reference_data[:marker_word] != current_data[:marker_word]
      errors << "#{chapter}:#{verse} word count differs (#{current_data[:marker_word]} vs #{reference_data[:marker_word]})"
    end

    missing_words = reference_data[:words] - current_data[:words]
    extra_words   = current_data[:words] - reference_data[:words]

    unless missing_words.empty?
      errors << "#{chapter}:#{verse} missing words #{missing_words.join(', ')}"
    end

    unless extra_words.empty?
      errors << "#{chapter}:#{verse} extra words #{extra_words.join(', ')}"
    end
  end

  errors
end

json_files = Dir.glob(File.join(WBW_DIR, "*.json")).sort

abort("No JSON files found in #{WBW_DIR}") if json_files.empty?

reference_file = nil
reference_shape = nil

json_files.each do |path|
  shape = validate_file(path)

  if reference_shape.nil?
    reference_file = path
    reference_shape = shape
    next
  end

  puts
  puts "Comparing #{File.basename(path)} against #{File.basename(reference_file)}..."

  errors = compare_shapes(reference_shape, shape)

  if errors.empty?
    puts "  OK"
  else
    puts "  #{errors.size} mismatch(es):"

    errors.each do |error|
      puts "    #{error}"
    end
  end
end
