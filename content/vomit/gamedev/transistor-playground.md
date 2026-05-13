# Transistor Playground

description: A transistor simulator on Godot - Work in Progress

Language: GD Script
Game Engine: Godot
Still in development
https://github.com/runoxVK/TheTransistorGame
---
# Devlog #1 — Foundation

**Date:** 2025-04-14 **Project:** Transistor Game (working title) **Engine:** Godot 4.2+

---

## Overview

First session. Designed and implemented the full foundational architecture for a first-person circuit-building game. The core concept is Minecraft redstone but with real transistor mechanics — players walk around a large flat board in first person and place wires, transistors, resistors, repeaters, LEDs, and clocks to build working digital logic circuits.

---

## Concept & Design Decisions

### Core Premise

A first-person 3D game where the player builds circuits on a flat grid, viewed and interacted with from ground level. Circuits are built from discrete components snapped to a tile grid, identical in philosophy to Minecraft redstone but with transistor-based logic instead of redstone torches.

### Why This Works in 3D

The simulation is entirely 2D under the hood — a flat dictionary keyed by `Vector2i` grid cells. The 3D aspect is purely visual and navigational. This keeps the simulation simple and correct while giving the game a physical, walkable feel.

### Signal Strength System

Adopted Minecraft's signal strength model directly. Signal starts at **15** from any source and loses **1 strength per wire tile** it travels through. At 0 the signal dies. A **Repeater** resets signal back to 15 at any point, allowing indefinitely long wire runs. This creates meaningful decisions about repeater placement and makes signal decay a visible, tangible mechanic.

### Transistor Model

NPN transistor analogy:

- **Collector** — power input side (back of component)
- **Emitter** — power output side (front of component)
- **Gate/Base** — control input (left and right sides)

Signal only flows Collector → Emitter when the Gate receives any signal (threshold: 1). This maps cleanly to real BJT transistor behaviour and is sufficient to construct all fundamental logic gates.

### Scalability Approach

The simulation was designed from the start to scale to large, intricate builds. Key decisions made early to support this:

- Event-driven solver — only runs when the circuit changes, not every frame
- Changed-only visual broadcast — `on_sim_update` is only called on nodes whose `powered` or `strength` state actually changed, not every node every tick
- Single global `SimulationManager` autoload owns the entire graph across all boards, so circuits can eventually span multiple physical board objects

---

## Architecture

### Systems Built

#### SimulationManager (Autoload)

Global BFS flood-fill solver. On any circuit change, seeds a queue from all active sources and propagates signal outward through the connection graph. Handles per-type strength rules (wire decay, repeater reset, transistor gate control, resistor drop, LED terminal). Snapshots state before each run and only notifies visual nodes that actually changed.

#### ComponentRegistry (Autoload)

Single source of truth for all component types. Each entry defines the scene path, default simulation node properties, and info panel text. Adding a new component means adding one dictionary entry here — nothing else changes.

#### CircuitBoard

Owns a flat 2D grid (`Dictionary` keyed by `Vector2i`). Handles world↔grid coordinate conversion, component instantiation, and — critically — directional connection routing. When building the sim graph, it asks each component which node ID a given neighbour direction should connect to. This allows transistors to have separate gate/collector/emitter nodes that neighbours connect to correctly based on physical position.

#### Player

Standard first-person `CharacterBody3D`. Raycasts from camera center to detect hovered board cells. Left-click places, middle-click removes, right-click toggles sources or opens the info panel. Scroll wheel and number keys cycle the component hotbar.

#### InfoPanel

HUD overlay showing static component data (description, real-world analogy, usage tips) plus live simulation state (current strength, powered status, gate open/closed for transistors, frequency for clocks). Appears on right-click inspect, dismissed with Escape.

### Component Types Implemented

|Component|Behaviour|
|---|---|
|Wire|Carries signal. Loses 1 strength per tile.|
|Source|Emits strength 15. Right-click to toggle on/off.|
|Repeater|Resets any incoming signal back to strength 15.|
|Transistor|NPN switch. Collector→Emitter flow gated by Base signal.|
|Resistor|Drops signal strength by 4 as it passes through.|
|LED|Terminal. Lights up when powered, brightness scales with strength. Does not propagate signal.|
|Clock|Auto-oscillating source. Right-click cycles preset frequencies (1Hz, 2Hz, 4Hz, 10Hz, 20Hz).|

### Transistor Sim Node Structure

Each placed transistor registers **three** sim nodes with SimulationManager:

- `{id}` — emitter (output), type `transistor_emitter`
- `{id}_gate` — gate/base (control), type `transistor_gate`
- `{id}_col` — collector (power input), type `transistor_collector`

CircuitBoard routes adjacent wires to the correct node based on which side of the transistor cell they occupy.

---

## Bugs Found and Fixed

### GDScript Type Inference Errors

Several variables using `:=` inference broke because `Dictionary.get()` returns `Variant` and iterating over untyped `Array` loses element types. Fixed throughout by using explicit type declarations (`var x: bool =`, `var x: Vector2i =`, etc.).

### `_set` Reserved Method Conflict

Transistor script used `_set` as a helper function name, which conflicts with Godot's built-in `_set(StringName, Variant) -> bool` virtual method. Renamed to `_apply`.

### LED Never Lighting Up

The BFS only updated a node's `powered` state if it was enqueued and propagated outward. LEDs return 0 output strength (terminal), so they were never being marked powered themselves. Fixed by separating "incoming strength to this node" from "output strength to neighbours" — LEDs now receive and store incoming strength but are not enqueued, so signal stops at them correctly.

### Transistor Connections Not Routing Correctly

Initial implementation connected all 4 neighbours of a transistor cell to its emitter node. Gate and collector nodes were registered but never connected to anything. Fixed by implementing `get_node_id_for_side(dir: Vector2i)` on the Transistor component and `_node_id_for_side()` on CircuitBoard, which routes each adjacent cell to the correct sub-node based on direction.

### Source Visual Not Updating on Toggle

`toggle_source` in CircuitBoard correctly updated the sim node but the source's own visual never changed because the sim broadcast only fires on nodes whose state changed — and sources are seeds, not propagated-to. Fixed by calling `on_sim_update` directly on the source instance after toggling.

### Clock Visual Not Pulsing

Clock's `_process` couldn't find its sim node because `board` and `cell` are set by CircuitBoard after `_ready()` runs. The sim node lookup was failing silently. Fixed by retrying the lookup each frame until it succeeds, then setting the initial visual state immediately on first successful acquisition.

### Scene Path Mismatch

ComponentRegistry hardcoded `res://components/` as scene paths. Project used `res://scenes/components/`. Updated all paths in ComponentRegistry.

---

## Logic Gate Reference

Verified transistor layout for building fundamental gates. Transistor orientation: Back = Collector, Front = Emitter, Left/Right = Gate.

**Buffer** — signal passes when gate is high: `Source A → Collector | Source B → Gate | Emitter → LED`

**AND gate** — two transistors in series: `Source → T1 Collector | T1 Emitter → T2 Collector | T2 Emitter → LED` `Input A → T1 Gate | Input B → T2 Gate`

**OR gate** — two transistors in parallel: `Source → T1 Collector | Source → T2 Collector` `T1 Emitter → LED wire | T2 Emitter → same LED wire` `Input A → T1 Gate | Input B → T2 Gate`

---

## What Works

- First-person movement, sprint, jump
- Component placement and removal on a large flat grid
- Green/red highlight cursor showing valid/invalid placement
- Full signal propagation with strength decay
- Wire colour gradient (dark grey → orange → bright yellow) reflecting signal strength
- Source toggle via right-click
- Repeater resetting signal strength
- Resistor dropping signal strength
- LED lighting up as a terminal indicator, brightness proportional to strength
- Clock auto-oscillating with right-click frequency cycling
- Transistor with directional gate/collector/emitter routing
- Info panel with live sim state on right-click inspect
- Hotbar with scroll and number key selection

---

## What's Next

1. **Component rotation** — R key to rotate repeaters and transistors before placing. Required for clean circuit layout since transistor orientation is currently fixed.
2. **Wire visual connection stubs** — wires should visually extend toward adjacent wires so a wire run looks like a line rather than a row of separate cubes.
3. **IC save system** — select a region, name it, save it as a reusable black-box component. Essential for building large circuits without re-laying the same gate patterns repeatedly.
4. **Copy/paste region** — stamp a selected rectangle of components elsewhere on the board.
5. **Grid overlay** — faint grid lines on the board surface for easier alignment.
6. **Blender models** — replace placeholder cubes with proper component models. Max bounding box per component: 0.9m × 0.9m × 0.4m (fits within one 1m × 1m tile with clearance).

---

_Engine: Godot 4.2 — Language: GDScript — Renderer: Forward+_

# Devlog #2 — Transistors, Rotation, and Digital Logic

**Date:** 2026-04-16 **Project:** Transistor Game (working title) **Engine:** Godot 4.2+

---

## Overview

This session focused entirely on getting the transistor simulation correct and building the foundational digital logic primitives. The session was longer and more debugging-heavy than expected — the simulation architecture went through several rewrites before converging on a correct, stable solver. By the end, AND, NAND, and XOR gates are all verified working in-game.

---

## What Was Built

### NPN and PNP Transistors

Replaced the single generic `Transistor` component with two distinct types:

**NPN Transistor**

- Normally open — gate HIGH opens it
- Conducts Collector→Emitter when gate strength ≥ threshold (1)
- Indicator colours: yellow gate, red collector, green emitter

**PNP Transistor**

- Normally closed — gate LOW opens it
- Conducts Collector→Emitter when gate strength < threshold (1)
- Indicator colours: yellow gate, red collector, green emitter (same scheme as NPN for consistency)

Both share the same physical pin layout:

- Left/Right sides → Gate (yellow sphere)
- Front (-Z) → Collector (red sphere, power IN)
- Back (+Z) → Emitter (green sphere, power OUT)

Each transistor registers three sim nodes with SimulationManager: an emitter node (main), a gate node, and a collector node. CircuitBoard routes adjacent wire connections to the correct node based on which side of the transistor they touch, using `get_node_id_for_side(dir)` on each component.

### Component Rotation

Added R key rotation before placement. Rotation cycles through 0°, 90°, 180°, 270° and is stored as a `rotation_step` integer on each `ComponentBase`. The highlight cursor rotates visually to preview placement orientation.

CircuitBoard remaps neighbour directions into each component's local space via `_unrotate_dir()` before passing them to `get_node_id_for_side()`, so transistor pin connections are always correct regardless of rotation.

### Visual Pin Indicators

Removed the direction arrow that was on transistors. Replaced with colour-coded sphere indicators that sit on each face:

- **Yellow** = Gate
- **Red** = Collector (power in)
- **Green** = Emitter (power out)

Same colour scheme on both NPN and PNP so pin identity is immediately readable without knowing the transistor type.

### Clock Component

Auto-oscillating source. Right-click cycles through preset frequencies: 1Hz, 2Hz, 4Hz, 10Hz, 20Hz. Required for sequential logic — flip-flops, counters, shift registers. Glows cyan when powered.

---

## Simulation Architecture — The Hard Part

This was the most technically demanding part of the session. The solver went through multiple rewrites before working correctly for all gate configurations.

### The Core Problem

Transistor emitters cannot be resolved during the main BFS pass from sources. The BFS populates wires, gates, and collectors correctly — but emitters depend on both their gate AND their collector being populated first. If the BFS visits an emitter before its gate wire is populated (which happens when the gate is fed by another transistor's emitter rather than directly by a source), the emitter check sees gate=0 and fails to conduct even when it should.

This manifested as: single transistors with direct sources worked fine, but chained transistors (AND gate feeding a PNP gate, NAND feeding an XOR stage) would fail intermittently depending on BFS traversal order.

### What Was Tried and Why It Didn't Work

**Multi-pass reset solver** — ran the full reset+BFS+resolve cycle multiple times hoping the second pass would have correct values. Failed because the reset wiped emitter outputs that downstream gates depended on, causing the same ordering problem on every pass.

**Oscillation misdiagnosis** — spent time trying to fix what appeared to be oscillation (emitter alternating powered/unpowered every frame). Turned out this was just the player toggling sources on and off — each toggle triggered one clean sim run. Not actually oscillating.

**Emitter self-feedback prevention** — attempted to prevent emitter output from feeding back into its own gate. This was a real concern for intentional oscillator circuits but wasn't the cause of the immediate failures.

**Explicit emitter zeroing** — tried to explicitly set emitter strength to 0 when gate closes. Failed because `_flood` only propagates higher values, so downstream nodes wouldn't clear.

### What Actually Works

The final solver runs in a strict ordered sequence:

**Step 1** — Reset all non-source nodes to strength=0, powered=false.

**Step 2** — BFS from all active sources. Propagates through wires, resistors, repeaters, gates, and collectors. Emitters are explicitly skipped.

**Step 3** — Unified emitter resolution loop. Scans every emitter node, checks if its gate and collector conditions are met, activates it if so, then immediately runs a BFS from that emitter before moving to the next one. The loop repeats until a complete scan produces zero new activations. NPN and PNP are handled together in the same loop — this is critical for mixed chains (NPN emitter feeding PNP gate, etc.).

**Step 4** — Notify only nodes whose state changed.

The immediate-BFS-after-activation in Step 3 is the key insight. When NPN1's emitter activates, its BFS immediately populates NPN2's collector and gate (if wired that way). Then when the loop reaches NPN2's emitter in the same or next iteration, the conditions are already met. No ordering dependency issues.

### Why Two Passes Were Also Needed

Even with the unified loop, a subtle bug remained: the PNP emitter would stay powered after its gate received signal because the emitter had been activated in a previous sim run and the reset correctly zeroed it — but then the emitter resolution loop re-activated it in the same run because the BFS hadn't yet propagated the gate signal from the AND output wire. Running two full sim passes (reset+BFS+resolve twice) guaranteed the second pass had correct gate values. Eventually this was superseded by the unified loop with immediate BFS, which handles the dependency correctly in a single pass.

---

## Bugs Found and Fixed

### Collector/Emitter Spheres Swapped

The sphere mesh positions in the Godot scenes were placed at the wrong Z coordinates relative to what the code expected. Discovered by testing: power into the "wrong" side opened the transistor. Fixed by swapping the code's side mapping rather than moving the meshes — `dir.y == -1` = collector (front), `dir.y == 1` = emitter (back).

### transistor_id Not Set on Emitter Node at First Sim Run

`CircuitBoard.place_component` called `SimulationManager.register_node` (which triggers a sim run via `mark_dirty`) before calling `init_sim_nodes` on the transistor. So the first simulation ran with the emitter node having `transistor_id = ""`, meaning the gate lookup always returned an empty dict and the emitter always defaulted to conducting regardless of gate state. Fixed by inserting the node directly into `SimulationManager.nodes` without triggering a sim run, then calling `init_sim_nodes`, then calling `mark_dirty`.

### ComponentRegistry Template Missing transistor_id

The PNP and NPN sim node templates in ComponentRegistry had no `transistor_id` field. If a simulation ran before `init_sim_nodes` completed, `n.get("transistor_id", "")` returned empty string and gate lookup failed silently. Fixed by adding `"transistor_id": "", "gate_threshold": 1` to both templates.

### C_FLOW_ON Renamed But Not Fully Replaced

During the colour scheme refactor (orange flow → separate red collector and green emitter colours), two `on_sim_update` calls in `TransistorPNP.gd` still referenced the old `C_FLOW_ON` constant which no longer existed. Caused a parse error on scene load. Fixed by replacing with `C_EMIT_ON` and `C_COL_ON` respectively.

### _set Reserved Method Name Conflict

An earlier version of `Transistor.gd` used `_set` as a helper function name. Godot's `Node` class defines `_set(StringName, Variant) -> bool` as a virtual method, causing a signature mismatch error. Renamed to `_apply`.

### InfoPanel Text Wrapping Vertically

The InfoPanel PanelContainer was too narrow, causing text to wrap character by character. Worked around by printing sim state to the Godot Output tab during debugging rather than relying on the in-game panel. UI fix pending.

---

## Logic Gates Verified Working

|Gate|Components|Verified|
|---|---|---|
|Buffer|1× NPN|✔|
|AND|2× NPN in series|✔|
|NAND|2× NPN in series + 1× PNP|✔|
|OR|2× NPN in parallel|✔|
|XOR|NAND + OR feeding second AND stage|✔|

---

## Current Component Set

|Component|Behaviour|
|---|---|
|Wire|Signal decay 1 per tile, max range 15|
|Source|Full strength (15) output, right-click to toggle|
|Repeater|Resets signal to 15|
|NPN Transistor|Normally open, gate HIGH conducts|
|PNP Transistor|Normally closed, gate LOW conducts|
|Resistor|Drops signal by 4|
|LED|Terminal, lights on any signal|
|Clock|Auto-oscillates, right-click cycles frequency|

---

## What's Next

1. **Wire visual connection stubs** — wires should visually extend toward adjacent wires so runs look like lines rather than rows of separate cubes. Critical for readability of complex circuits.
2. **IC save system** — select a region, name it, save as reusable black-box component. Without this, building large circuits means re-laying the same gate patterns repeatedly.
3. **InfoPanel UI fix** — panel is too narrow, text wraps vertically. Needs minimum width set.
4. **Copy/paste region** — stamp a selected rectangle of components elsewhere on the board.
5. **Blender models** — replace placeholder cubes. Max bounding box: 0.9m × 0.9m × 0.4m per tile.

---

_Engine: Godot 4.2 — Language: GDScript — Renderer: Forward+_