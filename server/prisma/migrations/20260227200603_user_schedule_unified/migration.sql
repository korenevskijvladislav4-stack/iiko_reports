/*
  Warnings:

  - You are about to drop the `Employee` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `EmployeeSchedule` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `Employee` DROP FOREIGN KEY `Employee_company_id_fkey`;

-- DropForeignKey
ALTER TABLE `Employee` DROP FOREIGN KEY `Employee_department_id_fkey`;

-- DropForeignKey
ALTER TABLE `Employee` DROP FOREIGN KEY `Employee_position_id_fkey`;

-- DropForeignKey
ALTER TABLE `EmployeeSchedule` DROP FOREIGN KEY `EmployeeSchedule_company_id_fkey`;

-- DropForeignKey
ALTER TABLE `EmployeeSchedule` DROP FOREIGN KEY `EmployeeSchedule_employee_id_fkey`;

-- AlterTable
ALTER TABLE `User` ADD COLUMN `department_id` VARCHAR(36) NULL,
    ADD COLUMN `hourly_rate` DOUBLE NULL,
    ADD COLUMN `include_in_schedule` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `position_id` VARCHAR(36) NULL,
    ADD COLUMN `schedule_access_role` VARCHAR(50) NOT NULL DEFAULT 'none',
    MODIFY `role` VARCHAR(50) NOT NULL DEFAULT 'staff';

-- DropTable
DROP TABLE `Employee`;

-- DropTable
DROP TABLE `EmployeeSchedule`;

-- CreateTable
CREATE TABLE `user_schedules` (
    `id` VARCHAR(36) NOT NULL,
    `company_id` VARCHAR(36) NOT NULL,
    `user_id` VARCHAR(36) NOT NULL,
    `date` DATE NOT NULL,
    `start_time` VARCHAR(20) NULL,
    `end_time` VARCHAR(20) NULL,
    `notes` VARCHAR(500) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_department_id_fkey` FOREIGN KEY (`department_id`) REFERENCES `Department`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_position_id_fkey` FOREIGN KEY (`position_id`) REFERENCES `Position`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_schedules` ADD CONSTRAINT `user_schedules_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `Company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_schedules` ADD CONSTRAINT `user_schedules_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
