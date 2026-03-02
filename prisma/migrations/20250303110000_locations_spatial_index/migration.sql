-- Spatial index for location proximity queries (bounding-box and nearby lookups).
-- Composite B-tree index on (latitude, longitude) for efficient range scans.
-- For full PostGIS GiST spatial index, enable the postgis extension and add a geography column.
CREATE INDEX "idx_locations_lat_lng" ON "locations" ("latitude", "longitude")
WHERE "latitude" IS NOT NULL AND "longitude" IS NOT NULL;
