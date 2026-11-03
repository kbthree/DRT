"""Read a Markdown memory snapshot by question, paragraph ID, or complete pages."""

import argparse
import hashlib
import json
import math
from pathlib import Path
import re
import sys


def words(text):
    return set(re.findall(r"[^\W_]{3,}", text.casefold()))


def passages(text):
    heading = "Memory"
    result = {}
    for block in re.split(r"\r?\n[ \t]*\r?\n", text):
        if not block.strip():
            continue
        if block.startswith("#"):
            heading = block.splitlines()[0].lstrip("# ").strip()
        result[f"P{len(result) + 1:03}"] = (heading, block.strip())
    return result


def search(records, query):
    terms = words(query)
    tokens = {k: words(h + " " + b) for k, (h, b) in records.items()}
    weights = {t: math.log((1 + len(records)) / (1 + sum(t in v for v in tokens.values())))
               for t in terms}
    scores = {}
    for key, (_, body) in records.items():
        if body.startswith("#") and "\n" not in body:
            continue
        scores[key] = sum(weights[t] for t in sorted(terms & tokens[key]))
    return sorted((k for k in scores if scores[k] > 0), key=lambda k: (-scores[k], k))[:4]


def pages(raw):
    chunks = [bytearray()]
    for line in raw.splitlines(keepends=True):
        if chunks[-1] and len(chunks[-1]) + len(line) > 7000:
            chunks.append(bytearray())
        chunks[-1].extend(line)
    return [bytes(chunk) for chunk in chunks]


def response(raw, action, args):
    if action == "page":
        chunks = pages(raw)
        if len(args) != 1 or not args[0].isdigit() or not 1 <= int(args[0]) <= len(chunks):
            raise ValueError(f"page requires one page number, 1 through {len(chunks)}")
        return chunks[int(args[0]) - 1], []
    records = passages(raw.decode("utf-8"))
    if action == "search":
        if not args:
            raise ValueError("search requires a question or keywords")
        ids = search(records, " ".join(args))
        lines = [f"{k} | {records[k][0]} | {' '.join(records[k][1].split())[:200]}" for k in ids]
        output = "\n".join(lines) or "No matches. Try different terms or list the headings."
    elif action == "read":
        if not args or any(k not in records for k in args):
            raise ValueError("read requires valid paragraph IDs from search or index")
        ids = args
        output = "\n\n".join(f"{k} | {records[k][0]}\n{records[k][1]}" for k in ids)
    else:
        if args:
            raise ValueError("index takes no extra arguments")
        ids = [k for k, (_, b) in records.items() if b.startswith("#")]
        output = "\n".join(f"{k} | {records[k][0]}" for k in ids)
        output += f"\n{len(records)} sequential paragraph IDs; {len(pages(raw))} full pages."
    return (output + "\n").encode("utf-8"), ids


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    parser.add_argument("log", type=Path)
    parser.add_argument("action", choices=("index", "search", "read", "page"))
    parser.add_argument("args", nargs="*")
    options = parser.parse_args()
    raw = options.source.read_bytes()
    try:
        payload, ids = response(raw, options.action, options.args)
    except ValueError as error:
        parser.error(str(error))
    sys.stdout.buffer.write(payload)
    sys.stdout.buffer.flush()
    receipt = {"action": options.action, "args": options.args, "ids": ids,
               "sourceSha256": hashlib.sha256(raw).hexdigest(), "bytes": len(payload),
               "outputSha256": hashlib.sha256(payload).hexdigest()}
    with options.log.open("a", encoding="utf-8") as log:
        log.write(json.dumps(receipt) + "\n")


if __name__ == "__main__":
    main()
