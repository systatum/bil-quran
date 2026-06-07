#!/usr/bin/env ruby

require "set"
require "open3"
require "thread"

# ============================================================
# CONFIG
# ============================================================

# Root project directory
BASE_DIR = "."

# Audio directory containing ayats/
AUDIO_DIR = File.join(BASE_DIR, "audio")

# Number of parallel uploads
BATCH_SIZE = 5

# ============================================================
# SETUP
# ============================================================

Dir.chdir(AUDIO_DIR)

# Cache loaded exception lists
exceptions_cache = {}

# Mutex for thread-safe file writes and stdout
mutex = Mutex.new

# ============================================================
# LOAD FILES
# ============================================================

all_files = Dir.glob("ayats/**/*").select do |file|
  File.file?(file)
end

# ============================================================
# FILTER FILES
# ============================================================

upload_queue = []

all_files.each do |file|

  folder_name = File.basename(File.dirname(file))
  filename    = File.basename(file)

  except_file = File.join(
    BASE_DIR,
    "except_#{folder_name}.txt"
  )

  # Load exception file once
  unless exceptions_cache.key?(folder_name)

    exceptions =
      if File.exist?(except_file)
        File.readlines(except_file, chomp: true).to_set
      else
        Set.new
      end

    exceptions_cache[folder_name] = exceptions
  end

  # Skip already uploaded
  if exceptions_cache[folder_name].include?(filename)
    puts "SKIP   #{file}"
    next
  end

  upload_queue << {
    file: file,
    folder_name: folder_name,
    filename: filename,
    except_file: except_file
  }
end

puts "#{upload_queue.size} files to upload..."

# ============================================================
# THREAD WORKER
# ============================================================

queue = Queue.new

upload_queue.each do |job|
  queue << job
end

threads = []

BATCH_SIZE.times do

  threads << Thread.new do

    until queue.empty?

      begin
        job = queue.pop(true)
      rescue ThreadError
        break
      end

      file        = job[:file]
      folder_name = job[:folder_name]
      filename    = job[:filename]
      except_file = job[:except_file]

      mutex.synchronize do
        puts "START  #{file}"
      end

      # Run upload
      stdout, stderr, status = Open3.capture3(
        "pnpx",
        "wrangler",
        "r2",
        "object",
        "put",
        "bilquran/#{file}",
        "--file",
        file,
        "--remote"
      )

      output = "#{stdout}\n#{stderr}"

      # Wrangler success detection
      upload_success =
        output.include?("Upload complete")

      if status.success? && upload_success

        mutex.synchronize do

          # Append uploaded filename
          File.open(except_file, "a") do |f|
            f.puts(filename)
          end

          # Update cache
          exceptions_cache[folder_name].add(filename)

          puts "DONE   #{file}"
        end

      else

        mutex.synchronize do
          puts "FAILED #{file}"
          puts output
        end

        exit(-1)
      end
    end
  end
end

# Wait for all uploads to finish
threads.each(&:join)

puts "ALL DONE"
