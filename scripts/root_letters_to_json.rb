#!/usr/bin/env ruby

require "json"
require "creek"
creek = Creek::Book.new "./Cleaned_Root_letters.xlsx"
sheets = creek.sheets[0]

# the roots data is taken from:
# https://github.com/Quran-Journey/roots

lexemes = []
sheets.simple_rows.each do |row|
  next if row["A"].strip.downcase == "id"

  lexemes << {
    "id" => row["A"].strip,
    "word" => row["B"],
    "trans" => row["C"],
    "root" => row["D"].strip,
  }
end

File.write("./lexemes.json", lexemes.to_json)
