"""Utils."""

import contextlib
import os
import shlex
import shutil
import subprocess
import tempfile

def pandoc():
    """Pandoc location."""
    return os.environ.get("PANDOC", "pandoc")

def grep():
    """Grep location."""
    return os.environ.get("GREP", "grep")

def check_requirements():
    """Check if grep and pandoc are installed."""
    return shutil.which(pandoc()) and shutil.which(grep())

def get_contents(filename):
    """Get contents of given file."""
    with open(filename) as file:
        return file.read()

def sqlite_string(text):
    """Encode python string into sqlite string."""
    return "'{}'".format(text.replace("'", "''"))

def write_lines(filename, text):
    """Write text (iterable) to file."""
    with open(filename, "w") as file:
        for line in text:
            print(line, file=file)

@contextlib.contextmanager
def make_temporary_file(*args, **kwargs):
    """Temporary file context manager that returns filename."""
    _, filename = tempfile.mkstemp(*args, **kwargs)
    yield filename
    os.remove(filename)

def run_command(cmd, **kwargs):
    """Run command with environment variables in kwargs.

    Returns stdout and stderr output.
    """
    env = os.environ.copy()
    env.update(**kwargs)
    proc = subprocess.run(shlex.split(cmd), env=env, check=False,
                          capture_output=True)
    return proc
