-- CreateIndex
CREATE INDEX "checklists_category_idx" ON "checklists"("category");

-- CreateIndex
CREATE INDEX "checklists_category_order_idx" ON "checklists"("category", "order");

-- CreateIndex
CREATE INDEX "contacts_user_id_idx" ON "contacts"("user_id");

-- CreateIndex
CREATE INDEX "locations_type_idx" ON "locations"("type");

-- CreateIndex
CREATE INDEX "locations_latitude_longitude_idx" ON "locations"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "notifications_user_id_idx" ON "notifications"("user_id");

-- CreateIndex
CREATE INDEX "notifications_user_id_read_idx" ON "notifications"("user_id", "read");

-- CreateIndex
CREATE INDEX "prayer_times_location_id_idx" ON "prayer_times"("location_id");

-- CreateIndex
CREATE INDEX "prayer_times_date_idx" ON "prayer_times"("date");

-- CreateIndex
CREATE INDEX "users_created_at_idx" ON "users"("created_at");
