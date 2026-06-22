require "json"

# Read id-ID.json
data = JSON.parse(File.read("../public/quran/wbw_translations/id-ID.json"))

counts = Hash.new(0)

data.each_value do |value|
  next unless value.is_a?(String)
  next unless value.include?("/")

  first_part = value.split("/", 2).first.strip
  counts["#{first_part}/*"] += 1
end

# Sort by occurrence descending
ranked = counts.sort_by { |_, count| -count }.to_h

# Write rank.json
File.write("./rank.json", JSON.pretty_generate(ranked))

puts "rank.json written"
