function characterClass (character) {
  const code = character.charCodeAt()
  return code >= 47 && code < 58 ? 'd'
    : code >= 97 && code < 123 ? 'a' : null
}

function isValidAlias (alias) {
  if (alias === null) return true
  if (typeof alias !== 'string') return false
  if (!alias) return false
  if (characterClass(alias.slice(0, 1)) !== 'd') return false
  for (const c of alias) {
    const charClass = characterClass(c)
    if (charClass !== 'd' && charClass !== 'a') {
      return false
    }
  }
  return true
}

function aliasParent (alias) {
  if (!isValidAlias(alias)) return null
  if (alias === null) return null

  const last = characterClass(alias.slice(-1))
  const pattern = last === 'd' ? /^(.*?)[0-9]+$/ : /^(.*?)[a-z]+$/
  return alias.replace(pattern, '$1') || null
}

function isSequence (prev, next) {
  return aliasParent(next) === prev
}

class Database {
  // Schema
  // {
  //   aliases: {
  //     <alias:str>: { id: <int>, children: [<str>], parent: <str> }
  //   },
  //   notes: [
  //     {
  //       title: <str>,
  //       aliases: [<str>],
  //       links: [{ src: <int>, dest: <int>, annotation: <str> }],
  //       backlinks: [<link>]
  //     }
  //   ]
  // }

  constructor () {
    this.data = { aliases: {}, notes: [] }
  }

  add (record) {
    return record.addTo(this) || record
  }
}

class IntegrityError extends Error {}
class DomainError extends IntegrityError {}
class ReferenceError extends IntegrityError {}

function check (condition, message) {
  if (!condition) throw new DomainError(message)
}

class Note {
  constructor (id, title) {
    check(Number.isInteger(id), 'invalid Note.id')
    check(typeof title === 'string', 'invalid Note.title')
    check(title, 'empty Note.title')

    this.id = id
    this.title = title
  }

  addTo (db) {
    // Overwrite existing entry in notes.
    db.data.notes[this.id] = {
      title: this.title,
      aliases: [],
      links: [],
      backlinks: []
    }
  }

  equals (note) {
    return this.id === note.id && this.title === note.title
  }
}

class Alias {
  constructor (id, alias) {
    check(Number.isInteger(id), 'non-integer Alias.id')
    check(typeof alias === 'string', 'non-string Alias.alias')
    check(isValidAlias(alias), 'malformed Alias.alias')
    check(alias, 'empty alias')
    if (Number.isInteger(Number(alias))) {
      check(String(id) === alias, 'invalid Alias.alias')
    }

    this.id = id
    this.alias = alias
  }

  addTo (db) {
    // Overwrite existing entry in aliases.
    // Note with ID must exist.
    const note = db.data.notes[this.id]
    if (!note) return new ReferenceError('Alias.id')

    db.data.aliases[this.alias] = {
      id: this.id,
      children: [],
      parent: null
    }
    note.aliases.push(this.alias)
  }
}

class Sequence {
  constructor (prev, next) {
    check(isValidAlias(prev), 'malformed Sequence.prev')
    check(isValidAlias(next), 'malformed Sequence.next')
    check(isSequence(prev, next),
      'Sequence.prev and Sequence.next not in sequence')
    check(prev != null, 'null Sequence.prev')
    check(next != null, 'null Sequence.next')

    this.prev = prev
    this.next = next
  }

  addTo (db) {
    let prev = db.data.aliases[this.prev]
    const next = db.data.aliases[this.next]

    if (!next) return
    if (!prev) {
      try {
        if (!db.add(new Alias(Number(this.prev), this.prev))) {
          return null
        }
        prev = db.data.aliases[this.prev]
      } catch (e) {
        return null
      }
    }

    const prevNote = db.data.notes[prev.id]
    const nextNote = db.data.notes[next.id]
    if (!prevNote || !nextNote) return

    next.parent = this.prev
    prev.children.push(this.next)
  }
}

class Link {
  constructor (src, dest, annotation) {
    check(src instanceof Note, 'invalid src Note')
    check(dest instanceof Note, 'invalid dest Note')
    check(typeof annotation === 'string', 'non-string Link.annotation')

    this.src = src
    this.dest = dest
    this.annotation = annotation
  }

  addTo (db) {
    const src = db.data.notes[this.src.id]
    const dest = db.data.notes[this.dest.id]
    if (!src) return new ReferenceError('Link.src')
    if (!dest) return new ReferenceError('Link.dest')

    // Existing entries get overwritten.
    const link = {
      src: this.src,
      dest: this.dest,
      annotation: this.annotation
    }
    src.links.push(link)
    if (link.annotation) {
      dest.backlinks.push(link)
    }
  }
}

class Query {
  constructor (db) {
    this.db = db
  }

  note (id) {
    const record = this.db.data.notes[id]
    if (!record) return null

    const note = new Note(id, record.title)

    note.links = () => this.links(note)
    note.backlinks = () => this.backlinks(note)

    note.aliases = function * () {
      yield * record.aliases
    }

    const self = this
    note.parents = function * () {
      for (const alias of record.aliases) {
        const parent = self.parent(alias)
        if (parent) {
          yield parent
        }
      }
    }

    note.children = function * () {
      for (const alias of record.aliases) {
        yield * self.children(alias)
      }
    }
    return note
  }

  * links (note) {
    const src = this.db.data.notes[note.id]
    if (src && src.links) {
      yield * src.links
    }
  }

  * backlinks (note) {
    const dest = this.db.data.notes[note.id]
    if (dest && dest.backlinks) {
      yield * dest.backlinks
    }
  }

  parent (alias) {
    const record = this.db.data.aliases[alias]
    if (!record || !record.parent) return null
    const parentRecord = this.db.data.aliases[record.parent]
    // TODO what if parentRecord.id === 0?
    if (!parentRecord || !parentRecord.id) return null
    return {
      note: this.note(parentRecord.id),
      alias: record.parent
    }
  }

  * children (alias) {
    const record = this.db.data.aliases[alias]
    if (record) {
      const children = record.children || []
      for (const childAlias of children) {
        const childRecord = this.db.data.aliases[childAlias]
        if (!childRecord) continue
        const childID = childRecord.id
        const child = this.note(childID)
        if (child) {
          yield {
            note: child,
            alias: childAlias,
            parentID: record.id,
            parentAlias: alias
          }
        }
      }
    }
  }

  * descendants (alias) {
    const record = this.db.data.aliases[alias]
    if (record) {
      for (const child of this.children(alias)) {
        yield child
        yield * this.descendants(child.alias)
      }
    }
  }
}

export {
  Alias,
  aliasParent,
  Database,
  DomainError,
  isSequence,
  Link,
  Note,
  Query,
  ReferenceError,
  Sequence
}
