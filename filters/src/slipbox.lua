local csv = require "src.csv"
local utils = require "src.utils"

local SlipBox = {}
function SlipBox:new()
  self.__index = self
  return setmetatable({
    files = {},
    notes = {},
    links = {},
    citations = {},
    images = {},
    bibliography = {},
    invalid = {
      has_empty_link_target = {},
    },
  }, self)
end

function SlipBox:save_file(filename, hash)
  assert(type(filename) == "string")
  assert(type(hash) == "string")
  assert(self.files[filename] == nil or self.files[filename] == hash)
  self.files[filename] = hash
end

function SlipBox:save_citation(id, citation)
  -- Save citation from note id (number).
  assert(type(id) == "number")
  local citations = self.citations[id] or {}
  citations[citation] = true
  self.citations[id] = citations
end

function SlipBox:save_image(id, filename)
  assert(type(id) == "number")
  assert(type(filename) == "string")

  local image = self.images[filename] or {
    id = id,
    filename = filename,
    notes = {},
  }
  self.images[filename] = image
  image.notes[id] = true
end

function SlipBox:save_reference(id, text)
  -- Save reference into slipbox.
  assert(type(id) == "string")
  assert(type(text) == "string")
  assert(id ~= "")
  assert(string ~= "")
  self.bibliography[id] = text
end

function SlipBox:save_note(id, title, filename)
  -- Save note into slipbox.
  -- Return list of error messages if a note with the same ID already
  -- exists.
  assert(type(id) == "number")
  assert(type(title) == "string")
  assert(type(filename) == "string")
  assert(title ~= "")
  assert(filename ~= "")

  local note = self.notes[id]
  if note then
    return {
      string.format("Duplicate ID: %d.", id),
      string.format("Could not insert note '%s'.", title),
      string.format("Note '%s' already uses the ID.", note.title)
    }
  end
  self.notes[id] = {title = title, filename = filename}
end

function SlipBox:save_link(link)
  if link and link.src then
    local links = self.links[link.src] or {}
    table.insert(links, link)
    self.links[link.src] = links
  end
end

local function notes_to_csv(notes)
  -- Generate CSV data from slipbox notes.
  local w = csv.Writer:new{"id", "title", "filename"}
  for id, note in pairs(notes) do
    if note.filename then
      w:write{id, note.title, note.filename}
      -- TODO show warning if note.filename is nil
      -- This occurs when the title in the header contains other symbols
      -- (ex: links, references, equations, etc.).
    end
  end
  return w.data
end

local function links_to_csv(links)
  -- Create CSV data from direct links in slipbox.
  local w = csv.Writer:new{"src", "dest", "tag"}
  for src, dests in pairs(links) do
    for _, dest in ipairs(dests) do
      w:write{src, dest.dest, dest.tag}
    end
  end
  return w.data
end

local function bibliography_to_csv(refs)
  local w = csv.Writer:new{"key", "text"}
  for ref, text in pairs(refs) do
    w:write{ref, text}
  end
  return w.data
end

local function files_to_csv(files)
  local w = csv.Writer:new{"filename", "hash"}
  for filename, hash in pairs(files) do
    w:write{filename, hash}
  end
  return w.data
end

local function citations_to_csv(citations)
  local w = csv.Writer:new{"note", "reference"}
  for id, cites in pairs(citations) do
    for cite in pairs(cites) do
      w:write{id, cite}
    end
  end
  return w.data
end

local function images_to_csv(images)
  local w = csv.Writer:new{"filename"}
  for filename in pairs(images) do
    w:write{filename}
  end
  return w.data
end

local function image_links_to_csv(images)
  local w = csv.Writer:new{"note", "image"}
  for filename, image in pairs(images) do
    for note in pairs(image.notes) do
      w:write{note, filename}
    end
  end
  return w.data
end

function SlipBox:write_data()
  -- Create CSV data to files.
  local write = utils.write_text
  write("files.csv", files_to_csv(self.files))
  write("notes.csv", notes_to_csv(self.notes))
  write("links.csv", links_to_csv(self.links))
  write("images.csv", images_to_csv(self.images))
  write("image_links.csv", image_links_to_csv(self.images))
  write("bibliography.csv", bibliography_to_csv(self.bibliography))
  write("citations.csv", citations_to_csv(self.citations))
end

return {
  SlipBox = SlipBox,
}
