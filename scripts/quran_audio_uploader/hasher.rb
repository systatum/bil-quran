#!/usr/bin/env ruby

require "json"
require "digest"

# ============================================================
# CONFIG
# ============================================================

BASE_DIR = "."
AUDIO_DIR = File.join(BASE_DIR, "audio")

# ============================================================
# SETUP
# ============================================================

Dir.chdir(AUDIO_DIR)

# ============================================================
# FIND ALL RECITER FOLDERS
# ============================================================

reciter_folders = Dir.glob("ayats/*").select do |path|
  File.directory?(path)
end

# ============================================================
# PROCESS EACH FOLDER
# ============================================================

reciter_folders.each do |folder|

  puts "PROCESS #{folder}"

  signatures = {}

  # Find only mp3 files directly inside folder
  mp3_files = Dir.glob(File.join(folder, "*.mp3")).sort

  mp3_files.each do |file|

    filename = File.basename(file)

    puts "HASH    #{file}"

    md5_hash = Digest::MD5.file(file).hexdigest

    signatures[filename] = md5_hash
  end

  # Output:
  # ayats/abdurrahmaan_as_sudais/signatures.json
  output_file = File.join(folder, "signatures.json")

  File.write(
    output_file,
    JSON.pretty_generate(signatures)
  )

  puts "WRITE   #{output_file}"
end

puts "ALL DONE"
