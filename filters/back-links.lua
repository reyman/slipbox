-- add backlinks stored in sqlite3 database into document

local sqlite3 = require "lsqlite3"

local function get_backlinks(db, filename)
    local stmt = db:prepare [[
        SELECT * FROM links JOIN notes ON src = filename
            WHERE dest = ? AND description != ""
    ]]
    stmt:bind_values(filename)
    return stmt:nrows()
end

function Pandoc(doc)
    local db = sqlite3.open(doc.meta.database)
    local blocklists = {}
    for backlink in get_backlinks(db, doc.meta.relpath) do
        local filename = backlink.filename
        local link = backlink.relative_backlink
        local content = string.format("%s (%s)", backlink.title or "", filename)
        local description = string.format(" - %s", backlink.description)
        local block = pandoc.Plain {
            pandoc.Link(pandoc.Str(content), link),
            pandoc.Str(description),
        }
        table.insert(blocklists, {block})
    end

    table.insert(doc.blocks, pandoc.HorizontalRule())

    if next(blocklists) then
        table.insert(doc.blocks, pandoc.Header(3, pandoc.Str "See also"))
        table.insert(doc.blocks, pandoc.BulletList(blocklists))
    end
    db:close()
    return doc
end
