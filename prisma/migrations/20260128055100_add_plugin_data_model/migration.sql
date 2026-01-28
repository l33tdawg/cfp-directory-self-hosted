-- CreateTable
CREATE TABLE "plugin_data" (
    "id" TEXT NOT NULL,
    "pluginId" TEXT NOT NULL,
    "namespace" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "encrypted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plugin_data_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "plugin_data_pluginId_namespace_idx" ON "plugin_data"("pluginId", "namespace");

-- CreateIndex
CREATE UNIQUE INDEX "plugin_data_pluginId_namespace_key_key" ON "plugin_data"("pluginId", "namespace", "key");

-- AddForeignKey
ALTER TABLE "plugin_data" ADD CONSTRAINT "plugin_data_pluginId_fkey" FOREIGN KEY ("pluginId") REFERENCES "plugins"("id") ON DELETE CASCADE ON UPDATE CASCADE;
