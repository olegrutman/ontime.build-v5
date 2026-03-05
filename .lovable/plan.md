

# Rename System Catalog Supplier

## Change

Update the existing system supplier record from **"Test Building Supply Co."** (code `SUPP-TEST`) to **"Ontime System Supplier"** (code `ONTIME-SYS`).

This is a single data update — no schema or code changes needed, since the supplier name is read dynamically from the database everywhere it appears.

## Steps

1. **Update supplier record** — Use the insert/update tool to run:
   ```sql
   UPDATE suppliers
   SET name = 'Ontime System Supplier', supplier_code = 'ONTIME-SYS'
   WHERE id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
   ```

No file changes required.

