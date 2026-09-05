# V1 Build Status — PDF-to-3D Kitchen Workflow

## Working now

- PDF page rendering and native text extraction.
- OCR for scanned/image pages.
- Dimension parsing (imperial and metric).
- Manual trace editor (points, walls, openings) with validation and room generation.
- Wall detection (classical Hough), review, and conversion to trace.
- Opening detection (gap/text) and conversion to traced openings.
- 3D structured room rendering with real wall openings.
- Procedural parametric cabinets (base/wall/tall/drawer/sink) with Move/Rotate, snapping, inspector, and materials.
- Cabinet-run creation along a wall (base runs) with preview and Flip Side.
- Material zones and simplified Presentation material controls.

## Working only through manual correction

- Scale calibration.
- Underlay alignment.
- Final wall/opening placement.
- Cabinet placement, dimensions, and finish-zone assignment.

## Partially automatic

- Wall detection (line-based, not full plan interpretation).
- Opening detection (gap + text evidence only; no symbol-level door/window recognition).
- Dimension extraction (text-based; no dimension-line association).

## Not implemented

- Multi-page 2020 drawing-set classification (floor plan, elevations, schedules).
- Cabinet/elevation recognition.
- Appliance recognition (range, refrigerator, dishwasher, hood).
- Plumbing-fixture recognition (sink, faucet).
- Countertop/backsplash generation.
- Structured kitchen reconstruction from a full drawing set.

## Required for PDF-to-3D V1

1. Multi-page drawing classification.
2. Cabinet/elevation recognition.
3. Appliance and plumbing recognition.
4. Structured kitchen reconstruction.
5. End-to-end PDF acceptance testing.

## Deferred beyond V1

- General CAD/space-planning polish.
- Advanced collision resolution and cabinet-run optimization.
- Manufacturer pricing and procurement.
- Sharing/persistence/deployment.
