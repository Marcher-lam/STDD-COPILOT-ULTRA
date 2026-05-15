---
description: Archive completed change - merge delta specs and cleanup
version: "1.0"
---

# STDD Skill: /stdd:archive

## Purpose
Complete a change by merging delta specs to main specs, moving to archive, and updating status.

## When to Use
- All tasks in tasks.md are completed
- Tests all pass
- Quality metrics meet thresholds
- Ready to finalize the change

## Workflow
1. Validate: all tasks done, tests pass, no blockers
2. Merge delta specs: ADDED → append, MODIFIED → replace, REMOVED → delete
3. Generate archive.md with metadata, summary, quality metrics, lessons learned
4. Move change to stdd/changes/archive/YYYY-MM-DD-{change-id}/
5. Update status to Completed
6. Main spec updated with merged changes

## Rules
- Archiving is irreversible - change removed from active list
- Validation must pass before archiving (unless --force)
- Spec merge must resolve all conflicts
- Full history preserved in archive directory

## Output
- Updated main specs in stdd/specs/
- stdd/changes/archive/YYYY-MM-DD-{change-id}/ with all artifacts
- archive.md summary document
