-- CreateEnum
CREATE TYPE "DeviceProvider" AS ENUM ('MOCK', 'ZKTECO', 'SUPREMA');

-- CreateEnum
CREATE TYPE "DeviceStatus" AS ENUM ('ONLINE', 'OFFLINE', 'DISABLED');

-- CreateTable
CREATE TABLE "devices" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "provider" "DeviceProvider" NOT NULL,
    "ipAddress" TEXT,
    "location" TEXT,
    "status" "DeviceStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "biometric_mappings" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "deviceUserId" TEXT NOT NULL,

    CONSTRAINT "biometric_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scan_logs" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "employeeId" TEXT,
    "verified" BOOLEAN NOT NULL,
    "payload" JSONB,
    "scannedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scan_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_daily_meal_status" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "breakfast" BOOLEAN NOT NULL DEFAULT false,
    "lunch" BOOLEAN NOT NULL DEFAULT false,
    "dinner" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_daily_meal_status_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "devices_code_key" ON "devices"("code");

-- CreateIndex
CREATE UNIQUE INDEX "biometric_mappings_deviceId_deviceUserId_key" ON "biometric_mappings"("deviceId", "deviceUserId");

-- CreateIndex
CREATE INDEX "employee_daily_meal_status_date_idx" ON "employee_daily_meal_status"("date");

-- CreateIndex
CREATE INDEX "employee_daily_meal_status_employeeId_date_idx" ON "employee_daily_meal_status"("employeeId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "employee_daily_meal_status_employeeId_date_key" ON "employee_daily_meal_status"("employeeId", "date");

-- AddForeignKey
ALTER TABLE "biometric_mappings" ADD CONSTRAINT "biometric_mappings_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "biometric_mappings" ADD CONSTRAINT "biometric_mappings_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "devices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scan_logs" ADD CONSTRAINT "scan_logs_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "devices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_daily_meal_status" ADD CONSTRAINT "employee_daily_meal_status_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
