-- Seed: Sage Barista Express Impress (BES876/SES876).
-- Capabilities describe both machine-level constants (portafilter size,
-- tamping force) and the per-attempt field schema a generic renderer could
-- use for a future machine. v1 ships a dedicated Sage form (Fase 2) that
-- reads the same numbers, so this JSON is the single source of truth.

insert into public.machine_models (slug, brand, model_name, capabilities_version, capabilities)
values (
  'sage-barista-express-impress',
  'Sage',
  'Barista Express Impress (BES876/SES876)',
  1,
  '{
    "portafilter_mm": 54,
    "grind": {
      "min": 1,
      "max": 25,
      "step": 1,
      "lower_is_finer": true
    },
    "baskets": {
      "sizes": ["single", "double"],
      "walls": ["single_wall", "dual_wall"]
    },
    "dosing": {
      "modes": ["auto", "manual"],
      "feedback_options": ["under", "ideal", "over", "unknown"],
      "has_bit_more": true
    },
    "tamping": {
      "assisted": true,
      "force_kg": 10,
      "twist_degrees": 7
    },
    "temperature_offset_c": {
      "min": -2,
      "max": 2,
      "step": 1
    },
    "shot": {
      "modes": ["single", "double", "manual"],
      "volumetric": true
    },
    "pressure": {
      "type": "analog_gauge",
      "observation_options": ["low", "espresso_range", "high", "unknown"]
    },
    "upper_burr": {
      "adjustable": true,
      "persist_on": "user_machine",
      "snapshot_on": "brew_attempt"
    },
    "attempt_fields": [
      { "key": "grind_setting", "group": "molienda", "type": "stepper", "min": 1, "max": 25, "required": true },
      { "key": "grind_seconds", "group": "molienda", "type": "decimal_seconds", "required": true },
      { "key": "dose_mode", "group": "molienda", "type": "enum", "options": ["auto", "manual"], "required": true },
      { "key": "dose_feedback", "group": "molienda", "type": "enum", "options": ["under", "ideal", "over", "unknown"], "required": false },
      { "key": "used_bit_more", "group": "molienda", "type": "boolean", "required": false },
      { "key": "basket_size", "group": "cesta", "type": "enum", "options": ["single", "double"], "required": true },
      { "key": "basket_wall", "group": "cesta", "type": "enum", "options": ["single_wall", "dual_wall"], "required": false },
      { "key": "temperature_offset_c", "group": "temperatura", "type": "stepper", "min": -2, "max": 2, "required": false },
      { "key": "shot_mode", "group": "extraccion", "type": "enum", "options": ["single", "double", "manual"], "required": true },
      { "key": "extraction_ms", "group": "extraccion", "type": "timer_ms", "required_when": "modo_preparacion" },
      { "key": "preinfusion_ms", "group": "extraccion", "type": "int_ms", "required": false },
      { "key": "pressure_observation", "group": "extraccion", "type": "enum", "options": ["low", "espresso_range", "high", "unknown"], "required": false },
      { "key": "input_weight_g", "group": "peso_volumen", "type": "decimal", "required": false },
      { "key": "output_weight_g", "group": "peso_volumen", "type": "decimal", "required": false },
      { "key": "output_volume_ml", "group": "peso_volumen", "type": "decimal", "required": false }
    ]
  }'::jsonb
)
on conflict (slug) do update set
  brand = excluded.brand,
  model_name = excluded.model_name,
  capabilities_version = excluded.capabilities_version,
  capabilities = excluded.capabilities;
