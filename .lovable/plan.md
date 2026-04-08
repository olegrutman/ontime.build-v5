

# Generate Setup & Framing Scope Questions Spreadsheet

## Overview
Create a comprehensive XLSX file with two sheets documenting all questions in the Project Setup wizard (97 DB-driven questions) and the Framing Scope wizard (100+ hardcoded UI questions across 12 sections).

## Sheet 1: Project Setup Questions
Query all 97 rows from `setup_questions` table. Columns:
- Phase, Phase Name, Section, Sort Order, Label, Field Key, Input Type, Trigger Condition, Notes
- One column per building type slug showing that type's options

## Sheet 2: Framing Scope Questions
Extract from the 12 section components. Columns:
- Section #, Section Name, Field Key (dot path), Label, Subtitle, Input Type (YesNo, Radio, Checkbox, Number, Toggle), Options (if radio/select), Visibility Rule (building type filter), Conditional On (parent field)

## Technical Details
- Python script using openpyxl with formatted headers, auto-width columns, and freeze panes
- Setup questions pulled via psql query; framing scope questions hardcoded from component analysis
- Output to `/mnt/documents/ontime_setup_framing_questions.xlsx`

## Files
No codebase changes. One artifact generated.

