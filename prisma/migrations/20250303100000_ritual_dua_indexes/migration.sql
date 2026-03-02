-- CreateIndex
CREATE INDEX "rituals_order_idx" ON "rituals"("order");

-- CreateIndex
CREATE INDEX "duas_ritual_id_idx" ON "duas"("ritual_id");

-- CreateIndex
CREATE INDEX "duas_ritual_id_order_idx" ON "duas"("ritual_id", "order");
