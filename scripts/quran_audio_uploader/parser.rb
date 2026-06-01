#!/usr/bin/env ruby

# this script can be used like this:
#   ./parser.rb < data.txt
# and will append the result into outdata.txt
# this can be used to parse a grid of files
# and only extract file names (.mp3 only)
# what for? so that maybe we didn't sync correctly
# and want to manually parse the file grid from
# cloudflare, use this to only get the filenames

def extract_mp3_filenames(text)
    text.scan(/^[^\s]+\.mp3$/i)
end

input = STDIN.read

files = extract_mp3_filenames(input)

puts files

File.open("outdata.txt", "a") do |file|
  files.each do |filename|
    file.puts(filename)
  end
end
