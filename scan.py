#!/usr/bin/env python3

import argparse
import glob
import os
import sqlite3
import subprocess as sp
import sys
import threading
import time

from zettel import client, server
from zettel.config import Config
from zettel.init import init
from zettel.missing import delete_missing_notes
from zettel.pandoc.commands import scan_metadata

def get_options():
    parser = argparse.ArgumentParser()
    parser.add_argument("-p", "--port", type=int, default=5000, help="port number")
    args = parser.parse_args()
    return args

def touch_modified(notes):
    """Touch notes and links from notes."""
    sql = "SELECT dest FROM links WHERE src = :src"
    with sqlite3.connect(Config.database) as conn:
        cur = conn.cursor()
        for note in notes:
            os.utime(note)
            for row in cur.execute(sql, {"src": note}):
                os.utime(row[0])

def notes_modified_recently(last_scan=None):
    if last_scan is None:
        last_scan = os.path.getmtime(Config.database)
    for note in glob.iglob("**/*.md", recursive=True):
        mtime = os.path.getmtime(note)
        if mtime >= last_scan:
            yield note

def check_database():
    """Initialize database if it does not exist.

    Return modification time (or 0 if it has never been modified)."""
    if os.path.isfile(Config.database):
        return os.path.getmtime(Config.database)
    init()
    return 0

def main():
    last_scan = check_database()
    args = get_options()
    host = "localhost"
    port = args.port

    with sqlite3.connect(Config.database) as conn:
        delete_missing_notes(conn)

    notes = list(notes_modified_recently(last_scan=last_scan))
    if not notes:
        return

    threading.Thread(target=server.main, args=(host, port)).start()

    tasks = []
    for note in notes:
        cmd = scan_metadata(note, port)
        task = sp.Popen(cmd, stdout=sp.DEVNULL, cwd=os.path.dirname(__file__))
        tasks.append(task)
    for task in tasks:
        task.wait()
    client.shutdown(host, port)
    touch_modified(notes)
    os.utime(Config.database)

if __name__ == "__main__":
    main()
