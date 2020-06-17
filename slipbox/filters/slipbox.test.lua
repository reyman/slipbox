local pretty = require "pl.pretty"
local slipbox = require "filters/slipbox"

--[[
local current_slipbox = slipbox.SlipBox:new()
pretty.dump(current_slipbox)
current_slipbox:save_note({
  id = 1,
  title = "Title",
})
pretty.dump(current_slipbox)
]]

local function test_parent_sequence_prefix()
  local cases = {
    ["10a"] = "10",
    ["10a1"] = "10a",
    ["10a1a1"] = "10a1a",
    ["10a1a2"] = "10a1a",
    ["10a1a3"] = "10a1a",
    ["10a1a1a"] = "10a1a1",
  }
  for i, o in pairs(cases) do
    local result = slipbox.parent_sequence(i)
    assert(o == result)
  end
end

test_parent_sequence_prefix()