"""All-pairs nemesis counts.

Person B is a nemesis of person A when B has a strictly better (lower) best
in every slot where A has one. A slot is an (event, single|average) pair.
This must match the per-person query in the web app
(apps/web/app/(root)/persons/_lib/nemesis-queries.ts).
"""

from collections import defaultdict

import numpy as np

ROW_CHUNK = 1024


def compute_nemesis_stats(entries):
    """Compute nemesis counts for every person.

    `entries` is an iterable of (person_id, slot_type, event_id, best) with
    best > 0. Returns a list of
    (person_id, nemesis_count, nemesized_count, event_count, slot_count).
    """
    slots = defaultdict(list)
    person_index = {}
    person_events = defaultdict(set)
    person_slots = defaultdict(int)

    for person_id, slot_type, event_id, best in entries:
        if best is None or best <= 0:
            continue
        idx = person_index.setdefault(person_id, len(person_index))
        slots[(slot_type, event_id)].append((best, idx))
        person_events[idx].add(event_id)
        person_slots[idx] += 1

    n = len(person_index)
    if n == 0:
        return []

    row_bytes = (n + 7) // 8
    # Row A holds the candidate nemeses of A (packbits big-endian bit order).
    acc = np.full((n, row_bytes), 0xFF, dtype=np.uint8)

    for slot_entries in slots.values():
        slot_entries.sort()
        bests = np.fromiter((b for b, _ in slot_entries), dtype=np.int64)
        idxs = np.fromiter((i for _, i in slot_entries), dtype=np.int64)
        running = np.zeros(row_bytes, dtype=np.uint8)
        group_starts = np.flatnonzero(np.r_[True, bests[1:] != bests[:-1]])
        group_ends = np.r_[group_starts[1:], len(bests)]

        for start, end in zip(group_starts, group_ends):
            members = idxs[start:end]
            acc[members] &= running
            np.bitwise_or.at(
                running,
                members >> 3,
                (0x80 >> (members & 7)).astype(np.uint8),
            )

    nemesis_counts = np.zeros(n, dtype=np.int64)
    nemesized_counts = np.zeros(n, dtype=np.int64)
    for start in range(0, n, ROW_CHUNK):
        bits = np.unpackbits(acc[start : start + ROW_CHUNK], axis=1, count=n)
        nemesis_counts[start : start + ROW_CHUNK] = bits.sum(axis=1, dtype=np.int64)
        nemesized_counts += bits.sum(axis=0, dtype=np.int64)

    return [
        (
            person_id,
            int(nemesis_counts[idx]),
            int(nemesized_counts[idx]),
            len(person_events[idx]),
            person_slots[idx],
        )
        for person_id, idx in person_index.items()
    ]
